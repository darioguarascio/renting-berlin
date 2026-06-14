import type { APIRoute } from 'astro';
import type { ListingCategory } from '../../../types/listing';
import { createTenantRequest, parseHouseholdTypesParam, searchTenantRequests, tenantRequestInputSchema } from '../../../lib/tenant-requests';
import { getUserHandle } from '../../../lib/user-handle';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const params = url.searchParams;

  const result = await searchTenantRequests({
    category: (params.get('category') as ListingCategory) ?? undefined,
    rentType: (params.get('rentType') as 'long_term' | 'short_term' | 'overnight') ?? undefined,
    neighborhood: params.get('neighborhood') ?? undefined,
    minBudget: params.get('minBudget') ? Number(params.get('minBudget')) : undefined,
    maxBudget: params.get('maxBudget') ? Number(params.get('maxBudget')) : undefined,
    anmeldungNeeded: params.get('anmeldungNeeded') === 'true' ? true : undefined,
    hasSchufa: params.get('hasSchufa') === 'true' ? true : undefined,
    householdTypes: parseHouseholdTypesParam(params),
    page: params.get('page') ? Number(params.get('page')) : 1,
    limit: 12,
  });

  return Response.json(result);
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const input = tenantRequestInputSchema.parse(body);
    const row = await createTenantRequest(session.user.id, input);
    const handle = await getUserHandle(session.user.id);
    return Response.json({ id: row.id, handle, status: row.status }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid request data';
    return new Response(message, { status: 400 });
  }
};
