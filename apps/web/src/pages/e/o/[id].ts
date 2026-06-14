import type { APIRoute } from 'astro';
import { recordEmailOpen, TRACKING_GIF } from '../../../lib/email/tracking';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const sendId = params.id?.replace(/\.gif$/i, '');
  if (sendId) {
    await recordEmailOpen(sendId, request).catch(() => {});
  }

  return new Response(TRACKING_GIF, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      Pragma: 'no-cache',
    },
  });
};
