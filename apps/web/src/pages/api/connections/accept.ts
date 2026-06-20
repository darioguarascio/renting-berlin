import type { APIRoute } from 'astro';
import { acceptInvite } from '../../../lib/connections';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const code = typeof body.code === 'string' ? body.code : null;
  if (!code) return new Response('Missing invite code', { status: 400 });

  const result = await acceptInvite(code, session.user.id);
  if (!result.ok) {
    return Response.json({ ok: false, reason: result.reason }, { status: 400 });
  }
  return Response.json({ ok: true, alreadyConnected: result.alreadyConnected, inviter: result.inviter });
};
