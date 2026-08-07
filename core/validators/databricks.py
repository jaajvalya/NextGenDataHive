"""Databricks workspace validation over the REST API."""
from __future__ import annotations

import json
import re
from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def _normalize_databricks_host(account_id: str) -> str:
    host = norm(account_id).rstrip("/")
    if not host:
        raise ConnectionValidationError(
            "Databricks workspace URL is required.",
            platform="databricks",
            error_type="validation",
        )
    if not re.match(r"^https?://", host, flags=re.I):
        host = "https://" + host
    if not re.match(r"^https://[A-Za-z0-9._:-]+", host):
        raise ConnectionValidationError(
            "Databricks workspace URL looks invalid. "
            "Example: https://dbc-xxxxxxxx-xxxx.cloud.databricks.com",
            platform="databricks",
            error_type="validation",
        )
    return host


def _databricks_http_json(
    url: str,
    *,
    method: str = "GET",
    headers: dict[str, str] | None = None,
    data: bytes | None = None,
) -> dict[str, Any]:
    import urllib.error
    import urllib.request

    req = urllib.request.Request(
        url,
        data=data,
        headers=headers or {},
        method=method,
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
        return json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        body = ""
        try:
            body = exc.read().decode("utf-8", errors="ignore")
        except Exception:
            body = ""
        detail = body.strip() or safe_error(exc)
        if exc.code in {401, 403}:
            raise ConnectionValidationError(
                f"Databricks authentication failed ({exc.code}): {detail}",
                platform="databricks",
                error_type="auth",
            ) from exc
        raise ConnectionValidationError(
            f"Databricks API error ({exc.code}): {detail}",
            platform="databricks",
            error_type="api",
        ) from exc
    except urllib.error.URLError as exc:
        raise ConnectionValidationError(
            f"Could not reach Databricks workspace: {safe_error(exc.reason if hasattr(exc, 'reason') else exc)}",
            platform="databricks",
            error_type="network",
        ) from exc


def validate_databricks(payload: dict[str, Any]) -> dict[str, Any]:
    host = _normalize_databricks_host(
        norm(payload.get("account_id") or payload.get("base_url") or payload.get("workspace_url"))
    )
    auth_type = norm(payload.get("auth_type")).lower() or "api_key"
    token = ""

    if auth_type in {"api_key", "pat", "token", "personal_access_token"}:
        token = norm(payload.get("api_key") or payload.get("token") or payload.get("access_token"))
        if not token:
            raise ConnectionValidationError(
                "Databricks personal access token is required.",
                platform="databricks",
                error_type="validation",
            )
    elif auth_type in {"oauth2", "service_principal"}:
        client_id = norm(payload.get("client_id"))
        client_secret = norm(payload.get("client_secret"))
        if not client_id or not client_secret:
            raise ConnectionValidationError(
                "Databricks service principal Client ID and Client secret are required.",
                platform="databricks",
                error_type="validation",
            )
        token_url = f"{host}/oidc/v1/token"
        body = (
            f"grant_type=client_credentials"
            f"&client_id={client_id}"
            f"&client_secret={client_secret}"
            f"&scope=all-apis"
        ).encode()
        token_data = _databricks_http_json(
            token_url,
            method="POST",
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=body,
        )
        token = norm(token_data.get("access_token"))
        if not token:
            raise ConnectionValidationError(
                "Databricks OAuth token response did not include an access token.",
                platform="databricks",
                error_type="auth",
            )
    else:
        raise ConnectionValidationError(
            f"Unsupported Databricks auth type '{auth_type}'.",
            platform="databricks",
            error_type="validation",
        )

    # Lightweight authenticated probe — current user via SCIM.
    me = _databricks_http_json(
        f"{host}/api/2.0/preview/scim/v2/Me",
        headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/scim+json, application/json",
        },
    )
    display = norm(me.get("displayName") or me.get("userName") or me.get("id")) or "authenticated"
    return {
        "ok": True,
        "platform": "databricks",
        "message": f"Databricks credentials validated ({display})",
        "details": {
            "workspace_url": host,
            "auth_type": auth_type,
            "user": display,
            "region": norm(payload.get("region")),
        },
    }
