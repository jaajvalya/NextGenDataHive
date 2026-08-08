# Scripts

Ops launchers and diagnostics. Run from the repository root unless noted.

| Script | Platform | Purpose |
|--------|----------|---------|
| [`start_api.sh`](start_api.sh) | macOS | Install/load a LaunchAgent that keeps the API alive on `:5055` |
| [`open_ui.command`](open_ui.command) | macOS | Start the API (via `start_api.sh`) and open the HTTP UI |
| [`open_ui.bat`](open_ui.bat) | Windows | Start the connector watchdog and open the HTTP UI |
| [`install_watchdog.ps1`](install_watchdog.ps1) | Windows | Install `api/connector_watchdog.py` to run at logon |
| [`check_postgres_env.py`](check_postgres_env.py) | any | Print the Postgres DSN resolved from `.env` (no secrets) |

Compatibility wrappers with the older spaced names still exist for bookmarks
and desktop shortcuts; prefer the names above for new setup docs.
