"""Markdown -> PDF conversion for contract documents.

Uses `markdown` to render to HTML and `xhtml2pdf` (pure-Python, no system
libraries) to produce the PDF, keeping the slim worker image dependency-light.
"""

from __future__ import annotations

import io

import markdown as markdown_lib
from xhtml2pdf import pisa

_CSS = """
@page { size: A4; margin: 2.2cm 2cm; }
body { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #1a1a1a; line-height: 1.45; }
h1 { font-size: 18pt; margin: 0 0 4pt 0; }
h2 { font-size: 12.5pt; margin: 16pt 0 4pt 0; border-bottom: 1px solid #ddd; padding-bottom: 2pt; }
h3 { font-size: 11pt; margin: 10pt 0 3pt 0; }
p { margin: 4pt 0; }
ul, ol { margin: 4pt 0 4pt 16pt; }
li { margin: 2pt 0; }
hr { border: none; border-top: 1px solid #ccc; margin: 12pt 0; }
table { width: 100%; border-collapse: collapse; margin: 8pt 0; }
td, th { border: 1px solid #ccc; padding: 6pt; text-align: left; vertical-align: top; }
em { color: #555; }
strong { color: #000; }
"""


def markdown_to_pdf(md: str) -> bytes:
    """Render markdown text into PDF bytes. Raises on failure."""
    html_body = markdown_lib.markdown(
        md,
        extensions=["tables", "sane_lists", "nl2br"],
    )
    document = f"<html><head><style>{_CSS}</style></head><body>{html_body}</body></html>"

    buffer = io.BytesIO()
    result = pisa.CreatePDF(src=document, dest=buffer, encoding="utf-8")
    if result.err:
        raise RuntimeError(f"PDF generation failed with {result.err} error(s)")
    return buffer.getvalue()
