from __future__ import annotations

from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from .config import DATABASE_URL

_conn: psycopg.Connection | None = None


def get_connection() -> psycopg.Connection:
    global _conn
    if _conn is None or _conn.closed:
        if not DATABASE_URL:
            raise RuntimeError("DATABASE_URL is not set")
        _conn = psycopg.connect(DATABASE_URL, row_factory=dict_row)
    return _conn


@contextmanager
def cursor() -> Iterator[psycopg.Cursor]:
    conn = get_connection()
    with conn.cursor() as cur:
        yield cur
    conn.commit()


def close_connection() -> None:
    global _conn
    if _conn is not None and not _conn.closed:
        _conn.close()
    _conn = None
