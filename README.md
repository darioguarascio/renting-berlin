# renting.berlin

Berlin apartment hunting is brutal. **renting.berlin** started in 2021 as a scrappy Telegram bot to beat the FOMO of new listings. In 2026 it is being rebuilt from scratch as a full rental platform — listings, messaging, trust, and alerts — developed rapidly with AI-assisted coding.

---

## The original bot (2021)

Finding a flat in Berlin means refreshing immobilienscout24 and WG-Gesucht, racing to apply before hundreds of others do. The first version of renting.berlin attacked that problem head-on:

1. Search on a real-estate site, sort by newest
2. Paste the search URL into [@RentingBerlinBot](https://t.me/RentingBerlinBot) on Telegram
3. Get pinged within minutes when a new ad appears

Under the hood it was a **proof-of-concept**: PHP (Phalcon CLI), a Telegram bot, Redis for per-user monitor state, and Resque workers that scraped fixed XPath selectors on immobilienscout24 and wg-gesucht every couple of minutes.

```
User → Telegram bot → Redis (saved search URLs)
              ↑
Periodic loader → job queue → workers → scrape sites → Telegram alert
```

It worked. It was also fragile — layout changes or anti-bot measures broke scraping overnight — and it only watched *other people's* listings. The hosted bot was taken down in 2022; the repo lingered with a static landing page pointing back to Telegram.

That code is archived on **`archive/bot-2021`**. It is not part of the current application.

---

## The platform (2026)

The problem never went away. Anonymous classifieds are still a mess: no accountability, no real reviews, no way to know who you are dealing with. Rather than patch the old scraper, renting.berlin is becoming **its own marketplace** — a place to post offers and seeker profiles, message directly, and build reputation through verified post-rental feedback.

This is a **clean-slate rewrite**, not a migration. The entire app on the **`dev`** branch was bootstrapped in a single day and is being extended iteratively with AI pair-programming (Cursor). Features land fast; the product is still finding its shape — for example, browsing is public but refining offers with filters requires an account.

### What's new

Recent additions on **`dev`** (not exhaustive, but the highlights):

- **Aggregated listings** — third-party exporters push Berlin ads into the catalog via a JSON import contract (`npm run db:import-external`). They appear alongside native offers with a clear “apply on the original site” flow: no in-app messaging or reviews on aggregated posts. Scraping stays **outside** this repo; the platform only ingests validated exports.
- **Telegram channel worker** — new native listings and seeker profiles are batched into digest posts (links sorted by last updated), continuing the spirit of the 2021 bot without fragile in-app scrapers.
- **Acquisition-focused discovery** — public listing pages, neighborhood SEO (`/rent-in/…`), guides, sitemap; listing photos used for Open Graph previews when sharing links.
- **Signed-in search UX** — filter offers by neighborhood, budget, Anmeldung, and more (guests browse unfiltered); cards / list / table / map view preference remembered per account; saved searches with notifications unchanged.
- **Background workers** — Python services for notifications, email, moderation (optional ML), profile-view analytics, and Telegram; ClickHouse-backed email analytics where configured.
- **Auth & trust polish** — magic-link sign-in, branded transactional email, mandatory `@handle`, verified post-rental feedback.

### What exists today

| Area | Features |
|------|----------|
| **Marketplace** | Native landlord offers and tenant seeker profiles; **aggregated external listings** (ImmoScout, WG-Gesucht, etc.) via import |
| **Discovery** | Public browse; **filters for signed-in users**; favorites; saved searches; cards / list / table / **map** view |
| **Messaging** | Conversations tied to **native** listings or requests, attachments, read receipts |
| **Trust** | Mutual reviews unlocked only after a confirmed rental period ends (native listings only) |
| **Identity** | Email/password, magic link, OAuth; mandatory `@handle`; public profiles at `/u/[handle]` |
| **Content** | Neighborhood rent stats (`/rent-in/…`), guides (Anmeldung, SCHUFA, costs) |
| **Alerts** | In-app saved-search notifications; **Telegram digests** for new listings and seeker profiles |
| **Ops** | Docker images (web + workers), GitHub Actions CI, SSH deploy with automatic migrations |

The brand palette (`#2679a3`) carries over from the original site — same spirit, modern stack.

### Aggregated listings (how it works)

The 2021 bot scraped sites directly. The 2026 platform **does not scrape**. Instead, external ads enter through a **push contract**:

1. A third-party tool (e.g. a self-hosted scraper) exports JSON matching `apps/web/src/db/external-listings-export.example.json`.
2. An operator runs `npm run db:import-external -- --file path/to/export.json` against the target database (see `EXTERNAL_LISTINGS_EXPORT_PATH` in `.env`).
3. Listings are upserted by `(externalProvider, externalSourceId)`, indexed for search, and attributed to a dedicated `@external-listings` publisher.
4. On the site they are labeled as aggregated; **Contact** sends users to the original URL. Messaging, favorites-style flows, and reviews stay native-only.

This keeps the catalog broad for discovery while native posts remain the trust layer.

### Conceptual shift

| 2021 bot | 2026 platform |
|----------|---------------|
| Scrape external sites in-process | **Import** external ads via JSON; no scraper in this repo |
| Watch external listing pages | Host native offers **and** surface aggregated ones |
| Telegram push alerts | Saved-search notifications **+** Telegram digest worker |
| Redis-only ephemeral state | PostgreSQL + Drizzle ORM |
| Telegram user IDs | Accounts with handles and public profiles |
| Scraper proof-of-concept | Trust, messaging, and verified feedback on native listings |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | [Astro 6](https://astro.build) (SSR, server output) |
| UI | React 19 islands, Tailwind CSS 4 |
| Server | Express + `@astrojs/node` (middleware mode) |
| Auth | [better-auth](https://www.better-auth.com) — email, magic link, Google, GitHub |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| Cache / events | Redis (search index, streams, Telegram digest queue) |
| Workers | Python 3 — notifications, email, moderation, profile views, Telegram |
| Analytics | ClickHouse (email send/click tracking, optional) |
| Maps | Leaflet |
| Tests | Vitest (unit + integration) |
| Deploy | Docker Compose (web + workers), GitHub Actions CI/CD |

```
/a/renting.berlin/
├── apps/web/          # Astro application (SSR, API routes, Drizzle)
├── workers/           # Python background workers
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── scripts/           # db setup, integration test helpers
└── .github/workflows/ # test + docker build/deploy
```

---

## Development

**Requirements:** Node ≥ 22.12, PostgreSQL, Redis.

```sh
cp .env.example .env   # fill in DATABASE_URL, REDIS_URL, BETTER_AUTH_SECRET, …
npm install
npm run db:setup       # create DB + run migrations
npm run dev            # http://localhost:4321
```

Other useful commands:

```sh
npm run test           # unit tests
npm run test:all       # unit + integration
npm run db:migrate     # apply Drizzle migrations
npm run db:import-external -- --file path/to/export.json   # upsert aggregated listings
npm run workers:install
npm run worker:telegram            # local Telegram digest worker (needs TELEGRAM_* in .env)
npm run docker:up                  # production-like stack locally
npm run docker:logs:workers        # tail worker logs
```

**Aggregated listing import:** set `DATABASE_URL` (and optionally `EXTERNAL_LISTINGS_EXPORT_PATH`) in `.env`. Use `--dry-run` to preview without writing. See `apps/web/src/db/external-listings-export.example.json` for the export schema.

**Workers:** copy `.env` with `DATABASE_URL`, `REDIS_URL`, and worker-specific vars (`TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, etc.). Production runs them as separate containers (`darioguarascio/renting.berlin-workers`).

---

## Branches

| Branch | Contents |
|--------|----------|
| **`master`** | Official upstream — current platform |
| **`dev`** | Active development (tracks `master`; deploy target) |
| **`archive/bot-2021`** | Archived 2021 PHP/Telegram bot |
| **`gh-pages`** | Archived static landing page (2022) |

---

## Disclaimer (then and now)

The 2021 bot scraped third-party sites with fixed XPath queries and no anti-bot countermeasures. It was always a POC.

The 2026 platform **does not scrape** third-party sites itself. Native listings are posted on-platform; **aggregated** ads are ingested only through the documented JSON import. External posts link out for applications and are excluded from messaging and reviews. The software is still early — expect rough edges and features that shift between deploys while the product finds its shape.
