#!/usr/bin/env python3
"""Import converted Fredy listings into production Postgres."""

from __future__ import annotations

import json
import os
import re
import secrets
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
EXPORT_PATH = Path(os.environ.get("FREDY_EXPORT_PATH", ROOT / "export" / "listings.json"))

PUBLISHER = {
    "email": "external@renting.berlin",
    "name": "External listings",
    "handle": "external-listings",
}

NANOID_ALPHABET = "_-0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"


def new_id(size: int = 21) -> str:
    return "".join(secrets.choice(NANOID_ALPHABET) for _ in range(size))


def seo_slug(text: str, max_len: int = 50) -> str:
    base = re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", text.lower()))[:max_len]
    return base or "listing"


def parse_date(value: str) -> datetime:
    if "T" in value:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    return datetime.fromisoformat(f"{value}T12:00:00+00:00")


def db_target(url: str) -> str:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(url.replace("postgres://", "postgresql://", 1))
        db = parsed.path.lstrip("/") or "postgres"
        port = parsed.port or 5432
        return f"{parsed.hostname}:{port}/{db}"
    except Exception:
        return "unknown"


def sql_literal(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"


def sql_json(value: object) -> str:
    return sql_literal(json.dumps(value, ensure_ascii=False)) + "::jsonb"


def sql_timestamp(value: datetime) -> str:
    return sql_literal(value.isoformat())


class PsqlImporter:
    def __init__(self, database_url: str) -> None:
        if not shutil.which("psql"):
            raise RuntimeError("psql is not installed")
        self.database_url = database_url

    def query_one(self, sql: str) -> str | None:
        result = subprocess.run(
            ["psql", self.database_url, "-v", "ON_ERROR_STOP=1", "-t", "-A", "-c", sql],
            check=True,
            capture_output=True,
            text=True,
        )
        value = result.stdout.strip()
        return value or None

    def execute(self, sql: str) -> None:
        subprocess.run(
            ["psql", self.database_url, "-v", "ON_ERROR_STOP=1", "-c", sql],
            check=True,
        )

    def ensure_publisher(self) -> str:
        email = sql_literal(PUBLISHER["email"])
        row = self.query_one(f"SELECT id FROM users WHERE email = {email}")
        if row:
            handle = sql_literal(PUBLISHER["handle"])
            self.execute(
                f"""
                INSERT INTO reserved_handles (handle, user_id, claimed_at)
                SELECT {handle}, id, NOW() FROM users WHERE email = {email}
                ON CONFLICT (handle) DO NOTHING
                """
            )
            self.execute(
                f"UPDATE users SET handle = {handle}, updated_at = NOW() "
                f"WHERE email = {email} AND handle IS NULL"
            )
            return row

        user_id = new_id()
        self.execute(
            f"""
            INSERT INTO users (id, name, email, email_verified, created_at, updated_at)
            VALUES (
              {sql_literal(user_id)},
              {sql_literal(PUBLISHER['name'])},
              {email},
              false,
              NOW(),
              NOW()
            )
            """
        )
        self.execute(
            f"""
            INSERT INTO reserved_handles (handle, user_id, claimed_at)
            VALUES ({sql_literal(PUBLISHER['handle'])}, {sql_literal(user_id)}, NOW())
            ON CONFLICT (handle) DO NOTHING
            """
        )
        self.execute(
            f"UPDATE users SET handle = {sql_literal(PUBLISHER['handle'])}, updated_at = NOW() "
            f"WHERE id = {sql_literal(user_id)}"
        )
        return user_id

    def upsert_listing(self, publisher_id: str, item: dict) -> str:
        provider = sql_literal(item["externalProvider"])
        source_id = sql_literal(item["externalSourceId"])
        existing = self.query_one(
            "SELECT id FROM listings "
            f"WHERE external_provider = {provider} AND external_source_id = {source_id}"
        )
        now = datetime.now(timezone.utc)
        values = {
            "publisher_id": sql_literal(publisher_id),
            "title": sql_literal(item["title"]),
            "status": sql_literal(item.get("status", "active")),
            "category": sql_literal(item["category"]),
            "rent_type": sql_literal(item["rentType"]),
            "available_from": sql_timestamp(parse_date(item["availableFrom"])),
            "available_to": (
                sql_timestamp(parse_date(item["availableTo"]))
                if item.get("availableTo")
                else "NULL"
            ),
            "size_sqm": str(int(item["sizeSqm"])),
            "rooms": str(int(item["rooms"])),
            "online_viewing_available": "true" if item.get("onlineViewingAvailable") else "false",
            "anmeldung_available": "true" if item.get("anmeldungAvailable") else "false",
            "schufa_required": "true" if item.get("schufaRequired") else "false",
            "address": sql_literal(item["address"]),
            "neighborhood": sql_literal(item["neighborhood"]),
            "lat": str(float(item["lat"])),
            "lng": str(float(item["lng"])),
            "approximate_location": "true" if item.get("approximateLocation") else "false",
            "costs": sql_json(item["costs"]),
            "descriptions": sql_json(item.get("descriptions", {})),
            "required_documents": sql_json(item.get("requiredDocuments", [])),
            "equipment": sql_json(item.get("equipment", [])),
            "photo_urls": sql_json(item.get("photoUrls", [])),
            "external_url": sql_literal(item["externalUrl"]),
            "external_provider": provider,
            "external_source_id": source_id,
            "external_synced_at": sql_timestamp(now),
            "published_at": sql_timestamp(now),
            "updated_at": sql_timestamp(now),
        }

        if existing:
            self.execute(
                f"""
                UPDATE listings SET
                  publisher_id = {values['publisher_id']},
                  title = {values['title']},
                  status = {values['status']}::listing_status,
                  category = {values['category']}::listing_category,
                  rent_type = {values['rent_type']}::rent_type,
                  available_from = {values['available_from']}::timestamptz,
                  available_to = {values['available_to']}{'' if values['available_to'] == 'NULL' else '::timestamptz'},
                  size_sqm = {values['size_sqm']},
                  rooms = {values['rooms']},
                  online_viewing_available = {values['online_viewing_available']},
                  anmeldung_available = {values['anmeldung_available']},
                  schufa_required = {values['schufa_required']},
                  address = {values['address']},
                  neighborhood = {values['neighborhood']},
                  lat = {values['lat']},
                  lng = {values['lng']},
                  approximate_location = {values['approximate_location']},
                  costs = {values['costs']},
                  descriptions = {values['descriptions']},
                  required_documents = {values['required_documents']},
                  equipment = {values['equipment']},
                  photo_urls = {values['photo_urls']},
                  source_type = 'external'::listing_source,
                  external_url = {values['external_url']},
                  external_provider = {values['external_provider']},
                  external_source_id = {values['external_source_id']},
                  external_synced_at = {values['external_synced_at']}::timestamptz,
                  moderation_status = 'approved'::moderation_status,
                  published_at = {values['published_at']}::timestamptz,
                  updated_at = {values['updated_at']}::timestamptz
                WHERE id = {sql_literal(existing)}
                """
            )
            return "updated"

        listing_id = new_id()
        slug = seo_slug(item["title"])
        short_code = new_id(8)
        self.execute(
            f"""
            INSERT INTO listings (
              id, slug, short_code, publisher_id, title, status, category, rent_type,
              available_from, available_to, size_sqm, rooms, online_viewing_available,
              anmeldung_available, schufa_required, address, neighborhood, lat, lng,
              approximate_location, costs, descriptions, required_documents, equipment,
              photo_urls, source_type, external_url, external_provider, external_source_id,
              external_synced_at, moderation_status, published_at, created_at, updated_at
            ) VALUES (
              {sql_literal(listing_id)},
              {sql_literal(slug)},
              {sql_literal(short_code)},
              {values['publisher_id']},
              {values['title']},
              {values['status']}::listing_status,
              {values['category']}::listing_category,
              {values['rent_type']}::rent_type,
              {values['available_from']}::timestamptz,
              {values['available_to']}{'' if values['available_to'] == 'NULL' else '::timestamptz'},
              {values['size_sqm']},
              {values['rooms']},
              {values['online_viewing_available']},
              {values['anmeldung_available']},
              {values['schufa_required']},
              {values['address']},
              {values['neighborhood']},
              {values['lat']},
              {values['lng']},
              {values['approximate_location']},
              {values['costs']},
              {values['descriptions']},
              {values['required_documents']},
              {values['equipment']},
              {values['photo_urls']},
              'external'::listing_source,
              {values['external_url']},
              {values['external_provider']},
              {values['external_source_id']},
              {values['external_synced_at']}::timestamptz,
              'approved'::moderation_status,
              {values['published_at']}::timestamptz,
              NOW(),
              {values['updated_at']}::timestamptz
            )
            """
        )
        return "inserted"


def import_listings(database_url: str, listings: list[dict]) -> tuple[int, int]:
    importer = PsqlImporter(database_url)
    publisher_id = importer.ensure_publisher()
    inserted = 0
    updated = 0
    for item in listings:
        result = importer.upsert_listing(publisher_id, item)
        if result == "inserted":
            inserted += 1
        else:
            updated += 1
    return inserted, updated


def main() -> int:
    dry_run = "--dry-run" in sys.argv
    database_url = os.environ.get("DATABASE_URL", "")
    if not database_url:
        print("DATABASE_URL is not set", file=sys.stderr)
        return 1

    if not EXPORT_PATH.exists():
        print(f"Missing export file: {EXPORT_PATH}", file=sys.stderr)
        return 1

    payload = json.loads(EXPORT_PATH.read_text(encoding="utf-8"))
    listings = payload.get("listings", [])
    if not listings:
        print(f"No listings in {EXPORT_PATH}")
        return 0

    target = db_target(database_url)
    if dry_run:
        print(f"Dry run: would import {len(listings)} listings into {target}")
        for item in listings[:5]:
            print(f"  - [{item['externalProvider']}] {item['title']}")
        if len(listings) > 5:
            print(f"  ... and {len(listings) - 5} more")
        return 0

    print(f"Importing into {target}")
    inserted, updated = import_listings(database_url, listings)
    print(
        f"Imported {len(listings)} external listings from {EXPORT_PATH} "
        f"({inserted} new, {updated} updated)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
