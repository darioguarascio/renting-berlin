from __future__ import annotations

from ..config import SITE_URL
from ..db import cursor
from .template import EmailContent, render_branded_email
from .tracking import create_email_send, tracking_open_url, wrap_links_for_tracking


def build_notification_email(
    *,
    user_id: str,
    category: str,
    title: str,
    body: str,
    link: str,
    cta_label: str = "View on renting.berlin",
    site_url: str | None = None,
) -> dict[str, str]:
    site = site_url or SITE_URL
    absolute_link = link if link.startswith("http") else f"{site.rstrip('/')}{link}"

    with cursor() as cur:
        cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
        row = cur.fetchone()
    if not row:
        raise ValueError(f"User not found: {user_id}")

    to_email = row["email"]
    content = EmailContent(
        subject=title,
        preview=body,
        title=title,
        paragraphs=[body],
        cta_label=cta_label,
        cta_href=absolute_link,
    )

    links = [absolute_link]
    send_id = create_email_send(
        to_email=to_email,
        user_id=user_id,
        category=category,
        subject=title,
        links=links,
    )
    tracked_links = wrap_links_for_tracking(send_id, links, site)
    text, html = render_branded_email(
        content,
        site_url=site,
        tracked_links=tracked_links,
        open_pixel_url=tracking_open_url(send_id, site),
    )

    return {
        "userId": user_id,
        "to": to_email,
        "subject": title,
        "text": text,
        "html": html,
        "event": category,
    }
