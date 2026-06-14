from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from html import escape
from pathlib import Path

BRAND = {
    "name": "renting.berlin",
    "brand": "#2679a3",
    "brand_deep": "#006699",
    "brand_light": "#d4eaf5",
    "brand_muted": "#e8f4fa",
    "ink": "#1a2332",
    "ink_muted": "#5c6b7a",
    "border": "#e2e8f0",
    "white": "#ffffff",
}

DEFAULT_FOOTER = (
    "You received this email from renting.berlin. "
    "If you did not expect it, you can ignore it."
)


@dataclass
class EmailContent:
    subject: str
    title: str
    paragraphs: list[str]
    preview: str | None = None
    cta_label: str | None = None
    cta_href: str | None = None
    footer: str | None = None


@lru_cache(maxsize=1)
def _text_layout() -> str:
    path = Path(__file__).resolve().parent / "text-layout.txt"
    return path.read_text(encoding="utf-8")


def render_text_email(content: EmailContent, *, site_url: str, tracked_links: list[str] | None = None) -> str:
    body = "\n\n".join(content.paragraphs)
    cta_block = ""
    if content.cta_label and content.cta_href:
        href = tracked_links[0] if tracked_links else content.cta_href
        cta_block = f"{content.cta_label}: {href}\n"

    return (
        _text_layout()
        .replace("{{title}}", content.title)
        .replace("{{body}}", body)
        .replace("{{cta_block}}", cta_block)
        .replace("{{footer}}", content.footer or DEFAULT_FOOTER)
        .replace("{{site_url}}", site_url.rstrip("/"))
    )


def render_html_email(
    content: EmailContent,
    *,
    site_url: str,
    logo_url: str,
    tracked_links: list[str] | None = None,
    open_pixel_url: str | None = None,
) -> str:
    preview = escape(content.preview or (content.paragraphs[0] if content.paragraphs else content.title))
    footer = escape(content.footer or DEFAULT_FOOTER)
    site = site_url.rstrip("/")
    colors = BRAND

    paragraphs_html = "".join(
        f'<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:{colors["ink"]};">{escape(p)}</p>'
        for p in content.paragraphs
    )

    cta_html = ""
    if content.cta_label and content.cta_href:
        href = escape(tracked_links[0] if tracked_links else content.cta_href)
        cta_html = f"""
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:10px;background:{colors['brand_deep']};">
            <a href="{href}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:{colors['white']};text-decoration:none;">{escape(content.cta_label)}</a>
          </td>
        </tr>
      </table>"""

    pixel_html = ""
    if open_pixel_url:
        pixel_html = (
            f'<img src="{escape(open_pixel_url)}" width="1" height="1" alt="" '
            'style="display:block;width:1px;height:1px;border:0;opacity:0;" />'
        )

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{escape(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:{colors['brand_muted']};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{colors['brand_muted']};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:{colors['white']};border-radius:16px;overflow:hidden;border:1px solid {colors['border']};">
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(135deg, {colors['brand']} 0%, {colors['brand_deep']} 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="{escape(logo_url)}" width="40" height="40" alt="" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:800;color:{colors['white']};">
                    renting<span style="color:{colors['brand_light']};">.</span>berlin
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:{colors['ink']};">{escape(content.title)}</h1>
              {paragraphs_html}
              {cta_html}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:{colors['ink_muted']};">{footer}</p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;">
                <a href="{escape(site)}" style="color:{colors['brand']};text-decoration:none;font-weight:600;">{escape(site.replace('https://', '').replace('http://', ''))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  {pixel_html}
</body>
</html>"""


def render_branded_email(
    content: EmailContent,
    *,
    site_url: str,
    tracked_links: list[str] | None = None,
    open_pixel_url: str | None = None,
) -> tuple[str, str]:
    logo_url = f"{site_url.rstrip('/')}/email/logo.svg"
    text = render_text_email(content, site_url=site_url, tracked_links=tracked_links)
    html = render_html_email(
        content,
        site_url=site_url,
        logo_url=logo_url,
        tracked_links=tracked_links,
        open_pixel_url=open_pixel_url,
    )
    return text, html
