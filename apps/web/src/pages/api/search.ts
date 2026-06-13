import type { APIRoute } from 'astro';
import { searchListings } from '../../lib/search';
import { redactListingSummaryForViewer } from '../../lib/listing-access';
import { getSession } from '../../lib/session';
import type { ListingSearchFilters } from '../../types/listing';

export const prerender = false;

export const GET: APIRoute = async ({ url, request }) => {
  const session = await getSession(request);
  const isAuthenticated = !!session;

  const filters: ListingSearchFilters = {
    q: url.searchParams.get('q') ?? undefined,
    category: (url.searchParams.get('category') as ListingSearchFilters['category']) ?? undefined,
    rentType: (url.searchParams.get('rentType') as ListingSearchFilters['rentType']) ?? undefined,
    neighborhood: url.searchParams.get('neighborhood') ?? undefined,
    minPrice: url.searchParams.get('minPrice') ? Number(url.searchParams.get('minPrice')) : undefined,
    maxPrice: url.searchParams.get('maxPrice') ? Number(url.searchParams.get('maxPrice')) : undefined,
    minSize: url.searchParams.get('minSize') ? Number(url.searchParams.get('minSize')) : undefined,
    maxSize: url.searchParams.get('maxSize') ? Number(url.searchParams.get('maxSize')) : undefined,
    minRooms: url.searchParams.get('minRooms') ? Number(url.searchParams.get('minRooms')) : undefined,
    maxRooms: url.searchParams.get('maxRooms') ? Number(url.searchParams.get('maxRooms')) : undefined,
    availableFrom: url.searchParams.get('availableFrom') ?? undefined,
    anmeldungAvailable: url.searchParams.get('anmeldungAvailable') === 'true' ? true : undefined,
    schufaRequired: url.searchParams.get('schufaRequired') === 'false' ? false : undefined,
    page: url.searchParams.get('page') ? Number(url.searchParams.get('page')) : 1,
    limit: url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : 12,
  };

  const result = await searchListings(filters);

  if (!isAuthenticated) {
    return Response.json({
      ...result,
      items: result.items.map(redactListingSummaryForViewer),
    });
  }

  return Response.json(result);
};
