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
from .context import CatalogIndex, TableRef, rank_tables, render_catalog_card
from .errors import PlanningError
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
  - Include tables needed only for joins or filters, not just the ones named in the question.
  - If nothing in the catalog can answer the question, set answerable to false and explain why.

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

    suffix = [t for t in pool if t.fqn.lower().endswith(f".{wanted}")]
    bare = [t for t in pool if t.table.lower() == wanted.rsplit(".", 1)[-1]]
    matches = suffix or bare
    if not matches:
        return None
    matches.sort(key=lambda t: (0 if t.platform == "snowflake" else 1, t.fqn.lower()))
    return matches[0]


def _plan_from_model(
    provider: LLMProvider,
    index: CatalogIndex,
    question: str,
    pool: list[TableRef],
    *,
    max_catalog_tables: int,
) -> tuple[list[TableRef], str]:
    card = render_catalog_card(index, question, max_tables=max_catalog_tables)
    messages = [
        {"role": "system", "content": _SYSTEM_PROMPT.format(max_tables=MAX_TABLES_PER_PLAN)},
        {"role": "user", "content": f"Question: {question}\n\n{card}"},
    ]
    payload = parse_json_response(provider.complete(messages, json_mode=True))

    reason = str(payload.get("reason") or "").strip()
    if payload.get("answerable") is False:
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


def plan_query(
    user: str,
    role: str | None,
    question: str,
    *,
    provider: LLMProvider,
    index: CatalogIndex,
    connector_id: str | None = None,
    max_catalog_tables: int = 120,
) -> QueryPlan:
    """Choose a connector and tables, then fetch their columns."""
    pool = _candidate_pool(index, connector_id)

    try:
        selected, reason = _plan_from_model(
            provider, index, question, pool, max_catalog_tables=max_catalog_tables
        )
    except PlanningError:
        raise
    except Exception as exc:
        _log.warning("planner model call failed, falling back to keyword ranking: %s", exc)
        selected, reason = [], ""

    if not selected:
        # Keyword ranking still beats refusing outright, and generation gets a
        # chance to work with the closest tables we have.
        ranked = [t for t in rank_tables(index, question, limit=MAX_TABLES_PER_PLAN) if t in pool]
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

    structures, notes = fetch_structures(user, role, selected)
    if not structures:
        raise PlanningError(
            "Matched "
            + ", ".join(t.sql_ref for t in selected)
            + " but could not read their columns. "
            + (notes[0] if notes else "Check the connector is reachable.")
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
