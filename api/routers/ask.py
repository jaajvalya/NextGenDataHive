"""Natural-language querying.

Ask a question in English; the pipeline picks a connector, reads the schema it
needs, writes read-only SQL, validates it and runs it through the same executor
as the SQL Insights tab.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.schemas import AskIn, AskSqlIn
from api.security import resolve_role, resolve_user
from api.services import sql_runner
from api.settings import QUERY_LOGS_COLLECTION
from core import mongo_store
from core.ai import answer as ai_answer
from core.ai import context as ai_context
from core.ai import guard, nl2sql, planner, provider
from core.ai.errors import AskError

router = APIRouter(tags=["ask"])

_log = logging.getLogger("datahive.api.ask")


def _log_failure(user: str, question: str, message: str, sql: str | None = None) -> None:
    """Record asks that never reached execution; run_sql logs the rest."""
    now = datetime.now(timezone.utc).isoformat()
    try:
        mongo_store.append_query_log(
            {
                "user": user,
                "source": "ask",
                "question": question,
                "query": sql or "",
                "status": "failure",
                "error": message,
                "query_start_time": now,
                "query_end_time": now,
                "collection": QUERY_LOGS_COLLECTION,
            }
        )
    except Exception as exc:
        _log.warning("ask failure log skipped: %s", exc)


def _sources(plan: planner.QueryPlan) -> list[dict[str, Any]]:
    return [
        {
            "fqn": ref.fqn,
            "schema": ref.schema,
            "table": ref.table,
            "connector_id": ref.connector_id,
            "connector_name": ref.connector_name,
            "platform": ref.platform,
        }
        for ref in plan.tables
    ]


def _build_query(
    user: str, role: str | None, body: AskSqlIn
) -> tuple[dict[str, Any], planner.QueryPlan, str, int]:
    """Plan, generate and validate. Returns (payload, plan, safe_sql, max_rows)."""
    settings = provider.load_settings()
    llm = provider.get_provider(settings)
    max_rows = min(body.max_rows, settings.max_rows)

    index = ai_context.build_index(user, role=role, connector_id=body.connector_id)
    plan = planner.plan_query(
        user,
        role,
        body.question,
        provider=llm,
        index=index,
        connector_id=body.connector_id,
    )
    generated = nl2sql.generate_sql(
        body.question, provider=llm, index=index, plan=plan, max_rows=max_rows
    )
    safe_sql = guard.enforce(generated.sql, plan.tables, max_rows=max_rows)

    payload = {
        "question": body.question,
        "sql": safe_sql,
        "connector_id": plan.connector_id,
        "connector_name": plan.connector_name,
        "platform": plan.platform,
        "sources": _sources(plan),
        "explanation": generated.explanation,
        "confidence": generated.confidence,
        "assumptions": generated.assumptions,
        "notes": plan.notes,
        "selection_reason": plan.reason,
        "max_rows": max_rows,
    }
    return payload, plan, safe_sql, max_rows


def _raise_for(exc: Exception, user: str, question: str, sql: str | None = None):
    """Map pipeline failures onto HTTP status codes."""
    if isinstance(exc, provider.AINotConfigured):
        _log_failure(user, question, str(exc), sql)
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if isinstance(exc, AskError):
        _log_failure(user, question, str(exc), sql)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    if isinstance(exc, provider.AIProviderError):
        _log_failure(user, question, str(exc), sql)
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    raise exc


@router.get("/api/ask/health")
def ask_health() -> dict[str, Any]:
    """Whether the Ask Aura tab should be shown, and which model backs it."""
    return provider.provider_status()


@router.post("/api/ask/sql")
def ask_sql(body: AskSqlIn, request: Request) -> dict[str, Any]:
    """Generate and validate SQL without running it."""
    user = resolve_user(request, None)
    role = resolve_role(request)
    try:
        payload, _plan, _sql, _max_rows = _build_query(user, role, body)
    except Exception as exc:
        _raise_for(exc, user, body.question)
        raise
    payload["executed"] = False
    return payload


@router.post("/api/ask")
def ask(body: AskIn, request: Request) -> dict[str, Any]:
    """Answer a question end to end."""
    user = resolve_user(request, None)
    role = resolve_role(request)

    try:
        payload, plan, safe_sql, max_rows = _build_query(user, role, body)
    except Exception as exc:
        _raise_for(exc, user, body.question)
        raise

    if not body.execute:
        payload["executed"] = False
        return payload

    head = plan.primary
    try:
        result = sql_runner.run_sql(
            user,
            role,
            safe_sql,
            connector_id=plan.connector_id,
            schema=head.schema if head else None,
            table=head.table if head else None,
            max_rows=max_rows,
            source="ask",
            log_extra={"question": body.question},
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except sql_runner.SqlExecutionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    payload.update(
        {
            "executed": True,
            "columns": result.get("columns") or [],
            "rows": result.get("rows") or [],
            "row_count": result.get("row_count"),
            "truncated": result.get("truncated"),
            "connector_id": result.get("connector_id") or plan.connector_id,
        }
    )

    settings = provider.load_settings()
    if body.explain_result and settings.send_results:
        payload["answer"] = ai_answer.summarize(
            body.question, safe_sql, result, provider=provider.get_provider(settings)
        )
    else:
        payload["answer"] = ""
        payload["answer_skipped"] = "Result summarisation is disabled by DATAHIVE_AI_SEND_RESULTS."
    return payload
