"""Read-only SQL execution against Postgres and Snowflake."""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.schemas import SqlQueryIn
from api.security import resolve_role, resolve_user
from api.services.catalog import resolve_structure_connector
from api.settings import QUERY_LOGS_COLLECTION
from core import asset_catalog, mongo_store, postgres_store, snowflake_catalog

router = APIRouter(tags=["sql"])


def _looks_like_snowflake_sql(sql: str, schema: str | None) -> bool:
    """True for Snowflake 3-part refs or catalog schemas like SALES_DB.RAW."""
    if schema and "." in schema:
        return True
    text = sql or ""
    # "DB"."SCHEMA"."TABLE" or DB.SCHEMA.TABLE
    if re.search(
        r'(?:"[^"]+"|[A-Za-z_][\w$]*)\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*)\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*)',
        text,
    ):
        return True
    return False


def _resolve_snowflake_connector_id(
    user: str,
    role: str | None,
    schema: str | None,
    table: str | None,
    connector_id: str | None,
) -> str | None:
    """Resolve a real Snowflake connector_dtls id (skip glossary: stubs)."""
    candidates: list[str] = []
    if connector_id and connector_id not in ("all", asset_catalog.LOCAL_POSTGRES_ID):
        candidates.append(connector_id)
    if schema:
        try:
            resolved = resolve_structure_connector(
                user, role, schema, table or "", None
            )
            if resolved and resolved not in candidates:
                candidates.append(resolved)
        except ValueError:
            pass
    try:
        by_platform = mongo_store.find_connector_by_platform("snowflake")
    except RuntimeError:
        by_platform = None
    if by_platform and by_platform.get("id"):
        candidates.append(str(by_platform["id"]))

    for cid in candidates:
        if not cid or str(cid).startswith("glossary:"):
            continue
        try:
            doc = mongo_store.get_connector_document(str(cid), with_secrets=False)
        except Exception:
            doc = None
        if not doc:
            continue
        cloud = str(doc.get("cloud") or doc.get("connector_type") or "").lower()
        if cloud == "snowflake":
            return str(cid)
    return None


@router.post("/api/sql/query")
def sql_query(body: SqlQueryIn, request: Request) -> dict[str, Any]:
    user = resolve_user(request, None)
    role = resolve_role(request)
    schema = (body.schema or "").strip() or None
    table = (body.table or "").strip() or None
    connector_id = (body.connector_id or "").strip() or None

    # Always prefer SQL-inferred 3-part names (DATABASE.SCHEMA / TABLE) when present.
    inferred_schema, inferred_table = postgres_store.infer_query_schema_table(body.sql)
    if inferred_schema and "." in inferred_schema:
        schema = inferred_schema
        table = inferred_table or table
    elif not schema or not table:
        schema = schema or inferred_schema
        table = table or inferred_table

    platform = "postgres"
    database = postgres_store.postgres_database_name()

    # Explicit non-snowflake connector → Postgres (or that connector's platform).
    explicit_platform = ""
    if connector_id and connector_id not in ("all", asset_catalog.LOCAL_POSTGRES_ID):
        if not str(connector_id).startswith("glossary:"):
            try:
                conn_doc = mongo_store.get_connector_document(
                    connector_id, with_secrets=False
                )
            except Exception:
                conn_doc = None
            if conn_doc:
                explicit_platform = str(
                    conn_doc.get("cloud") or conn_doc.get("connector_type") or ""
                ).lower()
                if explicit_platform == "snowflake":
                    platform = "snowflake"
                    database = (
                        (schema.split(".", 1)[0] if schema and "." in schema else None)
                        or str(conn_doc.get("dataset_scope") or "SALES_DB")
                    )
                elif explicit_platform and explicit_platform not in {
                    "postgres",
                    "postgresql",
                    "pg",
                    "local",
                }:
                    # Unknown cloud connectors currently have no SQL runner — keep Postgres
                    # only when the SQL is not clearly Snowflake-shaped.
                    pass

    if platform != "snowflake" and _looks_like_snowflake_sql(body.sql, schema):
        sf_id = _resolve_snowflake_connector_id(
            user, role, schema, table, connector_id
        )
        if sf_id:
            connector_id = sf_id
            platform = "snowflake"
            database = (
                schema.split(".", 1)[0]
                if schema and "." in schema
                else "SALES_DB"
            )

    query_start_time = datetime.now(timezone.utc)
    status = "success"
    error_message: str | None = None
    row_count: int | None = None
    result: dict[str, Any] | None = None
    try:
        if _looks_like_snowflake_sql(body.sql, schema) and platform != "snowflake":
            raise ValueError(
                "This SQL looks like a Snowflake query "
                f"({schema + '.' + table if schema and table else '3-part table name'}), "
                "but no Snowflake connector is available. "
                "Save/select the SFSALESDB connector in Insights."
            )
        if platform == "snowflake":
            if not connector_id:
                raise ValueError("Snowflake connector_id is required for this query.")
            doc = snowflake_catalog.load_connector_doc(connector_id)
            result = snowflake_catalog.execute_sql_query_for_doc(
                doc, body.sql, max_rows=body.max_rows
            )
        else:
            result = postgres_store.execute_sql_query(body.sql, max_rows=body.max_rows)
            result["platform"] = "postgres"
        row_count = result.get("row_count")
        result["connector_id"] = connector_id or asset_catalog.LOCAL_POSTGRES_ID
        return result
    except ValueError as exc:
        status = "failure"
        error_message = str(exc)
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        status = "failure"
        error_message = str(exc)
        label = "Snowflake" if platform == "snowflake" else "PostgreSQL"
        raise HTTPException(status_code=503, detail=f"{label} query failed: {exc}") from exc
    finally:
        query_end_time = datetime.now(timezone.utc)
        mongo_store.append_query_log(
            {
                "user": user,
                "source": "insights",
                "platform": platform,
                "connector_id": connector_id,
                "database": database,
                "schema": schema,
                "table": table,
                "query": body.sql,
                "max_rows": body.max_rows,
                "row_count": row_count,
                "truncated": (result or {}).get("truncated") if result else None,
                "query_start_time": query_start_time.isoformat(),
                "query_end_time": query_end_time.isoformat(),
                "duration_ms": int(
                    (query_end_time - query_start_time).total_seconds() * 1000
                ),
                "status": status,
                "error": error_message,
                "collection": QUERY_LOGS_COLLECTION,
            }
        )
