#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
LNAV_HOME=${LNAV_HOME_DIR:-"$HOME/.lnav"}
FORMAT_DIR="$LNAV_HOME/formats/installed"

mkdir -p "$FORMAT_DIR"
cp "$SCRIPT_DIR/preptalk_log.json" "$FORMAT_DIR/"
cp "$SCRIPT_DIR/preptalk.sql" "$FORMAT_DIR/"

echo "Installed lnav format + SQL to $FORMAT_DIR"
