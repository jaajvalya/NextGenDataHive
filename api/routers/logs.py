"""Client-reported connection failures."""
from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from api.schemas import ConnectionLogIn
from api.security import resolve_user
from core import mongo_store

router = APIRouter(tags=["logs"])


@router.post("/api/connection-logs")
def create_connection_log(body: ConnectionLogIn, request: Request) -> dict[str, bool]:
    try:
        mongo_store.log_connection_event(
            resolve_user(request, body.user),
            body.message,
            outcome=body.outcome,  # validated success|failure
            event=body.event,
            error_type=body.error_type,
            context=body.context,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {"ok": True}
