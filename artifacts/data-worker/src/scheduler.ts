import { ingestKansasLlcs } from "./jobs/ingest-ks-llcs";

let lastRunAt: string | null = null;
let nextRunAt: string | null = null;
let running = false;
let timer: NodeJS.Timeout | null = null;

function getDelayUntilNextRun(hourUtc: number): number {
  const now = new Date();
  const next = new Date(now);
  next.setUTCHours(hourUtc, 0, 0, 0);
  if (next <= now) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  nextRunAt = next.toISOString();
  return next.getTime() - now.getTime();
}

async function runOnce(hourUtc: number): Promise<void> {
  if (running) return;
  running = true;
  try {
    await ingestKansasLlcs();
    lastRunAt = new Date().toISOString();
  } finally {
    running = false;
    scheduleNext(hourUtc);
  }
}

function scheduleNext(hourUtc: number): void {
  const delay = getDelayUntilNextRun(hourUtc);
  timer = setTimeout(() => {
    void runOnce(hourUtc);
  }, delay);
}

export function startScheduler(): void {
  if (timer) return;
  const hourUtc = Number(process.env.INGESTION_HOUR_UTC ?? "6");
  scheduleNext(Number.isInteger(hourUtc) ? hourUtc : 6);
}

export function stopScheduler(): void {
  if (!timer) return;
  clearTimeout(timer);
  timer = null;
}

export function getSchedulerStatus() {
  return {
    running,
    lastRunAt,
    nextRunAt,
  };
}
