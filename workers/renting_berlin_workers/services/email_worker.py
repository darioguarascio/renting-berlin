from __future__ import annotations

import logging
import os
import signal
import time

import redis

from ..config import REDIS_KEYS
from ..redis_client import close_redis, ensure_consumer_group, get_redis
from .email import process_email_job
from .email_delivery import flush_due_buffered_emails
from ..stream_worker import parse_stream_fields

logger = logging.getLogger(__name__)


def run_email_worker(
    stream_key: str,
    group_name: str,
    *,
    batch_size: int = 10,
    block_ms: int = 5000,
    consumer_name: str | None = None,
) -> None:
    consumer = consumer_name or os.environ.get("EMAIL_WORKER_NAME") or f"email-worker-{os.getpid()}"
    ensure_consumer_group(stream_key, group_name)
    logger.info("Email worker started: %s (%s)", stream_key, consumer)

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

        if not result:
            try:
                flushed = flush_due_buffered_emails()
                if flushed:
                    logger.info("Flushed %s buffered email(s)", flushed)
            except Exception:
                logger.exception("Failed to flush buffered emails")
            continue

        for _stream, entries in result:
            for entry_id, fields in entries:
                data = parse_stream_fields(fields)
                try:
                    process_email_job(data)
                    client.xack(stream_key, group_name, entry_id)
                except Exception:
                    logger.exception("Failed to process email event %s", entry_id)

        try:
            flush_due_buffered_emails()
        except Exception:
            logger.exception("Failed to flush buffered emails")

    close_redis()
