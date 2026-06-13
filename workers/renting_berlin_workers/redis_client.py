from __future__ import annotations

import redis

from .config import REDIS_URL

_client: redis.Redis | None = None


def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        if not REDIS_URL:
            raise RuntimeError("REDIS_URL is not set")
        _client = redis.from_url(REDIS_URL, decode_responses=True)
    return _client


def close_redis() -> None:
    global _client
    if _client is not None:
        _client.close()
    _client = None


def ensure_consumer_group(stream_key: str, group_name: str) -> None:
    client = get_redis()
    try:
        client.xgroup_create(stream_key, group_name, id="0", mkstream=True)
    except redis.ResponseError as err:
        if "BUSYGROUP" not in str(err):
            raise


def enqueue_stream_event(stream_key: str, fields: dict[str, str]) -> None:
    client = get_redis()
    client.xadd(stream_key, fields)
