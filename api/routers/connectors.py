"""Connector CRUD, connectivity tests and file-backed connectors."""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Body, File, Form, HTTPException, Request, UploadFile

from api.audit import log_connection_failure
from api.files import ensure_upload_dir, safe_stored_name, write_upload_file
from api.repositories.connectors import (
    fetch_connectors,
    insert_connector_doc,
    public_connector_item,
)
from api.security import resolve_user
from api.settings import (
    ALLOWED_UPLOAD_SUFFIXES,
    COLLECTION,
    DB_NAME,
    UPLOAD_DIR,
    UPLOAD_RELATIVE_ROOT,
)
from core import mongo_store, validators

log = logging.getLogger("datahive.connectors")

router = APIRouter(tags=["connectors"])


@router.post("/api/connectors/test")
def test_connector(request: Request, payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    """
    Validate connector credentials with a live handshake before save.
    Accepts the same form payload as POST /api/connectors, or
    `{ "connector_id": "<id>" }` to re-test a saved connector.
    """
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")

    test_payload = dict(payload)
    connector_id = str(test_payload.pop("connector_id", "") or "").strip()
    if connector_id:
        try:
            doc = mongo_store.get_connector_document(connector_id, with_secrets=True)
        except ValueError as exc:
            raise HTTPException(status_code=422, detail=str(exc)) from exc
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc
        if not doc:
            raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")
        # Overlay any explicit fields from the request (non-secret overrides).
        for key, value in payload.items():
            if key == "connector_id":
                continue
            if value is not None and value != "":
                doc[key] = value
        test_payload = doc

    user = resolve_user(request)
    cloud = str(test_payload.get("cloud") or test_payload.get("connector_type") or "")
    try:
        result = validators.validate_connector(test_payload)
    except validators.ConnectionValidationError as exc:
        log_connection_failure(
            user,
            str(exc),
            event="connection.validate_failed",
            error_type=exc.error_type or "auth",
            context={
                "cloud": cloud,
                "platform": exc.platform,
                "display_name": test_payload.get("display_name"),
                "account_id": test_payload.get("account_id"),
                "auth_type": test_payload.get("auth_type"),
                "connector_id": connector_id or None,
                "connection_status": "failed",
            },
        )
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        log_connection_failure(
            user,
            str(exc),
            event="connection.validate_error",
            error_type="server",
            context={
                "cloud": cloud,
                "display_name": test_payload.get("display_name"),
                "connector_id": connector_id or None,
            },
        )
        raise HTTPException(
            status_code=503,
            detail=f"Connection validation failed: {exc}",
        ) from exc

    mongo_store.log_connection_event(
        user,
        result.get("message") or "Connection validated",
        outcome="success",
        event="connection.validated",
        context={
            "cloud": cloud,
            "platform": result.get("platform"),
            "display_name": test_payload.get("display_name"),
            "account_id": test_payload.get("account_id"),
            "auth_type": test_payload.get("auth_type"),
            "connector_id": connector_id or None,
            "connection_status": "validated",
            "details": result.get("details") or {},
        },
    )
    return {
        "ok": True,
        "validated": True,
        "platform": result.get("platform"),
        "message": result.get("message"),
        "details": result.get("details") or {},
    }


@router.get("/api/connectors")
def list_connectors(limit: int | None = None) -> dict[str, Any]:
    """Return all saved connectors from MongoDB (newest first)."""
    try:
        items = fetch_connectors(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MongoDB read failed: {exc}") from exc
    return {
        "ok": True,
        "items": items,
        "count": len(items),
        "db": DB_NAME,
        "collection": COLLECTION,
    }


@router.post("/api/connectors")
def save_connector(payload: dict[str, Any] = Body(...)) -> dict[str, Any]:
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")
    return insert_connector_doc(dict(payload))


@router.get("/api/connectors/recent")
def list_recent_connectors(limit: int = 500) -> dict[str, Any]:
    """Compatibility alias for GET /api/connectors (returns all by default)."""
    try:
        items = fetch_connectors(limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MongoDB read failed: {exc}") from exc
    return {
        "ok": True,
        "items": items,
        "count": len(items),
        "db": DB_NAME,
        "collection": COLLECTION,
    }


@router.get("/api/connectors/{connector_id}")
def get_connector(connector_id: str) -> dict[str, Any]:
    """Return a saved connector for editing. Secrets are never included."""
    try:
        doc = mongo_store.get_connector_document(connector_id, with_secrets=False)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not doc:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")
    return {"ok": True, "item": public_connector_item(doc)}


@router.put("/api/connectors/{connector_id}")
def update_connector(
    connector_id: str,
    request: Request,
    payload: dict[str, Any] = Body(...),
) -> dict[str, Any]:
    """Update a saved connector. Blank secret fields keep existing values."""
    if not payload:
        raise HTTPException(status_code=400, detail="Empty payload")
    user = resolve_user(request)
    try:
        updated = mongo_store.update_connector_document(connector_id, dict(payload))
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        mongo_store.log_connection_event(
            user,
            f"Connector updated — {DB_NAME}.{COLLECTION}",
            outcome="success",
            event="connection.updated",
            context={
                **mongo_store.connector_summary_context(updated),
                "connector_id": connector_id,
                "connection_status": updated.get("connection_status"),
                "db": DB_NAME,
                "collection": COLLECTION,
            },
        )
    except RuntimeError as exc:
        log.error("connection_logs write after connector update failed: %s", exc)

    return {
        "ok": True,
        "id": connector_id,
        "db": DB_NAME,
        "collection": COLLECTION,
        "connection_status": updated.get("connection_status"),
        "item": public_connector_item(updated),
    }


@router.delete("/api/connectors/{connector_id}")
def delete_connector(connector_id: str, request: Request) -> dict[str, Any]:
    """Delete a saved connector from connector_dtls."""
    user = resolve_user(request)
    summary: dict[str, Any] = {"connector_id": connector_id}
    try:
        existing = mongo_store.get_connector_document(connector_id, with_secrets=False)
        if existing:
            summary.update(mongo_store.connector_summary_context(existing))
        deleted = mongo_store.delete_connector_document(connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail=f"Connector not found: {connector_id}")

    try:
        mongo_store.log_connection_event(
            user,
            f"Connector deleted — {DB_NAME}.{COLLECTION}",
            outcome="success",
            event="connection.deleted",
            context={
                **summary,
                "db": DB_NAME,
                "collection": COLLECTION,
                "connection_status": "deleted",
            },
        )
    except RuntimeError as exc:
        log.error("connection_logs write after connector delete failed: %s", exc)

    return {"ok": True, "id": connector_id, "deleted": True}


@router.get("/api/connectors/{connector_id}/auth-ready")
def connector_auth_ready(connector_id: str) -> dict[str, Any]:
    """
    Server-side check that credentials can be decrypted for auth.
    Never returns secret values — only which fields are present.
    """
    try:
        creds = mongo_store.connector_credentials_for_auth(connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "ok": True,
        "id": connector_id,
        "credentials_configured": bool(creds),
        "credential_fields": sorted(creds.keys()),
    }


@router.get("/api/connectors/{connector_id}/runtime-env")
def connector_runtime_env(request: Request, connector_id: str) -> dict[str, Any]:
    """
    Resolve saved connector credentials into env vars / temp file contents
    for ETL script execution. Generated scripts call this at runtime using the
    selected connector id — secrets are not embedded in the script text.
    """
    from core.connector_runtime import runtime_env_for_connector

    user = resolve_user(request)
    try:
        payload = runtime_env_for_connector(connector_id)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    try:
        mongo_store.log_connection_event(
            user,
            "Connector runtime-env issued for ETL script",
            outcome="success",
            event="connection.runtime_env",
            context={
                "connector_id": connector_id,
                "cloud": payload.get("cloud"),
                "display_name": payload.get("display_name"),
                "auth_type": payload.get("auth_type"),
                "env_keys": sorted((payload.get("env") or {}).keys()),
                "file_keys": sorted((payload.get("files") or {}).keys()),
            },
        )
    except RuntimeError:
        pass
    return payload


@router.post("/api/connectors/upload")
async def save_connector_upload(
    file: UploadFile = File(...),
    metadata: str = Form(...),
) -> dict[str, Any]:
    try:
        meta = json.loads(metadata)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid metadata JSON.") from exc
    if not isinstance(meta, dict) or not meta:
        raise HTTPException(status_code=400, detail="Metadata must be a non-empty object.")

    original_name = file.filename or meta.get("file_name") or "upload"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {suffix or '(none)'}.",
        )

    ensure_upload_dir()
    stored_name = safe_stored_name(original_name)
    dest = UPLOAD_DIR / stored_name
    bytes_written = await write_upload_file(file, dest)

    doc = dict(meta)
    doc["mode"] = doc.get("mode") or "upload"
    doc["file_name"] = original_name
    doc["stored_file_name"] = stored_name
    doc["upload_relative_path"] = f"{UPLOAD_RELATIVE_ROOT}/{stored_name}"
    doc["file_size"] = bytes_written
    doc["file_type"] = file.content_type or doc.get("file_type") or ""

    result = insert_connector_doc(doc)
    result["upload_relative_path"] = doc["upload_relative_path"]
    result["stored_file_name"] = stored_name
    return result
