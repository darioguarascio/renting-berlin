import type { APIRoute } from 'astro';
import { renderRobotsTxt } from '../lib/sitemap';
import { getSiteUrl } from '../lib/site-url';

export const prerender = false;

export const GET: APIRoute = async () => {
  return new Response(renderRobotsTxt(getSiteUrl()), {
    status: 200,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
};
