import type { APIRoute } from 'astro';
import {
  getUnreadSearchNotificationCount,
  listSearchNotifications,
  markAllSearchNotificationsRead,
} from '../../../lib/saved-searches';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  if (url.searchParams.get('count') === '1') {
    const count = await getUnreadSearchNotificationCount(session.user.id);
    return Response.json({ count });
  }

  const items = await listSearchNotifications(session.user.id);
  const unreadCount = await getUnreadSearchNotificationCount(session.user.id);
  return Response.json({ items, unreadCount });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  await markAllSearchNotificationsRead(session.user.id);
  return Response.json({ ok: true });
};
