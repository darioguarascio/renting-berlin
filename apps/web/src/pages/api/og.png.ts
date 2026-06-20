import type { APIRoute } from 'astro';
import { renderOgPng, type OgImageOptions } from '../../lib/og-image';

export const prerender = false;

const DEFAULTS: OgImageOptions = {
  title: 'Find your place in Berlin',
  subtitle: 'Rental marketplace for Berlin. Search flats and rooms with trust built in.',
};

export const GET: APIRoute = async ({ url }) => {
  const params = url.searchParams;
  const title = params.get('title')?.trim() || DEFAULTS.title;
  const subtitle = params.get('subtitle')?.trim() || (params.has('title') ? undefined : DEFAULTS.subtitle);
  const eyebrow = params.get('eyebrow')?.trim() || undefined;
  const stats = params.getAll('stat').map((s) => s.trim()).filter(Boolean);

  try {
    const png = await renderOgPng({ title, subtitle, eyebrow, stats });
    return new Response(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('[og] failed to render OG image', error);
    return new Response('Failed to render image', { status: 500 });
  }
};
