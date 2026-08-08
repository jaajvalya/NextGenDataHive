"""Read-only SQL execution against Postgres and Snowflake."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.schemas import SqlQueryIn
from api.security import resolve_role, resolve_user
from api.services import sql_runner

router = APIRouter(tags=["sql"])


@router.post("/api/sql/query")
def sql_query(body: SqlQueryIn, request: Request) -> dict[str, Any]:
    user = resolve_user(request, None)
    role = resolve_role(request)
    try:
        return sql_runner.run_sql(
            user,
            role,
            body.sql,
            connector_id=body.connector_id,
            schema=body.schema,
            table=body.table,
            max_rows=body.max_rows,
            source="insights",
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except sql_runner.SqlExecutionError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
