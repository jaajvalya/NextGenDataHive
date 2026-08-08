"""Natural-language querying over the connector catalog.

Pipeline (see api/routers/ask.py):
    context  → catalog + glossary condensed into a schema card
    planner  → pick one connector and the candidate tables, then fetch columns
    nl2sql   → dialect-aware SQL generation
    guard    → read-only / row-cap / table-exists validation
    answer   → summarise the result rows in prose
"""
from __future__ import annotations

from .errors import (
    AINotConfigured,
    AIProviderError,
    AskError,
    GenerationError,
    PlanningError,
    UnsafeQueryError,
)
from .provider import AISettings, get_provider, load_settings, provider_status

__all__ = [
    "AINotConfigured",
    "AIProviderError",
    "AISettings",
    "AskError",
    "GenerationError",
    "PlanningError",
    "UnsafeQueryError",
    "get_provider",
    "load_settings",
    "provider_status",
]
