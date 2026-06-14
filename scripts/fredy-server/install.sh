#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
INSTALL_DIR="${FREDY_INSTALL_DIR:-$HOME/renting-berlin-fredy}"

echo "Installing Fredy feed to $INSTALL_DIR"

export PATH="${HOME}/bin:${PATH}"
if [[ -S "${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock" ]]; then
  export DOCKER_HOST="unix://${XDG_RUNTIME_DIR:-/run/user/$(id -u)}/docker.sock"
fi

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not available for user $(whoami)." >&2
  echo "Install rootless Docker: curl -fsSL https://get.docker.com/rootless | sh" >&2
  echo "Then add to ~/.bashrc:" >&2
  echo '  export PATH=$HOME/bin:$PATH' >&2
  echo '  export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock' >&2
  exit 1
fi

if [[ "$ROOT" != "$(cd "$INSTALL_DIR" && pwd)" ]]; then
  mkdir -p "$INSTALL_DIR"/{conf,db,export,scripts,systemd}
  cp "$ROOT/docker-compose.yml" "$INSTALL_DIR/"
  cp "$ROOT/conf/config.json" "$INSTALL_DIR/conf/"
  cp "$ROOT/scripts/"*.py "$INSTALL_DIR/scripts/"
  cp "$ROOT/sync.sh" "$ROOT/setup-jobs.sh" "$INSTALL_DIR/"
  chmod +x "$INSTALL_DIR/sync.sh" "$INSTALL_DIR/setup-jobs.sh" "$INSTALL_DIR/scripts/"*.py
fi

if [[ ! -f "$INSTALL_DIR/.env" ]]; then
  cp "$ROOT/.env.example" "$INSTALL_DIR/.env"
  SECRET="$(python3 -c 'import secrets; print(secrets.token_urlsafe(32))')"
  sed -i "s|change-me|$SECRET|" "$INSTALL_DIR/.env"
  echo "Created $INSTALL_DIR/.env — review DATABASE_URL and FREDY_SYNC_* before first sync"
fi

mkdir -p "$INSTALL_DIR"/{conf,db,export,scripts,systemd}
chmod +x "$INSTALL_DIR/sync.sh" "$INSTALL_DIR/setup-jobs.sh" "$INSTALL_DIR/scripts/"*.py 2>/dev/null || true

python3 -m pip install --user --quiet psycopg2-binary 2>/dev/null || true
if ! python3 -c 'import psycopg2' 2>/dev/null; then
  if ! command -v psql >/dev/null; then
    echo "Need psql or python3-psycopg2 for imports" >&2
    exit 1
  fi
  echo "Using psql for production imports"
fi

echo "Pulling Fredy image (first run may take a while)..."
docker compose -f "$INSTALL_DIR/docker-compose.yml" pull

docker compose -f "$INSTALL_DIR/docker-compose.yml" up -d

chmod +x "$INSTALL_DIR/setup-proxy.sh" 2>/dev/null || true
"$INSTALL_DIR/setup-proxy.sh" || echo "Proxy setup skipped or failed"
"$INSTALL_DIR/setup-jobs.sh"

if [[ -d /etc/systemd/system ]] && sudo -n true 2>/dev/null; then
  cp "$ROOT/systemd/"* "$INSTALL_DIR/systemd/" 2>/dev/null || true
  for unit in "$ROOT/systemd/"*.service "$ROOT/systemd/"*.timer; do
    [[ -f "$unit" ]] || continue
    sed "s|@INSTALL_DIR@|$INSTALL_DIR|g" "$unit" | sudo tee "/etc/systemd/system/$(basename "$unit")" >/dev/null
  done
  sudo systemctl daemon-reload
  sudo systemctl enable --now renting-berlin-fredy.service
  sudo systemctl enable --now renting-berlin-fredy-sync.timer
  echo "Systemd units enabled"
else
  CRON_LINE="*/30 * * * * PATH=$HOME/bin:/usr/bin:/bin FREDY_ENV=$INSTALL_DIR/.env DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock $INSTALL_DIR/sync.sh >> $INSTALL_DIR/sync.log 2>&1"
  (crontab -l 2>/dev/null | grep -Fv "$INSTALL_DIR/sync.sh"; echo "$CRON_LINE") | crontab -
  echo "Cron job installed (every 30 minutes)"
fi

echo ""
echo "Installed. Next steps:"
echo "  1. Edit $INSTALL_DIR/.env (DATABASE_URL is preset; set FREDY_SYNC_SECRET on prod too)"
echo "  2. Run: $INSTALL_DIR/sync.sh"
echo "  3. Fredy UI: http://$(hostname -I | awk '{print $1}'):9998 (admin/admin — change password in UI)"
