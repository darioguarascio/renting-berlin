import textLayout from './text-layout.txt?raw';
import { DEFAULT_EMAIL_FOOTER, EMAIL_BRAND } from './brand';
import { escapeHtml } from './utils';

export type EmailContent = {
  subject: string;
  preview?: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; href: string };
  footer?: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

export function renderTextEmail(
  content: EmailContent,
  options: { siteUrl: string; trackedLinks?: string[] },
): string {
  const body = content.paragraphs.join('\n\n');
  const ctaBlock =
    content.cta && options.trackedLinks?.[0]
      ? `${content.cta.label}: ${options.trackedLinks[0]}`
      : content.cta
        ? `${content.cta.label}: ${content.cta.href}`
        : '';

  return textLayout
    .replace('{{title}}', content.title)
    .replace('{{body}}', body)
    .replace('{{cta_block}}', ctaBlock ? `${ctaBlock}\n` : '')
    .replace('{{footer}}', content.footer ?? DEFAULT_EMAIL_FOOTER)
    .replace('{{site_url}}', options.siteUrl.replace(/\/$/, ''));
}

export function renderHtmlEmail(
  content: EmailContent,
  options: {
    siteUrl: string;
    logoUrl: string;
    trackedLinks?: string[];
    openPixelUrl?: string;
  },
): string {
  const preview = escapeHtml(content.preview ?? content.paragraphs[0] ?? content.title);
  const footer = escapeHtml(content.footer ?? DEFAULT_EMAIL_FOOTER);
  const siteUrl = options.siteUrl.replace(/\/$/, '');
  const { colors } = EMAIL_BRAND;

  const paragraphsHtml = content.paragraphs
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${colors.ink};">${escapeHtml(paragraph)}</p>`,
    )
    .join('');

  let ctaHtml = '';
  if (content.cta) {
    const href = options.trackedLinks?.[0] ?? content.cta.href;
    ctaHtml = `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
        <tr>
          <td style="border-radius:10px;background:${colors.brandDeep};">
            <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 28px;font-size:16px;font-weight:700;color:${colors.white};text-decoration:none;">${escapeHtml(content.cta.label)}</a>
          </td>
        </tr>
      </table>`;
  }

  const pixelHtml = options.openPixelUrl
    ? `<img src="${escapeHtml(options.openPixelUrl)}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0;opacity:0;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <meta name="supported-color-schemes" content="light" />
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${colors.brandMuted};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preview}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${colors.brandMuted};padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:${colors.white};border-radius:16px;overflow:hidden;border:1px solid ${colors.border};">
          <tr>
            <td style="padding:28px 32px 20px;background:linear-gradient(135deg, ${colors.brand} 0%, ${colors.brandDeep} 100%);">
              <table role="presentation" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-right:12px;vertical-align:middle;">
                    <img src="${escapeHtml(options.logoUrl)}" width="40" height="40" alt="" style="display:block;border:0;" />
                  </td>
                  <td style="vertical-align:middle;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:800;color:${colors.white};">
                    renting<span style="color:${colors.brandLight};">.</span>berlin
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <h1 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:26px;line-height:1.2;color:${colors.ink};">${escapeHtml(content.title)}</h1>
              ${paragraphsHtml}
              ${ctaHtml}
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <p style="margin:0;font-size:13px;line-height:1.5;color:${colors.inkMuted};">${footer}</p>
              <p style="margin:12px 0 0;font-size:13px;line-height:1.5;">
                <a href="${escapeHtml(siteUrl)}" style="color:${colors.brand};text-decoration:none;font-weight:600;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  ${pixelHtml}
</body>
</html>`;
}

export function renderBrandedEmail(
  content: EmailContent,
  options: {
    siteUrl: string;
    trackedLinks?: string[];
    openPixelUrl?: string;
  },
): RenderedEmail {
  const logoUrl = `${options.siteUrl.replace(/\/$/, '')}/email/logo.svg`;
  return {
    subject: content.subject,
    text: renderTextEmail(content, options),
    html: renderHtmlEmail(content, { ...options, logoUrl }),
  };
}
