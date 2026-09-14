import test from "node:test";
import assert from "node:assert/strict";
import type { NormalizedFilingRecord, RawSourceRecord, SourceAdapter } from "../connectors/source-adapter";
import { ingestSource } from "./ingest-source";
import { withRetry } from "./retry";
import type { IngestionRunRecord, IngestionStore } from "./types";

class InMemoryStore implements IngestionStore {
  private runId = 0;
  private sourceId = 0;
  private runs: Array<{ id: number; sourceId: string; status: string; recordsProcessed: number; added: number; updated: number; failed: number }> = [];
  public sourceEvidence: Array<{ id: number; sourceId: string; payload: unknown; parsed: boolean }> = [];
  public businesses = new Map<string, { legalName: string; location: string }>();
  public filings = new Map<string, { legalName: string; sourceRecordId: number }>();

  async createRun(sourceId: string): Promise<IngestionRunRecord> {
    const run = { id: ++this.runId, sourceId, status: "running", recordsProcessed: 0, added: 0, updated: 0, failed: 0 };
    this.runs.push(run);
    return { id: run.id, sourceId, status: run.status };
  }

  async completeRun(
    runId: number,
    payload: { recordsProcessed: number; added: number; updated: number; failed: number; status: "success" | "partial_failure" | "failed" },
  ): Promise<void> {
    const run = this.runs.find((r) => r.id === runId);
    if (!run) throw new Error("Run not found");
    run.status = payload.status;
    run.recordsProcessed = payload.recordsProcessed;
    run.added = payload.added;
    run.updated = payload.updated;
    run.failed = payload.failed;
  }

  async archiveSourceRecord(input: { sourceId: string; payload: unknown }): Promise<{ id: number }> {
    const id = ++this.sourceId;
    this.sourceEvidence.push({ id, sourceId: input.sourceId, payload: input.payload, parsed: false });
    return { id };
  }

  async markSourceRecordParsed(input: { sourceRecordId: number }): Promise<void> {
    const record = this.sourceEvidence.find((r) => r.id === input.sourceRecordId);
    if (record) record.parsed = true;
  }

  async markSourceRecordFailed(input: { sourceRecordId: number }): Promise<void> {
    const record = this.sourceEvidence.find((r) => r.id === input.sourceRecordId);
    if (record) record.parsed = false;
  }

  async upsertNormalizedRecord(input: { normalized: NormalizedFilingRecord; sourceRecordId: number }): Promise<"added" | "updated"> {
    const key = `${input.normalized.state}:${input.normalized.filingId}`;
    if (!this.filings.has(key)) {
      this.filings.set(key, { legalName: input.normalized.legalName, sourceRecordId: input.sourceRecordId });
      this.businesses.set(key, {
        legalName: input.normalized.legalName,
        location: input.normalized.location.address,
      });
      return "added";
    }

    this.filings.set(key, { legalName: input.normalized.legalName, sourceRecordId: input.sourceRecordId });
    this.businesses.set(key, {
      legalName: input.normalized.legalName,
      location: input.normalized.location.address,
    });
    return "updated";
  }
}

class ArrayAdapter implements SourceAdapter {
  sourceId = "ks-test";
  parserVersion = "v1";
  constructor(private readonly records: RawSourceRecord[]) {}

  async fetchRecords(): Promise<RawSourceRecord[]> {
    return this.records;
  }

  parseRecord(record: RawSourceRecord): NormalizedFilingRecord {
    const payload = record.payload as Record<string, unknown>;
    return {
      state: String(payload.state ?? ""),
      filingId: String(payload.filingId ?? ""),
      legalName: String(payload.legalName ?? ""),
      filedDate: String(payload.filedDate ?? ""),
      status: "Active",
      location: {
        addressType: "registered_agent",
        address: String(payload.address ?? ""),
      },
    };
  }
}

test("withRetry retries until success", async () => {
  let attempts = 0;
  const value = await withRetry(async () => {
    attempts++;
    if (attempts < 3) throw new Error("transient");
    return "ok";
  }, { attempts: 3, initialDelayMs: 1 });
  assert.equal(value, "ok");
  assert.equal(attempts, 3);
});

test("ingestion is idempotent and updates source changes", async () => {
  const store = new InMemoryStore();
  const firstAdapter = new ArrayAdapter([
    { payload: { state: "KS", filingId: "KS-1", legalName: "Alpha LLC", filedDate: "2026-09-01", address: "1 Main St" } },
  ]);

  const first = await ingestSource({ adapter: firstAdapter, store });
  assert.equal(first.added, 1);
  assert.equal(store.filings.size, 1);

  const secondAdapter = new ArrayAdapter([
    { payload: { state: "KS", filingId: "KS-1", legalName: "Alpha Holdings LLC", filedDate: "2026-09-01", address: "9 Main St" } },
  ]);

  const second = await ingestSource({ adapter: secondAdapter, store });
  assert.equal(second.added, 0);
  assert.equal(second.updated, 1);
  assert.equal(store.filings.size, 1);
  assert.equal(store.businesses.get("KS:KS-1")?.legalName, "Alpha Holdings LLC");
  assert.equal(store.businesses.get("KS:KS-1")?.location, "9 Main St");
});

test("malformed records are isolated and source evidence is retained", async () => {
  const store = new InMemoryStore();
  const adapter = new ArrayAdapter([
    { payload: { state: "KS", filingId: "KS-1", legalName: "Alpha LLC", filedDate: "2026-09-01", address: "1 Main St" } },
    { payload: { state: "KS", filingId: "", legalName: "", filedDate: "2026-09-01", address: "" } },
  ]);

  const result = await ingestSource({ adapter, store });
  assert.equal(result.recordsProcessed, 2);
  assert.equal(result.added, 1);
  assert.equal(result.failed, 1);
  assert.equal(store.sourceEvidence.length, 2);
  assert.equal(store.filings.size, 1);
});
