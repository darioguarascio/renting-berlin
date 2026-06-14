from __future__ import annotations

import json

from ..clickhouse import clickhouse_configured, ensure_client
from ..db import cursor
from ..ids import new_id


def create_email_send(
    *,
    to_email: str,
    user_id: str | None,
    category: str,
    subject: str,
    links: list[str],
) -> str:
    send_id = new_id()
    client = ensure_client()
    if client:
        from datetime import datetime, timezone

        client.insert(
            "email_sends",
            [[send_id, user_id, to_email, category, subject, links, datetime.now(timezone.utc)]],
            column_names=["id", "user_id", "to_email", "category", "subject", "links", "created_at"],
        )
        return send_id

    if clickhouse_configured():
        raise RuntimeError("ClickHouse is configured but unavailable")

    with cursor() as cur:
        cur.execute(
            """
            INSERT INTO email_sends (id, user_id, to_email, category, subject, links)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb)
            """,
            (send_id, user_id, to_email, category, subject, json.dumps(links)),
        )
    return send_id
