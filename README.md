# Occasions API

Express + TypeScript + Prisma (Postgres) backend for the Occasions marketplace.
Implements the contract in `BACKEND_HANDOFF.md`.

## Setup

```bash
cp .env.example .env
# edit .env: DATABASE_URL (your Postgres connection string) and NEXTAUTH_SECRET
# NEXTAUTH_SECRET MUST match the frontend's NEXTAUTH_SECRET exactly.

npm install
npm run prisma:generate
npm run prisma:migrate      # creates tables
npm run seed                # loads the 6 sample providers + demo logins
npm run dev                 # http://localhost:4000
```

Demo logins after seeding (password for all: `Occasions2026!`):

- `customer@example.com` — customer role
- `provider@freshplate.co.za`, `provider@mandlasrentals.co.za`, `provider@nkosicatering.co.za`,
  `provider@elegantoccasions.co.za`, `provider@siyandatoilets.co.za`, `provider@perfectsound.co.za` — provider role,
  each already linked to their seeded listing.

## Auth model

This API doesn't run its own login UI or session cookies. It trusts the
frontend's **NextAuth** session:

1. Frontend `POST /api/auth/register` here to create a `User` row (password hashed with bcrypt).
2. Frontend's NextAuth `Credentials` provider calls `POST /api/auth/login` here inside `authorize()` to verify
   the password and get back `{id, email, name, role}`.
3. NextAuth then mints its own encrypted JWT session cookie (using `NEXTAUTH_SECRET`).
4. When the frontend needs to call this API as an authenticated user, it reads the raw session token via a small
   Next.js route (`GET /api/auth/token`, included in the frontend integration) and sends it here as
   `Authorization: Bearer <token>`.
5. `src/middleware/auth.ts` decodes that token with `next-auth/jwt`'s `decode()`, using the **same**
   `NEXTAUTH_SECRET`, and attaches `req.user = {id, email, role}`.

Because both sides only need to agree on one secret, there's no separate JWT-signing scheme to keep in sync.

## Data model notes

- `Listing` is folded into `Provider` (see `prisma/schema.prisma` comment) rather than a separate table — the
  handoff doc lists it as a "suggested" split; merging it avoids a join for every provider read with no
  functional loss for v1.
- `GuestLevel.extra_large` in Postgres maps to the `"extra-large"` slug the frontend uses — enums can't contain
  hyphens, so `src/lib/taxonomy.ts` converts at the API boundary.
- `Provider.aliases` is how the canonical-slug fix works: `mandlas-event-rentals` is canonical, and
  `mandla-event-rentals` is stored as an alias that still resolves via `GET /api/providers/:slug`.
- Media/photo uploads (`POST /api/providers/me/media`) write to local disk by default (`STORAGE_DRIVER=local`)
  for easy local dev. Set `STORAGE_DRIVER=r2` in production to write to Cloudflare R2 instead — see
  `src/lib/storage.ts` and `DEPLOYMENT.md`. Swapping drivers is one env var; no route code changes.
- Provider `overview` sections (public detail page) are generated from live fields rather than stored as static
  text, so they never go stale when a provider edits their listing.

## Known v1 gaps (called out in the handoff doc as non-goals or MVP stubs)

- No payments/Paystack — `packageStatus` is stubbed `"Active"`.
- No admin review queue — onboarding's "success" step publishes the listing immediately (`status: "live"`).
- Settings' notification toggles are read/write in shape but not yet wired to a real notification system.
- `/quote` (multi-provider quote) and `/saved` search alerts are out of scope per the doc.

## Deploying

See `DEPLOYMENT.md` for the full Render + Neon + Cloudflare R2 walkthrough.

## Production hardening already in place

- `express-rate-limit` on `/api/auth/register`, `/api/auth/login` and `POST /api/providers/:slug/leads`
  (the quote form is intentionally open to guests, so it's also open to spam — see
  `src/middleware/rate-limit.ts`).
- `app.set("trust proxy", 1)` so rate limiting and `req.ip` see the real client IP behind Render's proxy.
- `helmet` for standard security headers, `cors` locked to `CORS_ORIGIN`.
- Stateless auth (NextAuth JWT + shared secret, no server-side session store) — the API can run
  multiple instances with zero session-affinity concerns.
