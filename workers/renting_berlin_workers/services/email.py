from __future__ import annotations

import json
import smtplib
import time
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid
from typing import Sequence

from ..config import EMAIL_FROM, SITE_URL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER
from ..db import cursor
from ..email.build import build_notification_email
from ..metrics import record_email


EVENT_FIELDS = {
    "messages": "notify_messages",
    "saved_searches": "notify_saved_searches",
    "profile_views": "notify_profile_views",
    "listing_updates": "notify_listing_updates",
    "product_news": "notify_product_news",
}


def smtp_configured() -> bool:
    return bool(SMTP_HOST and EMAIL_FROM)


def send_email(
    to: str,
    subject: str,
    text: str,
    html: str,
    *,
    event: str = "direct",
    attachments: Sequence[tuple[str, bytes, str]] | None = None,
) -> None:
    """Send an email. `attachments` is a sequence of (filename, content, subtype)
    tuples, e.g. ("agreement.pdf", pdf_bytes, "pdf")."""
    if not smtp_configured():
        attached = ", ".join(name for name, _, _ in attachments or [])
        suffix = f" attachments={attached}" if attached else ""
        print(f"[email] to={to} subject={subject}{suffix}\n{text}")
        record_email(event, "mock")
        return

    body = MIMEMultipart("alternative")
    body.attach(MIMEText(text, "plain"))
    body.attach(MIMEText(html, "html"))

    if attachments:
        message = MIMEMultipart("mixed")
        message.attach(body)
        for filename, content, subtype in attachments:
            part = MIMEApplication(content, _subtype=subtype)
            part.add_header("Content-Disposition", "attachment", filename=filename)
            message.attach(part)
    else:
        message = body

    message["Subject"] = subject
    message["From"] = EMAIL_FROM
    message["To"] = to
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=EMAIL_FROM.rsplit("@", 1)[-1])

    start = time.perf_counter()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            if SMTP_SECURE:
                server.starttls()
            if SMTP_USER and SMTP_PASS:
                server.login(SMTP_USER, SMTP_PASS)
            server.send_message(message)
    except Exception:
        record_email(event, "failed", time.perf_counter() - start)
        raise

    record_email(event, "sent", time.perf_counter() - start)


def should_notify_email(user_id: str, event: str) -> bool:
    field = EVENT_FIELDS.get(event)
    if not field:
        return False

    with cursor() as cur:
        cur.execute(
            f"""
            SELECT email_enabled, {field}
            FROM user_notification_preferences
            WHERE user_id = %s
            """,
            (user_id,),
        )
        row = cur.fetchone()

    if not row:
        return event != "product_news"

    return bool(row["email_enabled"] and row[field])


def process_email_job(data: dict[str, str]) -> None:
    user_id = data.get("userId", "")
    subject = data.get("subject", "")
    text = data.get("text", "")
    html = data.get("html", "")
    event = data.get("event", "")

    if not user_id or not subject or not text or not html or not event:
        return

    to = data.get("to") or ""
    if not to:
        with cursor() as cur:
            cur.execute("SELECT email FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
        if not row:
            return
        to = row["email"]

    from .email_delivery import deliver_email_job

    deliver_email_job(
        {
            "userId": user_id,
            "to": to,
            "subject": subject,
            "text": text,
            "html": html,
            "event": event,
        }
    )


def build_saved_search_email(user_id: str, title: str, body: str, link: str) -> dict[str, str]:
    return build_notification_email(
        user_id=user_id,
        category="saved_searches",
        title=title,
        body=body,
        link=link,
        site_url=SITE_URL,
    )
