"""Caller identity, taken from request headers set by the UI."""
from __future__ import annotations

from fastapi import Request


def resolve_user(request: Request | None, explicit: str | None = None) -> str:
    if explicit and explicit.strip():
        return explicit.strip()
    if request is not None:
        header_user = request.headers.get("X-DataHive-User")
        if header_user and header_user.strip():
            return header_user.strip()
        state_user = getattr(request.state, "user", None)
        if isinstance(state_user, str) and state_user.strip():
            return state_user.strip()
    return "unknown"


def resolve_role(request: Request | None) -> str | None:
    if request is None:
        return None
    role = request.headers.get("X-DataHive-Role")
    return role.strip() if role and role.strip() else None
