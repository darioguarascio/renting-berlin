from __future__ import annotations

from datetime import datetime

from ..db import cursor
from ..ids import new_id


def upsert_profile_view(profile_user_id: str, viewer_id: str, viewed_at: datetime) -> None:
    with cursor() as cur:
        cur.execute(
            """
            INSERT INTO profile_views (id, profile_user_id, viewer_id, first_viewed_at, last_viewed_at)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (profile_user_id, viewer_id)
            DO UPDATE SET last_viewed_at = EXCLUDED.last_viewed_at
            """,
            (new_id(), profile_user_id, viewer_id, viewed_at, viewed_at),
        )


def process_profile_view_job(data: dict[str, str]) -> None:
    profile_user_id = data.get("profileUserId")
    viewer_id = data.get("viewerId")
    viewed_at_raw = data.get("viewedAt")

    if not profile_user_id or not viewer_id or not viewed_at_raw:
        return
    if profile_user_id == viewer_id:
        return

    viewed_at = datetime.fromisoformat(viewed_at_raw.replace("Z", "+00:00"))
    upsert_profile_view(profile_user_id, viewer_id, viewed_at)
