import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../sos", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../sos")>();
  return {
    ...actual,
    getLastSuccessfulRunDate: vi.fn(),
  };
});

const sos = await import("../sos");
const { missingRefreshDates, nextRefreshDelay } = await import("../refresh-scheduler");

const mockedLastSuccess = vi.mocked(sos.getLastSuccessfulRunDate);

function setTime(iso: string): void {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(iso));
}

beforeEach(() => {
  mockedLastSuccess.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("missingRefreshDates", () => {
  it("returns nothing when the state succeeded yesterday (startup covers today)", async () => {
    setTime("2026-09-14T12:00:00Z");
    mockedLastSuccess.mockResolvedValue("2026-09-13");
    expect(await missingRefreshDates("KS")).toEqual([]);
  });

  it("returns nothing when the state already succeeded today", async () => {
    setTime("2026-09-14T12:00:00Z");
    mockedLastSuccess.mockResolvedValue("2026-09-14");
    expect(await missingRefreshDates("MO")).toEqual([]);
  });

  it("lists each missed day, oldest first", async () => {
    setTime("2026-09-14T12:00:00Z");
    mockedLastSuccess.mockResolvedValue("2026-09-11");
    expect(await missingRefreshDates("KS")).toEqual(["2026-09-12", "2026-09-13"]);
  });

  it("caps the backfill window at SOS_CATCHUP_MAX_DAYS", async () => {
    vi.stubEnv("SOS_CATCHUP_MAX_DAYS", "5");
    setTime("2026-09-14T12:00:00Z");
    mockedLastSuccess.mockResolvedValue("2026-08-01");
    const missing = await missingRefreshDates("KS");
    expect(missing).toHaveLength(5);
    expect(missing[0]).toBe("2026-09-09");
    expect(missing[4]).toBe("2026-09-13");
  });

  it("does not re-run days that already succeeded even at the window edge", async () => {
    vi.stubEnv("SOS_CATCHUP_MAX_DAYS", "7");
    setTime("2026-09-14T12:00:00Z");
    // Last success exactly 7 days ago: day -7 already succeeded, so only -6..-1 are missing.
    mockedLastSuccess.mockResolvedValue("2026-09-07");
    expect(await missingRefreshDates("KS")).toEqual([
      "2026-09-08",
      "2026-09-09",
      "2026-09-10",
      "2026-09-11",
      "2026-09-12",
      "2026-09-13",
    ]);
  });

  it("returns nothing for a state that never succeeded (startup refresh covers today)", async () => {
    setTime("2026-09-14T12:00:00Z");
    mockedLastSuccess.mockResolvedValue(null);
    expect(await missingRefreshDates("KS")).toEqual([]);
  });
});

describe("nextRefreshDelay", () => {
  it("targets the configured hour later today", () => {
    setTime("2026-09-14T01:00:00Z");
    expect(nextRefreshDelay()).toBe(2 * 60 * 60 * 1_000);
  });

  it("rolls to tomorrow when the hour has passed", () => {
    setTime("2026-09-14T04:00:00Z");
    expect(nextRefreshDelay()).toBe(23 * 60 * 60 * 1_000);
  });

  it("honors SOS_REFRESH_HOUR_UTC", () => {
    vi.stubEnv("SOS_REFRESH_HOUR_UTC", "5");
    setTime("2026-09-14T01:00:00Z");
    expect(nextRefreshDelay()).toBe(4 * 60 * 60 * 1_000);
  });
});
