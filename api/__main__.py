"""Entry point: `python -m api` from the repository root."""
from __future__ import annotations

import os

import uvicorn

HOST = os.getenv("DATAHIVE_API_HOST", "127.0.0.1")
PORT = int(os.getenv("DATAHIVE_API_PORT", "5055"))


def main() -> None:
    uvicorn.run("api.main:app", host=HOST, port=PORT, log_level="info")


if __name__ == "__main__":
    main()
