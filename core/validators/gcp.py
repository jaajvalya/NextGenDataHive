"""Google Cloud validation: service account and OAuth client flows."""
from __future__ import annotations

import json
from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error
from core.validators.google import google_oauth_post


def _validate_gcp_oauth(payload: dict[str, Any], *, project: str) -> dict[str, Any]:
    """Validate GCP OAuth client credentials (optional refresh token for live token)."""
    import urllib.error

    client_id = norm(payload.get("client_id"))
    client_secret = norm(payload.get("client_secret"))
    if not client_id or not client_secret:
        raise ConnectionValidationError(
            "GCP OAuth client ID and secret are required.",
            platform="gcp",
            error_type="validation",
        )

    refresh = norm(payload.get("refresh_token") or payload.get("api_key"))
    if refresh:
        try:
            data = google_oauth_post(
                {
                    "client_id": client_id,
                    "client_secret": client_secret,
                    "refresh_token": refresh,
                    "grant_type": "refresh_token",
                }
            )
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                err_body = json.loads(raw)
            except json.JSONDecodeError:
                err_body = {}
            detail = err_body.get("error_description") or err_body.get("error") or raw
            raise ConnectionValidationError(
                f"GCP OAuth refresh failed: {safe_error(Exception(detail))}",
                platform="gcp",
                error_type="auth",
            ) from exc
        except Exception as exc:
            raise ConnectionValidationError(
                f"GCP OAuth validation failed: {safe_error(exc)}",
                platform="gcp",
                error_type="auth",
            ) from exc

        if not data.get("access_token"):
            raise ConnectionValidationError(
                "GCP OAuth token refresh did not return an access token.",
                platform="gcp",
                error_type="auth",
            )
        return {
            "ok": True,
            "platform": "gcp",
            "message": "GCP OAuth refresh succeeded",
            "details": {
                "project": project,
                "auth_type": "oauth2",
                "token_type": data.get("token_type"),
            },
        }

    # Client ID + secret alone cannot finish a user consent flow. Probe Google's
    # token endpoint with a dummy authorization code: invalid_client means the
    # pair is wrong; invalid_grant / redirect_uri_mismatch means the client was
    # accepted.
    try:
        google_oauth_post(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "code": "datahive_validation_probe",
                "grant_type": "authorization_code",
                "redirect_uri": "http://localhost",
            }
        )
        # Extremely unlikely with a dummy code — treat as success if it somehow works.
        return {
            "ok": True,
            "platform": "gcp",
            "message": "GCP OAuth client accepted",
            "details": {"project": project, "auth_type": "oauth2"},
        }
    except urllib.error.HTTPError as exc:
        raw = exc.read().decode("utf-8", errors="replace")
        try:
            err_body = json.loads(raw)
        except json.JSONDecodeError:
            err_body = {}
        err = norm(err_body.get("error")).lower()
        if err == "invalid_client":
            raise ConnectionValidationError(
                "GCP OAuth client ID or secret is invalid.",
                platform="gcp",
                error_type="auth",
            ) from exc
        if err in {"invalid_grant", "redirect_uri_mismatch", "invalid_request", "unauthorized_client"}:
            return {
                "ok": True,
                "platform": "gcp",
                "message": "GCP OAuth client ID and secret accepted",
                "details": {
                    "project": project,
                    "auth_type": "oauth2",
                    "probe": err,
                },
            }
        detail = err_body.get("error_description") or err_body.get("error") or raw
        raise ConnectionValidationError(
            f"GCP OAuth validation failed: {safe_error(Exception(detail))}",
            platform="gcp",
            error_type="auth",
        ) from exc
    except ConnectionValidationError:
        raise
    except Exception as exc:
        raise ConnectionValidationError(
            f"GCP OAuth validation failed: {safe_error(exc)}",
            platform="gcp",
            error_type="auth",
        ) from exc


def validate_gcp(payload: dict[str, Any]) -> dict[str, Any]:
    auth_type = norm(payload.get("auth_type")).lower() or "service_account"
    project = norm(payload.get("account_id"))
    if not project:
        raise ConnectionValidationError(
            "GCP project ID is required.",
            platform="gcp",
            error_type="validation",
        )

    if auth_type == "api_key":
        api_key = norm(payload.get("api_key"))
        if not api_key:
            raise ConnectionValidationError(
                "GCP API key is required.",
                platform="gcp",
                error_type="validation",
            )
        # Lightweight live check against a public discovery endpoint.
        try:
            import urllib.error
            import urllib.request

            url = (
                "https://www.googleapis.com/discovery/v1/apis/bigquery/v2/rest"
                f"?key={api_key}"
            )
            with urllib.request.urlopen(url, timeout=15) as resp:
                if resp.status >= 400:
                    raise ConnectionValidationError(
                        f"GCP API key rejected (HTTP {resp.status}).",
                        platform="gcp",
                        error_type="auth",
                    )
            return {
                "ok": True,
                "platform": "gcp",
                "message": "GCP API key accepted",
                "details": {"project": project, "auth_type": "api_key"},
            }
        except ConnectionValidationError:
            raise
        except Exception as exc:
            raise ConnectionValidationError(
                f"GCP API key validation failed: {safe_error(exc)}",
                platform="gcp",
                error_type="auth",
            ) from exc

    if auth_type == "oauth2":
        return _validate_gcp_oauth(payload, project=project)

    sa_raw = norm(payload.get("service_account_json"))
    if not sa_raw:
        raise ConnectionValidationError(
            "GCP service account JSON is required.",
            platform="gcp",
            error_type="validation",
        )
    try:
        info = json.loads(sa_raw)
    except json.JSONDecodeError as exc:
        raise ConnectionValidationError(
            "Service account JSON is not valid JSON.",
            platform="gcp",
            error_type="validation",
        ) from exc

    try:
        from google.auth.transport.requests import Request
        from google.oauth2 import service_account
    except ImportError as exc:
        raise ConnectionValidationError(
            "google-auth is not installed on the API server. Run: pip install google-auth",
            platform="gcp",
            error_type="dependency",
        ) from exc

    try:
        creds = service_account.Credentials.from_service_account_info(
            info,
            scopes=["https://www.googleapis.com/auth/cloud-platform.read-only"],
        )
        creds.refresh(Request())
        return {
            "ok": True,
            "platform": "gcp",
            "message": "GCP service account token acquired",
            "details": {
                "project": project,
                "client_email": info.get("client_email"),
                "auth_type": "service_account",
                "token_valid": bool(creds.token),
            },
        }
    except Exception as exc:
        raise ConnectionValidationError(
            f"GCP authentication failed: {safe_error(exc)}",
            platform="gcp",
            error_type="auth",
        ) from exc
