"""The validator package split one large module into per-source files behind a
single dispatch function. These tests pin the routing, which is the part the
split could plausibly have broken, without opening any network connections.
"""
from __future__ import annotations

import pytest

from core import validators
from core.validators import base


def test_upload_mode_validates_without_touching_the_network():
    result = validators.validate_connector({"mode": "upload", "file_name": "orders.csv"})
    assert result["ok"] is True
    assert result["platform"] == "upload"
    assert result["details"]["file_name"] == "orders.csv"


def test_upload_without_a_file_name_is_rejected():
    with pytest.raises(validators.ConnectionValidationError) as exc:
        validators.validate_connector({"mode": "upload"})
    assert exc.value.error_type == "validation"


def test_an_unknown_platform_reports_itself_as_unsupported():
    with pytest.raises(validators.ConnectionValidationError) as exc:
        validators.validate_connector({"cloud": "myspace"})
    assert exc.value.error_type == "unsupported"
    assert exc.value.platform == "myspace"


def test_an_empty_payload_is_a_value_error():
    with pytest.raises(ValueError):
        validators.validate_connector({})


@pytest.mark.parametrize(
    "platform",
    [
        "snowflake", "databricks", "dbx", "sqlserver", "mssql", "mongodb", "mongo",
        "postgres", "postgresql", "pg", "rdbms", "onprem", "aws", "amazonwebservices",
        "gcp", "googlecloud", "azure", "microsoftazure", "sharepoint",
        "microsoftsharepoint", "googledrive", "onedrive", "microsoftonedrive",
    ],
)
def test_known_platforms_route_somewhere_other_than_unsupported(platform):
    """Each supported platform must reach a real validator.

    The payloads are empty, so most validators fail on missing credentials —
    that is fine. What must never happen is 'unsupported', which would mean
    the dispatch lost a branch. The bare postgres aliases are allowed to
    succeed, because they fall back to the local DataHive database.
    """
    try:
        validators.validate_connector({"cloud": platform})
    except validators.ConnectionValidationError as exc:
        assert exc.error_type != "unsupported", platform
    except Exception:
        pass  # a driver/network error still proves the branch was reached


def test_error_text_is_collapsed_and_capped():
    """Driver exceptions arrive as multi-line dumps; logs get one tidy line."""
    message = base.safe_error(Exception("line one\n\tline two    line three"))
    assert "\n" not in message
    assert message == "line one line two line three"

    long_message = base.safe_error(Exception("x" * 900))
    assert len(long_message) == 420
    assert long_message.endswith("...")


def test_blank_exception_falls_back_to_a_readable_message():
    assert base.safe_error(Exception(""), fallback="Connection failed") == "Connection failed"
