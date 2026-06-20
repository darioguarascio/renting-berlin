#!/usr/bin/env node
/**
 * Creates or verifies the internal analytics E2E user on production.
 * No listings, no tenant request — not discoverable via public browse.
 *
 * Usage (on rb.main-0 after deploy):
 *   E2E_ANALYTICS_EMAIL=zanalytics-e2e@renting.berlin \
 *   E2E_ANALYTICS_PASSWORD=... \
 *   E2E_ANALYTICS_HANDLE=zanalytics-e2e \
 *   SITE_URL=https://renting.berlin \
 *   node scripts/seed-e2e-analytics-user.mjs
 */

const siteUrl = (process.env.SITE_URL ?? 'https://renting.berlin').replace(/\/$/, '');
const email = process.env.E2E_ANALYTICS_EMAIL ?? 'zanalytics-e2e@renting.berlin';
const password = process.env.E2E_ANALYTICS_PASSWORD;
const handle = process.env.E2E_ANALYTICS_HANDLE ?? 'zanalytics-e2e';
const name = process.env.E2E_ANALYTICS_NAME ?? 'Analytics E2E';

if (!password) {
  console.error('Set E2E_ANALYTICS_PASSWORD');
  process.exit(1);
}

async function authFetch(path, { method = 'GET', body, cookie } = {}) {
  const headers = {
    Accept: 'application/json',
    Origin: siteUrl,
  };
  if (body) headers['Content-Type'] = 'application/json';
  if (cookie) headers.Cookie = cookie;

  const res = await fetch(`${siteUrl}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    redirect: 'manual',
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // non-json
  }

  return { res, json, setCookie, text };
}

function mergeCookies(existing, setCookie) {
  const jar = new Map();
  for (const part of (existing ?? '').split(';').map((s) => s.trim()).filter(Boolean)) {
    const [k, ...rest] = part.split('=');
    jar.set(k, rest.join('='));
  }
  for (const raw of setCookie) {
    const [pair] = raw.split(';');
    const [k, ...rest] = pair.split('=');
    jar.set(k.trim(), rest.join('='));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

async function signIn() {
  const { res, setCookie, json } = await authFetch('/api/auth/sign-in/email', {
    method: 'POST',
    body: { email, password, rememberMe: true },
  });

  if (!res.ok) {
    throw new Error(`Sign-in failed (${res.status}): ${JSON.stringify(json)}`);
  }

  const cookie = mergeCookies('', setCookie);
  if (!cookie.includes('better-auth')) {
    throw new Error('Sign-in did not return a session cookie');
  }
  return cookie;
}

async function ensureSignedUp() {
  const attempt = await authFetch('/api/auth/sign-up/email', {
    method: 'POST',
    body: { email, password, name },
  });

  if (attempt.res.ok) {
    console.log(`Created user ${email}`);
    return signIn();
  }

  const msg = JSON.stringify(attempt.json ?? attempt.text).toLowerCase();
  if (msg.includes('already') || msg.includes('exists') || attempt.res.status === 422) {
    console.log(`User already exists: ${email}`);
    return signIn();
  }

  throw new Error(`Sign-up failed (${attempt.res.status}): ${attempt.text}`);
}

async function ensureHandle(cookie) {
  const current = await authFetch('/api/account/handle', { cookie });
  if (current.res.ok && current.json?.handle === handle) {
    console.log(`Handle already set: ${handle}`);
    return;
  }

  const set = await authFetch('/api/account/handle', {
    method: 'PATCH',
    cookie,
    body: { handle },
  });

  if (!set.res.ok) {
    throw new Error(`Handle setup failed (${set.res.status}): ${set.text}`);
  }
  console.log(`Handle set: ${handle}`);
}

async function main() {
  const cookie = await ensureSignedUp();
  await ensureHandle(cookie);
  console.log('E2E analytics user ready (no public listings or seeker profile).');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
