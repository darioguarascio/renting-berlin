#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/require-env.sh

require_env TEST_DATABASE_URL

export DATABASE_URL="${TEST_DATABASE_URL}"
export BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-test-secret-integration}"
export BETTER_AUTH_URL="${BETTER_AUTH_URL:-http://localhost:4321}"

teardown() {
  echo ""
  bash scripts/test-db-teardown.sh
}
trap teardown EXIT

echo "==> Building app"
npm run build -w apps/web

echo ""
echo "==> Preparing test database"
bash scripts/test-db-setup.sh

echo ""
echo "==> Seeding test database"
npm run test:db:seed -w apps/web

echo ""
echo "==> Running integration tests"
npm run test:integration:run -w apps/web

echo ""
echo "Integration tests passed."
