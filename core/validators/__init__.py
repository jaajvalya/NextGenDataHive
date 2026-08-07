"""Live connection validation for DataHive connector credentials.

Called before persisting a connector so invalid credentials fail fast.
Each source family lives in its own module; this module only routes to them
and never logs secret values.
"""
from __future__ import annotations

from typing import Any

from core.validators.aws import validate_aws
from core.validators.azure import validate_azure
from core.validators.base import ConnectionValidationError, norm
from core.validators.databricks import validate_databricks
from core.validators.gcp import validate_gcp
from core.validators.gdrive import validate_google_drive
from core.validators.mongodb import validate_mongodb
from core.validators.msgraph import validate_ms_graph
from core.validators.postgres import validate_postgres
from core.validators.rdbms import validate_rdbms
from core.validators.snowflake import validate_snowflake
from core.validators.upload import validate_upload

__all__ = ["ConnectionValidationError", "validate_connector"]


def _platform(payload: dict[str, Any]) -> str:
    raw = norm(payload.get("cloud") or payload.get("connector_type") or payload.get("platform"))
    return raw.lower()


def validate_connector(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Attempt a real handshake with the target system.
    Returns a small success dict, or raises ConnectionValidationError / ValueError.
    """
    if not isinstance(payload, dict) or not payload:
        raise ValueError("Empty connector payload.")

    platform = _platform(payload)
    mode = norm(payload.get("mode")).lower()
    if mode == "upload" or platform in {"upload", "manualupload"}:
        return validate_upload(payload)

    if platform in {"snowflake"}:
        return validate_snowflake(payload)
    if platform in {"databricks", "dbx"}:
        return validate_databricks(payload)
    if platform in {"sqlserver", "mssql"}:
        merged = dict(payload)
        merged["engine"] = "sqlserver"
        return validate_rdbms(merged)
    if platform in {"mongodb", "mongo"}:
        return validate_mongodb(payload)
    if platform in {"postgres", "postgresql", "pg", "local-postgres"}:
        # Dedicated PostgreSQL connector (host/port/db) vs local DataHive Postgres fallback.
        if norm(payload.get("host") or payload.get("account_id")) or norm(payload.get("database")):
            merged = dict(payload)
            merged["engine"] = "postgresql"
            return validate_rdbms(merged)
        return validate_postgres(payload)
    if platform in {"rdbms", "onprem", "on-prem", "database"}:
        return validate_rdbms(payload)
    if platform in {"aws", "amazonwebservices"}:
        return validate_aws(payload)
    if platform in {"gcp", "googlecloud"}:
        return validate_gcp(payload)
    if platform in {"azure", "microsoftazure"}:
        return validate_azure(payload)
    if platform in {"sharepoint", "microsoftsharepoint"}:
        return validate_ms_graph(payload, kind="sharepoint")
    if platform in {"googledrive"}:
        return validate_google_drive(payload)
    if platform in {"onedrive", "microsoftonedrive"}:
        return validate_ms_graph(payload, kind="onedrive")

    raise ConnectionValidationError(
        f"Live validation is not configured for connector type '{platform or 'unknown'}'.",
        platform=platform or "unknown",
        error_type="unsupported",
    )
