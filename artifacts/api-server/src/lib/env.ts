type NodeEnv = "development" | "test" | "production";

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required but was not provided.`);
  }
  return value;
}

function getOptionalEnv(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function parsePort(rawPort: string): number {
  const port = Number(rawPort);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }
  return port;
}

function assertValidUrl(name: string, value: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

const nodeEnvRaw = process.env.NODE_ENV ?? "development";
if (!["development", "test", "production"].includes(nodeEnvRaw)) {
  throw new Error(`Invalid NODE_ENV value: "${nodeEnvRaw}"`);
}

const databaseUrl = getRequiredEnv("DATABASE_URL");
assertValidUrl("DATABASE_URL", databaseUrl);

const portalWebhookUrl = getOptionalEnv("PORTAL_WEBHOOK_URL");
if (portalWebhookUrl) {
  assertValidUrl("PORTAL_WEBHOOK_URL", portalWebhookUrl);
}

const portalWebhookPath = getOptionalEnv("PORTAL_WEBHOOK_PATH");
if (portalWebhookPath && !portalWebhookPath.startsWith("/")) {
  throw new Error('PORTAL_WEBHOOK_PATH must start with "/".');
}

const rawPort = getRequiredEnv("PORT");

export const env = {
  nodeEnv: nodeEnvRaw as NodeEnv,
  port: parsePort(rawPort),
  databaseUrl,
  logLevel: process.env.LOG_LEVEL ?? "info",
  clerkSecretKey: getOptionalEnv("CLERK_SECRET_KEY"),
  grokApiKey: getOptionalEnv("GROK_API_KEY"),
  portalWebhookUrl: portalWebhookUrl ?? "https://portaltreasurekc.org",
  portalWebhookPath: portalWebhookPath ?? "/webhook/llcs",
  portalWebhookSecret: getOptionalEnv("PORTAL_WEBHOOK_SECRET"),
};
