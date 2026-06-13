import { defineMiddleware } from 'astro:middleware';
import { getSession } from './lib/session';

const PROTECTED_PREFIXES = ['/dashboard', '/account', '/listings/new', '/requests/new', '/favorites', '/messages', '/saved-searches', '/contact'];

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await getSession(context.request);
  context.locals.session = session;

  const path = context.url.pathname;
  const needsAuth = PROTECTED_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (needsAuth && !session) {
    const redirect = encodeURIComponent(path + context.url.search);
    return context.redirect(`/login?redirect=${redirect}`);
  }

  return next();
});
