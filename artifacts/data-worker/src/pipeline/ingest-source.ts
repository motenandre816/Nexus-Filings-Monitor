import type { SourceAdapter } from "../connectors/source-adapter";
import { withRetry } from "./retry";
import type { IngestionResult, IngestionStore } from "./types";

export interface IngestSourceOptions {
  adapter: SourceAdapter;
  store: IngestionStore;
  retryAttempts?: number;
}

function assertRequired(normalized: {
  state: string;
  filingId: string;
  legalName: string;
  location: { addressType: string; address: string };
}): void {
  if (!normalized.state) throw new Error("Missing required field: state");
  if (!normalized.filingId) throw new Error("Missing required field: filingId");
  if (!normalized.legalName) throw new Error("Missing required field: legalName");
  if (!normalized.location.addressType) throw new Error("Missing required field: location.addressType");
  if (!normalized.location.address) throw new Error("Missing required field: location.address");
}

export async function ingestSource(options: IngestSourceOptions): Promise<IngestionResult> {
  const run = await options.store.createRun(options.adapter.sourceId);

  let recordsProcessed = 0;
  let added = 0;
  let updated = 0;
  let failed = 0;

  try {
    const rawRecords = await withRetry(
      () => options.adapter.fetchRecords(),
      { attempts: options.retryAttempts ?? 3, initialDelayMs: 250 },
    );
    recordsProcessed = rawRecords.length;

    for (const rawRecord of rawRecords) {
      const archived = await options.store.archiveSourceRecord({
        sourceId: options.adapter.sourceId,
        rawUrl: rawRecord.rawUrl,
        payload: rawRecord.payload,
      });

      try {
        const normalized = options.adapter.parseRecord(rawRecord);
        assertRequired({
          state: normalized.state,
          filingId: normalized.filingId,
          legalName: normalized.legalName,
          location: normalized.location,
        });

        const outcome = await options.store.upsertNormalizedRecord({
          normalized,
          sourceRecordId: archived.id,
        });

        if (outcome === "added") added++;
        if (outcome === "updated") updated++;

        await options.store.markSourceRecordParsed({
          sourceRecordId: archived.id,
          parserVersion: options.adapter.parserVersion,
          parserConfidence: 0.9,
        });
      } catch (error) {
        failed++;
        await options.store.markSourceRecordFailed({
          sourceRecordId: archived.id,
          parserVersion: options.adapter.parserVersion,
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      }
    }

    const status: IngestionResult["status"] = failed > 0 ? "partial_failure" : "success";
    await options.store.completeRun(run.id, {
      recordsProcessed,
      added,
      updated,
      failed,
      status,
    });

    return {
      runId: run.id,
      sourceId: run.sourceId,
      recordsProcessed,
      added,
      updated,
      failed,
      status,
      errorMessage: null,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await options.store.completeRun(run.id, {
      recordsProcessed,
      added,
      updated,
      failed,
      status: "failed",
      errorMessage,
    });
    return {
      runId: run.id,
      sourceId: run.sourceId,
      recordsProcessed,
      added,
      updated,
      failed,
      status: "failed",
      errorMessage,
    };
  }
}
