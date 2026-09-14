import { afterEach, describe, expect, it, vi } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

const { sendAlert } = await import("../alerts");

afterEach(() => {
  mockFetch.mockReset();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function okResponse(): Response {
  return { ok: true, status: 200 } as Response;
}

function badResponse(): Response {
  return { ok: false, status: 500 } as Response;
}

describe("sendAlert", () => {
  it("delivers a structured JSON payload to ALERT_WEBHOOK_URL", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://alerts.example.com/hook");
    mockFetch.mockResolvedValueOnce(okResponse());

    await sendAlert({
      event: "test_event",
      severity: "warning",
      message: "something happened",
      details: { state: "KS" },
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://alerts.example.com/hook");
    const body = JSON.parse(init.body as string);
    expect(body.source).toBe("nexus-filings-monitor");
    expect(body.event).toBe("test_event");
    expect(body.severity).toBe("warning");
    expect(body.message).toBe("something happened");
    expect(body.details).toEqual({ state: "KS" });
    expect(body.timestamp).toBeTruthy();
  });

  it("retries and succeeds on a later attempt", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://alerts.example.com/hook");
    vi.stubEnv("ALERT_RETRY_BASE_DELAY_MS", "1");
    mockFetch
      .mockResolvedValueOnce(badResponse())
      .mockResolvedValueOnce(badResponse())
      .mockResolvedValueOnce(okResponse());

    await sendAlert({ event: "e", severity: "critical", message: "m" });

    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("never throws when the alert endpoint stays down", async () => {
    vi.stubEnv("ALERT_WEBHOOK_URL", "https://alerts.example.com/hook");
    vi.stubEnv("ALERT_RETRY_BASE_DELAY_MS", "1");
    mockFetch.mockRejectedValue(new Error("network down"));

    await expect(
      sendAlert({ event: "e", severity: "critical", message: "m" }),
    ).resolves.toBeUndefined();
    expect(mockFetch).toHaveBeenCalledTimes(3);
  });

  it("is log-only when no ALERT_WEBHOOK_URL is configured", async () => {
    await sendAlert({ event: "e", severity: "warning", message: "m" });
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
