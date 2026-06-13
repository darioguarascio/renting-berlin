import type { APIContext } from 'astro';
import { auth } from '../../lib/auth';

function cookieHeaderFromSetCookies(setCookies: string[]): string {
  return setCookies.map((value) => value.split(';')[0]?.trim()).filter(Boolean).join('; ');
}

export async function signInCookie(email: string, password: string): Promise<string> {
  const result = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });

  const headers = result.headers as Headers | undefined;
  const setCookies =
    typeof headers?.getSetCookie === 'function'
      ? headers.getSetCookie()
      : headers?.get('set-cookie')
        ? [headers.get('set-cookie')!]
        : [];

  const cookie = cookieHeaderFromSetCookies(setCookies);
  if (!cookie) {
    throw new Error(`Failed to sign in test user: ${email}`);
  }

  return cookie;
}

export function jsonRequest(
  url: string,
  options: {
    method?: string;
    cookie?: string;
    body?: unknown;
  } = {},
): Request {
  const headers = new Headers();
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.cookie) {
    headers.set('Cookie', options.cookie);
  }

  return new Request(url, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

type ApiHandler = (context: APIContext) => Response | Promise<Response>;

export async function callApi<T = unknown>(
  handler: ApiHandler,
  options: {
    method?: string;
    cookie?: string;
    params?: Record<string, string | undefined>;
    body?: unknown;
    url?: string;
  } = {},
): Promise<{ status: number; json: T; response: Response }> {
  const request = jsonRequest(options.url ?? 'http://localhost/api/test', {
    method: options.method,
    cookie: options.cookie,
    body: options.body,
  });

  const response = await handler({
    request,
    params: options.params ?? {},
    url: new URL(request.url),
    redirect: (status, location) =>
      new Response(null, { status, headers: { Location: location } }),
  } as APIContext);

  const text = await response.text();
  let json: T;
  try {
    json = text ? (JSON.parse(text) as T) : (undefined as T);
  } catch {
    json = text as T;
  }

  return { status: response.status, json, response };
}
