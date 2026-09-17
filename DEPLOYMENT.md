# Deploying Occasions

Stack: **Vercel** (frontend) + **Render** (backend API) + **Neon** (Postgres) + **Cloudflare R2** (provider photos).

## 1. Neon (database)

1. Create a project at [neon.tech](https://neon.tech) (Frankfurt region — closest to South Africa of Neon's options).
2. In the Neon dashboard → **Connection Details**, toggle **Pooled connection** and copy that string
   (hostname will contain `-pooler`). Use the pooled string for `DATABASE_URL` in production —
   Neon's serverless Postgres needs pooling once you have concurrent requests, or Prisma exhausts
   the connection limit.
3. Keep this connection string handy for step 3.

## 2. Cloudflare R2 (provider photo storage)

The backend currently writes uploaded photos to local disk in dev. That breaks in production —
Render's filesystem doesn't persist across deploys/restarts — so production uses R2 instead
(S3-compatible, already wired up in `src/lib/storage.ts`).

1. Cloudflare dashboard → **R2** → **Create bucket**, name it e.g. `occasions-media`.
2. Bucket → **Settings** → **Public access** → enable it (or map a custom domain, e.g.
   `media.occasions.co.za`, if you have one). Copy the public URL — this is `R2_PUBLIC_URL`.
3. Cloudflare dashboard → **R2** → **Manage API tokens** → create a token with **Object Read & Write**
   scoped to this bucket. Copy the **Account ID**, **Access Key ID** and **Secret Access Key**.

## 3. Render (backend)

1. Push this `occasions-backend/` folder to a GitHub repo (its own repo, or a subfolder if you set
   Render's "Root Directory" to `occasions-backend`).
2. Render dashboard → **New** → **Blueprint** → point at the repo. It reads `render.yaml` automatically
   and creates the web service.
3. Once created, go to the service → **Environment** and fill in the variables marked `sync: false`
   in `render.yaml`:
   - `DATABASE_URL` — the **pooled** Neon string from step 1
   - `NEXTAUTH_SECRET` — generate with `openssl rand -base64 32`; you'll reuse this exact value in Vercel
   - `CORS_ORIGIN` — leave as `http://localhost:3000` for now, come back and set it to your real
     Vercel URL after step 4
   - `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET`, `R2_PUBLIC_URL` — from step 2
4. Deploy. The start command (`npx prisma migrate deploy && npm start`) applies any pending
   migrations automatically on every deploy — you don't need to run `prisma migrate deploy` by hand.
5. Once it's live, run the seed script **once**, from your machine, pointed at the production DB:
   ```bash
   DATABASE_URL="<neon pooled string>" npm run seed
   ```
   (Only do this once — re-running is safe, the seed script upserts, but there's no need to repeat it.)
6. Confirm: `curl https://<your-render-url>/health` → `{"ok":true}`.

## 4. Vercel (frontend)

1. Push your Next.js frontend (with the integration changes) to its own GitHub repo.
2. Vercel dashboard → **Add New** → **Project** → import that repo.
3. Under **Environment Variables**, add:
   - `NEXT_PUBLIC_API_URL` = your Render URL (e.g. `https://occasions-backend.onrender.com`)
   - `NEXTAUTH_SECRET` = the **exact same value** you set in Render
   - `NEXTAUTH_URL` = your Vercel URL (e.g. `https://occasions.vercel.app`) — Vercel also sets this
     automatically for preview deploys, but set it explicitly for production
4. Deploy.
5. Go back to Render → Environment → set `CORS_ORIGIN` to your real Vercel URL, save (triggers a
   redeploy). Until this is set correctly, the frontend's API calls will fail with a CORS error in
   the browser console.

## 5. Smoke test checklist

Once both are live:

- [ ] `GET https://<render-url>/health` → `{"ok":true}`
- [ ] Homepage loads with real featured providers / categories (confirms frontend → backend → Neon)
- [ ] `/search` returns results and filters actually change them
- [ ] A provider detail page loads, and `mandla-event-rentals` (old alias) resolves to the same
      page as `mandlas-event-rentals` (canonical slug fix)
- [ ] Submitting the quote form on a provider page succeeds
- [ ] Sign up as a provider, complete onboarding, confirm the listing appears in `/search`
- [ ] Log in as that provider, see the lead you just submitted in `/provider-dashboard/leads`
- [ ] Upload a photo in the listing flow (or via `POST /api/providers/me/media`) and confirm the
      returned URL is an `R2_PUBLIC_URL` link that actually loads the image

## Notes on scaling later

- Render's `starter` plan is a single instance — fine for a launch, but it means the local
  `express-rate-limit` counters (in `src/middleware/rate-limit.ts`) live in that one instance's
  memory. If you scale to multiple instances later, move rate limiting to a shared store (Redis)
  or Render's own edge rate limiting — otherwise each instance rate-limits independently.
- Neon autoscales storage/compute on its own within your plan; the main thing to watch is
  connection count, which the pooled connection string already handles.
- If Africa latency becomes a measurable problem once you have real traffic, revisit hosting the
  API on Fly.io (has a Johannesburg region) — everything here (Docker-free Node app, env-var driven
  config) ports over with minimal changes.
