import type { APIRoute } from 'astro';
import { rejectOtherListingConversations } from '../../../../lib/agreements';
import { rejectOthersSchema } from '../../../../lib/agreement-schema';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const input = rejectOthersSchema.parse(await request.json());
    const result = await rejectOtherListingConversations(params.id!, session.user.id, input);
    return Response.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send declines';
    const status = message === 'Listing not found' ? 404 : 400;
    return new Response(message, { status });
  }
};
