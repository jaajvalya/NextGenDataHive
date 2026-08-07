"""Validation for file-upload connectors."""
from __future__ import annotations

from typing import Any

from core.validators.base import ConnectionValidationError, norm


def validate_upload(payload: dict[str, Any]) -> dict[str, Any]:
    name = norm(payload.get("file_name"))
    if not name:
        raise ConnectionValidationError(
            "Upload file name is required.",
            platform="upload",
            error_type="validation",
        )
    return {
        "ok": True,
        "platform": "upload",
        "message": f"Upload ready for {name}",
        "details": {"file_name": name},
    }
