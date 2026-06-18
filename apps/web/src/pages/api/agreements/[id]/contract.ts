import type { APIRoute } from 'astro';
import { getAgreementContractMarkdown } from '../../../../lib/agreements';
import { getSession } from '../../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const markdown = await getAgreementContractMarkdown(params.id!, session.user.id);
  if (markdown === null) return new Response('Not found', { status: 404 });
  return Response.json({ markdown });
};
