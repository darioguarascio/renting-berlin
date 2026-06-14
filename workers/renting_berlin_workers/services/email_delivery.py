from __future__ import annotations

import json
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from ..config import REDIS_KEYS
from ..db import cursor
from ..redis_client import get_redis
from ..metrics import record_email, record_email_buffered, record_email_flush
from .email import EVENT_FIELDS, send_email, should_notify_email

BUFFER_PREFIX = "emails:buffer:"
META_PREFIX = "emails:meta:"
BUFFER_INDEX = "emails:buffer:users"

DIGEST_MS = {
    "daily": 24 * 60 * 60 * 1000,
    "weekly": 7 * 24 * 60 * 60 * 1000,
}


def _buffer_key(user_id: str) -> str:
    return f"{BUFFER_PREFIX}{user_id}"


def _meta_key(user_id: str) -> str:
    return f"{META_PREFIX}{user_id}"


def _berlin_minutes(now: datetime) -> int:
    local = now.astimezone(ZoneInfo("Europe/Berlin"))
    return local.hour * 60 + local.minute


def _parse_time(value: str | None) -> int | None:
    if not value:
        return None
    parts = value.split(":")
    if len(parts) != 2:
        return None
    return int(parts[0]) * 60 + int(parts[1])


def _load_preferences(user_id: str) -> dict[str, Any]:
    with cursor() as cur:
        cur.execute(
            """
            SELECT email_enabled, email_digest, quiet_hours_enabled, quiet_hours_start, quiet_hours_end
            FROM user_notification_preferences
            WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()
    if not row:
        return {
            "email_enabled": True,
            "email_digest": "instant",
            "quiet_hours_enabled": False,
            "quiet_hours_start": None,
            "quiet_hours_end": None,
        }
    return row


def is_in_quiet_hours(prefs: dict[str, Any], now: datetime | None = None) -> bool:
    if not prefs.get("quiet_hours_enabled"):
        return False
    start = _parse_time(prefs.get("quiet_hours_start") or "22:00")
    end = _parse_time(prefs.get("quiet_hours_end") or "08:00")
    if start is None or end is None:
        return False
    now_minutes = _berlin_minutes(now or datetime.now(tz=ZoneInfo("Europe/Berlin")))
    if start == end:
        return True
    if start < end:
        return start <= now_minutes < end
    return now_minutes >= start or now_minutes < end


def should_buffer_email(prefs: dict[str, Any], event: str, now: datetime | None = None) -> bool:
    if event == "messages":
        return False
    if prefs.get("email_digest") != "instant":
        return True
    return is_in_quiet_hours(prefs, now)


def _buffer_email_job(user_id: str, job: dict[str, str]) -> None:
    client = get_redis()
    client.rpush(_buffer_key(user_id), json.dumps(job))
    client.sadd(BUFFER_INDEX, user_id)


def _send_email_job_now(job: dict[str, str]) -> None:
    send_email(
        job["to"],
        job["subject"],
        job["text"],
        job["html"],
        event=job.get("event", "unknown"),
    )


def deliver_email_job(job: dict[str, str]) -> None:
    user_id = job.get("userId", "")
    event = job.get("event", "")
    if not user_id or not event:
        return
    if not should_notify_email(user_id, event):
        record_email(event, "skipped")
        return

    prefs = _load_preferences(user_id)
    if should_buffer_email(prefs, event):
        _buffer_email_job(user_id, job)
        record_email_buffered(event)
        return

    _send_email_job_now(job)


def flush_buffered_emails_for_user(user_id: str, now_ms: int | None = None) -> int:
    client = get_redis()
    raw_jobs = client.lrange(_buffer_key(user_id), 0, -1)
    if not raw_jobs:
        return 0

    prefs = _load_preferences(user_id)
    now = now_ms or int(datetime.now(tz=ZoneInfo("Europe/Berlin")).timestamp() * 1000)

    digest = prefs.get("email_digest", "instant")
    if digest != "instant":
        meta_raw = client.get(_meta_key(user_id))
        last_flush_at = 0
        if meta_raw:
            last_flush_at = int(json.loads(meta_raw).get("lastFlushAt", 0))
        interval = DIGEST_MS.get(digest, DIGEST_MS["daily"])
        if now - last_flush_at < interval:
            return 0
    elif is_in_quiet_hours(prefs):
        return 0

    client.delete(_buffer_key(user_id))
    client.srem(BUFFER_INDEX, user_id)

    sent = 0
    for raw in raw_jobs:
        job = json.loads(raw)
        if not should_notify_email(job.get("userId", ""), job.get("event", "")):
            continue
        _send_email_job_now(job)
        sent += 1

    if sent > 0:
        client.set(_meta_key(user_id), json.dumps({"lastFlushAt": now}))
        record_email_flush(sent)

    return sent


def flush_due_buffered_emails(now_ms: int | None = None) -> int:
    client = get_redis()
    user_ids = client.smembers(BUFFER_INDEX)
    total = 0
    for user_id in user_ids:
        total += flush_buffered_emails_for_user(user_id, now_ms)
    return total
