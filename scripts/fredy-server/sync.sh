#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${FREDY_ENV:-$ROOT/.env}"

export PATH="${HOME}/bin:${PATH}"
if [[ -S "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock" ]]; then
  export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock"
fi

if [[ -f "$ENV_FILE" ]]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
fi

log() {
  echo "[$(date -Iseconds)] $*"
}

export PATH="${HOME}/bin:${PATH}"
if [[ -S "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock" ]]; then
  export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock"
fi

systemctl --user start docker.service 2>/dev/null || true

log "Starting Fredy sync"

cd "$ROOT"

python3 "$ROOT/scripts/export.py"
python3 "$ROOT/scripts/convert.py"
python3 "$ROOT/scripts/import.py"

if [[ -n "${FREDY_SYNC_URL:-}" && -n "${FREDY_SYNC_SECRET:-}" ]]; then
  log "Requesting production search reindex"
  if curl -fsS -X POST "$FREDY_SYNC_URL" \
    -H "Authorization: Bearer ${FREDY_SYNC_SECRET}" \
    -H "Content-Type: application/json" \
    --max-time 120; then
    echo
    log "Search reindex complete"
  else
    log "Search reindex request failed (listings are in Postgres; search may lag until reindex)"
  fi
else
  log "FREDY_SYNC_URL / FREDY_SYNC_SECRET not set — skipping search reindex"
fi

log "Fredy sync finished"
