"""Google Drive validation."""
from __future__ import annotations

import json
from typing import Any

from core.validators.base import ConnectionValidationError, norm, safe_error
from core.validators.google import google_oauth_post


def validate_google_drive(payload: dict[str, Any]) -> dict[str, Any]:
    auth_type = norm(payload.get("auth_type")).lower() or "oauth2"
    if auth_type == "service_account":
        # Reuse GCP SA token path with Drive scope.
        sa_raw = norm(payload.get("service_account_json"))
        if not sa_raw:
            raise ConnectionValidationError(
                "Google Drive service account JSON is required.",
                platform="googledrive",
                error_type="validation",
            )
        try:
            info = json.loads(sa_raw)
            from google.auth.transport.requests import Request
            from google.oauth2 import service_account

            creds = service_account.Credentials.from_service_account_info(
                info,
                scopes=["https://www.googleapis.com/auth/drive.metadata.readonly"],
            )
            creds.refresh(Request())
            return {
                "ok": True,
                "platform": "googledrive",
                "message": "Google Drive service account token acquired",
                "details": {"client_email": info.get("client_email")},
            }
        except ImportError as exc:
            raise ConnectionValidationError(
                "google-auth is not installed on the API server. Run: pip install google-auth",
                platform="googledrive",
                error_type="dependency",
            ) from exc
        except Exception as exc:
            raise ConnectionValidationError(
                f"Google Drive authentication failed: {safe_error(exc)}",
                platform="googledrive",
                error_type="auth",
            ) from exc

    client_id = norm(payload.get("client_id"))
    client_secret = norm(payload.get("client_secret"))
    if not client_id or not client_secret:
        raise ConnectionValidationError(
            "Google Drive OAuth client ID and secret are required.",
            platform="googledrive",
            error_type="validation",
        )
    refresh = norm(payload.get("refresh_token") or payload.get("api_key"))
    if not refresh:
        raise ConnectionValidationError(
            "Google Drive OAuth needs a refresh token to validate live, "
            "or use service account auth.",
            platform="googledrive",
            error_type="validation",
        )
    try:
        data = google_oauth_post(
            {
                "client_id": client_id,
                "client_secret": client_secret,
                "refresh_token": refresh,
                "grant_type": "refresh_token",
            }
        )
        if not data.get("access_token"):
            raise ConnectionValidationError(
                "Google Drive token refresh did not return an access token.",
                platform="googledrive",
                error_type="auth",
            )
        return {
            "ok": True,
            "platform": "googledrive",
            "message": "Google Drive OAuth refresh succeeded",
            "details": {"token_type": data.get("token_type")},
        }
    except ConnectionValidationError:
        raise
    except Exception as exc:
        raise ConnectionValidationError(
            f"Google Drive authentication failed: {safe_error(exc)}",
            platform="googledrive",
            error_type="auth",
        ) from exc
