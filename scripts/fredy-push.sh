#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${FREDY_PROD_ENV:-$ROOT/.local/production.env}"
DRY_RUN=false

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      cat <<EOF
Push Fredy export to production Postgres (+ Redis search index).

Fredy stays local. This script:
  1. exports .local/fredy/db/listings.db -> export/raw.json
  2. converts raw.json -> export/listings.json
  3. imports listings.json using .local/production.env

Setup (once):
  cp scripts/fredy-templates/production.env.example .local/production.env
  # edit DATABASE_URL + REDIS_URL for production

Usage:
  npm run fredy:push              # export, convert, import to prod
  npm run fredy:push -- --dry-run # preview import only

Override env file:
  FREDY_PROD_ENV=/path/to/env npm run fredy:push
EOF
      exit 0
      ;;
    *)
      echo "Unknown option: $arg (try --help)" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  echo "Copy scripts/fredy-templates/production.env.example to .local/production.env and set prod DATABASE_URL + REDIS_URL." >&2
  exit 1
fi

cd "$ROOT"
npm run fredy:export
npm run fredy:convert

IMPORT_ARGS=()
if $DRY_RUN; then
  IMPORT_ARGS+=(--dry-run)
fi

node --env-file="$ENV_FILE" node_modules/.bin/tsx apps/web/src/db/import-external-listings.ts "${IMPORT_ARGS[@]}"
