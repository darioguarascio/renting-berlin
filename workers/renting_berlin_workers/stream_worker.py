from __future__ import annotations

import logging
import os
import signal
import time
from collections.abc import Callable

import redis

from .redis_client import close_redis, ensure_consumer_group, get_redis

logger = logging.getLogger(__name__)


def parse_stream_fields(fields: dict[str, str] | list[str]) -> dict[str, str]:
    if isinstance(fields, dict):
        return fields
    data: dict[str, str] = {}
    for index in range(0, len(fields), 2):
        data[fields[index]] = fields[index + 1]
    return data


def run_stream_worker(
    stream_key: str,
    group_name: str,
    handler: Callable[[str, dict[str, str]], None],
    *,
    batch_size: int = 10,
    block_ms: int = 5000,
    consumer_name: str | None = None,
) -> None:
    consumer = consumer_name or os.environ.get("WORKER_NAME") or f"worker-{os.getpid()}"
    ensure_consumer_group(stream_key, group_name)
    logger.info("Worker started: %s (%s)", stream_key, consumer)

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
            continue

        for _stream, entries in result:
            for entry_id, fields in entries:
                data = parse_stream_fields(fields)
                try:
                    handler(entry_id, data)
                    client.xack(stream_key, group_name, entry_id)
                except Exception:
                    logger.exception("Failed to process %s event %s", stream_key, entry_id)

    close_redis()
