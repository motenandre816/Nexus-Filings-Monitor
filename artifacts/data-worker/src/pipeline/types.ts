import type { NormalizedFilingRecord } from "../connectors/source-adapter";

export interface IngestionRunRecord {
  id: number;
  sourceId: string;
  status: string;
}

export interface IngestionResult {
  runId: number;
  sourceId: string;
  recordsProcessed: number;
  added: number;
  updated: number;
  failed: number;
  status: "success" | "partial_failure" | "failed";
  errorMessage: string | null;
}

export interface IngestionStore {
  createRun(sourceId: string): Promise<IngestionRunRecord>;
  completeRun(
    runId: number,
    payload: {
      recordsProcessed: number;
      added: number;
      updated: number;
      failed: number;
      status: IngestionResult["status"];
      errorMessage?: string | null;
    },
  ): Promise<void>;
  archiveSourceRecord(input: {
    sourceId: string;
    rawUrl?: string;
    payload: unknown;
  }): Promise<{ id: number }>;
  markSourceRecordParsed(input: {
    sourceRecordId: number;
    parserVersion: string;
    parserConfidence: number;
  }): Promise<void>;
  markSourceRecordFailed(input: {
    sourceRecordId: number;
    parserVersion: string;
    errorMessage: string;
  }): Promise<void>;
  upsertNormalizedRecord(input: {
    normalized: NormalizedFilingRecord;
    sourceRecordId: number;
  }): Promise<"added" | "updated">;
}
