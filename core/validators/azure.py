"""Azure validation, delegated to Microsoft Graph."""
from __future__ import annotations

from typing import Any

from core.validators.msgraph import validate_ms_graph


def validate_azure(payload: dict[str, Any]) -> dict[str, Any]:
    return validate_ms_graph(payload, kind="azure")
