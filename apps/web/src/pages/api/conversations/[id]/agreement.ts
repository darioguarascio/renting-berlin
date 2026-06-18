import type { APIRoute } from 'astro';
import {
  getConversationAgreementContext,
  proposeAgreement,
} from '../../../../lib/agreements';
import { proposeAgreementSchema } from '../../../../lib/agreement-schema';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const context = await getConversationAgreementContext(params.id!, session.user.id);
    if (!context) return new Response('Not found', { status: 404 });
    return Response.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to load agreement';
    const status = message === 'Conversation not found' ? 404 : message === 'Not a participant' ? 403 : 400;
    return new Response(message, { status });
  }
};

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const input = proposeAgreementSchema.parse(await request.json());
    const agreement = await proposeAgreement(params.id!, session.user.id, input);
    return Response.json(agreement, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to propose agreement';
    const status = message === 'Conversation not found' ? 404 : message === 'Not a participant' ? 403 : 400;
    return new Response(message, { status });
  }
};
