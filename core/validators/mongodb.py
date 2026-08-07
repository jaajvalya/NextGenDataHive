"""MongoDB credential validation."""
from __future__ import annotations

from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def validate_mongodb(payload: dict[str, Any]) -> dict[str, Any]:
    """Live-validate a MongoDB connection (on-prem / Atlas / self-hosted)."""
    try:
        from pymongo import MongoClient
        from pymongo.errors import PyMongoError
    except ImportError as exc:
        raise ConnectionValidationError(
            "pymongo is not installed. Run: pip install pymongo",
            platform="mongodb",
            error_type="dependency",
        ) from exc

    host = norm(payload.get("host") or payload.get("account_id"))
    port_raw = norm(payload.get("port") or "27017") or "27017"
    database = norm(payload.get("database")) or "admin"
    user = norm(payload.get("access_key_id") or payload.get("username") or payload.get("user"))
    password = norm(payload.get("secret_access_key") or payload.get("password"))
    uri = norm(payload.get("jdbc_url") or payload.get("connection_uri") or payload.get("mongodb_uri"))

    if uri:
        try:
            client = MongoClient(uri, serverSelectionTimeoutMS=8000)
            info = client.admin.command("ping")
            server = client.server_info()
            client.close()
            return {
                "ok": True,
                "platform": "mongodb",
                "message": "MongoDB connection successful",
                "details": {
                    "engine": "mongodb",
                    "via": "uri",
                    "version": str(server.get("version", ""))[:40],
                    "ping": info.get("ok"),
                },
            }
        except Exception as exc:
            raise ConnectionValidationError(
                f"MongoDB URI connection failed: {safe_error(exc)}",
                platform="mongodb",
                error_type="auth",
            ) from exc

    if not host:
        raise ConnectionValidationError(
            "Host / IP is required for MongoDB.",
            platform="mongodb",
            error_type="validation",
        )
    try:
        port = int(port_raw)
    except ValueError as exc:
        raise ConnectionValidationError(
            "Port must be a number.",
            platform="mongodb",
            error_type="validation",
        ) from exc

    kwargs: dict[str, Any] = {
        "host": host,
        "port": port,
        "serverSelectionTimeoutMS": 8000,
        "connectTimeoutMS": 8000,
    }
    if user:
        kwargs["username"] = user
        kwargs["password"] = password or ""
        kwargs["authSource"] = database

    try:
        client = MongoClient(**kwargs)
        info = client.admin.command("ping")
        server = client.server_info()
        # Touch the named database so authSource / privileges are exercised.
        _ = client[database].list_collection_names(max_time_ms=5000)
        client.close()
        return {
            "ok": True,
            "platform": "mongodb",
            "message": "MongoDB connection successful",
            "details": {
                "engine": "mongodb",
                "host": host,
                "port": port,
                "database": database,
                "version": str(server.get("version", ""))[:40],
                "ping": info.get("ok"),
            },
        }
    except PyMongoError as exc:
        raise ConnectionValidationError(
            f"MongoDB connection failed: {safe_error(exc)}",
            platform="mongodb",
            error_type="auth",
        ) from exc
    except Exception as exc:
        raise ConnectionValidationError(
            f"MongoDB connection failed: {safe_error(exc)}",
            platform="mongodb",
            error_type="auth",
        ) from exc
