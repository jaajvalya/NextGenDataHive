"""Connection-failure auditing into the Mongo connection log."""
from __future__ import annotations

import logging
from typing import Any

from api.settings import CONNECTION_LOG_PATH_PREFIXES
from core import mongo_store

log = logging.getLogger("datahive.audit")


def log_connection_failure(
    user: str,
    message: str,
    *,
    event: str = "connection.error",
    error_type: str | None = "server",
    context: dict[str, Any] | None = None,
    http_status: int | None = None,
) -> None:
    try:
        mongo_store.log_connection_event(
            user,
            message,
            outcome="failure",
            event=event,
            error_type=error_type,
            context=context,
            http_status=http_status,
        )
    except RuntimeError as exc:
        log.error("connection_logs write failed: %s", exc)


def should_log_connection_path(path: str) -> bool:
    return any(path == p or path.startswith(p + "/") for p in CONNECTION_LOG_PATH_PREFIXES)
