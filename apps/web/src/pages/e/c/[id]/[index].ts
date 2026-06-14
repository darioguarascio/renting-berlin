import type { APIRoute } from 'astro';
import { recordEmailClick } from '../../../../lib/email/tracking';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const sendId = params.id;
  const linkIndex = Number(params.index);
  if (!sendId || !Number.isInteger(linkIndex) || linkIndex < 0) {
    return new Response('Not found', { status: 404 });
  }

  const target = await recordEmailClick(sendId, linkIndex, request).catch(() => null);
  if (!target) {
    return new Response('Not found', { status: 404 });
  }

  return Response.redirect(target, 302);
};
