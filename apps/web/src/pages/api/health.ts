import type { APIRoute } from 'astro';
import { getAppCommit, getAppVersion } from '../../lib/site-url';

export const prerender = false;

export const GET: APIRoute = () =>
  Response.json({
    status: 'ok',
    version: getAppVersion(),
    commit: getAppCommit(),
    timestamp: new Date().toISOString(),
  });
