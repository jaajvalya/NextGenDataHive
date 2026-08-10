"""Summarise a result set in prose.

Only this step sends actual data to the model, and only a capped sample of it.
Set DATAHIVE_AI_SEND_RESULTS=false to skip it entirely; callers then show the
table on its own.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from .errors import AIProviderError
from .provider import LLMProvider

_log = logging.getLogger("datahive.ai.answer")

MAX_SAMPLE_ROWS = 50
MAX_SAMPLE_COLUMNS = 20

_SYSTEM_PROMPT = """You explain a query result to the person who asked the question.

Output ONLY the final answer as plain prose. Do not show planning, goals,
constraints, checklists, outlines, or bullet scratchpads.

  - Lead with the direct answer, in one or two sentences.
  - Quote concrete numbers and names from the rows.
  - The rows may be a truncated sample; say so if the answer depends on the full set.
  - Never invent a figure that is not in the rows.
  - Describe only the rows you were given. If there are fewer than the question
    implies, say how many came back instead of padding the list with placeholders.
  - Plain prose. No markdown tables, no code blocks, no preamble.
"""


def sample_rows(result: dict[str, Any]) -> dict[str, Any]:
    """Cap what leaves the machine: a few rows, a few columns."""
    columns = list(result.get("columns") or [])[:MAX_SAMPLE_COLUMNS]
    width = len(columns)
    rows = [list(row)[:width] for row in (result.get("rows") or [])[:MAX_SAMPLE_ROWS]]
    return {
        "columns": columns,
        "rows": rows,
        "row_count": result.get("row_count"),
        "sampled": len(rows) < len(result.get("rows") or []),
        "column_count": len(result.get("columns") or []),
    }


def summarize(
    question: str,
    sql: str,
    result: dict[str, Any],
    *,
    provider: LLMProvider,
) -> str:
    """Written answer for a result set. Returns "" if the model is unavailable."""
    from .provider import strip_model_scratchpad

    rows = result.get("rows") or []
    if not rows:
        return "The query ran successfully but returned no rows."

    sample = sample_rows(result)
    payload = {
        "question": question,
        "sql": sql,
        "columns": sample["columns"],
        "rows": sample["rows"],
        "total_rows_returned": sample["row_count"],
        "rows_shown_to_you": len(sample["rows"]),
        "truncated_by_row_cap": bool(result.get("truncated")),
    }

    try:
        text = provider.complete(
            [
                {"role": "system", "content": _SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        "Write only the final prose answer for this result. "
                        "No planning steps.\n"
                        + json.dumps(payload, default=str)
                    ),
                },
            ],
            temperature=0.2,
        ).strip()
        return strip_model_scratchpad(text)
    except AIProviderError as exc:
        # The rows are already in hand; a missing summary should not fail the request.
        _log.warning("answer synthesis failed: %s", exc)
        return ""
