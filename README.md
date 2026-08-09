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
    health · connectors · assets · sql · ask · data_quality
    snowflake · glossary · etl · logs · ui
  repositories/
    connectors.py        data access for the saved-connector collection
  services/
    catalog.py           catalog helpers shared by assets and sql
    sql_runner.py        platform routing and query logging for every execution
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
  ai/                    natural-language querying, behind one pluggable provider
    provider · context · planner · nl2sql · guard · answer
  validators/            one module per source family, behind one dispatch
    base · upload · snowflake · databricks · postgres · mongodb
    rdbms · aws · google · gcp · azure · msgraph · gdrive

web/                     everything served to the browser, and nothing else
  main.html              markup only
  css/                   main.css (shell) + ask.css (Ask Aura)
  js/
    http.js              shared apiBase / headers / fetch helpers
    ask.js · assets.js · sql-explorer.js · reporting.js
    save-connector.js · connector_session.js · app.js (shell)
  images/                logos and branding, mounted at /images

resources/               static files the API hands out (glossary template)
storage/                 runtime data, git-ignored
  uploads/               ETL source files uploaded through the UI
  glossary/              uploaded glossary workbooks
scripts/                 launchers and diagnostics (see scripts/README.md)
tests/                   unit tests (no database required)
```

## Setup

```bash
python3 -m venv .venv
.venv/bin/pip install -e ".[dev]"     # drop [dev] to skip linter and tests
```

Create or edit the repo-root `.env` (git-ignored) with Mongo, Postgres, and
optional Ask Aura settings. The file itself documents each variable.

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
open scripts/open_ui.command
```

On Windows, run `scripts/install_watchdog.ps1` once, then use
`scripts/open_ui.bat`.

## Development

```bash
.venv/bin/ruff check .        # lint; the baseline is clean
.venv/bin/pytest              # unit tests, no database needed
```

The tests cover the parts that fail silently rather than loudly: the read-only
SQL guard, credential sealing, log redaction, upload filename safety, the full
set of registered routes, and the natural-language pipeline (provider selection,
schema context, generated-SQL validation, and one end-to-end pass with a
scripted model).

`scripts/check_postgres_env.py` is a diagnostic, not a test — it opens a real
connection and prints what `.env` resolves to.

## What's in the UI

| Tab | Purpose |
|---|---|
| Connectors | Register, test and save connections; credentials encrypted at rest |
| Assets | Browse schemas, tables and columns discovered across connected sources |
| Ask Aura | Natural-language querying — picks the connector and writes the SQL for you |
| Insights | Read-only SQL explorer against Postgres and Snowflake |
| Glossary | Upload business terms and push them onto columns as comments |
| Governance | Data quality rules and profiling results |
| Reporting | Charts over query results |
| ETL | File upload and landing |
| Admin | Connection and query audit logs |

## Ask Aura — natural-language querying

Ask a question in English and Aura picks a connector, reads only the schema it
needs, writes a read-only query and runs it through the same executor as the
Insights tab.

The tab is hidden until a model provider is configured in `.env`. For Google
Gemma (native Generative Language API — required for Gemma; also works for
Gemini):

```bash
DATAHIVE_AI_PROVIDER=google
DATAHIVE_AI_API_KEY=...          # from https://aistudio.google.com/apikey
                                 # GOOGLE_API_KEY / GEMINI_API_KEY also work
DATAHIVE_AI_MODEL=gemma-3-12b-it # or gemma-3-27b-it, gemini-2.0-flash, …
```

OpenAI (or any OpenAI-compatible host):

```bash
DATAHIVE_AI_PROVIDER=openai      # or ollama, google, none, or auto
DATAHIVE_AI_API_KEY=sk-...       # OPENAI_API_KEY also works
DATAHIVE_AI_MODEL=gpt-4o-mini
```

To keep every question on the machine, run a local model instead:

```bash
ollama pull qwen2.5-coder:7b     # once; ~4.7 GB

DATAHIVE_AI_PROVIDER=ollama
DATAHIVE_AI_MODEL=qwen2.5-coder:7b
```

`auto` uses OpenAI when a key is present and is off otherwise — Google and local
models are opt-in, so an unset provider hides the tab rather than pointing at a
daemon that may not be installed. Azure OpenAI works through the same OpenAI
client: set `DATAHIVE_AI_PROVIDER=azure` and point `DATAHIVE_AI_BASE_URL` at the
deployment.

How a question becomes an answer:

1. The catalog and glossary are condensed into a list of connectors and table
   names — names only, so the prompt stays small on a large estate.
2. The model picks one connector and a handful of tables. Anything it names that
   is not in the catalog is discarded.
3. Those connectors are then invoked for the column detail of just those tables.
4. SQL is generated in the right dialect and validated before it runs: the
   read-only guard, a check that every referenced table exists, and a row cap.
5. The rows come back with a written answer, the SQL, and the sources used.

Only step 5 sends actual data to the model, and only a capped sample. Set
`DATAHIVE_AI_SEND_RESULTS=false` to skip it and show the table on its own.
Credentials are never included in any prompt. Every ask is written to the query
log with `source: "ask"`.

Answers are limited to Postgres and Snowflake, the two platforms that can
execute SQL today.

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
- Generated SQL passes through that same guard, plus a check that every table it
  references exists in the catalog, so a hallucinated name never reaches a
  database.
- Sensitive keys are redacted before anything is written to the logs.
- Uploaded filenames are flattened to a single path component with a unique
  prefix, so they cannot escape the landing directory or collide.
- Browser assets are served from three mounted directories (`/css`, `/js`,
  `/images`) instead of a catch-all route. Nothing outside `web/` is reachable,
  so Python source and `.env` cannot be served even by a malformed path.
