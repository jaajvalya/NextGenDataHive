"""Natural-language querying over the connector catalog.

Pipeline (see api/routers/ask.py):
    context  → catalog + glossary condensed into a schema card
    planner  → pick one connector and the candidate tables, then fetch columns
    nl2sql   → dialect-aware SQL generation
    guard    → read-only / row-cap / table-exists validation
    answer   → summarise the result rows in prose
"""
from __future__ import annotations

from .provider import AINotConfigured, AIProviderError, AISettings, load_settings

__all__ = [
    "AINotConfigured",
    "AIProviderError",
    "AISettings",
    "load_settings",
]
