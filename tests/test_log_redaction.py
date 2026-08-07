"""Audit-log context is built from connector payloads, so redaction has to
hold for nested structures too — that is where a secret would otherwise slip
through unnoticed.
"""
from __future__ import annotations

from core.mongo_store import sanitize_log_context

SENSITIVE_KEYS = [
    "api_key",
    "client_secret",
    "refresh_token",
    "secret_access_key",
    "service_account_json",
    "password",
    "private_key",
    "jdbc_url",
    "credentials_ciphertext",
]


def test_every_sensitive_key_is_redacted():
    context = dict.fromkeys(SENSITIVE_KEYS, "leaked")
    clean = sanitize_log_context(context)
    assert set(clean) == set(SENSITIVE_KEYS)
    assert all(value == "[redacted]" for value in clean.values())


def test_nested_dictionaries_are_redacted_too():
    clean = sanitize_log_context({"outer": {"inner": {"password": "leaked"}}})
    assert clean["outer"]["inner"]["password"] == "[redacted]"


def test_harmless_fields_pass_through_unchanged():
    context = {"host": "db.example.com", "port": 5432, "verified": True}
    assert sanitize_log_context(context) == context


def test_empty_context_is_normalized_to_a_dict():
    assert sanitize_log_context(None) == {}
    assert sanitize_log_context({}) == {}
