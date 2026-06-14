#!/bin/sh
set -eu
cd "$(dirname "$0")"
./migrate.sh
exec node server.mjs
