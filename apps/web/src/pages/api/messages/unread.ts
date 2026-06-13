import type { APIRoute } from 'astro';
import { getUnreadCount } from '../../../lib/messages';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return Response.json({ count: 0 });

  const count = await getUnreadCount(session.user.id);
  return Response.json({ count });
};
