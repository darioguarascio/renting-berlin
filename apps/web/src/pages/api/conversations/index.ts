import type { APIRoute } from 'astro';
import { listConversationsForUser, startConversationWithMessage } from '../../../lib/messages';
import type { MessageTemplateKind } from '../../../lib/message-templates';
import type { MessageAttachment } from '../../../types/message';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const items = await listConversationsForUser(session.user.id);
  return Response.json({ items });
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const listingId = body.listingId as string | undefined;
  const tenantRequestId = body.tenantRequestId as string | undefined;
  const text = (body.body as string | undefined) ?? '';
  const attachments = (body.attachments as MessageAttachment[] | undefined) ?? [];
  const saveAsTemplate = Boolean(body.saveAsTemplate);
  const templateLabel = body.templateLabel as string | undefined;
  const templateKind = body.templateKind as MessageTemplateKind | undefined;

  if (!text.trim() && attachments.length === 0) {
    return new Response('body or attachments required', { status: 400 });
  }

  try {
    const result = await startConversationWithMessage({
      userId: session.user.id,
      listingId,
      tenantRequestId,
      body: text,
      attachments,
      saveAsTemplate,
      templateLabel,
      templateKind,
    });
    return Response.json(result, { status: result.existing ? 200 : 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to create conversation';
    return new Response(message, { status: 400 });
  }
};
