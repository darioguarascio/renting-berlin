#!/usr/bin/env python3
"""Read active listings from the local Fredy SQLite database."""

from __future__ import annotations

import json
import sqlite3
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "db" / "listings.db"
OUT_PATH = ROOT / "export" / "raw.json"


def main() -> int:
    if not DB_PATH.exists():
        print(f"Fredy database not found: {DB_PATH}", file=sys.stderr)
        print("Start Fredy (npm run fredy:up), configure Berlin jobs, then retry.", file=sys.stderr)
        return 1

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        rows = conn.execute(
            """
            SELECT hash, provider, price, size, rooms, title, image_url, description,
                   address, link, latitude, longitude, created_at, is_active
            FROM listings
            WHERE manually_deleted = 0 AND is_active = 1
            ORDER BY created_at DESC
            """
        ).fetchall()
    except sqlite3.Error as exc:
        print(f"Failed to read Fredy listings: {exc}", file=sys.stderr)
        return 1
    finally:
        conn.close()

    payload = {
        "exportedAt": datetime.now(UTC).isoformat(),
        "sourceDb": str(DB_PATH),
        "count": len(rows),
        "listings": [dict(row) for row in rows],
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Exported {len(rows)} listings to {OUT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
