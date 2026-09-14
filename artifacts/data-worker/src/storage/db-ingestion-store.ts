import { db, ingestionRunsTable, sourceRecordsTable, upsertBusinessRecord } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { IngestionRunRecord, IngestionStore } from "../pipeline/types";

export class DbIngestionStore implements IngestionStore {
  async createRun(sourceId: string): Promise<IngestionRunRecord> {
    const [run] = await db
      .insert(ingestionRunsTable)
      .values({
        sourceId,
        status: "running",
      })
      .returning();

    return { id: run.id, sourceId: run.sourceId, status: run.status };
  }

  async completeRun(
    runId: number,
    payload: {
      recordsProcessed: number;
      added: number;
      updated: number;
      failed: number;
      status: "success" | "partial_failure" | "failed";
      errorMessage?: string | null;
    },
  ): Promise<void> {
    await db
      .update(ingestionRunsTable)
      .set({
        recordsProcessed: payload.recordsProcessed,
        added: payload.added,
        updated: payload.updated,
        failed: payload.failed,
        status: payload.status,
        errorMessage: payload.errorMessage ?? null,
      })
      .where(eq(ingestionRunsTable.id, runId));
  }

  async archiveSourceRecord(input: {
    sourceId: string;
    rawUrl?: string;
    payload: unknown;
  }): Promise<{ id: number }> {
    const [sourceRecord] = await db
      .insert(sourceRecordsTable)
      .values({
        sourceId: input.sourceId,
        rawUrl: input.rawUrl ?? null,
        rawPayload: input.payload,
      })
      .returning({ id: sourceRecordsTable.id });
    return sourceRecord;
  }

  async markSourceRecordParsed(input: {
    sourceRecordId: number;
    parserVersion: string;
    parserConfidence: number;
  }): Promise<void> {
    await db
      .update(sourceRecordsTable)
      .set({
        parsedAt: new Date(),
        parserVersion: input.parserVersion,
        parserConfidence: input.parserConfidence,
      })
      .where(eq(sourceRecordsTable.id, input.sourceRecordId));
  }

  async markSourceRecordFailed(input: {
    sourceRecordId: number;
    parserVersion: string;
    errorMessage: string;
  }): Promise<void> {
    await db
      .update(sourceRecordsTable)
      .set({
        parsedAt: new Date(),
        parserVersion: input.parserVersion,
        parserConfidence: 0,
      })
      .where(eq(sourceRecordsTable.id, input.sourceRecordId));
  }

  async upsertNormalizedRecord(input: {
    normalized: {
      state: string;
      filingId: string;
      legalName: string;
      tradeName?: string;
      status?: string;
      filedDate?: string;
      location: {
        addressType: string;
        address: string;
        city?: string;
        state?: string;
        zip?: string;
        coordinates?: string;
        verified?: boolean;
        confidence?: number;
      };
      operatingStatusConfidence?: number;
    };
    sourceRecordId: number;
  }): Promise<"added" | "updated"> {
    const result = await upsertBusinessRecord({
      state: input.normalized.state,
      filingId: input.normalized.filingId,
      legalName: input.normalized.legalName,
      tradeName: input.normalized.tradeName,
      status: input.normalized.status,
      filedDate: input.normalized.filedDate,
      location: input.normalized.location,
      operatingStatusConfidence: input.normalized.operatingStatusConfidence,
      sourceRecordId: input.sourceRecordId,
    });
    return result.action;
  }
}
