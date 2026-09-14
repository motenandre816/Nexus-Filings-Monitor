import { logger } from "./logger";
import { runSosRefresh } from "./sos";

const DAILY_REFRESH_HOUR_UTC = Number(process.env.SOS_REFRESH_HOUR_UTC ?? 3);
const DAY_MS = 24 * 60 * 60 * 1_000;

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

function nextRefreshDelay(now = new Date()): number {
  const next = new Date(now);
  next.setUTCHours(DAILY_REFRESH_HOUR_UTC, 0, 0, 0);
  if (next.getTime() <= now.getTime()) next.setTime(next.getTime() + DAY_MS);
  return next.getTime() - now.getTime();
}

async function refresh(trigger: "startup" | "scheduled"): Promise<void> {
  const results = await runSosRefresh(["KS", "MO"], todayUtc(), trigger);
  const failed = results.filter((result) => result.status === "failed");
  if (failed.length > 0) {
    logger.error({ failed }, "SOS refresh finished with source failures");
  } else {
    logger.info({ results }, "SOS refresh finished successfully");
  }
}

export function startDailyRefresh(): () => void {
  if (process.env.SOS_REFRESH_DISABLED === "true") {
    logger.warn("SOS daily refresh is disabled by SOS_REFRESH_DISABLED");
    return () => undefined;
  }

  void refresh("startup").catch((error) => {
    logger.error({ err: error }, "SOS startup refresh failed unexpectedly");
  });

  let interval: ReturnType<typeof setInterval> | undefined;
  const timeout = setTimeout(() => {
    void refresh("scheduled").catch((error) => {
      logger.error({ err: error }, "SOS scheduled refresh failed unexpectedly");
    });
    interval = setInterval(() => {
      void refresh("scheduled").catch((error) => {
        logger.error({ err: error }, "SOS scheduled refresh failed unexpectedly");
      });
    }, DAY_MS);
  }, nextRefreshDelay());

  return () => {
    clearTimeout(timeout);
    if (interval) clearInterval(interval);
  };
}