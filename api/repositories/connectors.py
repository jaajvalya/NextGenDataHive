"""Data access for the saved-connector collection."""
from __future__ import annotations

import logging
from typing import Any

from fastapi import HTTPException

from api.settings import COLLECTION, DB_NAME
from core import mongo_store

log = logging.getLogger("datahive.connectors")


def get_collection():
    return mongo_store.connectors_collection()


RECENT_CONNECTOR_FIELDS = (
    "cloud",
    "connector_type",
    "display_name",
    "mode",
    "region",
    "account_id",
    "auth_type",
    "dataset_scope",
    "apis",
    "tenant_id",
    "resource_group",
    "access_key_id",
    "client_id",
    "role_arn",
    "host",
    "port",
    "database",
    "engine",
    "file_name",
    "upload_format",
    "upload_notes",
    "connection_status",
    "credentials_encrypted",
    "credentials_keys",
    "user",
    "saved_at",
    "updated_at",
)


def public_connector_item(doc: dict[str, Any]) -> dict[str, Any]:
    """Return a client-safe connector document (never includes secret values)."""
    item = dict(doc)
    if "_id" in item and "id" not in item:
        item["id"] = str(item.pop("_id"))
    elif "_id" in item:
        item.pop("_id", None)
    for key in (
        "api_key",
        "client_secret",
        "refresh_token",
        "secret_access_key",
        "service_account_json",
        "password",
        "private_key",
        "jdbc_url",
        "credentials_ciphertext",
    ):
        item.pop(key, None)
    return item


def fetch_connectors(*, limit: int | None = None) -> list[dict[str, Any]]:
    """Return saved connectors (newest first). limit=None returns all."""
    projection = dict.fromkeys(RECENT_CONNECTOR_FIELDS, 1)
    projection["_id"] = 1
    cursor = get_collection().find({}, projection).sort(
        [("updated_at", -1), ("saved_at", -1), ("_id", -1)]
    )
    if limit is not None:
        cursor = cursor.limit(min(max(int(limit), 1), 500))
    return [public_connector_item(doc) for doc in cursor]


def fetch_recent_connectors(limit: int) -> list[dict[str, Any]]:
    return fetch_connectors(limit=limit)


def insert_connector_doc(doc: dict[str, Any]) -> dict[str, Any]:
    payload = dict(doc)
    payload.setdefault("connection_status", "connected")
    try:
        inserted_id = mongo_store.insert_connector_document(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    log_ok = True
    log_detail: str | None = None
    try:
        mongo_store.log_connection_event(
            str(payload.get("user") or "unknown"),
            f"Connection established — saved to {DB_NAME}.{COLLECTION}",
            outcome="success",
            event="connection.established",
            context={
                **mongo_store.connector_summary_context(payload),
                "connector_id": inserted_id,
                "connection_status": payload.get("connection_status"),
                "db": DB_NAME,
                "collection": COLLECTION,
            },
        )
    except RuntimeError as exc:
        log_ok = False
        log_detail = str(exc)
        log.error("connection_logs write after connector save failed: %s", exc)
    return {
        "ok": True,
        "id": inserted_id,
        "db": DB_NAME,
        "collection": COLLECTION,
        "connection_status": payload.get("connection_status"),
        "connection_log": log_ok,
        "connection_log_error": log_detail,
    }
