import { logger } from "./logger";

export interface WebhookPayload {
  event: "new_llcs";
  timestamp: string;
  state: string;
  date: string;
  count: number;
  llcs: Array<{
    id: number;
    name: string;
    state: string;
    city: string | null;
    filingDate: string;
    agentName: string | null;
    agentAddress: string | null;
    status: string;
  }>;
}

export interface WebhookSubscriber {
  name: string;
  url: string;
  secret: string | null;
}

export interface WebhookDeliveryResult {
  subscriber: string;
  url: string;
  status: "delivered" | "failed";
  attempts: number;
  error: string | null;
}

function deliveryMaxAttempts(): number {
  return Number(process.env.WEBHOOK_MAX_ATTEMPTS ?? 3);
}

function retryBaseDelayMs(): number {
  return Number(process.env.WEBHOOK_RETRY_BASE_DELAY_MS ?? 5000);
}

/**
 * Resolves webhook subscribers.
 *
 * Preferred: WEBHOOK_SUBSCRIBERS — a JSON array:
 *   [{"name":"portal","url":"https://portaltreasurekc.org/webhook/llcs","secret":"..."}]
 *
 * Legacy fallback: PORTAL_WEBHOOK_URL + PORTAL_WEBHOOK_PATH + PORTAL_WEBHOOK_SECRET
 * so existing deployments keep working without any changes.
 */
export function getWebhookSubscribers(): WebhookSubscriber[] {
  const raw = process.env.WEBHOOK_SUBSCRIBERS?.trim();
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) throw new Error("expected a JSON array");
      return parsed
        .filter((entry): entry is Record<string, unknown> => Boolean(entry && typeof entry === "object"))
        .map((entry, index) => {
          const url = typeof entry.url === "string" ? entry.url : "";
          if (!url) throw new Error(`subscriber at index ${index} is missing "url"`);
          return {
            name: typeof entry.name === "string" && entry.name ? entry.name : `subscriber-${index + 1}`,
            url,
            secret: typeof entry.secret === "string" && entry.secret ? entry.secret : null,
          };
        });
    } catch (error) {
      logger.error(
        { err: error },
        "WEBHOOK_SUBSCRIBERS is set but invalid — falling back to legacy webhook config",
      );
    }
  }

  const baseUrl = process.env.PORTAL_WEBHOOK_URL || "https://portaltreasurekc.org";
  const webhookPath = process.env.PORTAL_WEBHOOK_PATH || "/webhook/llcs";
  const secret = process.env.PORTAL_WEBHOOK_SECRET || "";
  return [
    {
      name: "portal",
      url: baseUrl.replace(/\/$/, "") + webhookPath,
      secret: secret || null,
    },
  ];
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

async function deliver(
  subscriber: WebhookSubscriber,
  payload: WebhookPayload,
): Promise<WebhookDeliveryResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Treasure-Event": payload.event,
    "X-Treasure-Timestamp": payload.timestamp,
  };
  if (subscriber.secret) {
    headers["X-Treasure-Secret"] = subscriber.secret;
  }

  let lastError: string | null = null;
  for (let attempt = 1; attempt <= deliveryMaxAttempts(); attempt += 1) {
    try {
      const response = await fetch(subscriber.url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok) {
        logger.info(
          { subscriber: subscriber.name, url: subscriber.url, status: response.status, attempt },
          "Webhook delivered successfully",
        );
        return { subscriber: subscriber.name, url: subscriber.url, status: "delivered", attempts: attempt, error: null };
      }
      lastError = `HTTP ${response.status}`;
      logger.warn(
        { subscriber: subscriber.name, url: subscriber.url, status: response.status, attempt },
        "Webhook responded with non-2xx status",
      );
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      logger.warn(
        { subscriber: subscriber.name, url: subscriber.url, err: error, attempt },
        "Webhook delivery failed",
      );
    }
    if (attempt < deliveryMaxAttempts()) await sleep(retryBaseDelayMs() * attempt);
  }

  return {
    subscriber: subscriber.name,
    url: subscriber.url,
    status: "failed",
    attempts: deliveryMaxAttempts(),
    error: lastError,
  };
}

/**
 * Fires the payload at every configured subscriber, each with independent
 * retries. Never throws — a down subscriber must not break the refresh
 * pipeline that produced the data.
 */
export async function fireWebhook(payload: WebhookPayload): Promise<WebhookDeliveryResult[]> {
  const subscribers = getWebhookSubscribers();
  logger.info({ subscribers: subscribers.length, llcCount: payload.count }, "Firing webhooks");
  const results = await Promise.all(subscribers.map((subscriber) => deliver(subscriber, payload)));
  const failed = results.filter((result) => result.status === "failed");
  if (failed.length > 0) {
    logger.error({ failed }, "Webhook delivery failed for some subscribers after all retries");
  }
  return results;
}
