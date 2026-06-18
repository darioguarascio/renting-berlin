"""Agreement worker: renders a signed contract's markdown to a PDF and emails
it to both parties as an attachment. Triggered by the `agreements:events` stream
when an agreement becomes binding."""

from __future__ import annotations

import logging

from ..config import SITE_URL
from ..db import cursor
from .email import send_email

logger = logging.getLogger(__name__)

_QUERY = """
    SELECT
        a.id,
        a.title,
        a.status,
        a.contract_markdown,
        u1.email AS proposer_email,
        u1.name  AS proposer_name,
        u2.email AS counterparty_email,
        u2.name  AS counterparty_name
    FROM agreements a
    JOIN users u1 ON u1.id = a.proposer_id
    JOIN users u2 ON u2.id = a.counterparty_id
    WHERE a.id = %s
"""


def _build_email(title: str) -> tuple[str, str, str]:
    subject = f"Your signed rental agreement: {title}"
    text = (
        "Both parties have signed the rental agreement.\n\n"
        f"The fully signed contract \"{title}\" is attached to this email as a PDF.\n"
        "Please keep a copy for your records.\n\n"
        f"{SITE_URL}\n"
    )
    html = (
        '<div style="font-family:Helvetica,Arial,sans-serif;font-size:15px;color:#1a1a1a">'
        "<p>Both parties have signed the rental agreement.</p>"
        f'<p>The fully signed contract <strong>{title}</strong> is attached to this email '
        "as a PDF. Please keep a copy for your records.</p>"
        f'<p><a href="{SITE_URL}">{SITE_URL}</a></p>'
        "</div>"
    )
    return subject, text, html


def process_agreement_job(data: dict[str, str]) -> None:
    if data.get("type") != "signed":
        return

    agreement_id = data.get("agreementId", "")
    if not agreement_id:
        return

    with cursor() as cur:
        cur.execute(_QUERY, (agreement_id,))
        row = cur.fetchone()

    if not row:
        logger.warning("agreement %s not found", agreement_id)
        return
    if row["status"] != "signed":
        logger.info("agreement %s is %s, skipping PDF", agreement_id, row["status"])
        return

    markdown = row["contract_markdown"]
    if not markdown:
        logger.warning("agreement %s has no contract markdown", agreement_id)
        return

    # Import lazily so the worker can start even if PDF deps are missing.
    from .pdf import markdown_to_pdf

    pdf_bytes = markdown_to_pdf(markdown)
    attachment = ("rental-agreement.pdf", pdf_bytes, "pdf")

    subject, text, html = _build_email(row["title"])

    recipients = {
        email
        for email in (row["proposer_email"], row["counterparty_email"])
        if email
    }
    for to in recipients:
        send_email(
            to,
            subject,
            text,
            html,
            event="agreement",
            attachments=[attachment],
        )

    logger.info("sent signed agreement %s to %d recipient(s)", agreement_id, len(recipients))
