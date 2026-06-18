import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { listings } from '../../../db/schema';
import { indexListing } from '../../../lib/search';
import { enqueueNotificationJob } from '../../../lib/notification-events';
import { enqueueTelegramJob } from '../../../lib/telegram-events';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return new Response('Not configured', { status: 503 });

  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${secret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { shortCode } = await request.json().catch(() => ({})) as { shortCode?: string };
  if (!shortCode) return new Response('shortCode required', { status: 400 });

  const row = await db.query.listings.findFirst({ where: eq(listings.shortCode, shortCode) });
  if (!row) return new Response('Not found', { status: 404 });

  if (row.moderationStatus === 'approved') {
    return Response.json({ ok: true, message: 'Already approved', id: row.id });
  }

  await db
    .update(listings)
    .set({ moderationStatus: 'approved', updatedAt: new Date() })
    .where(eq(listings.id, row.id));

  if (row.status === 'active') {
    await indexListing(row.id);
    await enqueueNotificationJob('new_listing', row.id);
    await enqueueTelegramJob('new_listing', row.id);
  }

  return Response.json({ ok: true, id: row.id, title: row.title });
};
