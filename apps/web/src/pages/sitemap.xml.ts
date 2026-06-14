import type { APIRoute } from 'astro';
import { getSitemapEntries, renderSitemapXml } from '../lib/sitemap';
import { getSiteUrl } from '../lib/site-url';

export const prerender = false;

export const GET: APIRoute = async () => {
  const entries = await getSitemapEntries(getSiteUrl());
  const xml = renderSitemapXml(entries);

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
