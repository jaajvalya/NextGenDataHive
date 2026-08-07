"""Credential sealing must be reversible and must never leave plaintext behind.

A silent failure here either leaks secrets into Mongo or makes every saved
connector unusable, and neither shows up as an error at save time.
"""
from __future__ import annotations

import pytest

from core import credential_crypto as cc


def test_encrypt_decrypt_round_trip():
    secrets = {"password": "s3cr3t", "api_key": "abc-123"}
    assert cc.decrypt_credentials(cc.encrypt_credentials(secrets)) == secrets


def test_ciphertext_does_not_contain_the_plaintext():
    ciphertext = cc.encrypt_credentials({"password": "hunter2"})
    assert "hunter2" not in ciphertext


def test_encryption_is_non_deterministic():
    """Fernet includes a random IV, so identical input yields different output."""
    a = cc.encrypt_credentials({"password": "same"})
    b = cc.encrypt_credentials({"password": "same"})
    assert a != b


def test_sealing_removes_every_plaintext_secret():
    doc = {
        "display_name": "warehouse",
        "host": "db.example.com",
        "password": "s3cr3t",
        "private_key": "-----BEGIN PRIVATE KEY-----",
    }
    sealed = cc.seal_connector_document(doc)

    for key in cc.SENSITIVE_CONNECTOR_KEYS:
        assert key not in sealed
    assert sealed["credentials_encrypted"] is True
    assert sealed["credentials_keys"] == ["password", "private_key"]
    # Non-sensitive fields survive untouched.
    assert sealed["host"] == "db.example.com"


def test_seal_then_unseal_restores_the_original_values():
    doc = {"display_name": "warehouse", "password": "s3cr3t"}
    restored = cc.unseal_connector_document(cc.seal_connector_document(doc))
    assert restored["password"] == "s3cr3t"


def test_sealing_is_idempotent():
    once = cc.seal_connector_document({"password": "s3cr3t"})
    twice = cc.seal_connector_document(once)
    assert twice["credentials_ciphertext"] == once["credentials_ciphertext"]
    assert cc.unseal_connector_document(twice)["password"] == "s3cr3t"


def test_document_without_secrets_is_marked_unencrypted():
    sealed = cc.seal_connector_document({"display_name": "public dataset"})
    assert sealed["credentials_encrypted"] is False
    assert "credentials_ciphertext" not in sealed


def test_blank_secrets_are_not_treated_as_secrets():
    assert cc.extract_sensitive_fields({"password": "   ", "api_key": None}) == {}


def test_wrong_key_raises_a_named_error_rather_than_returning_garbage(monkeypatch):
    ciphertext = cc.encrypt_credentials({"password": "s3cr3t"})
    monkeypatch.setenv("DATAHIVE_SECRETS_KEY", "a-completely-different-key")
    with pytest.raises(RuntimeError, match="DATAHIVE_SECRETS_KEY may have changed"):
        cc.decrypt_credentials(ciphertext)
