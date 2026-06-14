#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
JOURNAL="${ROOT}/apps/web/drizzle/meta/_journal.json"
SQL_DIR="${ROOT}/apps/web/drizzle"

if ! command -v jq >/dev/null 2>&1; then
  echo "jq is required to verify migration journal sync" >&2
  exit 1
fi

mapfile -t journal_tags < <(jq -r '.entries[].tag' "$JOURNAL" | sort)
mapfile -t sql_tags < <(find "$SQL_DIR" -maxdepth 1 -name '*.sql' -printf '%f\n' | sed 's/\.sql$//' | sort)

missing=()
for tag in "${sql_tags[@]}"; do
  if ! printf '%s\n' "${journal_tags[@]}" | grep -qx "$tag"; then
    missing+=("$tag")
  fi
done

extra=()
for tag in "${journal_tags[@]}"; do
  if ! printf '%s\n' "${sql_tags[@]}" | grep -qx "$tag"; then
    extra+=("$tag")
  fi
done

if ((${#missing[@]} > 0)); then
  echo "Migration SQL files missing from drizzle journal:" >&2
  printf '  - %s\n' "${missing[@]}" >&2
  exit 1
fi

if ((${#extra[@]} > 0)); then
  echo "Journal entries without SQL files:" >&2
  printf '  - %s\n' "${extra[@]}" >&2
  exit 1
fi

echo "Migration journal matches ${#sql_tags[@]} SQL files."
