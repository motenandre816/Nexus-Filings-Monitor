# Treasure KC Nexus — API Server

Express 5 API for LLC discovery and recruitment. Part of the pnpm workspace.

## Scheduling & sources

The server refreshes SOS filing sources daily at `SOS_REFRESH_HOUR_UTC` (default 3:00 UTC).
Refresh history lives in the `sos_refresh_runs` table. On startup the scheduler
backfills any days that have no successful refresh (bounded by `SOS_CATCHUP_MAX_DAYS`,
default 7), so a crashed or sleeping process does not silently lose filings.

| Variable | Default | Purpose |
| --- | --- | --- |
| `SOS_STATES` | `KS,MO` | Comma-separated states to monitor |
| `SOS_<STATE>_SOURCE_URL` | per-state default | Source feed URL for a state (supports `{date}` placeholder) |
| `SOS_<STATE>_LABEL` | generated | Human label for the source |
| `SOS_<STATE>_LLC_ONLY` | `true` | Set `false` to keep non-LLC entities |
| `SOS_REFRESH_HOUR_UTC` | `3` | Hour of day for the daily refresh (UTC) |
| `SOS_CATCHUP_MAX_DAYS` | `7` | Max days of missed history to backfill on startup |
| `SOS_SOURCE_MAX_ATTEMPTS` | `3` | Fetch retries per source (5s × attempt backoff) |
| `SOS_REFRESH_DISABLED` | — | Set `true` to disable scheduled refreshes entirely |

## Alerts

Failures (dead sources, missed days) are raised via `ALERT_WEBHOOK_URL`, a JSON
POST endpoint — e.g. a Slack incoming webhook, Discord hook, or any receiver.
Without it, alerts are log lines only.

| Variable | Default | Purpose |
| --- | --- | --- |
| `ALERT_WEBHOOK_URL` | — | JSON POST endpoint for operational alerts |
| `ALERT_MAX_ATTEMPTS` | `3` | Alert delivery retries |
| `ALERT_RETRY_BASE_DELAY_MS` | `2000` | Backoff between alert retries (multiplied by attempt) |

## Webhooks (outbound)

After a refresh that stores new filings, the server POSTs them to every
configured subscriber, each with independent retries.

| Variable | Default | Purpose |
| --- | --- | --- |
| `WEBHOOK_SUBSCRIBERS` | — | JSON array: `[{"name":"portal","url":"https://.../webhook/llcs","secret":"..."}]` |
| `WEBHOOK_MAX_ATTEMPTS` | `3` | Delivery retries per subscriber |
| `WEBHOOK_RETRY_BASE_DELAY_MS` | `5000` | Backoff between subscriber retries (multiplied by attempt) |
| `PORTAL_WEBHOOK_URL` | `https://portaltreasurekc.org` | Legacy single-destination fallback |
| `PORTAL_WEBHOOK_PATH` | `/webhook/llcs` | Legacy path (joined to `PORTAL_WEBHOOK_URL`) |
| `PORTAL_WEBHOOK_SECRET` | — | Legacy shared secret (sent as `X-Treasure-Secret` header) |

`GET /webhook/config` lists the resolved subscribers; `POST /webhook/test` fires
a test payload to all of them and reports per-subscriber results.

## Development

```bash
pnpm install
pnpm --filter @workspace/api-server dev
pnpm run typecheck
```
