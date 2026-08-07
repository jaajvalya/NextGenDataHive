"""Snowflake stage listing and provisioning."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.security import resolve_role, resolve_user
from core import asset_catalog, snowflake_catalog

router = APIRouter(tags=["snowflake"])


def _require_snowflake_connector(connector_id: str, user: str, role: str | None) -> dict[str, Any]:
    connectors = asset_catalog.list_accessible_connectors(user, role)
    conn = next((c for c in connectors if c["id"] == connector_id), None)
    if not conn:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")
    platform = str(conn.get("platform") or conn.get("cloud") or "").lower()
    if platform != "snowflake":
        raise HTTPException(status_code=422, detail="Connector is not a Snowflake connection.")
    return conn


@router.get("/api/snowflake/{connector_id}/stages")
def snowflake_list_stages(connector_id: str, request: Request) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    _require_snowflake_connector(connector_id, user, role)
    try:
        stages = snowflake_catalog.list_stages_for_doc(
            snowflake_catalog.load_connector_doc(connector_id)
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Snowflake stage list failed: {exc}") from exc
    return {"ok": True, "connector_id": connector_id, "items": stages, "count": len(stages)}


@router.get("/api/snowflake/{connector_id}/stages/{stage_fqn:path}/files")
def snowflake_list_stage_files(
    connector_id: str,
    stage_fqn: str,
    request: Request,
    pattern: str = "",
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    _require_snowflake_connector(connector_id, user, role)
    try:
        files = snowflake_catalog.list_stage_files_for_doc(
            snowflake_catalog.load_connector_doc(connector_id),
            stage_fqn,
            pattern=pattern or "",
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except snowflake_catalog.StageAccessError as exc:
        return {
            "ok": True,
            "connector_id": connector_id,
            "stage_fqn": stage_fqn.lstrip("@"),
            "items": [],
            "count": 0,
            "exists": None,
            "visible": False,
            "reason": exc.reason,
            "note": str(exc),
            "grant_sql": snowflake_catalog.ensure_raw_stage_grant_sql(),
        }
    except Exception as exc:
        detail = str(exc)
        if "does not exist" in detail.lower() or "not authorized" in detail.lower():
            return {
                "ok": True,
                "connector_id": connector_id,
                "stage_fqn": stage_fqn.lstrip("@"),
                "items": [],
                "count": 0,
                "exists": None,
                "visible": False,
                "note": (
                    "Stage is not visible to this connector role (Snowflake returns "
                    "'does not exist or not authorized'). SALES_DB.RAW is owned by ACCOUNTADMIN; "
                    "SYSADMIN does not inherit those privileges. Grant READ/WRITE on the stage "
                    "— do not recreate it from DataHive."
                ),
                "grant_sql": snowflake_catalog.ensure_raw_stage_grant_sql(),
            }
        raise HTTPException(status_code=503, detail=f"Snowflake stage file list failed: {exc}") from exc
    return {
        "ok": True,
        "connector_id": connector_id,
        "stage_fqn": stage_fqn.lstrip("@"),
        "items": files,
        "count": len(files),
        "exists": True,
        "visible": True,
    }


@router.post("/api/snowflake/{connector_id}/stages/ensure-raw")
def snowflake_ensure_raw_stage(connector_id: str, request: Request) -> dict[str, Any]:
    """Create SALES_DB.RAW.RAW_STAGE (or scoped DB.RAW.RAW_STAGE) when permitted."""
    user = resolve_user(request)
    role = resolve_role(request)
    _require_snowflake_connector(connector_id, user, role)
    try:
        result = snowflake_catalog.ensure_raw_stage_for_doc(
            snowflake_catalog.load_connector_doc(connector_id)
        )
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(
            status_code=403,
            detail={
                "message": str(exc),
                "grant_sql": snowflake_catalog.ensure_raw_stage_grant_sql(),
                "workaround": "Use stage @~ (user stage) in ETL until RAW_STAGE is granted/created.",
            },
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Could not ensure RAW_STAGE: {exc}") from exc
    return {"ok": True, "connector_id": connector_id, **result}
