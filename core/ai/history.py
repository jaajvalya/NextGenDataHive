"""Format prior Ask turns so follow-up questions keep table and filter context."""
from __future__ import annotations

import re
from typing import Any

# Short chip-style refinements that are meaningless without the prior question.
_SHORT_FOLLOWUP = re.compile(
    r"(?is)^\s*("
    r"(chart|graph|plot)(\s+(that|it|this|these|those))?|"
    r"(show\s+only\s+)?(the\s+)?top\s+\d+|"
    r"filter\s+to(\s+the)?\s+last\s+\d+\s+days|"
    r"break\s+(that|it)\s+down(\s+by\s+.+)?"
    r")\s*\.?\s*$"
)


def _turn_field(turn: Any, name: str) -> Any:
    if hasattr(turn, name):
        return getattr(turn, name)
    if isinstance(turn, dict):
        return turn.get(name)
    return None


def prior_questions(history: list[Any] | None) -> list[str]:
    out: list[str] = []
    for turn in history or []:
        question = str(_turn_field(turn, "question") or "").strip()
        if question:
            out.append(question)
    return out


def is_short_followup(question: str) -> bool:
    return bool(_SHORT_FOLLOWUP.match(question or ""))


_REFINEMENT_CLAUSE = re.compile(
    r"(?is)\b("
    r"filter to the last \d+ days|"
    r"show only the top \d+|"
    r"chart the result|"
    r"break it down by\b"
    r")"
)


def is_followup_refinement(question: str, history: list[Any] | None) -> bool:
    """True for chip follow-ups, including client/server expanded forms."""
    q = (question or "").strip()
    if not q:
        return False
    if is_short_followup(q):
        return True
    if not history:
        return False
    if _REFINEMENT_CLAUSE.search(q):
        return True
    priors = prior_questions(history)
    if not priors:
        return False
    base = _strip_trail(priors[-1]).lower()
    lowered = q.lower()
    return bool(base and base in lowered and len(lowered) > len(base) + 3)


def _strip_trail(text: str) -> str:
    return re.sub(r"[.?!\s]+$", "", (text or "").strip())


def expand_followup(question: str, history: list[Any] | None) -> str:
    """Rewrite chip-style follow-ups into a full question using prior intent.

    Longer follow-ups are left unchanged — only short chip text is expanded.
    """
    q = (question or "").strip()
    priors = prior_questions(history)
    if not priors or not q or not is_short_followup(q):
        return q
    base = _strip_trail(priors[-1])

    chart = re.match(r"(?is)^\s*(chart|graph|plot)\b", q)
    if chart:
        return f"{base}. Chart the result."

    top = re.search(r"(?i)\btop\s+(\d+)\b", q)
    if top:
        return f"{base}. Show only the top {top.group(1)}."

    days = re.search(r"(?i)\blast\s+(\d+)\s+days\b", q)
    if days:
        return f"{base}. Filter to the last {days.group(1)} days."

    by = re.match(r"(?is)^\s*break\s+(?:that|it)\s+down\s+by\s+(.+?)\s*$", q)
    if by:
        return f"{base}. Break it down by {by.group(1).strip()}."

    return f"{base}. {q}"


def effective_question(question: str, history: list[Any] | None) -> str:
    """Combine the latest follow-up with the prior user intent for ranking/prompts."""
    q = (question or "").strip()
    priors = prior_questions(history)
    if not priors:
        return q
    expanded = expand_followup(q, history)
    if expanded and expanded != q:
        return expanded
    base = priors[-1]
    if not q:
        return base
    if q.lower() == base.lower():
        return q
    return f"{base}\n\nFollow-up request: {q}"


def render_history(history: list[Any] | None, *, max_turns: int = 6) -> str:
    """Compact prior Q/SQL blocks for planner and NL2SQL prompts."""
    if not history:
        return ""
    turns = list(history)[-max_turns:]
    lines = [
        "## Prior conversation",
        "The latest user message is a follow-up refinement of the prior turns.",
        "It is answerable even if it is short (e.g. \"top 10\", \"by region\",",
        "\"chart that\"). Reuse the same connector, tables, joins, and filters",
        "unless the user clearly changes topic.",
        "",
    ]
    for i, turn in enumerate(turns, start=1):
        question = str(_turn_field(turn, "question") or "").strip()
        sql = str(_turn_field(turn, "sql") or "").strip()
        answer = str(_turn_field(turn, "answer") or "").strip()
        sources = _turn_field(turn, "sources") or []
        if not question:
            continue
        lines.append(f"### Turn {i}")
        lines.append(f"Q: {question}")
        if sources:
            if not isinstance(sources, list):
                sources = [sources]
            names = [str(s).strip() for s in sources if str(s).strip()]
            if names:
                lines.append("Tables: " + ", ".join(names))
        if sql:
            # Keep prompts bounded — full SQL is useful, huge scripts are not.
            clipped = sql if len(sql) <= 1200 else sql[:1200] + "\n-- …truncated"
            lines.append("SQL:")
            lines.append(clipped)
        if answer:
            clipped_a = answer if len(answer) <= 400 else answer[:400] + "…"
            lines.append(f"Answer: {clipped_a}")
        lines.append("")
    return "\n".join(lines).strip()
