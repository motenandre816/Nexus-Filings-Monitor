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

const DEFAULT_WEBHOOK_PATHS = ["/webhook/llcs", "/api/webhook", "/webhook"];

export async function fireWebhook(payload: WebhookPayload): Promise<void> {
  const baseUrl = process.env.PORTAL_WEBHOOK_URL || "https://portaltreasurekc.org";
  const webhookPath = process.env.PORTAL_WEBHOOK_PATH || "/webhook/llcs";
  const fullUrl = baseUrl.replace(/\/$/, "") + webhookPath;
  const secret = process.env.PORTAL_WEBHOOK_SECRET || "";

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Treasure-Event": payload.event,
    "X-Treasure-Timestamp": payload.timestamp,
  };

  if (secret) {
    headers["X-Treasure-Secret"] = secret;
  }

  try {
    logger.info({ url: fullUrl, llcCount: payload.count }, "Firing webhook to portal");

    const response = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      logger.warn({ status: response.status, url: fullUrl }, "Webhook responded with non-2xx status");
    } else {
      logger.info({ status: response.status, url: fullUrl }, "Webhook delivered successfully");
    }
  } catch (err) {
    logger.error({ err, url: fullUrl }, "Webhook delivery failed — portal may not be reachable yet");
  }
}
