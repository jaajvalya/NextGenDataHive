"""Validation for the built-in DataHive PostgreSQL connection."""
from __future__ import annotations

from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def validate_postgres(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        import psycopg
    except ImportError as exc:
        raise ConnectionValidationError(
            "psycopg is not installed on the API server.",
            platform="postgres",
            error_type="dependency",
        ) from exc

    # Prefer explicit form fields; fall back to local DataHive Postgres settings.
    host = norm(payload.get("host") or payload.get("account_id"))
    port = norm(payload.get("port") or "5432") or "5432"
    dbname = norm(payload.get("database") or payload.get("dataset_scope")) or "postgres"
    user = norm(payload.get("access_key_id") or payload.get("username") or payload.get("user"))
    password = norm(payload.get("secret_access_key") or payload.get("password"))

    if not host:
        try:
            from core import postgres_store

            postgres_store.ping_postgres()
            return {
                "ok": True,
                "platform": "postgres",
                "message": "Local Postgres connection successful",
                "details": {"host": postgres_store.redacted_postgres_host()},
            }
        except Exception as exc:
            raise ConnectionValidationError(
                f"Postgres connection failed: {safe_error(exc)}",
                platform="postgres",
                error_type="auth",
            ) from exc

    if not user:
        raise ConnectionValidationError(
            "Postgres username is required.",
            platform="postgres",
            error_type="validation",
        )

    try:
        with psycopg.connect(
            host=host,
            port=int(port) if str(port).isdigit() else 5432,
            dbname=dbname.split(",")[0].strip() or "postgres",
            user=user,
            password=password or None,
            connect_timeout=10,
        ) as conn, conn.cursor() as cur:
            cur.execute("SELECT version()")
            version = cur.fetchone()[0]
        return {
            "ok": True,
            "platform": "postgres",
            "message": "Postgres connection successful",
            "details": {"host": host, "database": dbname, "version": str(version)[:120]},
        }
    except Exception as exc:
        raise ConnectionValidationError(
            f"Postgres authentication failed: {safe_error(exc)}",
            platform="postgres",
            error_type="auth",
        ) from exc
