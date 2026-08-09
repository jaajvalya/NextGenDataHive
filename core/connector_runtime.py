"""Build runtime credential material from a saved connector_dtls document.

Used by ETL/ELT generated scripts via GET /api/connectors/{id}/runtime-env.
Secrets are returned only for local script execution against the DataHive API —
they are never included in the browser-generated script text itself.
"""
from __future__ import annotations

from typing import Any
from urllib.parse import quote_plus

from core import mongo_store
from core.snowflake_catalog import connect_kwargs_from_doc, parse_scope_options
from core.validators.base import norm


def _cloud(doc: dict[str, Any]) -> str:
    return norm(doc.get("cloud") or doc.get("connector_type")).lower()


def runtime_env_for_doc(doc: dict[str, Any]) -> dict[str, Any]:
    """Return env vars + optional credential file contents for a connector doc."""
    cloud = _cloud(doc)
    auth_type = norm(doc.get("auth_type")).lower()
    env: dict[str, str] = {}
    files: dict[str, str] = {}
    meta: dict[str, Any] = {
        "cloud": cloud,
        "auth_type": auth_type or None,
        "account_id": norm(doc.get("account_id")) or None,
        "region": norm(doc.get("region")) or None,
        "display_name": norm(doc.get("display_name")) or None,
    }

    if cloud in {"gcp", "googlecloud", "bigquery", "gcs"}:
        _runtime_gcp(doc, env=env, files=files, meta=meta)
    elif cloud == "aws":
        _runtime_aws(doc, env=env, meta=meta)
    elif cloud == "azure":
        _runtime_azure(doc, env=env, files=files, meta=meta)
    elif cloud == "snowflake":
        _runtime_snowflake(doc, env=env, files=files, meta=meta)
    elif cloud in {"postgres", "postgresql", "sqlserver", "mssql", "mysql"}:
        _runtime_rdbms(doc, cloud=cloud, env=env, meta=meta)
    else:
        raise ValueError(
            f"Runtime credentials are not implemented for connector type '{cloud or 'unknown'}'."
        )

    return {
        "ok": True,
        "id": str(doc.get("id") or ""),
        "cloud": cloud,
        "display_name": meta.get("display_name"),
        "auth_type": meta.get("auth_type"),
        "meta": meta,
        "env": env,
        "files": files,
    }


def runtime_env_for_connector(connector_id: str) -> dict[str, Any]:
    doc = mongo_store.get_connector_document(connector_id, with_secrets=True)
    if not doc:
        raise LookupError(f"Connector not found: {connector_id}")
    payload = runtime_env_for_doc(doc)
    payload["id"] = connector_id
    return payload


def _runtime_gcp(
    doc: dict[str, Any],
    *,
    env: dict[str, str],
    files: dict[str, str],
    meta: dict[str, Any],
) -> None:
    project = norm(doc.get("account_id"))
    if project:
        env["GOOGLE_CLOUD_PROJECT"] = project
        env["GCP_PROJECT"] = project
        env["GCLOUD_PROJECT"] = project
    auth_type = norm(doc.get("auth_type")).lower() or "service_account"
    sa_json = norm(doc.get("service_account_json"))
    if auth_type in {"service_account", "service_account_json", ""} and sa_json:
        files["GOOGLE_APPLICATION_CREDENTIALS"] = sa_json
        meta["credential_mode"] = "service_account_file"
        return
    client_id = norm(doc.get("client_id"))
    client_secret = norm(doc.get("client_secret"))
    refresh = norm(doc.get("refresh_token") or doc.get("api_key"))
    if client_id:
        env["GOOGLE_CLIENT_ID"] = client_id
    if client_secret:
        env["GOOGLE_CLIENT_SECRET"] = client_secret
    if refresh:
        env["GOOGLE_REFRESH_TOKEN"] = refresh
        meta["credential_mode"] = "oauth_refresh"
        return
    if not project and not sa_json:
        raise ValueError("GCP connector has no project id or service account JSON.")
    meta["credential_mode"] = "adc_fallback"


def _runtime_aws(doc: dict[str, Any], *, env: dict[str, str], meta: dict[str, Any]) -> None:
    region = norm(doc.get("region")) or "us-east-1"
    env["AWS_DEFAULT_REGION"] = region
    env["AWS_REGION"] = region
    access_key = norm(doc.get("access_key_id"))
    secret_key = norm(doc.get("secret_access_key"))
    role_arn = norm(doc.get("role_arn"))
    auth_type = norm(doc.get("auth_type")).lower() or "access_keys"
    if access_key:
        env["AWS_ACCESS_KEY_ID"] = access_key
    if secret_key:
        env["AWS_SECRET_ACCESS_KEY"] = secret_key
    if role_arn:
        env["AWS_ROLE_ARN"] = role_arn
        env["AWS_ROLE_SESSION_NAME"] = "datahive-etl"
    if auth_type in {"access_keys"} and (not access_key or not secret_key):
        raise ValueError("AWS connector is missing access key id / secret access key.")
    if auth_type in {"iam_role", "assume_role"} and not role_arn:
        raise ValueError("AWS connector is missing IAM role ARN.")
    meta["credential_mode"] = auth_type
    account = norm(doc.get("account_id"))
    if account:
        meta["account_id"] = account


def _runtime_azure(
    doc: dict[str, Any],
    *,
    env: dict[str, str],
    files: dict[str, str],
    meta: dict[str, Any],
) -> None:
    tenant = norm(doc.get("tenant_id"))
    client_id = norm(doc.get("client_id"))
    client_secret = norm(doc.get("client_secret"))
    if not tenant or not client_id or not client_secret:
        raise ValueError("Azure connector requires tenant_id, client_id, and client_secret.")
    env["AZURE_TENANT_ID"] = tenant
    env["AZURE_CLIENT_ID"] = client_id
    env["AZURE_CLIENT_SECRET"] = client_secret
    sub = norm(doc.get("account_id"))
    if sub:
        env["AZURE_SUBSCRIPTION_ID"] = sub
    rg = norm(doc.get("resource_group"))
    if rg:
        env["AZURE_RESOURCE_GROUP"] = rg
    cert_json = norm(doc.get("service_account_json"))
    if cert_json:
        files["AZURE_CLIENT_CERTIFICATE_PATH"] = cert_json
    meta["credential_mode"] = "service_principal"


def _runtime_snowflake(
    doc: dict[str, Any],
    *,
    env: dict[str, str],
    files: dict[str, str],
    meta: dict[str, Any],
) -> None:
    # Validate shape via the same helper used by live Snowflake APIs.
    kwargs = connect_kwargs_from_doc(doc)
    env["SNOWFLAKE_ACCOUNT"] = str(kwargs["account"])
    if kwargs.get("user"):
        env["SNOWFLAKE_USER"] = str(kwargs["user"])
    if kwargs.get("password"):
        env["SNOWFLAKE_PASSWORD"] = str(kwargs["password"])
    if kwargs.get("warehouse"):
        env["SNOWFLAKE_WAREHOUSE"] = str(kwargs["warehouse"])
    if kwargs.get("database"):
        env["SNOWFLAKE_DATABASE"] = str(kwargs["database"])
    if kwargs.get("schema"):
        env["SNOWFLAKE_SCHEMA"] = str(kwargs["schema"])
    if kwargs.get("role"):
        env["SNOWFLAKE_ROLE"] = str(kwargs["role"])
    if kwargs.get("authenticator") == "oauth" and kwargs.get("token"):
        env["SNOWFLAKE_AUTHENTICATOR"] = "oauth"
        env["SNOWFLAKE_TOKEN"] = str(kwargs["token"])
    # Prefer PEM in env/files so scripts can rebuild the private key locally.
    auth_type = norm(doc.get("auth_type")).lower() or "password"
    pem = norm(doc.get("service_account_json") or doc.get("private_key"))
    if auth_type == "key_pair" and pem:
        files["SNOWFLAKE_PRIVATE_KEY_PATH"] = pem
        env["SNOWFLAKE_AUTHENTICATOR"] = "snowflake_jwt"
        passphrase = norm(doc.get("secret_access_key") or doc.get("password"))
        if passphrase:
            env["SNOWFLAKE_PRIVATE_KEY_PASSPHRASE"] = passphrase
    scope = parse_scope_options(norm(doc.get("dataset_scope")))
    meta["scope"] = scope
    meta["credential_mode"] = auth_type


def _runtime_rdbms(
    doc: dict[str, Any],
    *,
    cloud: str,
    env: dict[str, str],
    meta: dict[str, Any],
) -> None:
    host = norm(doc.get("host") or doc.get("account_id")) or "localhost"
    port = norm(doc.get("port")) or ("5432" if "postgres" in cloud else "1433")
    database = norm(doc.get("database"))
    user = norm(doc.get("access_key_id") or doc.get("user") or doc.get("username"))
    password = norm(doc.get("secret_access_key") or doc.get("password"))
    if not database or not user:
        raise ValueError(f"{cloud} connector requires database and username.")
    prefix = "POSTGRES" if "postgres" in cloud else "MSSQL" if cloud in {"sqlserver", "mssql"} else "MYSQL"
    env[f"{prefix}_HOST"] = host
    env[f"{prefix}_PORT"] = str(port)
    env[f"{prefix}_DATABASE"] = database
    env[f"{prefix}_USER"] = user
    if password:
        env[f"{prefix}_PASSWORD"] = password
    if "postgres" in cloud:
        env["POSTGRES_CONNINFO"] = (
            f"postgresql+psycopg://{quote_plus(user)}:{quote_plus(password)}"
            f"@{host}:{port}/{database}"
        )
    meta["credential_mode"] = "password"
    meta["host"] = host
    meta["database"] = database
