import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import { closeDb, db } from '../../../db';
import { listings } from '../../../db/schema';
import { indexListing, warmListingCache } from '../../../lib/search';

export const prerender = false;

function unauthorized(): Response {
  return new Response('Unauthorized', { status: 401 });
}

function getSecret(request: Request): string | null {
  const auth = request.headers.get('authorization');
  if (auth?.startsWith('Bearer ')) {
    return auth.slice('Bearer '.length).trim() || null;
  }
  return request.headers.get('x-fredy-sync-secret');
}

export const POST: APIRoute = async ({ request }) => {
  const expected = process.env.FREDY_SYNC_SECRET;
  if (!expected) {
    return new Response('FREDY_SYNC_SECRET is not configured', { status: 503 });
  }

  const provided = getSecret(request);
  if (!provided || provided !== expected) {
    return unauthorized();
  }

  const body = await request.json().catch(() => ({}));
  const mode = typeof body?.mode === 'string' ? body.mode : 'warm';

  try {
    if (mode === 'external') {
      const rows = await db.query.listings.findMany({
        where: eq(listings.sourceType, 'external'),
        columns: { id: true },
      });
      for (const row of rows) {
        await indexListing(row.id);
      }
      return Response.json({ ok: true, mode, indexed: rows.length });
    }

    const count = await warmListingCache();
    return Response.json({ ok: true, mode: 'warm', indexed: count });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ ok: false, error: message }, { status: 500 });
  } finally {
    await closeDb();
  }
};
