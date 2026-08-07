"""Business glossary template, uploads and term listings."""
from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse

from api.files import count_glossary_terms, ensure_glossary_dir, safe_stored_name, write_upload_file
from api.security import resolve_user
from api.settings import (
    ALLOWED_GLOSSARY_SUFFIXES,
    ASSET_GLOSSARY_COLLECTION,
    DB_NAME,
    GLOSSARY_DIR,
    GLOSSARY_RELATIVE_ROOT,
    GLOSSARY_TEMPLATE_PATH,
    GLOSSARY_UPLOAD_LOG_COLLECTION,
    MAX_GLOSSARY_BYTES,
)
from core import glossary_store, mongo_store

router = APIRouter(tags=["glossary"])


@router.get("/api/glossary/template")
def download_glossary_template() -> FileResponse:
    if not GLOSSARY_TEMPLATE_PATH.is_file():
        raise HTTPException(
            status_code=404,
            detail="glossary_template.xlsx was not found on the server.",
        )
    return FileResponse(
        path=str(GLOSSARY_TEMPLATE_PATH),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename="glossary_template.xlsx",
    )


@router.get("/api/glossary/recent")
def recent_glossaries(limit: int = 20) -> dict[str, Any]:
    try:
        items = mongo_store.recent_glossary_documents(limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "ok": True,
        "items": items,
        "db": DB_NAME,
        "collection": GLOSSARY_UPLOAD_LOG_COLLECTION,
    }


@router.get("/api/glossary/terms")
def recent_glossary_terms(limit: int = 50) -> dict[str, Any]:
    """Unified asset glossary terms across AWS / Azure / GCP / Snowflake / Postgres."""
    try:
        items = mongo_store.recent_asset_glossary_terms(limit)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "ok": True,
        "items": items,
        "db": DB_NAME,
        "collection": ASSET_GLOSSARY_COLLECTION,
    }


@router.post("/api/glossary/upload")
async def upload_glossary(
    request: Request,
    file: UploadFile = File(...),
    notes: str = Form(""),
) -> dict[str, Any]:
    original_name = file.filename or "glossary.xlsx"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_GLOSSARY_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Use .xlsx, .xls, or .csv.",
        )

    ensure_glossary_dir()
    stored_name = safe_stored_name(original_name)
    dest = GLOSSARY_DIR / stored_name
    bytes_written = await write_upload_file(file, dest)
    if bytes_written > MAX_GLOSSARY_BYTES:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=413, detail="Glossary file exceeds 10 MB limit.")

    term_count = count_glossary_terms(dest)
    try:
        apply_result = glossary_store.apply_glossary_file(dest)
    except Exception as exc:
        dest.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Could not apply glossary to Assets metadata: {exc}",
        ) from exc

    user = resolve_user(request)
    apply_summary = {
        "updated": apply_result.get("updated", 0),
        "registry_updated": apply_result.get("registry_updated", 0),
        "source_synced": apply_result.get("source_synced", 0),
        "skipped": apply_result.get("skipped", 0),
        "failed": apply_result.get("failed", 0),
        "rows_total": apply_result.get("rows_total", 0),
        "platforms": apply_result.get("platforms") or [],
        "errors": apply_result.get("errors") or [],
        "collection": apply_result.get("collection") or ASSET_GLOSSARY_COLLECTION,
    }
    doc = {
        "event": "glossary.upload",
        "outcome": "success" if apply_summary["failed"] == 0 else "partial",
        "file_name": original_name,
        "stored_file_name": stored_name,
        "upload_relative_path": f"{GLOSSARY_RELATIVE_ROOT}/{stored_name}",
        "file_size": bytes_written,
        "file_type": file.content_type or "",
        "notes": (notes or "").strip(),
        "term_count": term_count if term_count is not None else apply_result.get("rows_total"),
        "user": user,
        "kind": "glossary",
        "apply": apply_summary,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
    try:
        inserted_id = mongo_store.insert_glossary_upload_log(doc)
    except RuntimeError as exc:
        # File + comments may already be applied; keep the file and report Mongo issue.
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return {
        "ok": True,
        "id": inserted_id,
        "db": DB_NAME,
        "collection": GLOSSARY_UPLOAD_LOG_COLLECTION,
        "asset_glossary_collection": ASSET_GLOSSARY_COLLECTION,
        "file_name": original_name,
        "stored_file_name": stored_name,
        "upload_relative_path": doc["upload_relative_path"],
        "file_size": bytes_written,
        "term_count": doc["term_count"],
        "apply": doc["apply"],
        "updates": apply_result.get("updates") or [],
    }


@router.get("/api/glossary/files/{stored_name}")
def download_glossary_upload(stored_name: str) -> FileResponse:
    safe = Path(stored_name).name
    path = GLOSSARY_DIR / safe
    if not path.is_file():
        raise HTTPException(status_code=404, detail="Glossary file not found.")
    return FileResponse(
        path=str(path),
        filename=safe.split("_", 1)[-1] if "_" in safe else safe,
        media_type="application/octet-stream",
    )
