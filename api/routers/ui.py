"""Serves the single-page UI.

The HTML is served over HTTP rather than opened as a file:// path, because
browsers block fetch to localhost from file:// and every screen would fail
with "Failed to fetch". CSS, JS and images are mounted as static
directories in the app factory.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from api.settings import WEB_DIR

router = APIRouter(include_in_schema=False)


@router.get("/")
def serve_ui_index() -> FileResponse:
    path = WEB_DIR / "main.html"
    if not path.is_file():
        raise HTTPException(status_code=404, detail="UI not found.")
    return FileResponse(path, media_type="text/html")


@router.get("/main.html")
def serve_ui_main() -> FileResponse:
    return serve_ui_index()
