#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/require-env.sh

require_env DATABASE_URL

echo "Syncing schema to DATABASE_URL..."
npm run db:push -w apps/web

echo "Seeding database..."
npm run db:seed -w apps/web

echo ""
echo "Setup complete."
echo "  App: npm run dev"
