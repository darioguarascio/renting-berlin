#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${FREDY_ENV:-$ROOT/.env}"
FREDY_URL="${FREDY_URL:-http://127.0.0.1:9998}"
FREDY_USER="${FREDY_USER:-admin}"
FREDY_PASS="${FREDY_PASS:-admin}"
if [[ -z "${FREDY_PROXY_URL:-}" ]]; then
  echo "FREDY_PROXY_URL not set — skipping proxy configuration"
  exit 0
fi

PROXY_URL="${FREDY_PROXY_URL}"

wait_for_fredy
login

curl -fsS -b "$COOKIE_JAR" -X POST "$FREDY_URL/api/admin/generalSettings" \
  -H 'Content-Type: application/json' \
  -d "{\"proxyUrl\":\"$PROXY_URL\"}" >/dev/null

echo "Configured Fredy proxy: $PROXY_URL"
