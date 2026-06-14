#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOCAL="$ROOT/.local/fredy"
TEMPLATES="$ROOT/scripts/fredy-templates"

if [[ ! -d "$TEMPLATES" ]]; then
  echo "Missing templates at $TEMPLATES" >&2
  exit 1
fi

mkdir -p "$LOCAL"/{conf,db,export,scripts}

cp "$TEMPLATES/docker-compose.yml" "$LOCAL/"
cp "$TEMPLATES/conf/config.json" "$LOCAL/conf/"
cp "$TEMPLATES/scripts/"*.py "$LOCAL/scripts/"
chmod +x "$LOCAL/scripts/"*.py

if [[ ! -f "$LOCAL/export/listings.example.json" ]]; then
  cp "$TEMPLATES/export/listings.example.json" "$LOCAL/export/listings.example.json"
fi

if [[ ! -f "$ROOT/.local/production.env.example" ]]; then
  cp "$TEMPLATES/production.env.example" "$ROOT/.local/production.env.example"
fi

echo "Fredy local infra ready at $LOCAL"
echo ""
echo "  npm run fredy:up          # start Fredy on http://localhost:9998 (admin/admin)"
echo "  npm run fredy:export       # dump Fredy SQLite -> export/raw.json"
echo "  npm run fredy:convert      # map raw -> export/listings.json"
echo "  npm run db:import-external # import into local dev DB (.env)"
echo ""
echo "  cp .local/production.env.example .local/production.env  # then set prod URLs"
echo "  npm run fredy:push         # export + convert + import to production"
