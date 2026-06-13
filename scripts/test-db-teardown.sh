#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${TEST_DATABASE_URL:-}" ]; then
  echo "TEST_DATABASE_URL not set; skipping teardown."
  exit 0
fi

TEST_DB="${TEST_DATABASE_NAME:-renting_berlin_test}"
TEST_URL="${TEST_DATABASE_URL}"
ADMIN_URL="${TEST_URL%/*}/postgres"

if ! command -v psql >/dev/null 2>&1; then
  echo "psql unavailable; skipping teardown."
  exit 0
fi

echo "Dropping test database: ${TEST_DB}"

psql "${ADMIN_URL}" -v ON_ERROR_STOP=0 -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${TEST_DB}' AND pid <> pg_backend_pid();" \
  >/dev/null 2>&1 || true

psql "${ADMIN_URL}" -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS ${TEST_DB};"

echo "Test database dropped."
