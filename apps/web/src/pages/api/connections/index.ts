import type { APIRoute } from 'astro';
import { listConnections, listInvites } from '../../../lib/connections';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const [connections, invites] = await Promise.all([
    listConnections(session.user.id),
    listInvites(session.user.id),
  ]);
  return Response.json({ connections, invites });
};
