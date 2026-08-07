"""Data-quality profiling runs and rule descriptions."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.schemas import DataQualityRunIn
from api.security import resolve_role, resolve_user
from core import asset_catalog, data_quality, mongo_store, postgres_store, snowflake_catalog

router = APIRouter(tags=["data_quality"])


@router.post("/api/data-quality/run")
def run_data_quality(body: DataQualityRunIn, request: Request) -> dict[str, Any]:
    """Profile selected tables and return DQ score, checks, and issue dashboard data."""
    user = resolve_user(request)
    role = resolve_role(request)
    connector_id = (body.connector_id or "").strip()
    schema = (body.schema or "").strip()
    tables = [str(t).strip() for t in (body.tables or []) if str(t).strip()]

    platform = "postgres"
    snowflake_doc: dict[str, Any] | None = None
    if connector_id and connector_id not in ("all", asset_catalog.LOCAL_POSTGRES_ID):
        if not str(connector_id).startswith("glossary:"):
            try:
                conn_doc = mongo_store.get_connector_document(
                    connector_id, with_secrets=False
                )
            except Exception:
                conn_doc = None
            if conn_doc:
                cloud = str(
                    conn_doc.get("cloud") or conn_doc.get("connector_type") or ""
                ).lower()
                if cloud == "snowflake":
                    platform = "snowflake"
                    snowflake_doc = snowflake_catalog.load_connector_doc(connector_id)

    def get_structure(sch: str, table: str) -> dict[str, Any]:
        if platform == "snowflake" and snowflake_doc is not None:
            return snowflake_catalog.table_structure_for_doc(snowflake_doc, sch, table)
        if connector_id in ("", "all", asset_catalog.LOCAL_POSTGRES_ID):
            return postgres_store.table_structure(sch.split(".")[-1], table)
        try:
            return asset_catalog.connector_structure(
                user,
                role=role,
                connector_id=connector_id,
                schema=sch,
                table=table,
            )
        except Exception:
            return postgres_store.table_structure(sch.split(".")[-1], table)

    def execute(sql: str) -> dict[str, Any]:
        if platform == "snowflake" and snowflake_doc is not None:
            return snowflake_catalog.execute_sql_query_for_doc(
                snowflake_doc, sql, max_rows=5000
            )
        return postgres_store.execute_sql_query(sql, max_rows=5000)

    try:
        return data_quality.run_data_quality(
            connector_id=connector_id or asset_catalog.LOCAL_POSTGRES_ID,
            schema=schema,
            tables=tables,
            platform=platform,
            get_structure=get_structure,
            execute=execute,
        )
    except data_quality.DataQualityError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=503, detail=f"Data quality run failed: {exc}"
        ) from exc


@router.get("/api/data-quality/logic")
def data_quality_logic() -> dict[str, Any]:
    return data_quality.score_logic_docs()
