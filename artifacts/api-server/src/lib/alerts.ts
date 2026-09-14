import { logger } from "./logger";

export type AlertSeverity = "warning" | "critical";

export type Alert = {
  event: string;
  severity: AlertSeverity;
  message: string;
  details?: Record<string, unknown>;
};

function alertWebhookUrl(): string {
  return process.env.ALERT_WEBHOOK_URL ?? "";
}

function alertMaxAttempts(): number {
  return Number(process.env.ALERT_MAX_ATTEMPTS ?? 3);
}

function alertRetryBaseDelayMs(): number {
  return Number(process.env.ALERT_RETRY_BASE_DELAY_MS ?? 2000);
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends an operational alert through every configured channel.
 *
 * Channels:
 * - Always: structured log output
 * - If ALERT_WEBHOOK_URL is set: JSON POST to that URL (e.g. a Slack
 *   incoming-webhook, a Discord hook, or any endpoint that accepts JSON)
 *
 * Delivery is best-effort with retry; alerting must never crash the refresh
 * pipeline it is reporting on.
 */
export async function sendAlert(alert: Alert): Promise<void> {
  const payload = {
    source: "nexus-filings-monitor",
    event: alert.event,
    severity: alert.severity,
    message: alert.message,
    details: alert.details ?? {},
    timestamp: new Date().toISOString(),
  };

  if (alert.severity === "critical") {
    logger.error(payload, `ALERT [${alert.event}] ${alert.message}`);
  } else {
    logger.warn(payload, `ALERT [${alert.event}] ${alert.message}`);
  }

  const webhookUrl = alertWebhookUrl();
  if (!webhookUrl) {
    return;
  }

  for (let attempt = 1; attempt <= alertMaxAttempts(); attempt += 1) {
    try {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) return;
      logger.warn(
        { status: response.status, attempt },
        "Alert webhook responded with non-2xx status",
      );
    } catch (error) {
      logger.warn({ err: error, attempt }, "Alert webhook delivery failed");
    }
    if (attempt < alertMaxAttempts()) await sleep(alertRetryBaseDelayMs() * attempt);
  }
}
