# NextGen DataHive

A local-first data platform UI and API: register connections to enterprise data
sources, browse the resulting asset catalog, run read-only SQL, attach business
glossary terms to columns, and profile data quality.

Ported from the original DataHive R&D build with the ID360 connector framework
removed — this repo contains DataHive and nothing else.

---

## Layout

Server code, browser assets and runtime data are kept in separate trees, so
nothing the API serves to the browser sits next to Python source.

```
api/                     the HTTP layer — thin, delegates to core/
  main.py                app factory: middleware, error handling, mounts
  __main__.py            entry point for `python -m api`
  settings.py            paths, upload limits, resolved collection names
  schemas.py             request bodies
  security.py            caller identity from request headers
  audit.py               connection-failure auditing
  files.py               upload landing zone: safe names, capped writes
  routers/               one module per resource group
    health · connectors · assets · sql · data_quality
    snowflake · glossary · etl · logs · ui
  repositories/
    connectors.py        data access for the saved-connector collection
  services/
    catalog.py           catalog helpers shared by assets and sql
  connector_watchdog.py  optional helper that keeps the API alive on Windows

core/                    domain logic, no HTTP concerns
  config.py              repo paths and .env loading, shared by all modules
  credential_crypto.py   Fernet encryption for stored credentials
  mongo_store.py         connector registry, connection/query/glossary logs
  postgres_store.py      Postgres catalog + read-only SQL
  snowflake_catalog.py   Snowflake catalog, stages, read-only SQL
  asset_catalog.py       unified asset browsing across sources
  glossary_store.py      glossary ingest and column-comment sync
  data_quality.py        profiling and rule execution
  validators/            one module per source family, behind one dispatch
    base · upload · snowflake · databricks · postgres · mongodb
    rdbms · aws · google · gcp · azure · msgraph · gdrive

web/                     everything served to the browser, and nothing else
  main.html              markup only
  css/main.css           styles
  js/                    app.js plus the connectors, assets, insights and
                         reporting modules
  images/                logos and branding, mounted at /images

resources/               static files the API hands out (glossary template)
storage/                 runtime data, git-ignored
  uploads/               ETL source files uploaded through the UI
  glossary/              uploaded glossary workbooks
scripts/                 launchers and diagnostics
tests/                   unit tests (no database required)
```

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"     # drop [dev] to skip linter and tests

cp .env.example .env                  # then fill in Mongo + Postgres credentials
```

The editable install puts `api` and `core` on the import path, so the app and
the tests run from any directory. On-prem database drivers are optional extras —
install only what you connect to: `.[mysql]`, `.[sqlserver]`, `.[oracle]`,
`.[db2]`.

`DATAHIVE_SECRETS_KEY` in `.env` encrypts connector passwords and keys at rest.
Changing it makes every previously saved credential unreadable, so set it once
and keep it.

## Running

```bash
.venv/bin/python -m api
```

Then open <http://127.0.0.1:5055/>.

Open the UI over HTTP, not as a `file://` path — browsers block `fetch` to
localhost from `file://`, which surfaces as "Failed to fetch".

To keep it running in the background on macOS:

```bash
bash scripts/start_api.sh          # installs a KeepAlive LaunchAgent
open "scripts/Open DataHive UI.command"
```

On Windows, run `scripts/install_ui_watchdog.ps1` once, then use
`scripts/Open DataHive UI.bat`.

## Development

```bash
.venv/bin/ruff check .        # lint; the baseline is clean
.venv/bin/pytest              # unit tests, no database needed
```

The tests cover the parts that fail silently rather than loudly: the read-only
SQL guard, credential sealing, log redaction, upload filename safety, and the
full set of registered routes.

`scripts/check_postgres_env.py` is a diagnostic, not a test — it opens a real
connection and prints what `.env` resolves to.

## What's in the UI

| Tab | Purpose |
|---|---|
| Connectors | Register, test and save connections; credentials encrypted at rest |
| Assets | Browse schemas, tables and columns discovered across connected sources |
| Insights | Read-only SQL explorer against Postgres and Snowflake |
| Glossary | Upload business terms and push them onto columns as comments |
| Governance | Data quality rules and profiling results |
| Reporting | Charts over query results |
| ETL | File upload and landing |
| Admin | Connection and query audit logs |

## Sources

Postgres · MySQL · SQL Server · Oracle · Db2 · MongoDB · Snowflake · Databricks ·
SharePoint · OneDrive

Postgres and Snowflake have the deepest support (catalog discovery, SQL
execution, glossary comment sync). Each source family has its own validator in
`core/validators/`, all reached through a single `validate_connector` dispatch.

## Data stores

- **MongoDB** holds the connector registry (`connector_dtls`) plus the
  connection, query and glossary-upload logs.
- **PostgreSQL** backs the Assets tab, reading the schemas named in
  `POSTGRES_ASSET_SCHEMAS`.

## Safety properties carried over

- Stored passwords, API keys and service-account JSON are Fernet-encrypted with
  a key derived from `DATAHIVE_SECRETS_KEY`; they are never returned to the UI.
- The SQL explorer rejects anything that is not a single read-only statement.
- Sensitive keys are redacted before anything is written to the logs.
- Uploaded filenames are flattened to a single path component with a unique
  prefix, so they cannot escape the landing directory or collide.
- Browser assets are served from three mounted directories (`/css`, `/js`,
  `/images`) instead of a catch-all route. Nothing outside `web/` is reachable,
  so Python source and `.env` cannot be served even by a malformed path.
