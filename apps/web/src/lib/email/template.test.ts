import { describe, expect, it } from 'vitest';
import { renderBrandedEmail, renderTextEmail } from './template';

describe('email template', () => {
  const content = {
    subject: 'New listing matches your search',
    title: 'New listing matches your search',
    paragraphs: ['Bright 2-room flat in Kreuzberg'],
    cta: { label: 'View listing', href: 'https://renting.berlin/listings/test--abc' },
  };

  it('renders branded html with logo and colors', () => {
    const { html, text } = renderBrandedEmail(content, {
      siteUrl: 'https://renting.berlin',
      trackedLinks: ['https://renting.berlin/e/c/send123/0'],
      openPixelUrl: 'https://renting.berlin/e/o/send123.gif',
    });

    expect(html).toContain('renting.berlin');
    expect(html).toContain('#2679a3');
    expect(html).toContain('/email/logo.svg');
    expect(html).toContain('Bright 2-room flat in Kreuzberg');
    expect(html).toContain('https://renting.berlin/e/c/send123/0');
    expect(html).toContain('https://renting.berlin/e/o/send123.gif');
    expect(text).toContain('renting.berlin');
    expect(text).toContain('Bright 2-room flat in Kreuzberg');
    expect(text).toContain('https://renting.berlin/e/c/send123/0');
  });

  it('uses the text layout file placeholders', () => {
    const text = renderTextEmail(content, {
      siteUrl: 'https://renting.berlin',
      trackedLinks: ['https://renting.berlin/e/c/send123/0'],
    });

    expect(text).toMatch(/^renting\.berlin/m);
    expect(text).toContain('---');
    expect(text).toContain('https://renting.berlin');
  });

  it('falls back to the raw CTA href when tracking links are missing', () => {
    const text = renderTextEmail(content, { siteUrl: 'https://renting.berlin/' });
    expect(text).toContain('View listing: https://renting.berlin/listings/test--abc');
  });

  it('omits the CTA block when no button is configured', () => {
    const text = renderTextEmail(
      { ...content, cta: undefined },
      { siteUrl: 'https://renting.berlin' },
    );
    expect(text).not.toContain('View listing:');
  });
});
