"""Shared Google OAuth token exchange."""
from __future__ import annotations

import json
from typing import Any


def google_oauth_post(form: dict[str, str]) -> dict[str, Any]:
    """POST to Google's OAuth token endpoint; returns JSON body or raises HTTPError."""
    import urllib.parse
    import urllib.request

    body = urllib.parse.urlencode(form).encode("utf-8")
    req = urllib.request.Request(
        "https://oauth2.googleapis.com/token",
        data=body,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read().decode("utf-8"))
