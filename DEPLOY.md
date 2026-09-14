# Deploying Nexus (no Replit)

The app deploys to Render straight from GitHub: every push to `main` automatically
rebuilds and redeploys. One Docker image serves both the Express API and the
built SPA from a single origin, next to a managed PostgreSQL database.

## One-time setup (~10 minutes)

1. Create a free account at [render.com](https://render.com) (sign in with GitHub).
2. Dashboard → **New → Blueprint**, pick this repo (`Nexus-Filings-Monitor`), apply.
   Render reads `render.yaml` at the repo root and provisions:
   - `nexus-db` — PostgreSQL (free plan)
   - `nexus` — web service running the Dockerfile (free plan)
3. When prompted for the values marked `sync: false`, fill in:

   | Value | Where to get it |
   | --- | --- |
   | `CLERK_SECRET_KEY` | Clerk dashboard → API keys (same one Replit used) |
   | `VITE_CLERK_PUBLISHABLE_KEY` | Clerk dashboard → API keys (publishable) |
   | `VITE_CLERK_PROXY_URL` | `https://<your-service>.onrender.com/api/__clerk` — enter any placeholder now, fix in step 4 |
   | `ALERT_WEBHOOK_URL` | optional — Slack/other webhook for operational alerts |
   | `WEBHOOK_SUBSCRIBERS` | optional — JSON subscriber list, e.g. `[{"name":"portal","url":"https://portaltreasurekc.org/webhook/llcs","secret":"..."}]` |
   | `PORTAL_WEBHOOK_SECRET` | optional — legacy portal secret |

4. After the first deploy finishes, copy the service URL
   (`https://nexus-xxxx.onrender.com`), set `VITE_CLERK_PROXY_URL` to
   `<service-url>/api/__clerk` in the Render dashboard, and trigger **Manual Deploy**.
   (The Clerk proxy URL is baked into the frontend bundle at build time, so it
   needs one redeploy once the real URL is known.)

## How it works

- `Dockerfile` — installs pinned pnpm, builds the whole workspace, boots the
  API server (`artifacts/api-server`). CI builds this image on every PR to
  catch Docker regressions.
- `render.yaml` — the Render blueprint: database + web service + env wiring.
- `SERVE_STATIC_DIR` makes the API server serve the built SPA from the same
  origin, so the frontend's relative `/api/...` calls and the Clerk proxy work
  without any separate frontend host.
- `MIGRATE_ON_START=true` applies the Drizzle schema with
  `drizzle-kit push --force` on every boot (idempotent). Set it to `false` if
  you'd rather run schema changes by hand.

## Environment variables (all optional beyond the ones above)

See `artifacts/api-server/README.md` for the full SOS refresh, alerting, and
webhook configuration (`SOS_STATES`, `SOS_REFRESH_HOUR_UTC`,
`SOS_CATCHUP_MAX_DAYS`, etc.). Everything has working defaults.

## Free-plan caveats

- The free Postgres instance **expires after 30 days**. Upgrade the DB (starts
  at $7/mo) before then, or export/reimport.
- The free web service **spins down after ~15 min without traffic**. It wakes on
  the first request, and the PR #2 refresh-scheduler catch-up logic backfills
  any missed daily SOS refreshes on wake — so data stays complete, but refreshes
  only run when the service is up. A cron ping to `/api/healthz` (e.g. GitHub
  Actions or cron-job.org every 10 min) keeps it warm if you want true daily
  precision on the free plan.
- Custom domain: Settings → Custom Domains in the Render dashboard; then update
  `VITE_CLERK_PROXY_URL` to the custom domain and redeploy.
