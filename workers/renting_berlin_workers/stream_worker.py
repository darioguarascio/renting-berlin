from __future__ import annotations

import logging
import os
import signal
import time
from collections.abc import Callable

import redis

from .metrics import observe_job, record_redis_error
from .redis_client import close_redis, ensure_consumer_group, get_redis

logger = logging.getLogger(__name__)


def parse_stream_fields(fields: dict[str, str] | list[str]) -> dict[str, str]:
    if isinstance(fields, dict):
        return fields
    data: dict[str, str] = {}
    for index in range(0, len(fields), 2):
        data[fields[index]] = fields[index + 1]
    return data


RECLAIM_IDLE_MS = 30_000  # reclaim messages idle for >30s after a worker restart


def _process_entries(
    client: redis.Redis,
    stream_key: str,
    group_name: str,
    entries: list,
    handler: Callable[[str, dict[str, str]], None],
) -> None:
    for entry_id, fields in entries:
        data = parse_stream_fields(fields)
        try:
            with observe_job(stream_key):
                handler(entry_id, data)
            client.xack(stream_key, group_name, entry_id)
        except Exception:
            logger.exception("Failed to process %s event %s", stream_key, entry_id)


def _reclaim_pending(
    client: redis.Redis,
    stream_key: str,
    group_name: str,
    consumer: str,
    handler: Callable[[str, dict[str, str]], None],
) -> None:
    cursor = "0-0"
    while True:
        result = client.xautoclaim(
            stream_key,
            group_name,
            consumer,
            min_idle_time=RECLAIM_IDLE_MS,
            start_id=cursor,
            count=100,
        )
        next_cursor, entries = result[0], result[1]
        if entries:
            logger.info("Reclaiming %d pending entries from %s", len(entries), stream_key)
            _process_entries(client, stream_key, group_name, entries, handler)
        if next_cursor == b"0-0" or next_cursor == "0-0":
            break
        cursor = next_cursor


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

    _reclaim_pending(client, stream_key, group_name, consumer, handler)

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
            record_redis_error(stream_key)
            logger.exception("Redis connection error, retrying")
            time.sleep(1)
            continue

        if not result:
            continue

        for _stream, entries in result:
            _process_entries(client, stream_key, group_name, entries, handler)

    close_redis()
