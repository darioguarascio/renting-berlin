import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '../../../db';
import { favorites } from '../../../db/schema';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return Response.json({ ids: [] });

  const rows = await db.query.favorites.findMany({
    where: eq(favorites.userId, session.user.id),
  });
  return Response.json({ ids: rows.map((r) => r.listingId) });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const listingId = body.listingId as string;
  if (!listingId) return new Response('Bad request', { status: 400 });

  await db
    .insert(favorites)
    .values({ id: nanoid(), userId: session.user.id, listingId })
    .onConflictDoNothing();

  return Response.json({ ok: true });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const listingId = body.listingId as string;
  if (!listingId) return new Response('Bad request', { status: 400 });

  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, session.user.id), eq(favorites.listingId, listingId)));

  return Response.json({ ok: true });
};
