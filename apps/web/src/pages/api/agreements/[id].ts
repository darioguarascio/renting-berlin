import type { APIRoute } from 'astro';
import { actOnAgreement } from '../../../lib/agreements';
import { agreementActionSchema } from '../../../lib/agreement-schema';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const action = agreementActionSchema.parse(await request.json());
    const agreement = await actOnAgreement(params.id!, session.user.id, action);
    return Response.json(agreement);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update agreement';
    const status = message === 'Agreement not found' ? 404 : message === 'Not a participant' ? 403 : 400;
    return new Response(message, { status });
  }
};
