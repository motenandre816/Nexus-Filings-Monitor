import { createHash } from "node:crypto";
import { and, desc, eq } from "drizzle-orm";
import { db, llcFilingsTable, sosRefreshRunsTable, type InsertLlcFiling, type SosRefreshRun } from "@workspace/db";
import { logger } from "./logger";

export type SosState = string;
export type RefreshTrigger = "catchup" | "manual" | "startup" | "scheduled";

/**
 * States to monitor. Configure with SOS_STATES="KS,MO" (comma separated).
 * Each state resolves its source URL from SOS_<STATE>_SOURCE_URL when set,
 * otherwise from the defaults below.
 */
export const CONFIGURED_STATES: SosState[] = (process.env.SOS_STATES ?? "KS,MO")
  .split(",")
  .map((state) => state.trim().toUpperCase())
  .filter((state) => state.length > 0);

export type SourceRefreshResult = {
  state: SosState;
  sourceUrl: string;
  status: "success" | "failed";
  found: number;
  stored: number;
  error: string | null;
  startedAt: string;
  completedAt: string;
};

type SourceConfig = {
  state: SosState;
  url: string;
  label: string;
  llcOnly: boolean;
};

type ParsedSourceRow = {
  name: string;
  filingId?: string | null;
  status?: string | null;
  filingDate?: string | null;
  agentName?: string | null;
  agentAddress?: string | null;
  city?: string | null;
};

const DEFAULT_SOURCE_URLS: Record<string, string> = {
  KS: "https://opensosdata.com/entity/kansas/",
  MO: "https://opensosdata.com/entity/missouri/",
};

function sourceConfigFor(state: SosState): SourceConfig {
  const envUrl = process.env[`SOS_${state}_SOURCE_URL`];
  const defaultUrl = DEFAULT_SOURCE_URLS[state];
  if (!envUrl && !defaultUrl) {
    throw new Error(
      `No source URL configured for state ${state}. Set SOS_${state}_SOURCE_URL or add a default.`,
    );
  }
  return {
    state,
    label: process.env[`SOS_${state}_LABEL`] ?? `SOS entity directory (${state})`,
    url: envUrl ?? defaultUrl,
    llcOnly: (process.env[`SOS_${state}_LLC_ONLY`] ?? "true").toLowerCase() !== "false",
  };
}

const REQUEST_TIMEOUT_MS = 30_000;
const SOURCE_MAX_ATTEMPTS = Number(process.env.SOS_SOURCE_MAX_ATTEMPTS ?? 3);
const RETRY_BASE_DELAY_MS = 5_000;

async function withRetry<T>(operation: () => Promise<T>, label: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= SOURCE_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt < SOURCE_MAX_ATTEMPTS) {
        const delay = RETRY_BASE_DELAY_MS * attempt;
        logger.warn(
          { err: error, label, attempt, nextAttemptInMs: delay },
          "Attempt failed, retrying",
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  throw lastError;
}
const MAX_SOURCE_BYTES = 8 * 1024 * 1024;
const MAX_ROWS_PER_SOURCE = 2_000;

export function getSosSourceConfig(state: SosState): SourceConfig {
  return sourceConfigFor(state);
}

function sourceUrlForDate(config: SourceConfig, date: string): string {
  return config.url.replaceAll("{date}", encodeURIComponent(date));
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string" && typeof value !== "number") return null;
  const text = String(value).replace(/\s+/g, " ").trim();
  return text.length > 0 ? text : null;
}

function decodeHtml(value: string): string {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/\s+/g, " ")
    .trim();
}

function valueFor(record: Record<string, unknown>, names: string[]): string | null {
  const keys = Object.keys(record);
  const wanted = names.map((name) => name.toLowerCase().replace(/[^a-z0-9]/g, ""));
  const key = keys.find((candidate) => {
    const normalized = candidate.toLowerCase().replace(/[^a-z0-9]/g, "");
    return wanted.some((name) => normalized === name || normalized.includes(name));
  });
  return key ? cleanText(record[key]) : null;
}

function parseDate(value: string | null, fallback: string): string {
  if (!value) return fallback;
  const iso = value.match(/\b(20\d{2})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const us = value.match(/\b(\d{1,2})[-/.](\d{1,2})[-/.](20\d{2})\b/);
  if (us) return `${us[3]}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`;
  return fallback;
}

function cityFromAddress(address: string | null, state: SosState): string | null {
  if (!address) return null;
  const match = address.match(new RegExp(`,\\s*([^,]+),\\s*${state}\\s+\\d{5}(?:-\\d{4})?`, "i"));
  return match?.[1]?.trim() || null;
}

function isLlcName(name: string): boolean {
  return /\bL\s*\.?\s*L\s*\.?\s*C\s*\.?\b|LIMITED LIABILITY COMPANY/i.test(name);
}

function rowFromRecord(record: Record<string, unknown>, state: SosState, date: string): ParsedSourceRow | null {
  const name = valueFor(record, ["name", "businessName", "entityName", "companyName", "beName"]);
  if (!name) return null;
  const agentAddress = valueFor(record, ["agentAddress", "registeredAgentAddress", "principalAddress", "address"]);
  return {
    name,
    filingId: valueFor(record, ["filingId", "charterNumber", "charterNo", "entityId", "businessId", "id"]),
    status: valueFor(record, ["status", "entityStatus"]) ?? "Active",
    filingDate: parseDate(valueFor(record, ["filingDate", "dateFiled", "dateFormed", "formedDate", "effectiveDate"]), date),
    agentName: valueFor(record, ["agentName", "registeredAgent", "registeredAgentName", "agent"]),
    agentAddress,
    city: valueFor(record, ["city", "principalCity"]) ?? cityFromAddress(agentAddress, state),
  };
}

function jsonRecords(value: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object"));
  }
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  for (const key of ["results", "filings", "entities", "companies", "data", "items"]) {
    const nested = record[key];
    if (Array.isArray(nested)) return jsonRecords(nested);
  }
  return [record];
}

function parseJsonBody(body: string, state: SosState, date: string): ParsedSourceRow[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    return [];
  }
  return jsonRecords(parsed)
    .map((record) => rowFromRecord(record, state, date))
    .filter((row): row is ParsedSourceRow => row !== null)
    .slice(0, MAX_ROWS_PER_SOURCE);
}

function parseHtmlBody(body: string, state: SosState, date: string): ParsedSourceRow[] {
  const rows: ParsedSourceRow[] = [];
  const tableMatches = body.matchAll(/<table\b[^>]*>([\s\S]*?)<\/table>/gi);
  for (const tableMatch of tableMatches) {
    const table = tableMatch[1];
    const rawRows = [...table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((match) => match[1]);
    if (rawRows.length < 2) continue;
    const headers = [...rawRows[0].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)]
      .map((match) => decodeHtml(match[1]).toLowerCase().replace(/[^a-z0-9]/g, ""));
    if (headers.length === 0) continue;
    for (const rawRow of rawRows.slice(1)) {
      const cells = [...rawRow.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map((match) => decodeHtml(match[1]));
      if (cells.length === 0) continue;
      const record = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]));
      const firstCell = rawRow.match(/<td\b[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "";
      const detailUrl = firstCell.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
      const sourceId = detailUrl?.match(/-(?:ks|mo)-([a-z0-9]+)\/?(?:["'#?]|$)/i)?.[1];
      if (sourceId) record.filingId = sourceId;
      const parsed = rowFromRecord(record, state, date);
      if (parsed && (!getSosSourceConfig(state).llcOnly || isLlcName(parsed.name))) rows.push(parsed);
      if (rows.length >= MAX_ROWS_PER_SOURCE) return rows;
    }
  }
  return rows;
}

function sourceRows(body: string, contentType: string, state: SosState, date: string): ParsedSourceRow[] {
  const trimmed = body.trim();
  const rows = contentType.includes("json") || trimmed.startsWith("{") || trimmed.startsWith("[")
    ? parseJsonBody(trimmed, state, date)
    : parseHtmlBody(body, state, date);
  if (rows.length === 0) {
    throw new Error("Source response did not contain a recognized filing result table or JSON feed");
  }
  return rows;
}

function stableFilingId(state: SosState, row: ParsedSourceRow, date: string): string {
  const sourceId = cleanText(row.filingId);
  if (sourceId) return sourceId;
  return `${state}-${createHash("sha256")
    .update([row.name, row.filingDate ?? date, row.agentName ?? "", row.agentAddress ?? ""].join("|").toLowerCase())
    .digest("hex")
    .slice(0, 24)}`;
}

function toInsertFiling(state: SosState, row: ParsedSourceRow, date: string): InsertLlcFiling {
  const filingDate = parseDate(row.filingDate ?? null, date);
  return {
    name: row.name.slice(0, 500),
    filingId: stableFilingId(state, row, filingDate),
    state,
    status: (row.status ?? "Active").slice(0, 100),
    filingDate,
    agentName: row.agentName?.slice(0, 500) ?? null,
    agentAddress: row.agentAddress?.slice(0, 1_000) ?? null,
    city: row.city?.slice(0, 200) ?? null,
    recruited: false,
    recruitedAt: null,
    recruitNote: null,
  };
}

async function fetchSource(url: string): Promise<{ body: string; contentType: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/html;q=0.9",
        "User-Agent": "TreasureKCNexus/1.0 (+https://portaltreasurekc.org)",
      },
    });
    if (!response.ok) throw new Error(`Source returned HTTP ${response.status}`);
    const body = await response.text();
    if (Buffer.byteLength(body, "utf8") > MAX_SOURCE_BYTES) {
      throw new Error(`Source response exceeded ${MAX_SOURCE_BYTES} bytes`);
    }
    return { body, contentType: response.headers.get("content-type") ?? "" };
  } finally {
    clearTimeout(timeout);
  }
}

async function recordRun(result: SourceRefreshResult): Promise<void> {
  await db.insert(sosRefreshRunsTable).values({
    state: result.state,
    sourceUrl: result.sourceUrl,
    status: result.status,
    found: result.found,
    stored: result.stored,
    error: result.error,
    startedAt: new Date(result.startedAt),
    completedAt: new Date(result.completedAt),
  });
}

async function refreshSource(state: SosState, date: string): Promise<SourceRefreshResult> {
  const config = getSosSourceConfig(state);
  const sourceUrl = sourceUrlForDate(config, date);
  const startedAt = new Date();
  try {
    const { body, contentType } = await withRetry(
      () => fetchSource(sourceUrl),
      `fetch ${state} source`,
    );
    const parsed = sourceRows(body, contentType, state, date);
    const filings = parsed.map((row) => toInsertFiling(state, row, date));
    const inserted: Array<{ id: number }> = [];
    for (const filing of filings) {
      const rows = await db
        .insert(llcFilingsTable)
        .values(filing)
        .onConflictDoNothing({
          target: [llcFilingsTable.state, llcFilingsTable.filingId],
        })
        .returning({ id: llcFilingsTable.id });
      inserted.push(...rows);
    }
    const result: SourceRefreshResult = {
      state,
      sourceUrl,
      status: "success",
      found: filings.length,
      stored: inserted.length,
      error: null,
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
    };
    await recordRun(result);
    logger.info({ state, found: result.found, stored: result.stored, sourceUrl }, "SOS source refresh completed");
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result: SourceRefreshResult = {
      state,
      sourceUrl,
      status: "failed",
      found: 0,
      stored: 0,
      error: message.slice(0, 500),
      startedAt: startedAt.toISOString(),
      completedAt: new Date().toISOString(),
    };
    await recordRun(result);
    logger.error({ err: error, state, sourceUrl }, "SOS source refresh failed");
    return result;
  }
}

export async function runSosRefresh(
  states: SosState[],
  date: string,
  trigger: RefreshTrigger,
): Promise<SourceRefreshResult[]> {
  logger.info({ states, date, trigger }, "Starting SOS refresh");
  return Promise.all(states.map((state) => refreshSource(state, date)));
}

/**
 * Returns the date (YYYY-MM-DD, UTC) of the most recent successful refresh
 * for a state, or null if the state has never succeeded.
 */
export async function getLastSuccessfulRunDate(state: SosState): Promise<string | null> {
  const [run] = await db
    .select()
    .from(sosRefreshRunsTable)
    .where(and(eq(sosRefreshRunsTable.state, state), eq(sosRefreshRunsTable.status, "success")))
    .orderBy(desc(sosRefreshRunsTable.completedAt))
    .limit(1);
  return run ? new Date(run.completedAt).toISOString().split("T")[0] : null;
}

export async function getLatestSosRuns(): Promise<SosRefreshRun[]> {
  const latest: SosRefreshRun[] = [];
  for (const state of CONFIGURED_STATES) {
    const [run] = await db
      .select()
      .from(sosRefreshRunsTable)
      .where(eq(sosRefreshRunsTable.state, state))
      .orderBy(desc(sosRefreshRunsTable.completedAt))
      .limit(1);
    if (run) latest.push(run);
  }
  return latest;
}