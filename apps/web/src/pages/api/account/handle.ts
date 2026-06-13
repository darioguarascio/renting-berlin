import type { APIRoute } from 'astro';
import { z } from 'zod';
import { getUserHandle, isHandleAvailable, setUserHandle } from '../../../lib/user-handle';
import { isValidHandle, normalizeHandle, HANDLE_MAX_LENGTH, HANDLE_MIN_LENGTH } from '../../../lib/urls';
import { getSession } from '../../../lib/session';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const handle = await getUserHandle(session.user.id);
  return Response.json({ handle });
};

const patchSchema = z.object({
  handle: z
    .string()
    .transform(normalizeHandle)
    .refine(isValidHandle, {
      message: `Handle must be ${HANDLE_MIN_LENGTH}–${HANDLE_MAX_LENGTH} characters, start with a letter, and use only lowercase letters, numbers, underscores, and hyphens`,
    }),
});

export const PATCH: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = patchSchema.parse(await request.json());
    const handle = await setUserHandle(session.user.id, body.handle);
    return Response.json({ handle });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid handle';
    return new Response(message, { status: 400 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const check = url.searchParams.get('check');
  if (!check) return new Response('Bad request', { status: 400 });

  const available = await isHandleAvailable(check);
  return Response.json({ available });
};
