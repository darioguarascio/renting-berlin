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

That code lives on the **`master`** branch. It is not part of the current application.

---

## The platform (2026)

The problem never went away. Anonymous classifieds are still a mess: no accountability, no real reviews, no way to know who you are dealing with. Rather than patch the old scraper, renting.berlin is becoming **its own marketplace** — a place to post offers and seeker profiles, message directly, and build reputation through verified post-rental feedback.

This is a **clean-slate rewrite**, not a migration. The entire app on the **`dev`** branch was bootstrapped in a single day and is being extended iteratively with AI pair-programming (Cursor). Features land fast; product decisions are still being shaped in real time — for example, whether listing details stay fully public or require an account.

### What exists today

| Area | Features |
|------|----------|
| **Marketplace** | Landlord offers and tenant seeker profiles, photos, map view, Berlin neighborhoods |
| **Discovery** | Search with filters, favorites, saved searches with in-app notifications |
| **Messaging** | Conversations tied to listings or requests, attachments, read receipts |
| **Trust** | Mutual reviews unlocked only after a confirmed rental period ends |
| **Identity** | Email/password and OAuth sign-up, mandatory `@handle`, public profiles at `/u/[handle]` |
| **Content** | Neighborhood rent stats (`/rent-in/…`), guides (Anmaldung, SCHUFA, costs) |
| **Ops** | Docker image, GitHub Actions CI, SSH deploy with automatic migrations |

The brand palette (`#2679a3`) carries over from the original site — same spirit, modern stack.

### Conceptual shift

| 2021 bot | 2026 platform |
|----------|---------------|
| Watch external listing pages | Host your own offers and requests |
| Telegram push alerts | Saved-search notifications in the app |
| Redis-only ephemeral state | PostgreSQL + Drizzle ORM |
| Telegram user IDs | Accounts with handles and public profiles |
| Scraper proof-of-concept | Trust, messaging, and verified feedback |

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | [Astro 6](https://astro.build) (SSR, server output) |
| UI | React 19 islands, Tailwind CSS 4 |
| Server | Express + `@astrojs/node` (middleware mode) |
| Auth | [better-auth](https://www.better-auth.com) — email, Google, GitHub |
| Database | PostgreSQL via [Drizzle ORM](https://orm.drizzle.team) |
| Cache / events | Redis (profile-view stream worker) |
| Maps | Leaflet |
| Tests | Vitest (unit + integration) |
| Deploy | Docker Compose, image `darioguarascio/renting.berlin` |

```
/a/renting.berlin/
├── apps/web/          # the application
├── docker-compose.yml
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
npm run docker:up      # production-like container locally
```

---

## Branches

| Branch | Contents |
|--------|----------|
| **`dev`** | Current platform — active development and deploy target |
| **`master`** | Archived 2021 PHP/Telegram bot |
| **`gh-pages`** | Archived static landing page (2022) |

---

## Disclaimer (then and now)

The 2021 bot scraped third-party sites with fixed XPath queries and no anti-bot countermeasures. It was always a POC.

The 2026 platform does not scrape listings. It is early software built quickly — expect rough edges, shifting access rules, and features that appear or change from one deploy to the next while the product finds its shape.
