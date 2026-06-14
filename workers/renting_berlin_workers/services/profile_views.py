from __future__ import annotations

from datetime import datetime

from ..analytics.view_events import upsert_profile_view


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
