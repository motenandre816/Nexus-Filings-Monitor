import { logger } from "./logger";
import { sendAlert } from "./alerts";
import {
  CONFIGURED_STATES,
  getLastSuccessfulRunDate,
  runSosRefresh,
  type SourceRefreshResult,
  type SosState,
} from "./sos";

const DAILY_REFRESH_HOUR_UTC = Number(process.env.SOS_REFRESH_HOUR_UTC ?? 3);
const DAY_MS = 24 * 60 * 60 * 1_000;
/** How far back we are willing to backfill missed days on startup. */
const CATCHUP_MAX_DAYS = Number(process.env.SOS_CATCHUP_MAX_DAYS ?? 7);

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

function dateDaysAgo(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().split("T")[0];
}

function nextRefreshDelay(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(DAILY_REFRESH_HOUR_UTC, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY_MS);
  return next.getTime() - now.getTime();
}

/**
 * Dates (YYYY-MM-DD) that have no recorded successful refresh for a state,
 * oldest first. Looks back at most CATCHUP_MAX_DAYS days, so a long outage
 * after a long downtime produces a bounded amount of backfill work.
 */
export async function missingRefreshDates(state: SosState): Promise<string[]> {
  const lastSuccess = await getLastSuccessfulRunDate(state);
  const today = todayUtc();
  if (lastSuccess && lastSuccess >= today) return [];
  const oldest = Math.min(
    CATCHUP_MAX_DAYS,
    lastSuccess ? daysBetween(lastSuccess, today) : 0,
  );
  if (!lastSuccess) {
    // Never succeeded yet: nothing to backfill — the startup refresh
    // covers today and history has nothing worth re-running.
    return [];
  }
  const dates: string[] = [];
  for (let back = oldest; back >= 1; back -= 1) {
    const date = dateDaysAgo(back);
    // Only days strictly after the last success are actually missing.
    if (date > lastSuccess) dates.push(date);
  }
  return dates;
}

function daysBetween(from: string, to: string): number {
  const ms = new Date(`${to}T00:00:00Z`).getTime() - new Date(`${from}T00:00:00Z`).getTime();
  return Math.floor(ms / DAY_MS);
}

async function reportFailures(results: SourceRefreshResult[], trigger: string): Promise<void> {
  const failed = results.filter((result) => result.status === "failed");
  if (failed.length === 0) return;
  await sendAlert({
    event: "sos_refresh_source_failure",
    severity: "critical",
    message: `SOS refresh (${trigger}) finished with ${failed.length} source failure(s): ${failed
      .map((f) => f.state)
      .join(", ")}`,
    details: {
      trigger,
      failures: failed.map((f) => ({ state: f.state, sourceUrl: f.sourceUrl, error: f.error })),
    },
  });
}

async function refresh(trigger: "catchup" | "scheduled" | "startup"): Promise<void> {
  const results = await runSosRefresh(CONFIGURED_STATES, todayUtc(), trigger);
  logger.info({ trigger, results }, "SOS refresh finished");
  await reportFailures(results, trigger);
}

/**
 * Backfills any days that were missed while the process was down or asleep.
 * Uses the sos_refresh_runs history table, so it is safe to call on every
 * boot: days that already have a successful run are skipped.
 */
async function catchUpMissedDays(): Promise<void> {
  for (const state of CONFIGURED_STATES) {
    const missing = await missingRefreshDates(state);
    if (missing.length === 0) continue;
    logger.warn({ state, missing }, "Detected missed refresh days, backfilling");
    await sendAlert({
      event: "sos_refresh_catchup",
      severity: "warning",
      message: `Process was down for ${state}: backfilling ${missing.length} missed day(s) (${missing[0]} … ${missing[missing.length - 1]}).`,
      details: { state, missingDates: missing },
    });
    for (const date of missing) {
      const results = await runSosRefresh([state], date, "catchup");
      await reportFailures(results, `catchup ${state} ${date}`);
    }
  }
}

let stopped = false;
let timer: ReturnType<typeof setTimeout> | undefined;

function scheduleNext(): void {
  if (stopped) return;
  timer = setTimeout(async () => {
    await refresh("scheduled").catch((error) => {
      logger.error({ err: error }, "SOS scheduled refresh failed unexpectedly");
    });
    // Re-schedule against the wall clock so drift never accumulates.
    scheduleNext();
  }, nextRefreshDelay());
}

export function startDailyRefresh(): () => void {
  if (process.env.SOS_REFRESH_DISABLED === "true") {
    logger.warn("SOS daily refresh is disabled by SOS_REFRESH_DISABLED");
    return () => undefined;
  }

  stopped = false;

  void catchUpMissedDays()
    .then(() => refresh("startup"))
    .catch((error) => {
      logger.error({ err: error }, "SOS startup refresh failed unexpectedly");
    });

  scheduleNext();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
  };
}
