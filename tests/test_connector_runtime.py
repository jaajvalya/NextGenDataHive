"""Unit tests for connector → ETL runtime-env materialization."""
from __future__ import annotations

import pytest

from core.connector_runtime import runtime_env_for_doc


def test_gcp_service_account_runtime():
    payload = runtime_env_for_doc(
        {
            "id": "abc",
            "cloud": "gcp",
            "auth_type": "service_account",
            "account_id": "my-proj",
            "display_name": "GCP SA",
            "service_account_json": '{"type":"service_account","project_id":"my-proj"}',
        }
    )
    assert payload["ok"] is True
    assert payload["env"]["GOOGLE_CLOUD_PROJECT"] == "my-proj"
    assert "GOOGLE_APPLICATION_CREDENTIALS" in payload["files"]
    assert "private_key" not in payload["env"]


def test_aws_access_keys_runtime():
    payload = runtime_env_for_doc(
        {
            "cloud": "aws",
            "auth_type": "access_keys",
            "region": "eu-west-1",
            "access_key_id": "AKIATEST",
            "secret_access_key": "secret",
            "account_id": "123456789012",
        }
    )
    assert payload["env"]["AWS_ACCESS_KEY_ID"] == "AKIATEST"
    assert payload["env"]["AWS_SECRET_ACCESS_KEY"] == "secret"
    assert payload["env"]["AWS_DEFAULT_REGION"] == "eu-west-1"


def test_azure_service_principal_runtime():
    payload = runtime_env_for_doc(
        {
            "cloud": "azure",
            "tenant_id": "tenant",
            "client_id": "client",
            "client_secret": "sekrit",
            "account_id": "sub-1",
        }
    )
    assert payload["env"]["AZURE_TENANT_ID"] == "tenant"
    assert payload["env"]["AZURE_CLIENT_ID"] == "client"
    assert payload["env"]["AZURE_CLIENT_SECRET"] == "sekrit"
    assert payload["env"]["AZURE_SUBSCRIPTION_ID"] == "sub-1"


def test_snowflake_password_runtime():
    payload = runtime_env_for_doc(
        {
            "cloud": "snowflake",
            "auth_type": "password",
            "account_id": "xy12345",
            "region": "us-east-1",
            "access_key_id": "ETL_USER",
            "secret_access_key": "pw",
            "dataset_scope": "WAREHOUSE=DEV_WH;DATABASE=SALES_DB;SCHEMA=RAW",
        }
    )
    assert payload["env"]["SNOWFLAKE_ACCOUNT"]
    assert payload["env"]["SNOWFLAKE_USER"] == "ETL_USER"
    assert payload["env"]["SNOWFLAKE_PASSWORD"] == "pw"
    assert payload["env"]["SNOWFLAKE_WAREHOUSE"] == "DEV_WH"


def test_aws_missing_keys_raises():
    with pytest.raises(ValueError, match="access key"):
        runtime_env_for_doc({"cloud": "aws", "auth_type": "access_keys"})
