from __future__ import annotations

from datetime import datetime

from ..analytics.view_events import upsert_profile_view
from ..config import REDIS_KEYS, SITE_URL
from ..db import cursor
from ..email.build import build_notification_email
from ..redis_client import enqueue_stream_event
from .email import should_notify_email


def _is_new_profile_view(profile_user_id: str, viewer_id: str) -> bool:
    with cursor() as cur:
        cur.execute(
            """
            SELECT 1
            FROM profile_views
            WHERE profile_user_id = %s AND viewer_id = %s
            LIMIT 1
            """,
            (profile_user_id, viewer_id),
        )
        return cur.fetchone() is None


def _notify_profile_view_email(profile_user_id: str, viewer_id: str) -> None:
    if not should_notify_email(profile_user_id, "profile_views"):
        return

    with cursor() as cur:
        cur.execute(
            """
            SELECT handle, name
            FROM users
            WHERE id = %s
            """,
            (viewer_id,),
        )
        viewer = cur.fetchone()
        cur.execute("SELECT handle FROM users WHERE id = %s", (profile_user_id,))
        profile_user = cur.fetchone()

    if not viewer or not profile_user or not profile_user["handle"]:
        return

    viewer_label = f"@{viewer['handle']}" if viewer.get("handle") else viewer["name"]
    enqueue_stream_event(
        REDIS_KEYS["email_events"],
        build_notification_email(
            user_id=profile_user_id,
            category="profile_views",
            title="Someone viewed your seeker profile",
            body=f"{viewer_label} viewed your profile.",
            link="/account/profile-views",
            site_url=SITE_URL,
        ),
    )


def process_profile_view_job(data: dict[str, str]) -> None:
    profile_user_id = data.get("profileUserId")
    viewer_id = data.get("viewerId")
    viewed_at_raw = data.get("viewedAt")

    if not profile_user_id or not viewer_id or not viewed_at_raw:
        return
    if profile_user_id == viewer_id:
        return

    is_new = _is_new_profile_view(profile_user_id, viewer_id)
    viewed_at = datetime.fromisoformat(viewed_at_raw.replace("Z", "+00:00"))
    upsert_profile_view(profile_user_id, viewer_id, viewed_at)

    if is_new:
        _notify_profile_view_email(profile_user_id, viewer_id)
