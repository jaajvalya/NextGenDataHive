"""Shared fixtures.

The unit tests here must not touch MongoDB, PostgreSQL or Snowflake, so a
throwaway secrets key is planted before `core` is imported. Without it,
`credential_crypto` would read the developer's real `.env`.
"""
from __future__ import annotations

import os

os.environ.setdefault("DATAHIVE_SECRETS_KEY", "unit-test-key-not-used-anywhere-else")
