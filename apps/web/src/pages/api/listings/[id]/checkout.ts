import type { APIRoute } from 'astro';
import {
  checkoutInputSchema,
  completeListingCheckout,
  getListingCheckoutContext,
} from '../../../../lib/rental-checkout';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const context = await getListingCheckoutContext(params.id!, session.user.id);
  if (!context) return new Response('Not found', { status: 404 });

  return Response.json(context);
};

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const input = checkoutInputSchema.parse(body);
    const result = await completeListingCheckout(params.id!, session.user.id, input);
    if (!result) return new Response('Not found', { status: 404 });

    return Response.json({
      status: result.listing.status,
      transactionCreated: result.transactionCreated,
      rejectedCount: result.rejectedCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid checkout data';
    return new Response(message, { status: 400 });
  }
};
