import type { APIRoute } from 'astro';
import {
  getNewNotificationCount,
  listNewNotifications,
  listOlderNotifications,
  recordNotificationsVisit,
} from '../../../lib/notifications';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  if (url.searchParams.get('count') === '1') {
    const count = await getNewNotificationCount(session.user.id);
    return Response.json({ count });
  }

  const [newItems, olderItems, newCount] = await Promise.all([
    listNewNotifications(session.user.id),
    listOlderNotifications(session.user.id),
    getNewNotificationCount(session.user.id),
  ]);
  return Response.json({ newItems, olderItems, newCount });
};

/** Mark inbox as viewed (clears badge). */
export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  await recordNotificationsVisit(session.user.id);
  return Response.json({ ok: true });
};
