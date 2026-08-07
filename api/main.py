"""Application factory: middleware, error handling, routers and static mounts.

Run from the repository root:
    python -m api
or:
    uvicorn api.main:app --reload
"""
from __future__ import annotations

import json
import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from api import settings
from api.audit import log_connection_failure, should_log_connection_path
from api.routers import (
    assets,
    connectors,
    data_quality,
    etl,
    glossary,
    health,
    logs,
    snowflake,
    sql,
    ui,
)
from api.security import resolve_user

log = logging.getLogger("datahive.api")

# UI routes are registered last so the more specific API paths win.
API_ROUTERS = (
    health.router,
    connectors.router,
    assets.router,
    sql.router,
    data_quality.router,
    snowflake.router,
    glossary.router,
    etl.router,
    logs.router,
)


def create_app() -> FastAPI:
    app = FastAPI(title="DataHive API")

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def attach_request_user(request: Request, call_next):
        request.state.user = request.headers.get("X-DataHive-User") or "unknown"
        return await call_next(request)

    @app.exception_handler(HTTPException)
    async def connection_http_exception_handler(request: Request, exc: HTTPException):
        detail = exc.detail
        message = detail if isinstance(detail, str) else json.dumps(detail)
        if should_log_connection_path(request.url.path):
            log_connection_failure(
                resolve_user(request),
                message,
                event="connection.http_error",
                error_type="server",
                http_status=exc.status_code,
                context={
                    "path": request.url.path,
                    "method": request.method,
                },
            )
        return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})

    @app.exception_handler(Exception)
    async def connection_unhandled_exception_handler(request: Request, exc: Exception):
        if should_log_connection_path(request.url.path):
            log_connection_failure(
                resolve_user(request),
                str(exc),
                event="connection.unhandled_error",
                error_type="server",
                http_status=500,
                context={
                    "path": request.url.path,
                    "method": request.method,
                    "exception_type": type(exc).__name__,
                },
            )
        return JSONResponse(status_code=500, content={"detail": "Internal server error."})

    for router in API_ROUTERS:
        app.include_router(router)
    app.include_router(ui.router)

    _mount_static(app)
    return app


def _mount_static(app: FastAPI) -> None:
    """Mount only directories that hold public assets.

    Nothing outside web/ is reachable, so Python source and .env cannot be
    served even if a path slips through.
    """
    for url, directory in (
        ("/css", settings.WEB_DIR / "css"),
        ("/js", settings.WEB_DIR / "js"),
        ("/images", settings.IMAGES_DIR),
    ):
        if directory.is_dir():
            app.mount(url, StaticFiles(directory=str(directory)), name=url.strip("/"))
        else:
            log.warning("static directory missing, not mounted: %s", directory)


app = create_app()
