#!/bin/bash
# Compatibility wrapper — prefer scripts/open_ui.command.
exec "$(cd "$(dirname "$0")" && pwd)/open_ui.command"
