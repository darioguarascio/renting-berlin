from __future__ import annotations

import os
import re

BRAND_NAME = "renting.berlin"


def email_from_name() -> str:
    return os.environ.get("EMAIL_FROM_NAME", "").strip() or BRAND_NAME


def email_logo_url(site_url: str) -> str:
    return f"{site_url.rstrip('/')}/email/logo.png"


def format_email_from(from_addr: str | None = None, name: str | None = None) -> str:
    address = (from_addr or os.environ.get("EMAIL_FROM", "")).strip()
    if not address:
        return ""

    if re.match(r"^[^<]*<[^>]+>$", address):
        return address

    display = (name or email_from_name()).strip() or BRAND_NAME
    escaped = display.replace("\\", "\\\\").replace('"', '\\"')
    return f'"{escaped}" <{address}>'
