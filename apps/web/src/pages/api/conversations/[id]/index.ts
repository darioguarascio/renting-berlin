import type { APIRoute } from 'astro';
import { deleteConversation, getConversationWithMessages, sendMessage } from '../../../../lib/messages';
import type { MessageAttachment } from '../../../../types/message';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const data = await getConversationWithMessages(params.id!, session.user.id);
  if (!data) return new Response('Not found', { status: 404 });
  return Response.json(data);
};

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const body = await request.json();
  const text = (body.body as string) ?? '';
  const attachments = (body.attachments as MessageAttachment[] | undefined) ?? [];
  const saveAsTemplate = Boolean(body.saveAsTemplate);
  const templateLabel = body.templateLabel as string | undefined;

  try {
    const message = await sendMessage(params.id!, session.user.id, text, {
      attachments,
      saveAsTemplate,
      templateLabel,
    });
    return Response.json({
      id: message.id,
      body: message.body,
      attachments: message.attachments ?? [],
      senderId: message.senderId,
      isMine: true,
      createdAt: message.createdAt.toISOString(),
      readAt: message.readAt?.toISOString() ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send message';
    return new Response(message, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    await deleteConversation(params.id!, session.user.id);
    return new Response(null, { status: 204 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to delete conversation';
    const status = message === 'Conversation not found' ? 404 : message === 'Not a participant' ? 403 : 400;
    return new Response(message, { status });
  }
};
