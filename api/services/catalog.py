"""Asset-catalog helpers shared by the assets and SQL routers."""
from __future__ import annotations

from typing import Any

from core import asset_catalog


def asset_matches_schema(asset: dict[str, Any], schema: str) -> bool:
    """Match UI schema selection against catalog rows (incl. Snowflake DB.SCHEMA)."""
    wanted = (schema or "").strip().lower()
    if not wanted:
        return False
    candidates = {
        str(asset.get("schema") or "").lower(),
        str(asset.get("snowflake_schema") or "").lower(),
        str(asset.get("database") or "").lower(),
    }
    db = str(asset.get("database") or "").strip()
    sf_schema = str(asset.get("snowflake_schema") or "").strip()
    if db and sf_schema:
        candidates.add(f"{db}.{sf_schema}".lower())
    crumb = str(asset.get("crumb") or "")
    if crumb.count(".") >= 1:
        # DATABASE.SCHEMA.TABLE → DATABASE.SCHEMA
        parts = crumb.split(".")
        if len(parts) >= 2:
            candidates.add(f"{parts[0]}.{parts[1]}".lower())
    return wanted in candidates


def catalog_table_items(
    catalog: dict[str, Any],
    schema: str,
    *,
    include_columns: bool = False,
) -> list[dict[str, Any]]:
    items: list[dict[str, Any]] = []
    for a in catalog.get("items") or []:
        if not asset_matches_schema(a, schema):
            continue
        if a.get("name") == "snowflake_catalog_error":
            continue
        if str(a.get("type") or "") in {"Schema", "API", "Scope", "File"}:
            continue
        row = {
            "name": a["name"],
            "type": a.get("type") or "Table",
            "connector_id": a.get("connector_id"),
            "connector_name": a.get("connector_name"),
            "platform": a.get("platform"),
            "structure_supported": a.get("structure_supported"),
            "crumb": a.get("crumb"),
            "database": a.get("database"),
            "schema": a.get("schema"),
        }
        if include_columns and a.get("columns") is not None:
            row["columns"] = a.get("columns")
        items.append(row)
    return items


def resolve_structure_connector(
    user: str,
    role: str | None,
    schema: str,
    table: str,
    connector_id: str | None,
) -> str:
    """Pick the connector that owns schema[.table] when Insights omits connector_id."""
    if connector_id and connector_id not in ("all",):
        return connector_id
    catalog = asset_catalog.build_catalog(user, role=role, connector_id="all")
    schema_assets = [
        a
        for a in catalog.get("items") or []
        if asset_matches_schema(a, schema) and a.get("connector_id")
    ]
    matches = schema_assets
    if (table or "").strip():
        table_l = (table or "").strip().lower()
        exact = [
            a for a in schema_assets if str(a.get("name") or "").lower() == table_l
        ]
        if exact:
            matches = exact
    if matches:
        # Prefer Snowflake/live structure when multiple connectors share a name.
        matches.sort(
            key=lambda a: (
                0 if str(a.get("platform") or "").lower() == "snowflake" else 1,
                0 if a.get("structure_supported") else 1,
            )
        )
        return str(matches[0]["connector_id"])
    # Postgres medallion / local schemas
    if "." not in (schema or ""):
        return asset_catalog.LOCAL_POSTGRES_ID
    raise ValueError(
        f"Could not resolve connector for {schema}"
        + (f".{table}" if table else "")
        + ". Select a connector in Insights or Assets first."
    )
