import { getSiteUrl } from '../site-url';
import { createEmailSend, getEmailSend, recordEmailEvent } from '../analytics/email-analytics';

export const TRACKING_GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

export function trackingOpenUrl(sendId: string, siteUrl?: string): string {
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, '');
  return `${base}/e/o/${sendId}.gif`;
}

export function trackingClickUrl(sendId: string, linkIndex: number, siteUrl?: string): string {
  const base = (siteUrl ?? getSiteUrl()).replace(/\/$/, '');
  return `${base}/e/c/${sendId}/${linkIndex}`;
}

export { createEmailSend };

export function wrapLinksForTracking(sendId: string, links: string[], siteUrl?: string): string[] {
  return links.map((_url, index) => trackingClickUrl(sendId, index, siteUrl));
}

function requestMeta(request: Request) {
  return {
    userAgent: request.headers.get('user-agent'),
    ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? null,
  };
}

export async function recordEmailOpen(sendId: string, request: Request): Promise<boolean> {
  const send = await getEmailSend(sendId);
  if (!send) return false;

  await recordEmailEvent({
    sendId,
    type: 'open',
    ...requestMeta(request),
  });
  return true;
}

export async function recordEmailClick(
  sendId: string,
  linkIndex: number,
  request: Request,
): Promise<string | null> {
  const send = await getEmailSend(sendId);
  if (!send) return null;

  const target = send.links[linkIndex];
  if (!target) return null;

  try {
    await recordEmailEvent({
      sendId,
      type: 'click',
      linkIndex,
      ...requestMeta(request),
    });
  } catch (error) {
    console.warn('[email] click tracking failed, redirecting anyway:', error);
  }

  return target;
}
