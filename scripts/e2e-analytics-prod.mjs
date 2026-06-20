#!/usr/bin/env node
/**
 * Browser E2E: API login, visit /offers twice, verify analytics cookies.
 *
 * Usage:
 *   E2E_ANALYTICS_EMAIL=... E2E_ANALYTICS_PASSWORD=... \
 *   node scripts/e2e-analytics-prod.mjs
 */

import { chromium } from 'playwright';

const siteUrl = (process.env.SITE_URL ?? 'https://renting.berlin').replace(/\/$/, '');
const email = process.env.E2E_ANALYTICS_EMAIL ?? 'zanalytics-e2e@renting.berlin';
const password = process.env.E2E_ANALYTICS_PASSWORD;

if (!password) {
  console.error('Set E2E_ANALYTICS_PASSWORD');
  process.exit(1);
}

function mergeCookies(setCookie) {
  const jar = new Map();
  for (const raw of setCookie) {
    const [pair] = raw.split(';');
    const eq = pair.indexOf('=');
    jar.set(pair.slice(0, eq).trim(), pair.slice(eq + 1));
  }
  return [...jar.entries()].map(([name, value]) => ({
    name,
    value,
    domain: new URL(siteUrl).hostname,
    path: '/',
    httpOnly: true,
    secure: siteUrl.startsWith('https'),
    sameSite: 'Lax',
  }));
}

async function signInViaApi() {
  const res = await fetch(`${siteUrl}/api/auth/sign-in/email`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Origin: siteUrl,
    },
    body: JSON.stringify({ email, password, rememberMe: true }),
  });

  const setCookie = res.headers.getSetCookie?.() ?? [];
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API sign-in failed (${res.status}): ${text}`);
  }
  if (setCookie.length === 0) {
    throw new Error('API sign-in did not return session cookies');
  }
  return mergeCookies(setCookie);
}

async function visitOffers(page) {
  await page.goto(`${siteUrl}/offers`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1', { timeout: 15000 });
}

async function main() {
  const sessionCookies = await signInViaApi();
  console.log(`API login OK (${sessionCookies.length} cookies)`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  await context.addCookies(sessionCookies);
  const page = await context.newPage();

  console.log('First /offers visit (baseline)…');
  await visitOffers(page);
  const firstBanner = await page.getByText(/new listing/i).count();
  console.log(`Banner after first visit: ${firstBanner > 0 ? 'visible' : 'hidden'}`);

  console.log('Second /offers visit…');
  await page.waitForTimeout(1500);
  await visitOffers(page);
  const secondBanner = await page.getByText(/new listing/i).count();
  console.log(`Banner after second visit: ${secondBanner > 0 ? 'visible' : 'hidden'}`);

  const cookies = await context.cookies();
  const visitor = cookies.find((c) => c.name === 'rb_vid');
  const seenAt = cookies.find((c) => c.name === 'rb_offers_seen_at');
  console.log(`Cookies: rb_vid=${visitor?.value ?? 'missing'}, rb_offers_seen_at=${seenAt?.value ?? 'missing'}`);

  await browser.close();
  console.log('Browser E2E complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
