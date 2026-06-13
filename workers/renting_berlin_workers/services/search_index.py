from __future__ import annotations

import json
from typing import Any

from ..config import REDIS_KEYS
from ..db import cursor
from ..redis_client import get_redis
from .notifications import listing_summary


def index_listing(listing_id: str) -> None:
    with cursor() as cur:
        cur.execute("SELECT * FROM listings WHERE id = %s", (listing_id,))
        row = cur.fetchone()

    if not row or row["status"] != "active" or row["moderation_status"] != "approved":
        remove_listing_from_index(listing_id)
        return

    summary = listing_summary(row)
    client = get_redis()
    pipe = client.pipeline()
    pipe.sadd(REDIS_KEYS["listings_index"], listing_id)
    pipe.set(f"listing:{listing_id}", json.dumps(summary))
    pipe.geoadd(REDIS_KEYS["geo_index"], (row["lng"], row["lat"], listing_id))
    pipe.execute()


def remove_listing_from_index(listing_id: str) -> None:
    client = get_redis()
    pipe = client.pipeline()
    pipe.srem(REDIS_KEYS["listings_index"], listing_id)
    pipe.delete(f"listing:{listing_id}")
    pipe.zrem(REDIS_KEYS["geo_index"], listing_id)
    pipe.execute()
