import type { APIRoute } from 'astro';
import { getProfileViewsForAccount } from '../../../lib/profile-views';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const data = await getProfileViewsForAccount(session.user.id);
  return Response.json(data);
};
