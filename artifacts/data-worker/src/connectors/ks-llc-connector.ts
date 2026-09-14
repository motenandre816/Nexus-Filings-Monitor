import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NormalizedFilingRecord, RawSourceRecord, SourceAdapter } from "./source-adapter";

interface KansasFixtureRecord {
  filing_id?: string;
  legal_name?: string;
  trade_name?: string;
  status?: string;
  filed_date?: string;
  source_url?: string;
  registered_agent?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FIXTURE_PATH = path.resolve(__dirname, "../fixtures/ks-secretary-of-state.fixture.json");

export class KansasLlcSourceAdapter implements SourceAdapter {
  sourceId = "ks-secretary-of-state-fixture";
  parserVersion = "ks-fixture-v1";

  async fetchRecords(): Promise<RawSourceRecord[]> {
    const raw = await fs.readFile(FIXTURE_PATH, "utf8");
    const parsed = JSON.parse(raw) as KansasFixtureRecord[];
    return parsed.map((payload) => ({ rawUrl: payload.source_url, payload }));
  }

  parseRecord(record: RawSourceRecord): NormalizedFilingRecord {
    const payload = record.payload as KansasFixtureRecord;
    return {
      state: "KS",
      filingId: payload.filing_id ?? "",
      legalName: payload.legal_name ?? "",
      tradeName: payload.trade_name,
      status: payload.status ?? "Unknown",
      filedDate: payload.filed_date,
      location: {
        addressType: "registered_agent",
        address: payload.registered_agent?.address ?? "",
        city: payload.registered_agent?.city,
        state: payload.registered_agent?.state,
        zip: payload.registered_agent?.zip,
        verified: true,
        confidence: 0.85,
      },
      operatingStatusConfidence: payload.status === "Active" ? 0.8 : 0.4,
    };
  }
}
