from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

import clickhouse_connect
from clickhouse_connect.driver.client import Client


def clickhouse_configured() -> bool:
    return bool(os.environ.get("CLICKHOUSE_URL", "").strip())


def _database() -> str:
    return os.environ.get("CLICKHOUSE_DATABASE", "renting_berlin").strip() or "renting_berlin"


def _parse_url(url: str) -> tuple[str, int, str, str]:
    parsed = urlparse(url)
    host = parsed.hostname or "localhost"
    port = parsed.port or (443 if parsed.scheme == "https" else 8123)
    username = parsed.username or os.environ.get("CLICKHOUSE_USER", "default")
    password = parsed.password or os.environ.get("CLICKHOUSE_PASSWORD", "")
    return host, port, username, password


@lru_cache(maxsize=1)
def _schema_ready() -> bool:
    client = get_client()
    if not client:
        return False

    schema_path = Path(__file__).resolve().parent / "schema.sql"
    for statement in schema_path.read_text(encoding="utf-8").split(";"):
        query = statement.strip()
        if query:
            client.command(query)
    return True


def get_client() -> Client | None:
    url = os.environ.get("CLICKHOUSE_URL", "").strip()
    if not url:
        return None

    host, port, username, password = _parse_url(url)
    secure = url.startswith("https://")
    return clickhouse_connect.get_client(
        host=host,
        port=port,
        username=username,
        password=password,
        database=_database(),
        secure=secure,
    )


def ensure_client() -> Client | None:
    if not clickhouse_configured():
        return None
    _schema_ready()
    return get_client()
