#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
source scripts/require-env.sh

require_env TEST_DATABASE_URL

TEST_DB="${TEST_DATABASE_NAME:-renting_berlin_test}"
TEST_URL="${TEST_DATABASE_URL}"
ADMIN_URL="${TEST_URL%/*}/postgres"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql is required for integration test database setup."
  exit 1
fi

echo "Waiting for Postgres at ${ADMIN_URL}..."
until psql "${ADMIN_URL}" -c 'SELECT 1' >/dev/null 2>&1; do
  sleep 1
done

terminate_test_db_connections() {
  psql "${ADMIN_URL}" -v ON_ERROR_STOP=0 -c \
    "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid();" \
    >/dev/null 2>&1 || true
}

echo "Recreating test database: ${TEST_DB}"
terminate_test_db_connections
psql "${ADMIN_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${TEST_DB};"
psql "${ADMIN_URL}" -v ON_ERROR_STOP=1 -c "CREATE DATABASE ${TEST_DB};"

echo "Syncing schema to test database..."
(
  cd apps/web
  DATABASE_URL="${TEST_URL}" ./node_modules/.bin/drizzle-kit push --force
)

echo "Test database ready."
