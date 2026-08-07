"""Shared error type and text helpers for the connector validators."""
from __future__ import annotations

import re
from typing import Any


class ConnectionValidationError(Exception):
    """Raised when credentials cannot authenticate to the target system."""

    def __init__(self, message: str, *, platform: str = "", error_type: str = "auth"):
        super().__init__(message)
        self.platform = platform
        self.error_type = error_type


def norm(value: Any) -> str:
    return str(value or "").strip()


def safe_error(exc: BaseException, *, fallback: str = "Connection failed") -> str:
    text = str(exc).strip() or fallback
    # Collapse multi-line driver dumps; keep first actionable sentence.
    text = re.sub(r"\s+", " ", text)
    if len(text) > 420:
        text = text[:417] + "..."
    return text
