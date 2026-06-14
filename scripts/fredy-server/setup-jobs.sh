#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="${FREDY_ENV:-$ROOT/.env}"
FREDY_URL="${FREDY_URL:-http://127.0.0.1:9998}"
FREDY_USER="${FREDY_USER:-admin}"
FREDY_PASS="${FREDY_PASS:-admin}"
COOKIE_JAR="$(mktemp)"
trap 'rm -f "$COOKIE_JAR"' EXIT

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

login() {
  curl -fsS -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$FREDY_URL/api/login" \
    -H 'Content-Type: application/json' \
    -d "{\"username\":\"$FREDY_USER\",\"password\":\"$FREDY_PASS\"}" >/dev/null
}

job_count() {
  curl -fsS -b "$COOKIE_JAR" "$FREDY_URL/api/jobs" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))"
}

create_job() {
  local name="$1"
  local payload="$2"
  curl -fsS -b "$COOKIE_JAR" -X POST "$FREDY_URL/api/jobs" \
    -H 'Content-Type: application/json' \
    -d "$payload" >/dev/null
  echo "Created job: $name"
}

wait_for_fredy() {
  for _ in $(seq 1 60); do
    if curl -fsS "$FREDY_URL/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 2
  done
  echo "Fredy did not become ready at $FREDY_URL" >&2
  return 1
}

wait_for_fredy
login

if [[ "$(job_count)" -gt 0 ]]; then
  echo "Fredy already has jobs configured — skipping setup"
  exit 0
fi

create_job "Berlin rentals (ImmoScout24)" '{
  "name": "Berlin rentals (ImmoScout24)",
  "enabled": true,
  "blacklist": [],
  "shareWithUsers": [],
  "provider": [{
    "id": "immoscout",
    "enabled": true,
    "url": "https://www.immobilienscout24.de/Suche/de/berlin/berlin/wohnung-mieten?sorting=2"
  }],
  "notificationAdapter": []
}'

create_job "Berlin WG rooms (WG-Gesucht)" '{
  "name": "Berlin WG rooms (WG-Gesucht)",
  "enabled": true,
  "blacklist": [],
  "shareWithUsers": [],
  "provider": [{
    "id": "wggesucht",
    "enabled": true,
    "url": "https://www.wg-gesucht.de/wohnungen-Berlin.8.0.0.html"
  }],
  "notificationAdapter": []
}'

create_job "Berlin rentals (Immowelt)" '{
  "name": "Berlin rentals (Immowelt)",
  "enabled": true,
  "blacklist": [],
  "shareWithUsers": [],
  "provider": [{
    "id": "immowelt",
    "enabled": true,
    "url": "https://www.immowelt.de/liste/berlin/berlin/wohnungen/mieten"
  }],
  "notificationAdapter": []
}'

echo "Fredy scrape jobs configured"
