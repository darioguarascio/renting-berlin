import type { APIRoute } from 'astro';
import {
  createMessageTemplate,
  deleteMessageTemplate,
  listMessageTemplates,
  type MessageTemplateKind,
} from '../../../lib/message-templates';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const kind = url.searchParams.get('kind') as MessageTemplateKind | null;
  const items = await listMessageTemplates(session.user.id, kind ?? undefined);
  return Response.json({ items });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const label = body.label as string;
  const text = body.body as string;
  const kind = body.kind as MessageTemplateKind | undefined;

  try {
    const template = await createMessageTemplate(session.user.id, { label, body: text, kind });
    return Response.json(template, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create template';
    return new Response(message, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const templateId = url.searchParams.get('id');
  if (!templateId) return new Response('id required', { status: 400 });

  const deleted = await deleteMessageTemplate(session.user.id, templateId);
  if (!deleted) return new Response('Not found', { status: 404 });
  return new Response(null, { status: 204 });
};
