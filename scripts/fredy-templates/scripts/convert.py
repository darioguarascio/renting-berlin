#!/usr/bin/env python3
"""Map Fredy raw export JSON into renting.berlin import format."""

from __future__ import annotations

import json
import math
import re
import sys
from datetime import UTC, datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
IN_PATH = ROOT / "export" / "raw.json"
OUT_PATH = ROOT / "export" / "listings.json"

NEIGHBORHOOD_CENTERS: dict[str, tuple[float, float]] = {
    "mitte": (52.520, 13.405),
    "kreuzberg": (52.499, 13.418),
    "neukolln": (52.482, 13.435),
    "friedrichshain": (52.515, 13.454),
    "prenzlauer-berg": (52.538, 13.424),
    "charlottenburg": (52.505, 13.303),
    "schoneberg": (52.486, 13.344),
    "tempelhof": (52.468, 13.385),
    "wedding": (52.550, 13.366),
    "pankow": (52.569, 13.401),
    "lichtenberg": (52.520, 13.499),
    "treptow": (52.493, 13.469),
    "steglitz": (52.458, 13.322),
    "zehlendorf": (52.434, 13.258),
    "spandau": (52.535, 13.199),
    "reinickendorf": (52.574, 13.321),
    "marzahn": (52.545, 13.544),
    "hellersdorf": (52.537, 13.607),
    "koepenick": (52.442, 13.574),
}

PLZ_NEIGHBORHOOD: dict[int, str] = {
    10115: "mitte",
    10117: "mitte",
    10119: "mitte",
    10178: "mitte",
    10179: "friedrichshain",
    10243: "friedrichshain",
    10245: "friedrichshain",
    10247: "friedrichshain",
    10249: "prenzlauer-berg",
    10405: "prenzlauer-berg",
    10407: "prenzlauer-berg",
    10409: "prenzlauer-berg",
    10435: "prenzlauer-berg",
    10437: "prenzlauer-berg",
    10439: "prenzlauer-berg",
    10551: "mitte",
    10557: "mitte",
    10559: "moabit",
    10707: "charlottenburg",
    10709: "charlottenburg",
    10711: "charlottenburg",
    10713: "charlottenburg",
    10715: "charlottenburg",
    10717: "charlottenburg",
    10719: "charlottenburg",
    10777: "schoneberg",
    10779: "schoneberg",
    10781: "schoneberg",
    10783: "schoneberg",
    10785: "schoneberg",
    10787: "schoneberg",
    10789: "schoneberg",
    10823: "schoneberg",
    10825: "schoneberg",
    10827: "schoneberg",
    10829: "schoneberg",
    10961: "kreuzberg",
    10963: "kreuzberg",
    10965: "kreuzberg",
    10967: "kreuzberg",
    10969: "kreuzberg",
    10997: "kreuzberg",
    10999: "kreuzberg",
    12043: "neukolln",
    12045: "neukolln",
    12047: "neukolln",
    12049: "neukolln",
    12051: "neukolln",
    12053: "neukolln",
    12055: "neukolln",
    12057: "neukolln",
    12059: "neukolln",
    12101: "tempelhof",
    12103: "tempelhof",
    12105: "tempelhof",
    12107: "tempelhof",
    12109: "tempelhof",
    12157: "tempelhof",
    12159: "tempelhof",
    12161: "tempelhof",
    12163: "tempelhof",
    12165: "tempelhof",
    12167: "tempelhof",
    12169: "tempelhof",
    12203: "steglitz",
    12205: "steglitz",
    12207: "steglitz",
    12209: "steglitz",
    12247: "steglitz",
    12249: "steglitz",
    12277: "steglitz",
    12279: "steglitz",
    12347: "neukolln",
    12349: "neukolln",
    12351: "neukolln",
    12353: "neukolln",
    12355: "neukolln",
    12357: "neukolln",
    12359: "neukolln",
    12435: "treptow",
    12437: "treptow",
    12439: "treptow",
    12459: "treptow",
    12487: "koepenick",
    12489: "koepenick",
    12524: "treptow",
    12526: "treptow",
    12527: "treptow",
    12555: "koepenick",
    12557: "koepenick",
    12559: "koepenick",
    12587: "koepenick",
    12589: "koepenick",
    12619: "marzahn",
    12621: "marzahn",
    12623: "marzahn",
    12627: "marzahn",
    12629: "marzahn",
    12679: "marzahn",
    12681: "marzahn",
    12683: "marzahn",
    12685: "marzahn",
    12687: "marzahn",
    12689: "marzahn",
    13051: "marzahn",
    13053: "marzahn",
    13055: "marzahn",
    13057: "marzahn",
    13059: "marzahn",
    13086: "hellersdorf",
    13088: "hellersdorf",
    13089: "hellersdorf",
    13125: "pankow",
    13127: "pankow",
    13129: "pankow",
    13156: "pankow",
    13158: "pankow",
    13159: "pankow",
    13187: "pankow",
    13189: "pankow",
    13347: "wedding",
    13349: "wedding",
    13351: "wedding",
    13353: "wedding",
    13355: "wedding",
    13357: "wedding",
    13359: "wedding",
    13403: "reinickendorf",
    13405: "reinickendorf",
    13407: "reinickendorf",
    13409: "reinickendorf",
    13435: "reinickendorf",
    13437: "reinickendorf",
    13439: "reinickendorf",
    13465: "reinickendorf",
    13467: "reinickendorf",
    13469: "reinickendorf",
    13503: "reinickendorf",
    13505: "reinickendorf",
    13507: "reinickendorf",
    13509: "reinickendorf",
    13581: "spandau",
    13583: "spandau",
    13585: "spandau",
    13587: "spandau",
    13589: "spandau",
    13591: "spandau",
    13593: "spandau",
    13595: "spandau",
    13597: "spandau",
    13599: "spandau",
    14050: "charlottenburg",
    14052: "charlottenburg",
    14053: "charlottenburg",
    14055: "charlottenburg",
    14057: "charlottenburg",
    14059: "charlottenburg",
    14109: "zehlendorf",
    14129: "zehlendorf",
    14163: "zehlendorf",
    14165: "zehlendorf",
    14167: "zehlendorf",
    14169: "zehlendorf",
    14193: "zehlendorf",
    14195: "zehlendorf",
    14197: "zehlendorf",
    14199: "zehlendorf",
}

KEYWORD_NEIGHBORHOOD: list[tuple[str, str]] = [
    ("kreuzberg", "kreuzberg"),
    ("neukölln", "neukolln"),
    ("neukolln", "neukolln"),
    ("friedrichshain", "friedrichshain"),
    ("prenzlauer berg", "prenzlauer-berg"),
    ("prenzlauer-berg", "prenzlauer-berg"),
    ("charlottenburg", "charlottenburg"),
    ("schöneberg", "schoneberg"),
    ("schoneberg", "schoneberg"),
    ("tempelhof", "tempelhof"),
    ("wedding", "wedding"),
    ("pankow", "pankow"),
    ("lichtenberg", "lichtenberg"),
    ("treptow", "treptow"),
    ("steglitz", "steglitz"),
    ("zehlendorf", "zehlendorf"),
    ("spandau", "spandau"),
    ("reinickendorf", "reinickendorf"),
    ("marzahn", "marzahn"),
    ("hellersdorf", "hellersdorf"),
    ("köpenick", "koepenick"),
    ("koepenick", "koepenick"),
    ("mitte", "mitte"),
]

SHORT_TERM_RE = re.compile(r"\b(zwischenmiete|befristet|sublet|short[\s-]?term|monatlich)\b", re.I)
WG_RE = re.compile(r"\b(wg[-\s]?zimmer|wg zimmer|shared room|mitbewohner)\b", re.I)
PLZ_RE = re.compile(r"\b(1[0-3]\d{3})\b")


def closest_neighborhood(lat: float, lng: float) -> str:
    best = "mitte"
    best_dist = math.inf
    for slug, (nlat, nlng) in NEIGHBORHOOD_CENTERS.items():
        dist = (lat - nlat) ** 2 + (lng - nlng) ** 2
        if dist < best_dist:
            best_dist = dist
            best = slug
    return best


def neighborhood_from_address(address: str | None) -> str | None:
    if not address:
        return None
    lower = address.lower()
    for keyword, slug in KEYWORD_NEIGHBORHOOD:
        if keyword in lower:
            return slug
    match = PLZ_RE.search(address)
    if match:
        plz = int(match.group(1))
        if plz in PLZ_NEIGHBORHOOD:
            slug = PLZ_NEIGHBORHOOD[plz]
            if slug == "moabit":
                return "mitte"
            return slug
    return None


def infer_category(provider: str | None, title: str | None, description: str | None) -> str:
    text = " ".join(filter(None, [title, description])).lower()
    if provider in {"wggesucht", "wg-gesucht"}:
        return "shared_room"
    if WG_RE.search(text):
        return "shared_room"
    return "full_flat"


def infer_rent_type(title: str | None, description: str | None) -> str:
    text = " ".join(filter(None, [title, description]))
    return "short_term" if SHORT_TERM_RE.search(text) else "long_term"


def infer_schufa(title: str | None, description: str | None) -> bool:
    text = " ".join(filter(None, [title, description])).lower()
    return "schufa" in text


def clamp_int(value: object, default: int, minimum: int, maximum: int) -> int:
    try:
        num = int(round(float(value)))
    except (TypeError, ValueError):
        return default
    return max(minimum, min(maximum, num))


def normalize_coords(lat: object, lng: object, neighborhood: str) -> tuple[float, float]:
    try:
        lat_f = float(lat)
        lng_f = float(lng)
    except (TypeError, ValueError):
        lat_f = lng_f = 0.0
    if 52.3 <= lat_f <= 52.7 and 13.0 <= lng_f <= 13.8:
        return lat_f, lng_f
    center = NEIGHBORHOOD_CENTERS.get(neighborhood, NEIGHBORHOOD_CENTERS["mitte"])
    return center


def convert_row(row: dict) -> dict | None:
    title = (row.get("title") or "").strip()
    link = (row.get("link") or "").strip()
    provider = (row.get("provider") or "").strip()
    source_id = (row.get("hash") or "").strip()

    if not title or not link or not source_id:
        return None

    address = (row.get("address") or "").strip() or "Berlin"
    neighborhood = neighborhood_from_address(address)
    lat_raw = row.get("latitude")
    lng_raw = row.get("longitude")
    if neighborhood is None and lat_raw is not None and lng_raw is not None:
        try:
            neighborhood = closest_neighborhood(float(lat_raw), float(lng_raw))
        except (TypeError, ValueError):
            neighborhood = "mitte"
    if neighborhood is None:
        neighborhood = "mitte"

    lat, lng = normalize_coords(lat_raw, lng_raw, neighborhood)
    description = (row.get("description") or "").strip()
    image = (row.get("image_url") or "").strip()
    price = clamp_int(row.get("price"), default=800, minimum=100, maximum=10000)
    size_sqm = clamp_int(row.get("size"), default=40, minimum=8, maximum=500)
    rooms = clamp_int(row.get("rooms"), default=1, minimum=1, maximum=10)
    category = infer_category(provider, title, description)
    rent_type = infer_rent_type(title, description)
    schufa_required = infer_schufa(title, description)

    created_ms = row.get("created_at")
    if isinstance(created_ms, (int, float)) and created_ms > 0:
        available_from = datetime.fromtimestamp(created_ms / 1000, tz=UTC).date().isoformat()
    else:
        available_from = datetime.now(UTC).date().isoformat()

    photo_urls = [image] if image else []

    return {
        "externalProvider": provider,
        "externalSourceId": source_id,
        "externalUrl": link,
        "title": title[:120],
        "category": category,
        "rentType": rent_type,
        "availableFrom": available_from,
        "availableTo": None,
        "sizeSqm": size_sqm,
        "rooms": rooms,
        "onlineViewingAvailable": False,
        "anmeldungAvailable": False,
        "schufaRequired": schufa_required,
        "address": address[:200],
        "neighborhood": neighborhood,
        "lat": lat,
        "lng": lng,
        "approximateLocation": lat_raw is None or lng_raw is None,
        "costs": {"rentPerMonth": price},
        "descriptions": {
            "apartment": description[:5000] if description else title,
            "location": f"Berlin · {neighborhood.replace('-', ' ').title()}",
            "misc": f"Aggregated from {provider}. Apply on the original listing.",
        },
        "requiredDocuments": ["schufa", "proof_of_income"] if schufa_required else ["passport"],
        "equipment": [],
        "photoUrls": photo_urls,
        "status": "active",
    }


def main() -> int:
    if not IN_PATH.exists():
        print(f"Missing raw export: {IN_PATH}", file=sys.stderr)
        print("Run: npm run fredy:export", file=sys.stderr)
        return 1

    raw = json.loads(IN_PATH.read_text(encoding="utf-8"))
    converted: list[dict] = []
    skipped = 0
    for row in raw.get("listings", []):
        item = convert_row(row)
        if item is None:
            skipped += 1
            continue
        converted.append(item)

    payload = {
        "convertedAt": datetime.now(UTC).isoformat(),
        "sourceExport": str(IN_PATH),
        "count": len(converted),
        "skipped": skipped,
        "listings": converted,
    }

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Converted {len(converted)} listings to {OUT_PATH} (skipped {skipped})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
