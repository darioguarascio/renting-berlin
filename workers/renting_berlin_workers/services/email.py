from __future__ import annotations

import json
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.utils import formatdate, make_msgid

from ..config import EMAIL_FROM, SITE_URL, SMTP_HOST, SMTP_PASS, SMTP_PORT, SMTP_SECURE, SMTP_USER
from ..db import cursor
from ..email.build import build_notification_email


EVENT_FIELDS = {
    "messages": "notify_messages",
    "saved_searches": "notify_saved_searches",
    "profile_views": "notify_profile_views",
    "listing_updates": "notify_listing_updates",
    "product_news": "notify_product_news",
}


def smtp_configured() -> bool:
    return bool(SMTP_HOST and EMAIL_FROM)


def send_email(to: str, subject: str, text: str, html: str) -> None:
    if not smtp_configured():
        print(f"[email] to={to} subject={subject}\n{text}")
        return

    message = MIMEMultipart("alternative")
    message["Subject"] = subject
    message["From"] = EMAIL_FROM
    message["To"] = to
    message["Date"] = formatdate(localtime=True)
    message["Message-ID"] = make_msgid(domain=EMAIL_FROM.rsplit("@", 1)[-1])
    message.attach(MIMEText(text, "plain"))
    message.attach(MIMEText(html, "html"))

    with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
        if SMTP_SECURE:
            server.starttls()
        if SMTP_USER and SMTP_PASS:
            server.login(SMTP_USER, SMTP_PASS)
        server.send_message(message)


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
