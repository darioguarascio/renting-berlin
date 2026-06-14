from __future__ import annotations

import json
import logging
import urllib.error
import urllib.parse
import urllib.request
from html import escape
from typing import Any

from ..config import LISTING_PATH_SEP, SITE_URL, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
from ..db import cursor

logger = logging.getLogger(__name__)


def telegram_configured() -> bool:
    return bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)


def build_listing_path(slug: str, short_code: str) -> str:
    return f"{slug}{LISTING_PATH_SEP}{short_code}"


def send_telegram_message(text: str) -> None:
    if not telegram_configured():
        logger.info("[telegram] %s", text.replace("\n", " | "))
        return

    payload = urllib.parse.urlencode(
        {
            "chat_id": TELEGRAM_CHAT_ID,
            "text": text,
            "parse_mode": "HTML",
            "disable_web_page_preview": "false",
        }
    ).encode("utf-8")

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    request = urllib.request.Request(url, data=payload, method="POST")

    try:
        with urllib.request.urlopen(request, timeout=15) as response:
            if response.status >= 400:
                body = response.read().decode("utf-8", errors="replace")
                raise RuntimeError(f"Telegram API returned {response.status}: {body}")
    except urllib.error.HTTPError as err:
        body = err.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Telegram API error {err.code}: {body}") from err


def _costs(row: dict[str, Any]) -> dict[str, Any]:
    costs = row["costs"]
    if isinstance(costs, str):
        costs = json.loads(costs)
    return costs


def _neighborhoods(row: dict[str, Any]) -> list[str]:
    neighborhoods = row["desired_neighborhoods"]
    if isinstance(neighborhoods, str):
        neighborhoods = json.loads(neighborhoods)
    return neighborhoods or []


def format_listing_message(row: dict[str, Any]) -> str:
    costs = _costs(row)
    rent = costs.get("rentPerMonth")
    path = build_listing_path(row["slug"], row["short_code"])
    url = f"{SITE_URL}/listings/{path}"
    title = escape(row["title"])
    neighborhood = escape(row["neighborhood"])
    category = escape(row["category"].replace("_", " "))
    rent_type = escape(row["rent_type"].replace("_", " "))

    lines = [
        "🏠 <b>New listing published</b>",
        "",
        f"<b>{title}</b>",
        f"€{rent}/mo · {row['rooms']} room(s) · {row['size_sqm']} m²",
        f"{neighborhood} · {category} · {rent_type}",
        f'<a href="{escape(url)}">View on renting.berlin</a>',
    ]
    return "\n".join(lines)


def format_tenant_request_message(row: dict[str, Any], handle: str) -> str:
    url = f"{SITE_URL}/u/{handle}"
    title = escape(row["title"])
    neighborhoods = ", ".join(escape(n) for n in _neighborhoods(row))
    category = escape(row["category"].replace("_", " "))
    rent_type = escape(row["rent_type"].replace("_", " "))

    lines = [
        "👤 <b>New seeker profile published</b>",
        "",
        f"<b>{title}</b>",
        f"Budget up to €{row['budget_max']}/mo",
        f"{neighborhoods or 'Berlin'} · {category} · {rent_type}",
        f'<a href="{escape(url)}">View on renting.berlin</a>',
    ]
    return "\n".join(lines)


def notify_published_listing(listing_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM listings WHERE id = %s", (listing_id,))
        row = cur.fetchone()

    if not row or row["status"] != "active" or row["moderation_status"] != "approved":
        return

    send_telegram_message(format_listing_message(row))


def notify_published_tenant_request(request_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM tenant_requests WHERE id = %s", (request_id,))
        row = cur.fetchone()

    if not row or row["status"] != "active" or row["moderation_status"] != "approved":
        return

    with cursor() as cur:
        cur.execute("SELECT handle FROM users WHERE id = %s", (row["seeker_id"],))
        seeker = cur.fetchone()

    if not seeker or not seeker["handle"]:
        return

    send_telegram_message(format_tenant_request_message(row, seeker["handle"]))


def process_telegram_job(data: dict[str, str]) -> None:
    job_type = data.get("type")
    entity_id = data.get("entityId")
    if not entity_id:
        return

    if job_type == "new_listing":
        notify_published_listing(entity_id)
    elif job_type == "new_tenant_request":
        notify_published_tenant_request(entity_id)
