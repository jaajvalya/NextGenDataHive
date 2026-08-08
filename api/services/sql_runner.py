"""Read-only SQL execution shared by the SQL Insights tab and the Ask Aura tab.

Holds the Postgres/Snowflake platform routing and the query-log write so both
callers behave identically and every execution is audited the same way.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any

from api.services.catalog import resolve_structure_connector
from api.settings import QUERY_LOGS_COLLECTION
from core import asset_catalog, mongo_store, postgres_store, snowflake_catalog

# "DB"."SCHEMA"."TABLE" or DB.SCHEMA.TABLE
_THREE_PART_REF = re.compile(
    r'(?:"[^"]+"|[A-Za-z_][\w$]*)\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*)\s*\.\s*(?:"[^"]+"|[A-Za-z_][\w$]*)'
)


class SqlExecutionError(RuntimeError):
    """The target platform rejected or failed the query."""

    def __init__(self, message: str, *, platform: str = ""):
        super().__init__(message)
        self.platform = platform


def looks_like_snowflake_sql(sql: str, schema: str | None) -> bool:
    """True for Snowflake 3-part refs or catalog schemas like SALES_DB.RAW."""
    if schema and "." in schema:
        return True
    return bool(_THREE_PART_REF.search(sql or ""))


def resolve_snowflake_connector_id(
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
            resolved = resolve_structure_connector(user, role, schema, table or "", None)
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


def resolve_target(
    user: str,
    role: str | None,
    sql: str,
    *,
    connector_id: str | None = None,
    schema: str | None = None,
    table: str | None = None,
) -> dict[str, Any]:
    """Decide which platform and connector will run this SQL."""
    schema = (schema or "").strip() or None
    table = (table or "").strip() or None
    connector_id = (connector_id or "").strip() or None

    # Always prefer SQL-inferred 3-part names (DATABASE.SCHEMA / TABLE) when present.
    inferred_schema, inferred_table = postgres_store.infer_query_schema_table(sql)
    if inferred_schema and "." in inferred_schema:
        schema = inferred_schema
        table = inferred_table or table
    elif not schema or not table:
        schema = schema or inferred_schema
        table = table or inferred_table

    platform = "postgres"
    database = postgres_store.postgres_database_name()

    # Explicit non-snowflake connector → Postgres (or that connector's platform).
    if connector_id and connector_id not in ("all", asset_catalog.LOCAL_POSTGRES_ID):
        if not str(connector_id).startswith("glossary:"):
            try:
                conn_doc = mongo_store.get_connector_document(connector_id, with_secrets=False)
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

    if platform != "snowflake" and looks_like_snowflake_sql(sql, schema):
        sf_id = resolve_snowflake_connector_id(user, role, schema, table, connector_id)
        if sf_id:
            connector_id = sf_id
            platform = "snowflake"
            database = schema.split(".", 1)[0] if schema and "." in schema else "SALES_DB"

    return {
        "platform": platform,
        "connector_id": connector_id,
        "database": database,
        "schema": schema,
        "table": table,
    }


def run_sql(
    user: str,
    role: str | None,
    sql: str,
    *,
    connector_id: str | None = None,
    schema: str | None = None,
    table: str | None = None,
    max_rows: int = 1000,
    source: str = "insights",
    log_extra: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Execute one read-only statement and append a query-log entry.

    Raises ValueError for anything the caller can fix (422) and SqlExecutionError
    when the target platform itself failed (503).
    """
    target = resolve_target(
        user, role, sql, connector_id=connector_id, schema=schema, table=table
    )
    platform = target["platform"]
    connector_id = target["connector_id"]
    schema = target["schema"]
    table = target["table"]

    query_start_time = datetime.now(timezone.utc)
    status = "success"
    error_message: str | None = None
    row_count: int | None = None
    result: dict[str, Any] | None = None
    try:
        if looks_like_snowflake_sql(sql, schema) and platform != "snowflake":
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
            result = snowflake_catalog.execute_sql_query_for_doc(doc, sql, max_rows=max_rows)
        else:
            result = postgres_store.execute_sql_query(sql, max_rows=max_rows)
            result["platform"] = "postgres"
        row_count = result.get("row_count")
        result["connector_id"] = connector_id or asset_catalog.LOCAL_POSTGRES_ID
        return result
    except ValueError as exc:
        status = "failure"
        error_message = str(exc)
        raise
    except Exception as exc:
        status = "failure"
        error_message = str(exc)
        label = "Snowflake" if platform == "snowflake" else "PostgreSQL"
        raise SqlExecutionError(f"{label} query failed: {exc}", platform=platform) from exc
    finally:
        query_end_time = datetime.now(timezone.utc)
        record: dict[str, Any] = {
            "user": user,
            "source": source,
            "platform": platform,
            "connector_id": connector_id,
            "database": target["database"],
            "schema": schema,
            "table": table,
            "query": sql,
            "max_rows": max_rows,
            "row_count": row_count,
            "truncated": (result or {}).get("truncated") if result else None,
            "query_start_time": query_start_time.isoformat(),
            "query_end_time": query_end_time.isoformat(),
            "duration_ms": int((query_end_time - query_start_time).total_seconds() * 1000),
            "status": status,
            "error": error_message,
            "collection": QUERY_LOGS_COLLECTION,
        }
        if log_extra:
            record.update(log_extra)
        mongo_store.append_query_log(record)
