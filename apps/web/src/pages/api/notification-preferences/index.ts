import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  getOrCreateNotificationPreferences,
  updateNotificationPreferences,
} from '../../../lib/notification-preferences';
import { getSession } from '../../../lib/session';

export const prerender = false;

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

const patchSchema = z.object({
  inAppEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifySavedSearches: z.boolean().optional(),
  notifyProfileViews: z.boolean().optional(),
  notifyListingUpdates: z.boolean().optional(),
  notifyProductNews: z.boolean().optional(),
  emailDigest: z.enum(['instant', 'daily', 'weekly']).optional(),
  quietHoursEnabled: z.boolean().optional(),
  quietHoursStart: z.string().regex(timePattern).nullable().optional(),
  quietHoursEnd: z.string().regex(timePattern).nullable().optional(),
  acceptInquiries: z.boolean().optional(),
  preferredContactHours: z.string().max(200).nullable().optional(),
});

export const GET: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const preferences = await getOrCreateNotificationPreferences(session.user.id);
  return Response.json({ preferences });
};

export const PATCH: APIRoute = async ({ request }) => {
  const session = await getSession(request);
  if (!session) return new Response('Unauthorized', { status: 401 });

  try {
    const body = patchSchema.parse(await request.json());
    const preferences = await updateNotificationPreferences(session.user.id, body);
    return Response.json({ preferences });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid update';
    return new Response(message, { status: 400 });
  }
};
