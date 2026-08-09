"""Pins the HTTP surface.

The API was split from one module into nine routers; a router that fails to
be registered would leave the UI silently 404-ing, so the full expected route
set is asserted here. Building the app opens no database connections.
"""
from __future__ import annotations

import pytest

from api.main import app

EXPECTED_ROUTES = {
    ("GET", "/health"),
    ("GET", "/"),
    ("GET", "/main.html"),
    # connectors
    ("GET", "/api/connectors"),
    ("POST", "/api/connectors"),
    ("POST", "/api/connectors/test"),
    ("GET", "/api/connectors/recent"),
    ("POST", "/api/connectors/upload"),
    ("GET", "/api/connectors/{connector_id}"),
    ("PUT", "/api/connectors/{connector_id}"),
    ("DELETE", "/api/connectors/{connector_id}"),
    ("GET", "/api/connectors/{connector_id}/auth-ready"),
    ("GET", "/api/connectors/{connector_id}/runtime-env"),
    # assets
    ("GET", "/api/assets/connectors"),
    ("GET", "/api/assets/catalog"),
    ("GET", "/api/assets/relevant"),
    ("GET", "/api/assets/search"),
    ("GET", "/api/assets/discover"),
    ("GET", "/api/assets/schemas"),
    ("GET", "/api/assets/counts"),
    ("GET", "/api/assets/tables"),
    ("GET", "/api/assets/structure"),
    # ask (natural-language querying)
    ("GET", "/api/ask/health"),
    ("POST", "/api/ask"),
    ("POST", "/api/ask/sql"),
    # sql / quality / logs
    ("POST", "/api/sql/query"),
    ("POST", "/api/data-quality/run"),
    ("GET", "/api/data-quality/logic"),
    ("POST", "/api/connection-logs"),
    # snowflake
    ("GET", "/api/snowflake/{connector_id}/stages"),
    ("GET", "/api/snowflake/{connector_id}/stages/{stage_fqn:path}/files"),
    ("POST", "/api/snowflake/{connector_id}/stages/ensure-raw"),
    # glossary / etl
    ("GET", "/api/glossary/template"),
    ("GET", "/api/glossary/recent"),
    ("GET", "/api/glossary/terms"),
    ("POST", "/api/glossary/upload"),
    ("GET", "/api/glossary/files/{stored_name}"),
    ("POST", "/api/etl/upload"),
}


def _registered() -> set[tuple[str, str]]:
    found = set()
    for route in app.routes:
        for method in getattr(route, "methods", None) or ():
            if method in {"GET", "POST", "PUT", "DELETE"}:
                found.add((method, route.path))
    return found


@pytest.mark.parametrize("method,path", sorted(EXPECTED_ROUTES))
def test_route_is_registered(method, path):
    assert (method, path) in _registered()


def test_no_catch_all_route_can_shadow_the_api():
    """A bare /{filename} route once served UI assets from the code directory.

    Static mounts replaced it; if it ever returns it would also swallow
    unmatched API paths.
    """
    assert all(not path.startswith("/{") for _, path in _registered())


def test_static_mounts_are_scoped_to_public_directories():
    mounts = {route.path for route in app.routes if route.__class__.__name__ == "Mount"}
    assert mounts == {"/css", "/js", "/images"}
