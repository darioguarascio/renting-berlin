import type { APIRoute } from 'astro';
import { getSession } from '../../lib/session';
import { saveUpload, saveMessageAttachment } from '../../lib/storage';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll('files').filter((f): f is File => f instanceof File);
  const context = formData.get('context');
  const saveFn = context === 'message' ? saveMessageAttachment : saveUpload;
  if (files.length === 0) {
    return new Response('No files provided', { status: 400 });
  }
  if (files.length > 20) {
    return new Response('Maximum 20 files per upload', { status: 400 });
  }

  try {
    const urls = await Promise.all(files.map((file) => saveFn(file)));
    return Response.json({ urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return new Response(message, { status: 400 });
  }
};
