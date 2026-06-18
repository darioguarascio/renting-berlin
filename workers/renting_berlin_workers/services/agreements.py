"""Agreement worker: renders a signed contract's markdown to a PDF and emails
it to both parties as an attachment. Triggered by the `agreements:events` stream
when an agreement becomes binding."""

from __future__ import annotations

import logging
from datetime import datetime

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
        a.proposer_id,
        a.counterparty_id,
        a.proposer_signature_name,
        a.proposer_signed_at,
        a.counterparty_signature_name,
        a.counterparty_signed_at,
        c.publisher_id,
        u1.email AS proposer_email,
        u1.name  AS proposer_name,
        u2.email AS counterparty_email,
        u2.name  AS counterparty_name
    FROM agreements a
    JOIN conversations c ON c.id = a.conversation_id
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


def _party_signatures(row: dict) -> tuple[tuple[str, str, datetime], tuple[str, str, datetime]]:
    """Map proposer/counterparty signatures onto Main Tenant / Subtenant roles."""
    publisher_id = row["publisher_id"]
    proposer_is_publisher = row["proposer_id"] == publisher_id

    if proposer_is_publisher:
        publisher_name = row["proposer_signature_name"]
        publisher_signed_at = row["proposer_signed_at"]
        inquirer_name = row["counterparty_signature_name"]
        inquirer_signed_at = row["counterparty_signed_at"]
    else:
        inquirer_name = row["proposer_signature_name"]
        inquirer_signed_at = row["proposer_signed_at"]
        publisher_name = row["counterparty_signature_name"]
        publisher_signed_at = row["counterparty_signed_at"]

    if not publisher_name or not inquirer_name or not publisher_signed_at or not inquirer_signed_at:
        raise ValueError("Signed agreement is missing one or both party signatures")

    main_tenant = ("Main Tenant", publisher_name, _as_datetime(publisher_signed_at))
    subtenant = ("Subtenant", inquirer_name, _as_datetime(inquirer_signed_at))
    return main_tenant, subtenant


def _as_datetime(value: datetime) -> datetime:
    if isinstance(value, datetime):
        return value
    raise TypeError(f"Expected datetime, got {type(value)!r}")


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

    try:
        main_raw, sub_raw = _party_signatures(row)
    except ValueError as exc:
        logger.warning("agreement %s: %s", agreement_id, exc)
        return

    # Import lazily so the worker can start even if PDF deps are missing.
    from .pdf import SignatureInfo, markdown_to_signed_pdf

    main_tenant = SignatureInfo(*main_raw)
    subtenant = SignatureInfo(*sub_raw)
    pdf_bytes = markdown_to_signed_pdf(markdown, main_tenant, subtenant)
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
