import type { APIRoute } from 'astro';
import { removeConnection } from '../../../lib/connections';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const DELETE: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const ok = await removeConnection(session.user.id, params.id!);
  return Response.json({ ok });
};
