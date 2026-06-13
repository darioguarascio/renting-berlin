import { defineMiddleware } from 'astro:middleware';
import { getUserHandle } from './lib/user-handle';
import {
  authEntryUrl,
  isPublicApi,
  isPublicPage,
  isStaticAsset,
} from './lib/public-routes';
import { getSession } from './lib/session';

const HANDLE_SETUP_PATH = '/signup/handle';

function isHandleExempt(path: string): boolean {
  if (path === HANDLE_SETUP_PATH) return true;
  if (path.startsWith('/api/auth')) return true;
  if (path === '/api/account/handle') return true;
  return false;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await getSession(context.request);
  context.locals.session = session;

  const path = context.url.pathname;
  const search = context.url.search;

  if (isStaticAsset(path)) {
    return next();
  }

  if (path.startsWith('/api/')) {
    if (isPublicApi(path)) {
      return next();
    }
    if (!session) {
      return new Response('Unauthorized', { status: 401 });
    }
  } else if (!isPublicPage(path) && !session) {
    return context.redirect(authEntryUrl(path + search));
  }

  if (session) {
    const handle = await getUserHandle(session.user.id);

    if (handle && path === HANDLE_SETUP_PATH) {
      const redirect = new URL(context.url).searchParams.get('redirect') ?? '/dashboard';
      return context.redirect(redirect);
    }

    if (handle && (path === '/login' || path === '/signup')) {
      return context.redirect('/dashboard');
    }

    if (!handle && !isHandleExempt(path)) {
      const destination = `${HANDLE_SETUP_PATH}?redirect=${encodeURIComponent(path + search)}`;
      if (path.startsWith('/api/')) {
        return new Response('Set your account handle to continue', { status: 403 });
      }
      if (path === '/login' || path === '/signup') {
        return context.redirect(destination);
      }
      return context.redirect(destination);
    }
  }

  return next();
});
