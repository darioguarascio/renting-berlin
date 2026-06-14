from __future__ import annotations

import json
from typing import Any

from ..config import REDIS_KEYS
from ..db import cursor
from ..ids import new_id
from ..redis_client import enqueue_stream_event
from .moderation.image import moderate_image_url
from .moderation.text import ModerationVerdict, moderate_text
from .search_index import index_listing, remove_listing_from_index


def store_result(
    *,
    entity_type: str,
    entity_id: str,
    field: str,
    verdict: ModerationVerdict,
) -> None:
    with cursor() as cur:
        cur.execute(
            """
            INSERT INTO moderation_results
              (id, entity_type, entity_id, field, score, labels, approved)
            VALUES (%s, %s, %s, %s, %s, %s::jsonb, %s)
            """,
            (
                new_id(),
                entity_type,
                entity_id,
                field,
                verdict.score,
                json.dumps(verdict.labels),
                verdict.approved,
            ),
        )


def _descriptions(row: dict[str, Any]) -> list[str]:
    descriptions = row["descriptions"]
    if isinstance(descriptions, str):
        descriptions = json.loads(descriptions)
    parts = [
        descriptions.get("apartment"),
        descriptions.get("location"),
        descriptions.get("misc"),
    ]
    return [part for part in parts if part]


def _photo_urls(row: dict[str, Any], key: str) -> list[str]:
    photos = row[key]
    if isinstance(photos, str):
        photos = json.loads(photos)
    return photos or []


def moderate_listing(listing_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM listings WHERE id = %s", (listing_id,))
        row = cur.fetchone()

    if not row:
        return

    verdicts: list[ModerationVerdict] = []

    title_verdict = moderate_text(row["title"])
    verdicts.append(title_verdict)
    store_result(entity_type="listing", entity_id=listing_id, field="title", verdict=title_verdict)

    for part in _descriptions(row):
        verdict = moderate_text(part)
        verdicts.append(verdict)
        store_result(entity_type="listing", entity_id=listing_id, field="description", verdict=verdict)

    for photo_url in _photo_urls(row, "photo_urls"):
        verdict = moderate_image_url(photo_url)
        verdicts.append(verdict)
        store_result(entity_type="listing", entity_id=listing_id, field="photo", verdict=verdict)

    moderation_status = "flagged" if any(not verdict.approved for verdict in verdicts) else "approved"

    with cursor() as cur:
        cur.execute(
            "UPDATE listings SET moderation_status = %s, updated_at = NOW() WHERE id = %s",
            (moderation_status, listing_id),
        )

    if moderation_status == "approved" and row["status"] == "active":
        index_listing(listing_id)
        enqueue_stream_event(
            REDIS_KEYS["notification_events"],
            {"type": "new_listing", "entityId": listing_id},
        )
        enqueue_stream_event(
            REDIS_KEYS["telegram_events"],
            {"type": "new_listing", "entityId": listing_id},
        )
        return

    remove_listing_from_index(listing_id)


def moderate_tenant_request(request_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM tenant_requests WHERE id = %s", (request_id,))
        row = cur.fetchone()

    if not row:
        return

    verdicts: list[ModerationVerdict] = []

    title_verdict = moderate_text(row["title"])
    verdicts.append(title_verdict)
    store_result(entity_type="tenant_request", entity_id=request_id, field="title", verdict=title_verdict)

    description_verdict = moderate_text(row["description"])
    verdicts.append(description_verdict)
    store_result(
        entity_type="tenant_request",
        entity_id=request_id,
        field="description",
        verdict=description_verdict,
    )

    for photo_url in _photo_urls(row, "photo_urls"):
        verdict = moderate_image_url(photo_url)
        verdicts.append(verdict)
        store_result(entity_type="tenant_request", entity_id=request_id, field="photo", verdict=verdict)

    moderation_status = "flagged" if any(not verdict.approved for verdict in verdicts) else "approved"

    with cursor() as cur:
        cur.execute(
            "UPDATE tenant_requests SET moderation_status = %s, updated_at = NOW() WHERE id = %s",
            (moderation_status, request_id),
        )

    if moderation_status == "approved" and row["status"] == "active":
        enqueue_stream_event(
            REDIS_KEYS["notification_events"],
            {"type": "new_tenant_request", "entityId": request_id},
        )
        enqueue_stream_event(
            REDIS_KEYS["telegram_events"],
            {"type": "new_tenant_request", "entityId": request_id},
        )


def moderate_uploaded_image(photo_url: str) -> None:
    verdict = moderate_image_url(photo_url)
    store_result(entity_type="image", entity_id=photo_url, field="photo", verdict=verdict)


def process_moderation_job(data: dict[str, str]) -> None:
    job_type = data.get("type")
    entity_id = data.get("entityId")
    if not entity_id:
        return

    if job_type == "listing":
        moderate_listing(entity_id)
    elif job_type == "tenant_request":
        moderate_tenant_request(entity_id)
    elif job_type == "image":
        photo_url = data.get("photoUrl") or entity_id
        moderate_uploaded_image(photo_url)
