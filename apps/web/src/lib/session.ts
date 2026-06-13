import { auth } from './auth';
import type { Session } from './auth';

export async function getSession(request: Request): Promise<Session | null> {
  return auth.api.getSession({ headers: request.headers });
}

export async function requireSession(request: Request): Promise<Session | null> {
  return getSession(request);
}
