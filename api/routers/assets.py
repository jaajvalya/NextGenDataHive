"""Asset browsing: catalog, search, schemas, tables and column structure."""
from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException, Request

from api.security import resolve_role, resolve_user
from api.services.catalog import catalog_table_items, resolve_structure_connector
from core import asset_catalog, postgres_store

router = APIRouter(tags=["assets"])


@router.get("/api/assets/connectors")
def assets_connectors(request: Request) -> dict[str, Any]:
    """Connectors the current user may browse (privilege-aware)."""
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        items = asset_catalog.list_accessible_connectors(user, role)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Connector list failed: {exc}") from exc
    return {
        "ok": True,
        "user": user,
        "admin": asset_catalog.user_is_admin(user, role),
        "count": len(items),
        "items": items,
    }


@router.get("/api/assets/catalog")
def assets_catalog(
    request: Request,
    connector_id: str | None = None,
) -> dict[str, Any]:
    """Unified assets across accessible connectors, optionally filtered to one."""
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        return asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id or "all"
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset catalog failed: {exc}") from exc


@router.get("/api/assets/relevant")
def assets_relevant(
    request: Request,
    tab: str = "recently_verified",
    type: str | None = None,
    connector_id: str | None = None,
) -> dict[str, Any]:
    if tab not in ("recently_verified", "my_drafts"):
        raise HTTPException(status_code=422, detail="invalid tab")
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        if connector_id and connector_id not in ("all", asset_catalog.LOCAL_POSTGRES_ID):
            catalog = asset_catalog.build_catalog(
                user, role=role, connector_id=connector_id
            )
            items = catalog["items"]
            if type:
                items = [i for i in items if str(i.get("type") or "").lower() == type.lower()]
            return {
                "tab": tab,
                "items": items[:50],
                "counts": catalog.get("counts") or {},
                "connector_id": connector_id,
            }
        return postgres_store.relevant_assets(user, tab, type)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Assets relevant failed: {exc}") from exc


@router.get("/api/assets/search")
def assets_search(
    request: Request,
    q: str = "",
    limit: int = 10,
    offset: int = 0,
    connector_id: str | None = None,
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    query = (q or "").strip().lower()
    capped = min(max(limit, 1), 50)
    try:
        catalog = asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id or "all"
        )
        items = catalog["items"]
        if query:
            items = [
                i
                for i in items
                if query in str(i.get("name") or "").lower()
                or query in str(i.get("schema") or "").lower()
                or query in str(i.get("crumb") or "").lower()
                or query in str(i.get("connector_name") or "").lower()
                or query in str(i.get("platform") or "").lower()
            ]
        page = items[offset : offset + capped]
        # Also include classic Postgres hits when browsing all / local postgres.
        if (not connector_id or connector_id in ("all", asset_catalog.LOCAL_POSTGRES_ID)) and query:
            try:
                pg = postgres_store.search_assets(user, q, limit=capped, offset=0)
                for hit in pg.get("items") or []:
                    hit = dict(hit)
                    hit.setdefault("connector_id", asset_catalog.LOCAL_POSTGRES_ID)
                    hit.setdefault("connector_name", "Local Postgres")
                    hit.setdefault("platform", "postgres")
                    page.append(hit)
            except Exception:
                pass
        # de-dupe by crumb+connector
        seen: set[str] = set()
        unique: list[dict[str, Any]] = []
        for hit in page:
            key = f"{hit.get('connector_id')}|{hit.get('crumb') or hit.get('name')}"
            if key in seen:
                continue
            seen.add(key)
            unique.append(hit)
        return {
            "q": q,
            "count": len(unique),
            "items": unique[:capped],
            "connector_id": connector_id or "all",
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset search failed: {exc}") from exc


@router.get("/api/assets/discover")
def assets_discover(
    request: Request,
    limit: int = 100,
    connector_id: str | None = None,
) -> dict[str, Any]:
    capped = min(max(limit, 1), 500)
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        catalog = asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id or "all"
        )
        return {
            "items": catalog["items"][:capped],
            "counts": catalog.get("counts") or {},
            "schemas": catalog.get("schemas") or [],
            "connectors": catalog.get("connectors") or [],
            "connector_id": catalog.get("selected_connector_id"),
            "asset_count": catalog.get("asset_count"),
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset discover failed: {exc}") from exc


@router.get("/api/assets/schemas")
def assets_schemas(
    request: Request,
    connector_id: str | None = None,
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        if not connector_id or connector_id == "all":
            catalog = asset_catalog.build_catalog(user, role=role, connector_id="all")
            return {
                "items": catalog.get("schemas") or [],
                "configured_schemas": list(postgres_store.asset_schemas()),
                "counts": catalog.get("counts") or {},
                "connectors": catalog.get("connectors") or [],
                "connector_count": catalog.get("connector_count"),
                "asset_count": catalog.get("asset_count"),
                "selected_connector_id": "all",
            }
        if connector_id == asset_catalog.LOCAL_POSTGRES_ID:
            return {
                "items": postgres_store.list_schemas(),
                "configured_schemas": list(postgres_store.asset_schemas()),
                "counts": postgres_store.catalog_counts(),
                "selected_connector_id": connector_id,
            }
        catalog = asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id
        )
        return {
            "items": catalog.get("schemas") or [],
            "configured_schemas": [],
            "counts": catalog.get("counts") or {},
            "selected_connector_id": connector_id,
            "asset_count": catalog.get("asset_count"),
        }
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset schemas failed: {exc}") from exc


@router.get("/api/assets/counts")
def assets_counts(
    request: Request,
    connector_id: str | None = None,
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        catalog = asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id or "all"
        )
        return {
            "counts": catalog.get("counts") or {},
            "connector_count": catalog.get("connector_count"),
            "asset_count": catalog.get("asset_count"),
            "selected_connector_id": catalog.get("selected_connector_id"),
        }
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset counts failed: {exc}") from exc


@router.get("/api/assets/tables")
def assets_tables(
    request: Request,
    schema: str,
    connector_id: str | None = None,
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        # Explicit Local Postgres only.
        if connector_id == asset_catalog.LOCAL_POSTGRES_ID:
            items = postgres_store.list_tables(schema)
            return {
                "schema": schema,
                "count": len(items),
                "items": items,
                "connector_id": asset_catalog.LOCAL_POSTGRES_ID,
                "platform": "postgres",
                "structure_supported": True,
            }

        # Default / all: unified catalog (Postgres + Snowflake + …).
        # Do NOT force Snowflake DB.SCHEMA labels through postgres_store.
        if not connector_id or connector_id == "all":
            catalog = asset_catalog.build_catalog(user, role=role, connector_id="all")
            items = catalog_table_items(catalog, schema)
            if items:
                platforms = sorted(
                    {str(i.get("platform") or "") for i in items if i.get("platform")}
                )
                return {
                    "schema": schema,
                    "count": len(items),
                    "items": items,
                    "connector_id": "all",
                    "platforms": platforms,
                    "structure_supported": any(i.get("structure_supported") for i in items),
                }
            # Fallback: pure Postgres schema not yet in annotated catalog.
            if "." not in (schema or ""):
                try:
                    items = postgres_store.list_tables(schema)
                    return {
                        "schema": schema,
                        "count": len(items),
                        "items": items,
                        "connector_id": asset_catalog.LOCAL_POSTGRES_ID,
                        "platform": "postgres",
                        "structure_supported": True,
                    }
                except ValueError:
                    pass
            return {
                "schema": schema,
                "count": 0,
                "items": [],
                "connector_id": "all",
                "structure_supported": False,
                "note": f"No tables found for schema '{schema}' across connectors.",
            }

        catalog = asset_catalog.build_catalog(
            user, role=role, connector_id=connector_id
        )
        items = catalog_table_items(catalog, schema, include_columns=True)
        note = None
        if not items:
            platform = None
            for c in catalog.get("connectors") or []:
                if c.get("id") == connector_id:
                    platform = c.get("platform") or c.get("cloud")
                    break
            if str(platform or "").lower() == "snowflake":
                note = (
                    f"No tables or views found in Snowflake schema '{schema}'. "
                    "The schema exists, but it is empty for this role."
                )
        return {
            "schema": schema,
            "count": len(items),
            "items": items,
            "connector_id": connector_id,
            "structure_supported": any(i.get("structure_supported") for i in items),
            "note": note,
        }
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset tables failed: {exc}") from exc


@router.get("/api/assets/structure")
def assets_structure(
    request: Request,
    schema: str,
    table: str,
    connector_id: str | None = None,
) -> dict[str, Any]:
    user = resolve_user(request)
    role = resolve_role(request)
    try:
        resolved_id = resolve_structure_connector(
            user, role, schema, table, connector_id
        )
        if resolved_id == asset_catalog.LOCAL_POSTGRES_ID:
            structure = postgres_store.table_structure(schema, table)
            structure["connector_id"] = asset_catalog.LOCAL_POSTGRES_ID
            structure["connector_name"] = "Local Postgres"
            structure["platform"] = "postgres"
            return structure
        return asset_catalog.connector_structure(
            user,
            role=role,
            connector_id=resolved_id,
            schema=schema,
            table=table,
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Asset structure failed: {exc}") from exc
