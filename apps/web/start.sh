#!/bin/sh
set -eu
cd "$(dirname "$0")"
./migrate.sh
node bootstrap-analytics.mjs
exec node server.mjs
