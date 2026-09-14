import { Router, type IRouter } from "express";
import { desc, eq } from "drizzle-orm";
import { db, ingestionRunsTable } from "@workspace/db";
import { requireAuth } from "../middlewares/requireAuth";
import { GetWorkerIngestionRunsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/worker/ingestion-runs", requireAuth, async (_req, res): Promise<void> => {
  const recentRuns = await db
    .select()
    .from(ingestionRunsTable)
    .orderBy(desc(ingestionRunsTable.runAt))
    .limit(20);

  const [currentRun] = await db
    .select()
    .from(ingestionRunsTable)
    .where(eq(ingestionRunsTable.status, "running"))
    .orderBy(desc(ingestionRunsTable.runAt))
    .limit(1);

  const response = GetWorkerIngestionRunsResponse.parse({
    currentRun: currentRun
      ? {
          id: currentRun.id,
          sourceId: currentRun.sourceId,
          runAt: currentRun.runAt.toISOString(),
          recordsProcessed: currentRun.recordsProcessed,
          added: currentRun.added,
          updated: currentRun.updated,
          failed: currentRun.failed,
          errorMessage: currentRun.errorMessage,
          status: currentRun.status,
        }
      : null,
    lastRun:
      recentRuns.length > 0
        ? {
            id: recentRuns[0].id,
            sourceId: recentRuns[0].sourceId,
            runAt: recentRuns[0].runAt.toISOString(),
            recordsProcessed: recentRuns[0].recordsProcessed,
            added: recentRuns[0].added,
            updated: recentRuns[0].updated,
            failed: recentRuns[0].failed,
            errorMessage: recentRuns[0].errorMessage,
            status: recentRuns[0].status,
          }
        : null,
    recentRuns: recentRuns.map((run) => ({
      id: run.id,
      sourceId: run.sourceId,
      runAt: run.runAt.toISOString(),
      recordsProcessed: run.recordsProcessed,
      added: run.added,
      updated: run.updated,
      failed: run.failed,
      errorMessage: run.errorMessage,
      status: run.status,
    })),
  });

  res.json(response);
});

export default router;
