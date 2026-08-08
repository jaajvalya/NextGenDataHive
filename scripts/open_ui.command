#!/bin/bash
# macOS launcher — starts the API, then opens the HTTP UI (never file://).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

bash "$ROOT/scripts/start_api.sh"
open "http://127.0.0.1:5055/"
echo "DataHive UI: http://127.0.0.1:5055/"
