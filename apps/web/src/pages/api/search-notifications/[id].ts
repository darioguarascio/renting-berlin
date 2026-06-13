import type { APIRoute } from 'astro';
import { markSearchNotificationRead } from '../../../lib/saved-searches';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  await markSearchNotificationRead(session.user.id, params.id!);
  return Response.json({ ok: true });
};
