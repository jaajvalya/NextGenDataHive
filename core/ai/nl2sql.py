"""Turn a question plus the planner's column detail into one SQL statement."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from .context import CatalogIndex, render_table_details
from .errors import GenerationError
from .history import effective_question, render_history
from .planner import QueryPlan
from .provider import LLMProvider, parse_json_response

_log = logging.getLogger("datahive.ai.nl2sql")

_DIALECTS = {
    "postgres": (
        "PostgreSQL. Reference tables as schema.table. Quote identifiers with double "
        'quotes only when they are mixed case or reserved ("dhpoc-bronze"."orders"). '
        "Use ILIKE for case-insensitive text matching, date_trunc() for period grouping, "
        "and CURRENT_DATE - INTERVAL '3 months' for relative dates."
    ),
    "snowflake": (
        "Snowflake. Always reference tables with the full three-part name "
        "DATABASE.SCHEMA.TABLE. Identifiers are upper case unless double-quoted. "
        "Use DATEADD()/DATE_TRUNC() for date arithmetic and ILIKE for case-insensitive "
        "text matching."
    ),
}

_SYSTEM_PROMPT = """You write a single read-only SQL SELECT that answers the user's question.

Dialect: {dialect}

Hard rules:
  - Exactly one statement. SELECT or WITH ... SELECT only. Never INSERT, UPDATE,
    DELETE, DROP, ALTER, CREATE, GRANT, COPY or CALL.
  - Use only the tables and columns listed below. Never invent a column.
  - Reference tables using exactly these names, keeping the quoting shown: {fqns}
  - When more than one table is listed, JOIN them. Prefer INNER JOIN unless the
    question needs unmatched rows (then LEFT JOIN). Put every join predicate in
    ON, never in WHERE when it is a relationship key.
  - Use the "Likely join keys" section when present. If it is missing, join on
    shared *_ID / primary-key columns that appear in both tables. Never invent
    a join column that is not listed.
  - Qualify columns with table aliases when joining (e.g. o.order_id, c.name).
  - Honour the row count the question asks for ("top 5" means LIMIT 5).
    {max_rows} is only a safety ceiling; add LIMIT {max_rows} when the question
    names no count and the query does not already aggregate to a few rows.
  - Prefer explicit column lists over SELECT *.
  - Order results meaningfully when the question implies a ranking.
  - If the user asks for a chart, graph, plot, or visual, still return only
    the underlying aggregate SELECT that produces the data — the UI will chart it.
    Prefer two columns: a category/period label and a numeric measure, ordered.
  - When prior conversation is provided, the latest question is a follow-up.
    Start from the previous SQL and apply the refinement (LIMIT, date window,
    GROUP BY, ordering, etc.). Never refuse a short follow-up as vague.
  - Only reference tables listed under "## Tables". If prior SQL names other
    tables, rewrite those references to the listed tables — never copy a table
    that is not listed.
  - State anything you had to guess in "assumptions" rather than silently choosing.

Reply with JSON only:
{{"sql": "...", "explanation": "one or two sentences in plain English",
  "confidence": "high|medium|low", "assumptions": ["..."]}}
"""


@dataclass
class GeneratedQuery:
    sql: str
    explanation: str = ""
    confidence: str = "medium"
    assumptions: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)


def dialect_for(platform: str) -> str:
    return _DIALECTS.get((platform or "").lower(), _DIALECTS["postgres"])


def generate_sql(
    question: str,
    *,
    provider: LLMProvider,
    index: CatalogIndex,
    plan: QueryPlan,
    max_rows: int,
    history: list[Any] | None = None,
) -> GeneratedQuery:
    """Ask the model for SQL against the planned tables."""
    fqns = ", ".join(ref.sql_ref for ref in plan.tables)
    details = render_table_details(index, plan.structures)

    system = _SYSTEM_PROMPT.format(
        dialect=dialect_for(plan.platform), fqns=fqns, max_rows=max_rows
    )
    prior = render_history(history)
    resolved = effective_question(question, history)
    user_parts: list[str] = []
    if prior:
        user_parts += [
            prior,
            "",
            "## Current question",
            question,
            "",
            "## Resolved intent",
            resolved,
            "",
            "## Tables",
            details,
        ]
    else:
        user_parts += [f"Question: {question}", "", "## Tables", details]
    if plan.notes:
        user_parts += ["", "## Caveats", *[f"- {note}" for note in plan.notes]]

    payload = parse_json_response(
        provider.complete(
            [
                {"role": "system", "content": system},
                {"role": "user", "content": "\n".join(user_parts)},
            ],
            json_mode=True,
        )
    )

    sql = str(payload.get("sql") or "").strip()
    if not sql:
        raise GenerationError(
            "The model did not produce a query for that question. Try rephrasing it."
        )

    assumptions = payload.get("assumptions")
    if not isinstance(assumptions, list):
        assumptions = []

    confidence = str(payload.get("confidence") or "medium").lower()
    if confidence not in {"high", "medium", "low"}:
        confidence = "medium"

    return GeneratedQuery(
        sql=sql,
        explanation=str(payload.get("explanation") or "").strip(),
        confidence=confidence,
        assumptions=[str(a) for a in assumptions][:6],
        raw=payload,
    )
