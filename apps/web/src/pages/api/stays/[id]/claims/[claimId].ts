import type { APIRoute } from 'astro';
import { respondToClaim, withdrawClaim } from '../../../../../lib/stay-claims';
import { getSession } from '../../../../../lib/session';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json().catch(() => ({}));
  const action = body.action;
  const claimId = params.claimId!;

  if (action === 'withdraw') {
    const ok = await withdrawClaim(session.user.id, claimId);
    return Response.json({ ok });
  }

  if (action === 'accept' || action === 'decline') {
    const result = await respondToClaim(session.user.id, claimId, action);
    if (!result.ok) {
      return Response.json({ ok: false, reason: result.reason }, { status: 400 });
    }
    return Response.json({ ok: true, action: result.action });
  }

  return new Response('Invalid action', { status: 400 });
};
