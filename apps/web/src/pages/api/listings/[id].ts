import type { APIRoute } from 'astro';
import { closeListing, getListingForPublisher, listingInputSchema, updateListing } from '../../../lib/listings';
import { buildListingPath } from '../../../lib/urls';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const row = await getListingForPublisher(params.id!, session.user.id);
  if (!row) return new Response('Not found', { status: 404 });

  return Response.json({
    id: row.id,
    slug: row.slug,
    shortCode: row.shortCode,
    path: buildListingPath(row.slug, row.shortCode),
    title: row.title,
    status: row.status,
    category: row.category,
    rentType: row.rentType,
    availableFrom: row.availableFrom.toISOString(),
    availableTo: row.availableTo?.toISOString() ?? null,
    sizeSqm: row.sizeSqm,
    rooms: row.rooms,
    floorLevel: row.floorLevel,
    onlineViewingAvailable: row.onlineViewingAvailable,
    anmeldungAvailable: row.anmeldungAvailable,
    schufaRequired: row.schufaRequired,
    address: row.address,
    neighborhood: row.neighborhood,
    lat: row.lat,
    lng: row.lng,
    approximateLocation: row.approximateLocation,
    hidePublisherName: row.hidePublisherName,
    costs: row.costs,
    descriptions: row.descriptions,
    requiredDocuments: row.requiredDocuments,
    requiredDocumentsOther: row.requiredDocumentsOther,
    equipment: row.equipment,
    photoUrls: row.photoUrls,
  });
};

export const PATCH: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = await request.json();
    const input = listingInputSchema.partial().parse(body);
    const row = await updateListing(params.id!, session.user.id, input);
    if (!row) return new Response('Not found', { status: 404 });
    return Response.json({
      id: row.id,
      slug: row.slug,
      shortCode: row.shortCode,
      path: buildListingPath(row.slug, row.shortCode),
      status: row.status,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid listing data';
    return new Response(message, { status: 400 });
  }
};

export const DELETE: APIRoute = async ({ request, params }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const row = await closeListing(params.id!, session.user.id);
    if (!row) return new Response('Not found', { status: 404 });
    return Response.json({ ok: true, status: row.status });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Cannot close listing';
    return new Response(message, { status: 400 });
  }
};
