"""Pick one connector and the tables the question needs, then go get their columns.

Two stages on purpose. The model first sees only names, which is cheap even on a
large catalog; the connector is then invoked for column detail on the few tables
it chose. Anything the model names that is not in the catalog is discarded here,
so a hallucinated table can never reach SQL generation.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

from .. import asset_catalog
from .context import CatalogIndex, TableRef, rank_tables, render_catalog_card, tokenize
from .errors import PlanningError
from .guard import referenced_tables
from .history import (
    effective_question,
    is_followup_refinement,
    is_short_followup,
    render_history,
)
from .provider import LLMProvider, parse_json_response

_log = logging.getLogger("datahive.ai.planner")

MAX_TABLES_PER_PLAN = 6

_SYSTEM_PROMPT = """You route data questions to exactly one data connector.

Given a question and a catalog of connectors and tables, choose:
  - the single connector most likely to answer it
  - up to {max_tables} tables from that connector that the query will need

Rules:
  - Only choose from connectors marked "can run SQL".
  - Only name tables that appear verbatim in the catalog. Never invent one.
  - All chosen tables must belong to the same connector.
  - Prefer multiple related tables when the question combines entities
    (customers + orders, products + sales, users + events). Include every table
    needed for JOINs or filters, not only the fact table named in the question.
  - Typical pattern: fact/transaction table plus dimension/lookup tables
    (customers, products, regions, dates) that supply names or attributes.
  - List the driving fact table first, then join partners.
  - CRITICAL: When a prior conversation is provided, the current question is a
    follow-up. Always set answerable to true. Reuse the prior connector and the
    tables named in the prior SQL/Tables lines. Short refinements like
    "top 10", "by region", "last 90 days", or "chart that" are valid follow-ups
    — never refuse them as underspecified.
  - Only set answerable to false when there is NO prior conversation AND nothing
    in the catalog can answer the standalone question.

Reply with JSON only:
{{"answerable": true, "connector_id": "...", "tables": ["EXACT.FQN.FROM.CATALOG"], "reason": "one sentence"}}
"""


@dataclass
class QueryPlan:
    connector_id: str
    connector_name: str
    platform: str
    tables: list[TableRef] = field(default_factory=list)
    structures: list[dict[str, Any]] = field(default_factory=list)
    reason: str = ""
    notes: list[str] = field(default_factory=list)

    @property
    def primary(self) -> TableRef | None:
        return self.tables[0] if self.tables else None


def _candidate_pool(index: CatalogIndex, connector_id: str | None) -> list[TableRef]:
    tables = index.queryable_tables()
    if connector_id and connector_id != "all":
        scoped = [t for t in tables if t.connector_id == connector_id]
        if not scoped:
            conn = index.connector(connector_id)
            label = (conn or {}).get("display_name") or connector_id
            raise PlanningError(
                f"'{label}' has no tables that support SQL yet. "
                "Pick a Postgres or Snowflake connector, or leave the source on Auto."
            )
        return scoped
    if not tables:
        raise PlanningError(
            "No queryable tables are available. Save a Postgres or Snowflake connector "
            "and browse it in Assets first."
        )
    return tables


def _match_table(pool: list[TableRef], reference: str) -> TableRef | None:
    """Resolve a model-supplied reference against the catalog.

    Mirrors how the Assets tab resolves an ambiguous name: prefer an exact FQN,
    then Snowflake, then anything with live structure.
    """
    # Quoting is the model's choice, so compare on the unquoted spelling.
    wanted = re.sub(r'["`\s]', "", (reference or "")).lower()
    if not wanted:
        return None

    exact = [t for t in pool if t.fqn.lower() == wanted]
    if exact:
        return exact[0]

    # schema.table when catalog fqn is database.schema.table (or the reverse)
    parts = [p for p in wanted.split(".") if p]
    schema_table = ".".join(parts[-2:]) if len(parts) >= 2 else wanted
    schema_table_hits = [
        t
        for t in pool
        if t.fqn.lower().endswith(f".{schema_table}")
        or f"{t.schema}.{t.table}".lower().replace('"', "") == schema_table
        or t.fqn.lower().replace('"', "") == schema_table
    ]
    suffix = [t for t in pool if t.fqn.lower().endswith(f".{wanted}")]
    bare_name = parts[-1]
    bare = [t for t in pool if t.table.lower() == bare_name]
    matches = schema_table_hits or suffix or bare
    if not matches:
        return None
    matches.sort(key=lambda t: (0 if t.platform == "snowflake" else 1, t.fqn.lower()))
    return matches[0]


def _turn_sources(turn: Any) -> list[str]:
    raw = getattr(turn, "sources", None) if not isinstance(turn, dict) else turn.get("sources")
    if not raw:
        return []
    if isinstance(raw, list):
        out: list[str] = []
        for item in raw:
            if isinstance(item, dict):
                name = str(item.get("fqn") or item.get("table") or "").strip()
            else:
                name = str(item or "").strip()
            if name:
                out.append(name)
        return out
    return [str(raw).strip()] if str(raw).strip() else []


def _turn_connector_id(turn: Any) -> str | None:
    value = (
        getattr(turn, "connector_id", None)
        if not isinstance(turn, dict)
        else turn.get("connector_id")
    )
    value = str(value or "").strip()
    return value or None


def _tables_from_history(history: list[Any] | None, pool: list[TableRef]) -> list[TableRef]:
    """Recover planned tables from the most recent prior SQL / source list."""
    if not history:
        return []
    for turn in reversed(list(history)):
        selected: list[TableRef] = []
        references: list[str] = []
        sql = str(
            getattr(turn, "sql", None)
            if not isinstance(turn, dict)
            else turn.get("sql") or ""
        ).strip()
        if sql:
            references.extend(referenced_tables(sql))
        references.extend(_turn_sources(turn))
        connector_id = _turn_connector_id(turn)
        scoped = [t for t in pool if t.connector_id == connector_id] if connector_id else pool
        search_pool = scoped or pool
        for reference in references:
            match = _match_table(search_pool, reference)
            if match and match not in selected:
                selected.append(match)
            if len(selected) >= MAX_TABLES_PER_PLAN:
                break
        if selected:
            winner = selected[0].connector_id
            return [t for t in selected if t.connector_id == winner]
    return []


def _rank_followup_tables(
    index: CatalogIndex,
    history: list[Any] | None,
    pool: list[TableRef],
    question: str,
) -> list[TableRef]:
    """Last-resort table pick for follow-ups when SQL/source recovery fails."""
    if not pool:
        return []
    ranking_question = effective_question(question, history)
    connector_id = _turn_connector_id(history[-1]) if history else None
    scoped = [t for t in pool if t.connector_id == connector_id] if connector_id else list(pool)
    if not scoped:
        scoped = list(pool)
    ranked = [t for t in rank_tables(index, ranking_question, limit=MAX_TABLES_PER_PLAN) if t in scoped]
    if not ranked:
        ranked = scoped[:MAX_TABLES_PER_PLAN]
    if not ranked:
        return []
    winner = ranked[0].connector_id
    return [t for t in ranked if t.connector_id == winner][:MAX_TABLES_PER_PLAN]


def _plan_from_model(
    provider: LLMProvider,
    index: CatalogIndex,
    question: str,
    pool: list[TableRef],
    *,
    max_catalog_tables: int,
    history: list[Any] | None = None,
) -> tuple[list[TableRef], str]:
    # Rank the catalog with prior intent so follow-ups still surface the right tables.
    ranking_question = effective_question(question, history)
    card = render_catalog_card(index, ranking_question, max_tables=max_catalog_tables)
    prior = render_history(history)
    user_content = f"Question: {question}\n\n{card}"
    if prior:
        user_content = (
            f"{prior}\n\n## Current question\n{question}\n\n"
            f"(Resolved intent for routing: {ranking_question})\n\n{card}"
        )
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT.format(max_tables=MAX_TABLES_PER_PLAN)},
        {"role": "user", "content": user_content},
    ]
    payload = parse_json_response(provider.complete(messages, json_mode=True))

    reason = str(payload.get("reason") or "").strip()
    if payload.get("answerable") is False:
        if history:
            # Never surface "underspecified" for follow-ups — recover or defer.
            _log.info(
                "planner marked follow-up unanswerable (%s); recovering from history",
                reason or "no reason",
            )
            recovered = _tables_from_history(history, pool)
            return recovered, reason or "Follow-up on the previous query."
        raise PlanningError(
            reason or "No table in the catalog matches that question."
        )

    chosen_connector = str(payload.get("connector_id") or "").strip()
    references = payload.get("tables")
    if not isinstance(references, list):
        references = []

    scoped = [t for t in pool if t.connector_id == chosen_connector] or pool
    selected: list[TableRef] = []
    for reference in references[: MAX_TABLES_PER_PLAN * 2]:
        match = _match_table(scoped, str(reference))
        if match and match not in selected:
            selected.append(match)
        elif not match:
            _log.info("planner dropped unknown table reference: %s", reference)
        if len(selected) >= MAX_TABLES_PER_PLAN:
            break

    # All tables must run on one connector.
    if selected:
        winner = selected[0].connector_id
        selected = [t for t in selected if t.connector_id == winner]
    elif history:
        selected = _tables_from_history(history, pool)
        if selected:
            reason = reason or "Reused tables from the previous query."
    return selected, reason


def fetch_structures(
    user: str,
    role: str | None,
    tables: list[TableRef],
) -> tuple[list[dict[str, Any]], list[str]]:
    """Invoke each connector for the column detail of one table. Never raises."""
    structures: list[dict[str, Any]] = []
    notes: list[str] = []
    for ref in tables:
        try:
            structure = asset_catalog.connector_structure(
                user,
                role=role,
                connector_id=ref.connector_id,
                schema=ref.schema,
                table=ref.table,
            )
        except Exception as exc:
            _log.warning("structure fetch failed for %s: %s", ref.fqn, exc)
            notes.append(f"Could not read columns for {ref.fqn}: {exc}")
            continue
        structure.setdefault("schema", ref.schema)
        structure.setdefault("table", ref.table)
        structures.append(structure)
    return structures, notes


def _expand_related_tables(
    question: str,
    selected: list[TableRef],
    pool: list[TableRef],
) -> list[TableRef]:
    """Pull in sibling tables the question names so JOINs have both sides.

    The model sometimes returns only the fact table. If the question also
    mentions customers/products/etc. that exist on the same connector, add them.
    """
    if not selected or len(selected) >= MAX_TABLES_PER_PLAN:
        return selected

    head = selected[0]
    wanted = tokenize(question)
    if not wanted:
        return selected

    siblings = [
        t for t in pool if t.connector_id == head.connector_id and t not in selected
    ]
    if not siblings:
        return selected

    scored: list[tuple[int, int, str, TableRef]] = []
    for ref in siblings:
        haystack = tokenize(f"{ref.table} {ref.schema} {' '.join(ref.terms)}")
        overlap = len(wanted & haystack)
        if overlap <= 0:
            continue
        same_schema = 0 if ref.schema.lower() == head.schema.lower() else 1
        scored.append((-overlap, same_schema, ref.fqn.lower(), ref))
    scored.sort()

    expanded = list(selected)
    for *_, ref in scored:
        if len(expanded) >= MAX_TABLES_PER_PLAN:
            break
        expanded.append(ref)
    if len(expanded) > len(selected):
        _log.info(
            "planner expanded tables for joins: %s",
            ", ".join(t.fqn for t in expanded),
        )
    return expanded


def plan_query(
    user: str,
    role: str | None,
    question: str,
    *,
    provider: LLMProvider,
    index: CatalogIndex,
    connector_id: str | None = None,
    max_catalog_tables: int = 120,
    history: list[Any] | None = None,
    raw_question: str | None = None,
) -> QueryPlan:
    """Choose a connector and tables, then fetch their columns."""
    pool = _candidate_pool(index, connector_id)
    prior_tables = _tables_from_history(history, pool) if history else []
    # Prefer the user's original chip text ("Chart that") over an expanded rewrite.
    followup_probe = raw_question or question

    # Chip-style follow-ups (raw or already expanded) must not ask the model
    # whether they are "answerable".
    if history and (
        is_followup_refinement(followup_probe, history)
        or is_followup_refinement(question, history)
        or is_short_followup(followup_probe)
    ):
        selected = prior_tables or _rank_followup_tables(
            index, history, pool, question
        )
        reason = "Follow-up on the previous query."
    else:
        try:
            selected, reason = _plan_from_model(
                provider,
                index,
                question,
                pool,
                max_catalog_tables=max_catalog_tables,
                history=history,
            )
        except PlanningError:
            if history:
                _log.info("planner refused follow-up; recovering without model refusal")
                selected = prior_tables or _rank_followup_tables(
                    index, history, pool, question
                )
                reason = "Follow-up on the previous query."
            else:
                raise
        except Exception as exc:
            _log.warning("planner model call failed, falling back to keyword ranking: %s", exc)
            selected, reason = [], ""

    if not selected and prior_tables:
        selected = prior_tables
        reason = reason or "Reused tables from the previous query."

    if not selected and history:
        selected = _rank_followup_tables(index, history, pool, question)
        reason = reason or "Follow-up on the previous query."

    if not selected:
        # Keyword ranking still beats refusing outright, and generation gets a
        # chance to work with the closest tables we have.
        ranking_question = effective_question(question, history)
        ranked = [
            t
            for t in rank_tables(index, ranking_question, limit=MAX_TABLES_PER_PLAN)
            if t in pool
        ]
        selected = ranked[:MAX_TABLES_PER_PLAN] or pool[:MAX_TABLES_PER_PLAN]
        if selected:
            winner = selected[0].connector_id
            selected = [t for t in selected if t.connector_id == winner]
        reason = reason or "Selected by name match against the catalog."

    if not selected:
        raise PlanningError(
            "Could not match that question to any table in the catalog. "
            "Try naming the schema or table you mean."
        )

    ranking_question = effective_question(question, history)
    selected = _expand_related_tables(ranking_question, selected, pool)

    structures, notes = fetch_structures(user, role, selected)
    if not structures:
        detail = notes[0] if notes else "Check the connector is reachable."
        raise PlanningError(
            "Matched "
            + ", ".join(t.sql_ref for t in selected)
            + " but could not read their columns. "
            + detail
            + " Tip: open Connectors → Test on the Snowflake connection, "
            "confirm the account id (ORG-ACCOUNT), and retry — Snowflake "
            "sometimes needs a longer first connect."
        )

    head = selected[0]
    return QueryPlan(
        connector_id=head.connector_id,
        connector_name=head.connector_name,
        platform=head.platform,
        tables=selected,
        structures=structures,
        reason=reason,
        notes=notes,
    )
