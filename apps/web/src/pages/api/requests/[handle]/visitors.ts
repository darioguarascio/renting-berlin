import type { APIRoute } from 'astro';
import { getUserByHandle } from '../../../../lib/user-handle';
import { getProfileVisitors } from '../../../../lib/profile-views';
import { getSession } from '../../../../lib/session';
import { parseAccountHandle } from '../../../../lib/urls';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const account = await getUserByHandle(parseAccountHandle(params.handle!));
  if (!account) return new Response('Not found', { status: 404 });
  if (account.id !== session.user.id) return new Response('Forbidden', { status: 403 });

  const visitors = await getProfileVisitors(account.id, account.id);
  return Response.json({ visitors });
};
