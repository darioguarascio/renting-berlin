#!/usr/bin/env bash
set -euo pipefail

# Sends an HTML message file to a Telegram chat.
# Required env: TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
# Usage: telegram-send.sh <message-file>

MESSAGE_FILE="${1:?usage: telegram-send.sh <message-file>}"

if [ -z "${TELEGRAM_BOT_TOKEN:-}" ] || [ -z "${TELEGRAM_CHAT_ID:-}" ]; then
  echo "TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID not set; skipping notification." >&2
  cat "$MESSAGE_FILE"
  exit 0
fi

curl -fsS \
  --retry 3 --retry-delay 2 \
  "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage" \
  --data-urlencode "chat_id=${TELEGRAM_CHAT_ID}" \
  --data-urlencode "parse_mode=HTML" \
  --data-urlencode "disable_web_page_preview=false" \
  --data-urlencode "text@${MESSAGE_FILE}" \
  >/dev/null

echo "Telegram notification sent."
