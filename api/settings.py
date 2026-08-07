"""Filesystem layout, upload limits and resolved Mongo collection names.

Every path is derived from the repository root so the API behaves the same
whichever directory it is launched from.
"""
from __future__ import annotations

from pathlib import Path

from core import mongo_store
from core.config import load_repo_dotenv

API_DIR = Path(__file__).resolve().parent
REPO_ROOT = API_DIR.parent

WEB_DIR = REPO_ROOT / "web"
IMAGES_DIR = WEB_DIR / "images"
STORAGE_DIR = REPO_ROOT / "storage"
RESOURCES_DIR = REPO_ROOT / "resources"

UPLOAD_DIR = STORAGE_DIR / "uploads"
GLOSSARY_DIR = STORAGE_DIR / "glossary"
GLOSSARY_TEMPLATE_PATH = RESOURCES_DIR / "glossary_template.xlsx"

# Persisted in Mongo and echoed into generated ETL scripts, so these stay
# repo-root relative rather than absolute.
UPLOAD_RELATIVE_ROOT = "storage/uploads"
GLOSSARY_RELATIVE_ROOT = "storage/glossary"

MAX_UPLOAD_BYTES = 50 * 1024 * 1024
MAX_GLOSSARY_BYTES = 10 * 1024 * 1024
ALLOWED_UPLOAD_SUFFIXES = frozenset(
    {".csv", ".tsv", ".txt", ".xlsx", ".xls", ".json", ".jsonl", ".ndjson", ".parquet"}
)
ALLOWED_GLOSSARY_SUFFIXES = frozenset({".xlsx", ".xls", ".csv"})

# Requests under these prefixes have their failures written to the audit log.
CONNECTION_LOG_PATH_PREFIXES = (
    "/api/connectors",
    "/api/connection-logs",
)

load_repo_dotenv()

MONGO_URI = mongo_store.mongo_uri()
DB_NAME = mongo_store.database_name()
COLLECTION = mongo_store.connectors_collection_name()
CONNECTION_LOGS_COLLECTION = mongo_store.connection_logs_collection_name()
QUERY_LOGS_COLLECTION = mongo_store.query_logs_collection_name()
GLOSSARY_UPLOAD_LOG_COLLECTION = mongo_store.glossary_upload_logs_collection_name()
ASSET_GLOSSARY_COLLECTION = mongo_store.asset_glossary_collection_name()
