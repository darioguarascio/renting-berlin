import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createSavedSearch, listSavedSearches } from '../../../lib/saved-searches';
import { getSession } from '../../../lib/session';

export const prerender = false;

const createSchema = z.object({
  type: z.enum(['listings', 'tenant_requests']),
  filters: z.record(z.string(), z.unknown()),
  name: z.string().max(120).optional(),
});

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const items = await listSavedSearches(session.user.id);
  return Response.json({ items });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = createSchema.parse(await request.json());
    const result = await createSavedSearch(session.user.id, body.type, body.filters, body.name);
    return Response.json(result, { status: result.created ? 201 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid saved search';
    return new Response(message, { status: 400 });
  }
};
