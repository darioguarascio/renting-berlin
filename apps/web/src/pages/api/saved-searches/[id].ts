import type { APIRoute } from 'astro';
import { z } from 'zod';
import { deleteSavedSearch, updateSavedSearch } from '../../../lib/saved-searches';
import { getSession } from '../../../lib/session';

export const prerender = false;

const patchSchema = z.object({
  notifyEnabled: z.boolean().optional(),
  name: z.string().max(120).optional(),
});

export const PATCH: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = patchSchema.parse(await request.json());
    const updated = await updateSavedSearch(session.user.id, params.id!, body);
    if (!updated) return new Response('Not found', { status: 404 });
    return Response.json({ item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid update';
    return new Response(message, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const ok = await deleteSavedSearch(session.user.id, params.id!);
  if (!ok) return new Response('Not found', { status: 404 });
  return new Response(null, { status: 204 });
};
