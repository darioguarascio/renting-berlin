import type { APIRoute } from 'astro';
import {
  createStayOffer,
  listMyStayOffers,
  listStayFeed,
  stayOfferInputSchema,
} from '../../../lib/stay-offers';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const [feed, mine] = await Promise.all([
    listStayFeed(session.user.id),
    listMyStayOffers(session.user.id),
  ]);
  return Response.json({ feed, mine });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const input = stayOfferInputSchema.parse(body);
    const row = await createStayOffer(session.user.id, input);
    return Response.json({ id: row.id }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid stay offer';
    return new Response(message, { status: 400 });
  }
};
