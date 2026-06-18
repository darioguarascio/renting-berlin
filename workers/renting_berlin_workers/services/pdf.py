"""Markdown -> PDF conversion for contract documents.

Uses `markdown` to render to HTML and `xhtml2pdf` (pure-Python, no system
libraries) to produce the PDF, keeping the slim worker image dependency-light.
"""

from __future__ import annotations

import html
import io
import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import markdown as markdown_lib
from xhtml2pdf import pisa

_FONT_PATH = (
    Path(__file__).resolve().parent.parent / "assets" / "fonts" / "Caveat-Regular.ttf"
)
_FONT_URI = _FONT_PATH.as_uri()

_SIGNATURE_TABLE_PATTERN = re.compile(
    r"<table>\s*<thead>\s*<tr>\s*<th>\s*Main Tenant\s*</th>\s*<th>\s*Subtenant\s*</th>\s*</tr>\s*</thead>\s*<tbody>.*?</tbody>\s*</table>",
    re.IGNORECASE | re.DOTALL,
)


@dataclass(frozen=True)
class SignatureInfo:
    label: str
    name: str
    signed_at: datetime


def format_signed_at(value: datetime) -> str:
    """Human-readable signing timestamp in Berlin local time."""
    if value.tzinfo is None:
        value = value.replace(tzinfo=ZoneInfo("UTC"))
    return value.astimezone(ZoneInfo("Europe/Berlin")).strftime("%d %B %Y at %H:%M:%S %Z")


def _css() -> str:
    return f"""
@page {{ size: A4; margin: 2.2cm 2cm; }}
@font-face {{
  font-family: "Caveat";
  src: url("{_FONT_URI}");
}}
body {{ font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.45; }}
h1 {{ font-size: 18pt; margin: 0 0 4pt 0; }}
h2 {{ font-size: 12.5pt; margin: 16pt 0 4pt 0; border-bottom: 1px solid #ddd; padding-bottom: 2pt; }}
h3 {{ font-size: 11pt; margin: 10pt 0 3pt 0; }}
p {{ margin: 4pt 0; }}
ul, ol {{ margin: 4pt 0 4pt 16pt; }}
li {{ margin: 2pt 0; }}
hr {{ border: none; border-top: 1px solid #ccc; margin: 12pt 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 8pt 0; }}
td, th {{ border: 1px solid #ccc; padding: 6pt; text-align: left; vertical-align: top; }}
em {{ color: #555; }}
strong {{ color: #000; }}
.signatures-table td {{ padding: 10pt 8pt 12pt; }}
.signature-role {{
  margin: 0 0 4pt;
  font-size: 8pt;
  font-weight: bold;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #666;
}}
.signature-name {{
  margin: 0 0 6pt;
  font-family: "Caveat", cursive;
  font-size: 24pt;
  line-height: 1.1;
  color: #1a3a5c;
  border-bottom: 1px solid #888;
  padding-bottom: 4pt;
}}
.signature-time {{
  margin: 0;
  font-size: 8.5pt;
  color: #555;
}}
"""


def _signature_cell(party: SignatureInfo) -> str:
    return (
        f'<td class="signature-cell">'
        f'<p class="signature-role">{html.escape(party.label)}</p>'
        f'<p class="signature-name">{html.escape(party.name)}</p>'
        f'<p class="signature-time">Signed {html.escape(format_signed_at(party.signed_at))}</p>'
        f"</td>"
    )


def build_signatures_table_html(main_tenant: SignatureInfo, subtenant: SignatureInfo) -> str:
    return (
        '<table class="signatures-table">'
        "<thead><tr><th>Main Tenant</th><th>Subtenant</th></tr></thead>"
        f"<tbody><tr>{_signature_cell(main_tenant)}{_signature_cell(subtenant)}</tr></tbody>"
        "</table>"
    )


def inject_signatures(
    html_body: str,
    main_tenant: SignatureInfo,
    subtenant: SignatureInfo,
) -> str:
    """Replace the blank signature table in rendered contract HTML."""
    table = build_signatures_table_html(main_tenant, subtenant)
    if _SIGNATURE_TABLE_PATTERN.search(html_body):
        return _SIGNATURE_TABLE_PATTERN.sub(table, html_body, count=1)

    marker = "<h2>Signatures</h2>"
    if marker in html_body:
        return html_body.replace(marker, f"{marker}\n{table}", 1)

    return f"{html_body}\n{table}"


def markdown_to_pdf(md: str) -> bytes:
    """Render markdown text into PDF bytes. Raises on failure."""
    return _render_pdf(md, None, None)


def markdown_to_signed_pdf(
    md: str,
    main_tenant: SignatureInfo,
    subtenant: SignatureInfo,
) -> bytes:
    """Render markdown and inject handwritten-style signatures before PDF export."""
    return _render_pdf(md, main_tenant, subtenant)


def _render_pdf(
    md: str,
    main_tenant: SignatureInfo | None,
    subtenant: SignatureInfo | None,
) -> bytes:
    html_body = markdown_lib.markdown(
        md,
        extensions=["tables", "sane_lists", "nl2br"],
    )
    if main_tenant and subtenant:
        html_body = inject_signatures(html_body, main_tenant, subtenant)

    document = f"<html><head><style>{_css()}</style></head><body>{html_body}</body></html>"

    buffer = io.BytesIO()
    result = pisa.CreatePDF(src=document, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
    return buffer.getvalue()
