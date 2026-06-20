import type { APIRoute } from 'astro';
import { createClaim } from '../../../../lib/stay-claims';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const message = typeof body.message === 'string' ? body.message : undefined;

  const result = await createClaim(params.id!, session.user.id, message);
  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return Response.json({ ok: true, status: result.status }, { status: 201 });
};
