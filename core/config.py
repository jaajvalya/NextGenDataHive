"""Repository paths and `.env` loading, shared by every core module.

Two readers exist because they answer different questions:

`load_repo_dotenv` seeds `os.environ` without overwriting anything already
set, so a real environment variable always beats the file. `dotenv_values`
reads the file directly, for the cases where an edit to `.env` must take
effect even though the variable is already present in the environment.
"""
from __future__ import annotations

import os
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[1]
ENV_PATH = REPO_ROOT / ".env"


def _iter_env_lines(path: Path):
    # utf-8-sig tolerates the BOM that Windows editors add.
    for line in path.read_text(encoding="utf-8-sig").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        yield key.strip(), value.strip().strip('"').strip("'")


def load_repo_dotenv() -> None:
    """Seed os.environ from repo-root `.env`, without overriding what is set."""
    if not ENV_PATH.is_file():
        return
    for key, value in _iter_env_lines(ENV_PATH):
        # Skip blanks so an empty DATAHIVE_AI_API_KEY= cannot mask a later real value.
        if value == "":
            continue
        os.environ.setdefault(key, value)


def dotenv_values(prefix: str | None = None) -> dict[str, str]:
    """Values straight from `.env`, optionally limited to one key prefix."""
    out: dict[str, str] = {}
    if not ENV_PATH.is_file():
        return out
    for key, value in _iter_env_lines(ENV_PATH):
        if prefix is None or key.startswith(prefix):
            # Later non-empty entries win; empty does not erase a prior value.
            if value == "" and key in out:
                continue
            out[key] = value
    return out
