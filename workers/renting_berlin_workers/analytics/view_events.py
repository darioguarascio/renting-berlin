from __future__ import annotations

from datetime import datetime

from ..clickhouse import ensure_client
from ..db import cursor
from ..ids import new_id


def record_view_event(
    entity_type: str,
    entity_id: str,
    viewer_id: str,
    viewed_at: datetime,
) -> None:
    client = ensure_client()
    if client:
        client.insert(
            "view_events",
            [[new_id(), entity_type, entity_id, viewer_id, viewed_at]],
            column_names=["id", "entity_type", "entity_id", "viewer_id", "viewed_at"],
        )
        return

    if entity_type == "profile":
        with cursor() as cur:
            cur.execute(
                """
                INSERT INTO profile_views (id, profile_user_id, viewer_id, first_viewed_at, last_viewed_at)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (profile_user_id, viewer_id)
                DO UPDATE SET last_viewed_at = EXCLUDED.last_viewed_at
                """,
                (new_id(), entity_id, viewer_id, viewed_at, viewed_at),
            )
        return

    with cursor() as cur:
        cur.execute(
            """
            INSERT INTO listing_views (id, listing_id, viewer_id, first_viewed_at, last_viewed_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (listing_id, viewer_id)
            DO UPDATE SET last_viewed_at = EXCLUDED.last_viewed_at
            """,
            (new_id(), entity_id, viewer_id, viewed_at, viewed_at),
        )


def upsert_profile_view(profile_user_id: str, viewer_id: str, viewed_at: datetime) -> None:
    record_view_event("profile", profile_user_id, viewer_id, viewed_at)
