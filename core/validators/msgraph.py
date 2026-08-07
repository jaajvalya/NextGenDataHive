"""Microsoft Graph validation for SharePoint and OneDrive."""
from __future__ import annotations

import json
from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error


def validate_ms_graph(payload: dict[str, Any], *, kind: str) -> dict[str, Any]:
    tenant = norm(payload.get("tenant_id"))
    client_id = norm(payload.get("client_id"))
    client_secret = norm(payload.get("client_secret"))
    auth_type = norm(payload.get("auth_type")).lower()

    if kind == "azure" and not tenant:
        raise ConnectionValidationError(
            "Azure tenant ID is required.",
            platform=kind,
            error_type="validation",
        )
    if not tenant:
        # SharePoint / OneDrive often still need tenant for app auth.
        tenant = "common"

    if auth_type in {"oauth2", "service_principal", ""} or kind == "azure":
        if not client_id or not client_secret:
            raise ConnectionValidationError(
                "Client ID and client secret are required.",
                platform=kind,
                error_type="validation",
            )
    else:
        raise ConnectionValidationError(
            f"Unsupported {kind} auth type '{auth_type}'.",
            platform=kind,
            error_type="validation",
        )

    token_url = f"https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token"
    scope = (
        "https://graph.microsoft.com/.default"
        if kind in {"sharepoint", "onedrive"}
        else "https://management.azure.com/.default"
    )
    body = (
        f"client_id={client_id}"
        f"&client_secret={client_secret}"
        f"&scope={scope}"
        f"&grant_type=client_credentials"
    ).encode()

    try:
        import urllib.error
        import urllib.request

        req = urllib.request.Request(
            token_url,
            data=body,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read().decode("utf-8")
        data = json.loads(raw)
        if not data.get("access_token"):
            raise ConnectionValidationError(
                f"{kind} token response did not include an access token.",
                platform=kind,
                error_type="auth",
            )
        return {
            "ok": True,
            "platform": kind,
            "message": f"{kind} credentials validated (token acquired)",
            "details": {
                "tenant_id": tenant,
                "token_type": data.get("token_type"),
                "expires_in": data.get("expires_in"),
                "auth_type": auth_type or "service_principal",
            },
        }
    except ConnectionValidationError:
        raise
    except Exception as exc:
        detail = safe_error(exc)
        if hasattr(exc, "read"):
            try:
                detail = safe_error(exc.read().decode("utf-8"))
            except Exception:
                pass
        raise ConnectionValidationError(
            f"{kind} authentication failed: {detail}",
            platform=kind,
            error_type="auth",
        ) from exc
