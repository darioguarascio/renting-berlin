import type { APIRoute } from 'astro';
import { cancelStayOffer, getStayOffer, updateStayOffer } from '../../../lib/stay-offers';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const result = await getStayOffer(session.user.id, params.id!);
  if (!result.ok) {
    return new Response(result.reason, { status: result.reason === 'not_found' ? 404 : 403 });
  }
  return Response.json({ offer: result.offer });
};

export const PATCH: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const status = body.status;
  if (status !== 'open' && status !== 'closed') {
    return new Response('Invalid status', { status: 400 });
  }
  const ok = await updateStayOffer(session.user.id, params.id!, { status });
  return Response.json({ ok });
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const ok = await cancelStayOffer(session.user.id, params.id!);
  return Response.json({ ok });
};
