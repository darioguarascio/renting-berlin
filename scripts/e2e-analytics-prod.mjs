#!/usr/bin/env node
/**
 * Browser E2E: login, visit /offers twice, verify "new since last visit" flow.
 *
 * Usage:
 *   E2E_ANALYTICS_EMAIL=... E2E_ANALYTICS_PASSWORD=... \
 *   npx playwright install chromium && node scripts/e2e-analytics-prod.mjs
 */

import { chromium } from 'playwright';

const siteUrl = (process.env.SITE_URL ?? 'https://renting.berlin').replace(/\/$/, '');
const email = process.env.E2E_ANALYTICS_EMAIL ?? 'zanalytics-e2e@renting.berlin';
const password = process.env.E2E_ANALYTICS_PASSWORD;

if (!password) {
  console.error('Set E2E_ANALYTICS_PASSWORD');
  process.exit(1);
}

async function login(page) {
  await page.goto(`${siteUrl}/login`, { waitUntil: 'networkidle' });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /log in|sign in/i }).click();
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 30000 });
}

async function visitOffers(page) {
  await page.goto(`${siteUrl}/offers`, { waitUntil: 'networkidle' });
  await page.waitForSelector('h1', { timeout: 15000 });
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Logging in…');
  await login(page);

  console.log('First /offers visit (baseline)…');
  await visitOffers(page);
  const firstBanner = await page.getByText(/new listing/i).count();
  console.log(`Banner after first visit: ${firstBanner > 0 ? 'visible' : 'hidden'}`);

  console.log('Second /offers visit (should record site_visits)…');
  await page.waitForTimeout(1500);
  await visitOffers(page);
  const secondBanner = await page.getByText(/new listing/i).count();
  const listingCount = await page.locator('strong').first().textContent().catch(() => '?');
  console.log(`Listings count line: ${listingCount?.trim()}`);
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
