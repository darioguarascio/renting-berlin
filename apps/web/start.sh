#!/bin/sh
set -eu
cd "$(dirname "$0")"
./migrate.sh
node bootstrap-analytics.mjs || echo "[analytics-bootstrap] skipped — web will start anyway"
exec node server.mjs
