import type { APIRoute } from 'astro';
import { renderAgreementContractPreview } from '../../../../../lib/agreements';
import { contractPreviewSchema } from '../../../../../lib/agreement-schema';
import { getSession } from '../../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const input = contractPreviewSchema.parse(await request.json());
    const markdown = await renderAgreementContractPreview(params.id!, session.user.id, input);
    return Response.json({ markdown });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to render contract';
    const status =
      message === 'Conversation not found' ? 404 : message === 'Not a participant' ? 403 : 400;
    return new Response(message, { status });
  }
};
