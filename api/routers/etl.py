"""Local file uploads used as ETL pipeline sources."""
from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from api.files import ensure_upload_dir, safe_stored_name, write_upload_file
from api.settings import ALLOWED_UPLOAD_SUFFIXES, UPLOAD_DIR, UPLOAD_RELATIVE_ROOT

router = APIRouter(tags=["etl"])


@router.post("/api/etl/upload")
async def upload_etl_local_file(
    file: UploadFile = File(...),
) -> dict[str, Any]:
    """Store a local file for ETL/ELT source (no connector document required)."""
    original_name = file.filename or "upload"
    suffix = Path(original_name).suffix.lower()
    if suffix not in ALLOWED_UPLOAD_SUFFIXES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type {suffix or '(none)'}. Use CSV, Excel, JSON, or Parquet.",
        )

    ensure_upload_dir()
    stored_name = safe_stored_name(original_name)
    dest = UPLOAD_DIR / stored_name
    bytes_written = await write_upload_file(file, dest)
    rel = f"{UPLOAD_RELATIVE_ROOT}/{stored_name}"
    return {
        "ok": True,
        "file_name": original_name,
        "stored_file_name": stored_name,
        "upload_relative_path": rel,
        "source_object": rel,
        "absolute_path": str(dest.resolve()),
        "file_size": bytes_written,
        "ext": suffix.lstrip("."),
        "file_type": file.content_type or "",
    }
