import type { APIRoute } from 'astro';
import { createInvite, revokeInvite } from '../../../lib/connections';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === 'string' ? body.label : undefined;
  const maxUses = typeof body.maxUses === 'number' ? body.maxUses : null;
  const expiresInDays = typeof body.expiresInDays === 'number' ? body.expiresInDays : null;

  const invite = await createInvite(session.user.id, { label, maxUses, expiresInDays });
  return Response.json({ invite }, { status: 201 });
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === 'string' ? body.id : null;
  if (!id) return new Response('Missing invite id', { status: 400 });

  const ok = await revokeInvite(session.user.id, id);
  return Response.json({ ok });
};
