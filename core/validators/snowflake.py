"""Snowflake credential validation (password and key-pair auth)."""
from __future__ import annotations

import re
from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def _parse_snowflake_account(account_id: str, region: str) -> str:
    """Same normalization as core.snowflake_catalog._parse_account."""
    from core.snowflake_catalog import _parse_account

    return _parse_account(account_id, region)

def _load_private_key_bytes(pem: str, passphrase: str | None) -> bytes:
    from cryptography.hazmat.backends import default_backend
    from cryptography.hazmat.primitives import serialization

    password = passphrase.encode("utf-8") if passphrase else None
    key = serialization.load_pem_private_key(
        pem.encode("utf-8"),
        password=password,
        backend=default_backend(),
    )
    return key.private_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )


def validate_snowflake(payload: dict[str, Any]) -> dict[str, Any]:
    try:
        import snowflake.connector as sf
    except ImportError as exc:
        raise ConnectionValidationError(
            "Snowflake driver is not installed on the API server. "
            "Run: pip install snowflake-connector-python",
            platform="snowflake",
            error_type="dependency",
        ) from exc

    account_id = norm(payload.get("account_id"))
    region = norm(payload.get("region"))
    auth_type = norm(payload.get("auth_type")).lower() or "password"
    user = norm(payload.get("access_key_id") or payload.get("username") or payload.get("user"))
    password = norm(payload.get("secret_access_key") or payload.get("password"))
    private_key_pem = norm(payload.get("service_account_json") or payload.get("private_key"))
    client_id = norm(payload.get("client_id"))
    client_secret = norm(payload.get("client_secret"))
    scope = norm(payload.get("dataset_scope"))

    if not account_id:
        raise ConnectionValidationError(
            "Snowflake account identifier is required.",
            platform="snowflake",
            error_type="validation",
        )
    if not user and auth_type != "oauth2":
        raise ConnectionValidationError(
            "Snowflake username is required.",
            platform="snowflake",
            error_type="validation",
        )

    account = _parse_snowflake_account(account_id, region)
    connect_kwargs: dict[str, Any] = {
        "account": account,
        "user": user or None,
        "login_timeout": 60,
        "network_timeout": 60,
        "client_session_keep_alive": False,
    }

    # Optional warehouse/database/role from scope: WAREHOUSE=...;DATABASE=...;ROLE=...
    # or DATABASE.SCHEMA pattern.
    for part in re.split(r"[;\n,]", scope):
        part = part.strip()
        if not part:
            continue
        if "=" in part:
            key, _, val = part.partition("=")
            key_u = key.strip().upper()
            val = val.strip()
            if key_u in {"WAREHOUSE", "WH"} and val:
                connect_kwargs["warehouse"] = val
            elif key_u in {"DATABASE", "DB"} and val:
                connect_kwargs["database"] = val
            elif key_u == "SCHEMA" and val:
                connect_kwargs["schema"] = val
            elif key_u == "ROLE" and val:
                connect_kwargs["role"] = val
        elif part.count(".") == 1 and "warehouse" not in connect_kwargs:
            db, _, sch = part.partition(".")
            if db:
                connect_kwargs["database"] = db
            if sch:
                connect_kwargs["schema"] = sch
        elif part.upper().startswith("@") is False and "database" not in connect_kwargs:
            connect_kwargs.setdefault("database", part)

    if auth_type in {"password", "access_keys"}:
        if not password:
            raise ConnectionValidationError(
                "Snowflake password is required.",
                platform="snowflake",
                error_type="validation",
            )
        connect_kwargs["password"] = password
    elif auth_type == "key_pair":
        if not private_key_pem:
            raise ConnectionValidationError(
                "Snowflake private key (PEM) is required for key-pair auth.",
                platform="snowflake",
                error_type="validation",
            )
        try:
            connect_kwargs["private_key"] = _load_private_key_bytes(
                private_key_pem, password or None
            )
        except Exception as exc:
            raise ConnectionValidationError(
                f"Invalid Snowflake private key: {safe_error(exc)}",
                platform="snowflake",
                error_type="validation",
            ) from exc
    elif auth_type == "oauth2":
        if not client_id or not client_secret:
            raise ConnectionValidationError(
                "Snowflake OAuth client ID and secret are required.",
                platform="snowflake",
                error_type="validation",
            )
        # Password grant / token exchange is tenant-specific; require an access token
        # when provided in api_key, otherwise fail with guidance.
        token = norm(payload.get("api_key") or payload.get("access_token"))
        if not token:
            raise ConnectionValidationError(
                "Snowflake OAuth validation needs an access token (paste into API key) "
                "or use username/password or key-pair auth.",
                platform="snowflake",
                error_type="validation",
            )
        connect_kwargs.pop("user", None)
        connect_kwargs["authenticator"] = "oauth"
        connect_kwargs["token"] = token
    else:
        raise ConnectionValidationError(
            f"Unsupported Snowflake auth type '{auth_type}'.",
            platform="snowflake",
            error_type="validation",
        )

    conn = None
    try:
        conn = sf.connect(**{k: v for k, v in connect_kwargs.items() if v is not None})
        with conn.cursor() as cur:
            cur.execute("SELECT CURRENT_VERSION(), CURRENT_ACCOUNT(), CURRENT_USER()")
            row = cur.fetchone() or ("", "", "")
        return {
            "ok": True,
            "platform": "snowflake",
            "message": "Snowflake connection successful",
            "details": {
                "account": account,
                "user": user or None,
                "auth_type": auth_type,
                "snowflake_version": row[0],
                "current_account": row[1],
                "current_user": row[2],
                "database": connect_kwargs.get("database"),
                "warehouse": connect_kwargs.get("warehouse"),
            },
        }
    except ConnectionValidationError:
        raise
    except Exception as exc:
        raise ConnectionValidationError(
            f"Snowflake authentication failed: {safe_error(exc)}",
            platform="snowflake",
            error_type="auth",
        ) from exc
    finally:
        if conn is not None:
            try:
                conn.close()
            except Exception:
                pass
