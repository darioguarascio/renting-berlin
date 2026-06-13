import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { db } from '../../../db';
import { listings } from '../../../db/schema';
import { createListing, listingInputSchema } from '../../../lib/listings';
import { buildListingPath } from '../../../lib/urls';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const rows = await db.query.listings.findMany({
    where: eq(listings.publisherId, session.user.id),
    orderBy: (table, { desc }) => [desc(table.updatedAt)],
  });

  return Response.json({
    items: rows.map((r) => ({
      id: r.id,
      slug: r.slug,
      shortCode: r.shortCode,
      path: buildListingPath(r.slug, r.shortCode),
      title: r.title,
      status: r.status,
      rentPerMonth: r.costs.rentPerMonth,
      neighborhood: r.neighborhood,
      photoUrl: r.photoUrls[0] ?? null,
      updatedAt: r.updatedAt.toISOString(),
    })),
  });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const input = listingInputSchema.parse(body);
    const row = await createListing(session.user.id, input);
    return Response.json({
      id: row.id,
      slug: row.slug,
      shortCode: row.shortCode,
      path: buildListingPath(row.slug, row.shortCode),
      status: row.status,
    }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid listing data';
    return new Response(message, { status: 400 });
  }
};
