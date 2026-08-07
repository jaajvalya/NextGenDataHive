"""Liveness and dependency-status endpoint."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from api.repositories.connectors import fetch_recent_connectors, get_collection
from api.settings import (
    ASSET_GLOSSARY_COLLECTION,
    COLLECTION,
    CONNECTION_LOGS_COLLECTION,
    DB_NAME,
    GLOSSARY_UPLOAD_LOG_COLLECTION,
    MONGO_URI,
    QUERY_LOGS_COLLECTION,
)
from core import postgres_store

router = APIRouter(tags=["health"])


def _redacted_mongo_uri(uri: str) -> str:
    if "://" not in uri or "@" not in uri:
        return uri
    scheme, rest = uri.split("://", 1)
    _, host_part = rest.rsplit("@", 1)
    return f"{scheme}://***@{host_part}"


@router.get("/health")
def health(recent: int = 0) -> dict[str, Any]:
    try:
        get_collection()
        payload: dict[str, Any] = {
            "ok": True,
            "mongo": _redacted_mongo_uri(MONGO_URI),
            "db": DB_NAME,
            "collection": COLLECTION,
            "connection_logs_collection": CONNECTION_LOGS_COLLECTION,
            "query_logs_collection": QUERY_LOGS_COLLECTION,
            "glossary_upload_log_collection": GLOSSARY_UPLOAD_LOG_COLLECTION,
            "asset_glossary_collection": ASSET_GLOSSARY_COLLECTION,
            "sql_query_api": True,
            "query_log_api": True,
            "credentials_encrypted": True,
        }
        try:
            postgres_store.ping_postgres()
            payload["postgres"] = postgres_store.redacted_postgres_host()
            payload["postgres_ok"] = True
            kw = postgres_store.postgres_dsn_kwargs()
            payload["postgres_target"] = (
                f"{kw['user']}@{kw['host']}:{kw['port']}/{kw['dbname']}"
            )
            try:
                payload["asset_counts"] = postgres_store.catalog_counts()
                payload["asset_schemas"] = list(postgres_store.asset_schemas())
            except Exception as count_exc:
                payload["asset_counts_error"] = str(count_exc)
        except Exception as pg_exc:
            payload["postgres_ok"] = False
            payload["postgres_error"] = str(pg_exc)
        if recent > 0:
            try:
                payload["recent_connectors"] = fetch_recent_connectors(recent)
            except Exception as recent_exc:
                payload["recent_connectors"] = []
                payload["recent_connectors_error"] = str(recent_exc)
        return payload
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"MongoDB unavailable: {exc}") from exc
