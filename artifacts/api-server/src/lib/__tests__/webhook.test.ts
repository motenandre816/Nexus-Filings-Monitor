import { afterEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { getWebhookSubscribers, fireWebhook } = await import("../webhook");

const basePayload = {
  event: "new_llcs" as const,
  timestamp: "2026-09-14T00:00:00.000Z",
  state: "KS",
  date: "2026-09-13",
  count: 1,
  llcs: [
    {
      id: 1,
      name: "Test LLC",
      state: "KS",
      city: "Wichita",
      filingDate: "2026-09-13",
      agentName: null,
      agentAddress: null,
      status: "Active",
    },
  ],
};

function okResponse(): Response {
  return { ok: true, status: 200 } as Response;
}

function badResponse(): Response {
  return { ok: false, status: 503 } as Response;
}

afterEach(() => {
  mockFetch.mockReset();
  vi.unstubAllEnvs();
});

describe("getWebhookSubscribers", () => {
  it("falls back to the legacy PORTAL_* env vars", () => {
    vi.stubEnv("PORTAL_WEBHOOK_URL", "https://portaltreasurekc.org/");
    vi.stubEnv("PORTAL_WEBHOOK_PATH", "/webhook/llcs");
    vi.stubEnv("PORTAL_WEBHOOK_SECRET", "s3cret");

    expect(getWebhookSubscribers()).toEqual([
      {
        name: "portal",
        url: "https://portaltreasurekc.org/webhook/llcs",
        secret: "s3cret",
      },
    ]);
  });

  it("reads the WEBHOOK_SUBSCRIBERS JSON array", () => {
    vi.stubEnv(
      "WEBHOOK_SUBSCRIBERS",
      JSON.stringify([
        { name: "portal", url: "https://portal.example.com/hook", secret: "a" },
        { name: "partner", url: "https://partner.example.com/hook" },
      ]),
    );

    const subscribers = getWebhookSubscribers();
    expect(subscribers).toHaveLength(2);
    expect(subscribers[0]).toEqual({
      name: "portal",
      url: "https://portal.example.com/hook",
      secret: "a",
    });
    expect(subscribers[1].secret).toBeNull();
  });

  it("ignores an invalid WEBHOOK_SUBSCRIBERS value and falls back", () => {
    vi.stubEnv("WEBHOOK_SUBSCRIBERS", "{definitely not json");
    vi.stubEnv("PORTAL_WEBHOOK_URL", "https://portaltreasurekc.org");
    vi.stubEnv("PORTAL_WEBHOOK_PATH", "/webhook/llcs");

    expect(getWebhookSubscribers()).toHaveLength(1);
    expect(getWebhookSubscribers()[0].url).toBe("https://portaltreasurekc.org/webhook/llcs");
  });
});

describe("fireWebhook", () => {
  it("delivers to every subscriber and reports per-subscriber results", async () => {
    vi.stubEnv(
      "WEBHOOK_SUBSCRIBERS",
      JSON.stringify([
        { name: "portal", url: "https://portal.example.com/hook" },
        { name: "partner", url: "https://partner.example.com/hook" },
      ]),
    );
    mockFetch.mockResolvedValue(okResponse());

    const results = await fireWebhook(basePayload);

    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(results).toHaveLength(2);
    expect(results.every((result) => result.status === "delivered")).toBe(true);
  });

  it("retries a failing subscriber with backoff and reports the failure", async () => {
    vi.stubEnv("WEBHOOK_RETRY_BASE_DELAY_MS", "1");
    vi.stubEnv(
      "WEBHOOK_SUBSCRIBERS",
      JSON.stringify([{ name: "down", url: "https://down.example.com/hook" }]),
    );
    mockFetch.mockRejectedValue(new Error("connection refused"));

    const results = await fireWebhook(basePayload);

    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(results[0].status).toBe("failed");
    expect(results[0].attempts).toBe(3);
    expect(results[0].error).toContain("connection refused");
  });

  it("keeps delivering to healthy subscribers when another one is down", async () => {
    vi.stubEnv("WEBHOOK_RETRY_BASE_DELAY_MS", "1");
    vi.stubEnv(
      "WEBHOOK_SUBSCRIBERS",
      JSON.stringify([
        { name: "down", url: "https://down.example.com/hook" },
        { name: "up", url: "https://up.example.com/hook" },
      ]),
    );
    mockFetch.mockImplementation(async (url: string) => {
      if (String(url).includes("down.example.com")) throw new Error("nope");
      return okResponse();
    });

    const results = await fireWebhook(basePayload);

    expect(results.find((r) => r.subscriber === "down")?.status).toBe("failed");
    expect(results.find((r) => r.subscriber === "up")?.status).toBe("delivered");
  });

  it("sends the secret header only when configured", async () => {
    vi.stubEnv(
      "WEBHOOK_SUBSCRIBERS",
      JSON.stringify([{ name: "portal", url: "https://portal.example.com/hook", secret: "top" }]),
    );
    mockFetch.mockResolvedValue(okResponse());

    await fireWebhook(basePayload);

    const init = mockFetch.mock.calls[0][1];
    expect(init.headers["X-Treasure-Secret"]).toBe("top");
    expect(init.headers["X-Treasure-Event"]).toBe("new_llcs");
  });
});
