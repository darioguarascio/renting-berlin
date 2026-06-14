from __future__ import annotations

import json
from datetime import datetime
from typing import Any

from ..config import LISTING_PATH_SEP, REDIS_KEYS
from ..db import cursor
from ..ids import new_id
from ..redis_client import enqueue_stream_event, get_redis
from .email import build_saved_search_email


def build_listing_path(slug: str, short_code: str) -> str:
    return f"{slug}{LISTING_PATH_SEP}{short_code}"


def seeker_profile_href(handle: str) -> str:
    return f"/u/{handle}"


def listing_summary(row: dict[str, Any]) -> dict[str, Any]:
    costs = row["costs"] if isinstance(row["costs"], dict) else json.loads(row["costs"])
    photo_urls = row["photo_urls"] if isinstance(row["photo_urls"], list) else json.loads(row["photo_urls"])
    return {
        "id": row["id"],
        "slug": row["slug"],
        "shortCode": row["short_code"],
        "path": build_listing_path(row["slug"], row["short_code"]),
        "title": row["title"],
        "category": row["category"],
        "rentType": row["rent_type"],
        "rentPerMonth": costs["rentPerMonth"],
        "sizeSqm": row["size_sqm"],
        "rooms": row["rooms"],
        "neighborhood": row["neighborhood"],
        "availableFrom": row["available_from"].isoformat(),
        "availableTo": row["available_to"].isoformat() if row["available_to"] else None,
        "anmeldungAvailable": row["anmeldung_available"],
        "schufaRequired": row["schufa_required"],
        "onlineViewingAvailable": row["online_viewing_available"],
        "lat": row["lat"],
        "lng": row["lng"],
        "approximateLocation": row["approximate_location"],
        "primaryPhotoUrl": photo_urls[0] if photo_urls else None,
        "createdAt": row["created_at"].isoformat(),
    }


def matches_listing_filters(item: dict[str, Any], filters: dict[str, Any]) -> bool:
    if filters.get("category") and item["category"] != filters["category"]:
        return False
    if filters.get("rentType") and item["rentType"] != filters["rentType"]:
        return False
    if filters.get("minPrice") is not None and item["rentPerMonth"] < filters["minPrice"]:
        return False
    if filters.get("maxPrice") is not None and item["rentPerMonth"] > filters["maxPrice"]:
        return False
    if filters.get("minSize") is not None and item["sizeSqm"] < filters["minSize"]:
        return False
    if filters.get("maxSize") is not None and item["sizeSqm"] > filters["maxSize"]:
        return False
    if filters.get("minRooms") is not None and item["rooms"] < filters["minRooms"]:
        return False
    if filters.get("maxRooms") is not None and item["rooms"] > filters["maxRooms"]:
        return False
    if filters.get("anmeldungAvailable") and not item["anmeldungAvailable"]:
        return False
    if "schufaRequired" in filters and item["schufaRequired"] != filters["schufaRequired"]:
        return False
    if filters.get("neighborhood") and item["neighborhood"] != filters["neighborhood"]:
        return False
    if filters.get("availableFrom"):
        if datetime.fromisoformat(item["availableFrom"].replace("Z", "+00:00")) > datetime.fromisoformat(
            filters["availableFrom"].replace("Z", "+00:00")
        ):
            return False
    if filters.get("availableTo") and item.get("availableTo"):
        if datetime.fromisoformat(item["availableTo"].replace("Z", "+00:00")) < datetime.fromisoformat(
            filters["availableTo"].replace("Z", "+00:00")
        ):
            return False
    return True


def matches_tenant_request_filters(item: dict[str, Any], filters: dict[str, Any]) -> bool:
    neighborhoods = item["desired_neighborhoods"]
    if isinstance(neighborhoods, str):
        neighborhoods = json.loads(neighborhoods)

    if filters.get("category") and item["category"] != filters["category"]:
        return False
    if filters.get("rentType") and item["rent_type"] != filters["rentType"]:
        return False
    if filters.get("minBudget") is not None and item["budget_max"] < filters["minBudget"]:
        return False
    if filters.get("maxBudget") is not None and item["budget_max"] > filters["maxBudget"]:
        return False
    if filters.get("anmeldungNeeded") and not item["anmeldung_needed"]:
        return False
    if filters.get("hasSchufa") and not item["has_schufa"]:
        return False
    if filters.get("neighborhood") and filters["neighborhood"] not in neighborhoods:
        return False
    household_types = filters.get("householdTypes") or []
    if household_types and item["household_type"] not in household_types:
        return False
    return True


def should_notify_in_app(user_id: str, event: str) -> bool:
    field = {
        "messages": "notify_messages",
        "saved_searches": "notify_saved_searches",
        "profile_views": "notify_profile_views",
        "listing_updates": "notify_listing_updates",
        "product_news": "notify_product_news",
    }.get(event)
    if not field:
        return False

    with cursor() as cur:
        cur.execute(
            f"""
            SELECT in_app_enabled, {field}
            FROM user_notification_preferences
            WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()

    if not row:
        return event != "product_news"

    return bool(row["in_app_enabled"] and row[field])


def create_search_notification(
    *,
    user_id: str,
    saved_search_id: str,
    search_type: str,
    item_id: str,
    title: str,
    body: str,
    link: str,
) -> None:
    with cursor() as cur:
        try:
            cur.execute(
                """
                INSERT INTO search_notifications
                  (id, user_id, saved_search_id, search_type, item_id, title, body, link)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (saved_search_id, item_id) DO NOTHING
                """,
                (new_id(), user_id, saved_search_id, search_type, item_id, title, body, link),
            )
        except Exception:
            pass


def append_known_id(saved_search_id: str, item_id: str, current: list[str]) -> None:
    if item_id in current:
        return
    with cursor() as cur:
        cur.execute(
            """
            UPDATE saved_searches
            SET last_known_ids = %s::jsonb, updated_at = NOW()
            WHERE id = %s
            """,
            (json.dumps([*current, item_id]), saved_search_id),
        )


def notify_new_listing(listing_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM listings WHERE id = %s", (listing_id,))
        row = cur.fetchone()

    if not row or row["status"] != "active" or row["moderation_status"] != "approved":
        return

    item = listing_summary(row)

    with cursor() as cur:
        cur.execute(
            """
            SELECT * FROM saved_searches
            WHERE type = 'listings' AND notify_enabled = TRUE
            """
        )
        saved = cur.fetchall()

    for search in saved:
        filters = search["filters"] if isinstance(search["filters"], dict) else json.loads(search["filters"])
        last_known = search["last_known_ids"] if isinstance(search["last_known_ids"], list) else json.loads(
            search["last_known_ids"]
        )

        if not matches_listing_filters(item, filters):
            continue
        if item["id"] in last_known:
            continue
        if search["user_id"] == row["publisher_id"]:
            continue
        if not should_notify_in_app(search["user_id"], "saved_searches"):
            continue

        link = f"/listings/{item['path']}"
        create_search_notification(
            user_id=search["user_id"],
            saved_search_id=search["id"],
            search_type="listings",
            item_id=item["id"],
            title="New listing matches your search",
            body=item["title"],
            link=link,
        )
        enqueue_stream_event(REDIS_KEYS["email_events"], build_saved_search_email(
            search["user_id"],
            "New listing matches your search",
            item["title"],
            link,
        ))
        append_known_id(search["id"], item["id"], last_known)


def notify_new_tenant_request(request_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM tenant_requests WHERE id = %s", (request_id,))
        row = cur.fetchone()

    if not row or row["status"] != "active" or row["moderation_status"] != "approved":
        return

    with cursor() as cur:
        cur.execute("SELECT handle FROM users WHERE id = %s", (row["seeker_id"],))
        seeker = cur.fetchone()

    if not seeker or not seeker["handle"]:
        return

    with cursor() as cur:
        cur.execute(
            """
            SELECT * FROM saved_searches
            WHERE type = 'tenant_requests' AND notify_enabled = TRUE
            """
        )
        saved = cur.fetchall()

    for search in saved:
        filters = search["filters"] if isinstance(search["filters"], dict) else json.loads(search["filters"])
        last_known = search["last_known_ids"] if isinstance(search["last_known_ids"], list) else json.loads(
            search["last_known_ids"]
        )

        if not matches_tenant_request_filters(row, filters):
            continue
        if row["id"] in last_known:
            continue
        if search["user_id"] == row["seeker_id"]:
            continue
        if not should_notify_in_app(search["user_id"], "saved_searches"):
            continue

        link = seeker_profile_href(seeker["handle"])
        create_search_notification(
            user_id=search["user_id"],
            saved_search_id=search["id"],
            search_type="tenant_requests",
            item_id=row["id"],
            title="New seeker matches your search",
            body=row["title"],
            link=link,
        )
        enqueue_stream_event(REDIS_KEYS["email_events"], build_saved_search_email(
            search["user_id"],
            "New seeker matches your search",
            row["title"],
            link,
        ))
        append_known_id(search["id"], row["id"], last_known)


def process_notification_job(data: dict[str, str]) -> None:
    job_type = data.get("type")
    entity_id = data.get("entityId")
    if not entity_id:
        return

    if job_type == "new_listing":
        notify_new_listing(entity_id)
    elif job_type == "new_tenant_request":
        notify_new_tenant_request(entity_id)
