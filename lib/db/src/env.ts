function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} must be set. Did you forget to provision a database?`);
  }
  return value;
}

function assertValidUrl(name: string, value: string): void {
  try {
    new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL.`);
  }
}

const databaseUrl = getRequiredEnv("DATABASE_URL");
assertValidUrl("DATABASE_URL", databaseUrl);

export const env = {
  databaseUrl,
};
