from __future__ import annotations

import logging
import os
import signal
import time
import urllib.error
import urllib.parse
import urllib.request
from html import escape

import redis

from ..config import (
    REDIS_KEYS,
    SITE_URL,
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    TELEGRAM_DIGEST_INTERVAL_HOURS,
)
from ..redis_client import close_redis, ensure_consumer_group, get_redis
from ..stream_worker import parse_stream_fields

logger = logging.getLogger(__name__)

TELEGRAM_DIGEST_INTERVAL_SECONDS = TELEGRAM_DIGEST_INTERVAL_HOURS * 3600
TELEGRAM_MESSAGE_LIMIT = 4096


def telegram_configured() -> bool:
    return bool(TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID)


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


def _link_line(url: str) -> str:
    safe_url = escape(url)
    return f'<a href="{safe_url}">{safe_url}</a>'


def listings_search_url() -> str:
    return f"{SITE_URL}/offers?sort=updated"


def seekers_search_url() -> str:
    return f"{SITE_URL}/requests?sort=updated"


def _pending_key(job_type: str) -> str | None:
    if job_type == "new_listing":
        return REDIS_KEYS["telegram_pending_listings"]
    if job_type == "new_tenant_request":
        return REDIS_KEYS["telegram_pending_seekers"]
    return None


def buffer_telegram_entity(job_type: str, entity_id: str) -> None:
    pending_key = _pending_key(job_type)
    if not pending_key:
        return

    client = get_redis()
    client.sadd(pending_key, entity_id)
    logger.info("Buffered telegram %s %s", job_type, entity_id)


def _digest_due(client: redis.Redis) -> bool:
    raw = client.get(REDIS_KEYS["telegram_last_digest_at"])
    if not raw:
        client.set(REDIS_KEYS["telegram_last_digest_at"], str(int(time.time())))
        return False

    last_sent = int(raw)
    return time.time() - last_sent >= TELEGRAM_DIGEST_INTERVAL_SECONDS


def format_digest_message(listing_count: int, seeker_count: int) -> str:
    sections: list[str] = [
        f"📬 <b>renting.berlin update</b> (last {TELEGRAM_DIGEST_INTERVAL_HOURS}h)",
        "",
    ]

    if listing_count:
        sections.extend(
            [
                f"🏠 <b>{listing_count} new listing{'s' if listing_count != 1 else ''}</b>",
                _link_line(listings_search_url()),
                "",
            ]
        )

    if seeker_count:
        sections.append(
            f"👤 <b>{seeker_count} new seeker profile{'s' if seeker_count != 1 else ''}</b>",
        )
        sections.append(_link_line(seekers_search_url()))

    message = "\n".join(sections).strip()
    if len(message) > TELEGRAM_MESSAGE_LIMIT:
        message = message[: TELEGRAM_MESSAGE_LIMIT - 20].rstrip() + "\n…"
    return message


def _clear_pending(client: redis.Redis) -> None:
    client.delete(
        REDIS_KEYS["telegram_pending_listings"],
        REDIS_KEYS["telegram_pending_seekers"],
    )
    client.set(REDIS_KEYS["telegram_last_digest_at"], str(int(time.time())))


def maybe_send_digest() -> None:
    client = get_redis()
    if not _digest_due(client):
        return

    listing_count = client.scard(REDIS_KEYS["telegram_pending_listings"])
    seeker_count = client.scard(REDIS_KEYS["telegram_pending_seekers"])
    if listing_count == 0 and seeker_count == 0:
        return

    send_telegram_message(format_digest_message(listing_count, seeker_count))
    _clear_pending(client)
    logger.info(
        "Sent telegram digest (%s listings, %s seekers)",
        listing_count,
        seeker_count,
    )


def process_telegram_job(data: dict[str, str]) -> None:
    job_type = data.get("type")
    entity_id = data.get("entityId")
    if not entity_id or not job_type:
        return

    buffer_telegram_entity(job_type, entity_id)


def run_telegram_worker(
    stream_key: str,
    group_name: str,
    *,
    batch_size: int = 10,
    block_ms: int = 5000,
    consumer_name: str | None = None,
) -> None:
    consumer = consumer_name or os.environ.get("TELEGRAM_WORKER_NAME") or f"worker-{os.getpid()}"
    ensure_consumer_group(stream_key, group_name)
    logger.info(
        "Telegram worker started: %s (%s), digest every %sh",
        stream_key,
        consumer,
        TELEGRAM_DIGEST_INTERVAL_HOURS,
    )

    running = True

    def shutdown(_signum: int, _frame: object) -> None:
        nonlocal running
        running = False

    signal.signal(signal.SIGINT, shutdown)
    signal.signal(signal.SIGTERM, shutdown)

    client = get_redis()

    while running:
        try:
            result = client.xreadgroup(
                groupname=group_name,
                consumername=consumer,
                streams={stream_key: ">"},
                count=batch_size,
                block=block_ms,
            )
        except redis.exceptions.ConnectionError:
            logger.exception("Redis connection error, retrying")
            time.sleep(1)
            continue

        if result:
            for _stream, entries in result:
                for entry_id, fields in entries:
                    data = parse_stream_fields(fields)
                    try:
                        process_telegram_job(data)
                        client.xack(stream_key, group_name, entry_id)
                    except Exception:
                        logger.exception("Failed to process %s event %s", stream_key, entry_id)

        try:
            maybe_send_digest()
        except Exception:
            logger.exception("Failed to send telegram digest")

    close_redis()
