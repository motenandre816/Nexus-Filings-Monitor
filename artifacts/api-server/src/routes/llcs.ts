import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, or, sql, count } from "drizzle-orm";
import { db, llcFilingsTable } from "@workspace/db";
import { fireWebhook } from "../lib/webhook";
import { CONFIGURED_STATES, runSosRefresh, type SosState } from "../lib/sos";
import { requireAuth } from "../middlewares/requireAuth";
import {
  GetLlcByIdParams,
  GetLlcsQueryParams,
  GetNewLlcsQueryParams,
  MarkLlcRecruitedParams,
  MarkLlcRecruitedBody,
  TriggerScrapeBody,
  GetNewLlcsResponse,
  GetLlcsResponse,
  GetLlcByIdResponse,
  MarkLlcRecruitedResponse,
  TriggerScrapeResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /fresh_llcs — public API product endpoint
// Same as /new_llcs but intended for external API consumers
router.get("/fresh_llcs", async (req, res): Promise<void> => {
  const parsed = GetNewLlcsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { state = "ALL", date, limit = 50, offset = 0 } = parsed.data;

  const today = new Date().toISOString().split("T")[0];
  const targetDate = date ?? today;

  const conditions = [eq(llcFilingsTable.filingDate, targetDate)];
  if (state !== "ALL") {
    conditions.push(eq(llcFilingsTable.state, state));
  }

  const [{ total }] = await db.select({ total: count() }).from(llcFilingsTable).where(and(...conditions));
  const llcs = await db
    .select()
    .from(llcFilingsTable)
    .where(and(...conditions))
    .orderBy(desc(llcFilingsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({
    date: targetDate,
    state,
    total: Number(total),
    llcs: llcs.map(formatFiling),
  });
});

// GET /new_llcs
router.get("/new_llcs", async (req, res): Promise<void> => {
  const parsed = GetNewLlcsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { state = "ALL", date, limit = 50, offset = 0 } = parsed.data;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const targetDate = date ?? yesterday.toISOString().split("T")[0];

  const conditions = [eq(llcFilingsTable.filingDate, targetDate)];
  if (state !== "ALL") {
    conditions.push(eq(llcFilingsTable.state, state));
  }

  const [{ total }] = await db.select({ total: count() }).from(llcFilingsTable).where(and(...conditions));
  const llcs = await db
    .select()
    .from(llcFilingsTable)
    .where(and(...conditions))
    .orderBy(desc(llcFilingsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(GetNewLlcsResponse.parse({
    date: targetDate,
    state,
    total: Number(total),
    llcs: llcs.map(formatFiling),
  }));
});

// GET /llcs
router.get("/llcs", async (req, res): Promise<void> => {
  const parsed = GetLlcsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { state, search, limit = 100, offset = 0 } = parsed.data;

  const conditions = [];
  if (state) conditions.push(eq(llcFilingsTable.state, state));
  if (search) {
    conditions.push(or(
      ilike(llcFilingsTable.name, `%${search}%`),
      ilike(llcFilingsTable.city, `%${search}%`)
    ));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const [{ total }] = await db.select({ total: count() }).from(llcFilingsTable).where(whereClause);
  const llcs = await db
    .select()
    .from(llcFilingsTable)
    .where(whereClause)
    .orderBy(desc(llcFilingsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json(GetLlcsResponse.parse({ total: Number(total), offset, limit, llcs: llcs.map(formatFiling) }));
});

// GET /llcs/:id
router.get("/llcs/:id", async (req, res): Promise<void> => {
  const params = GetLlcByIdParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [llc] = await db.select().from(llcFilingsTable).where(eq(llcFilingsTable.id, params.data.id));
  if (!llc) {
    res.status(404).json({ error: "LLC not found" });
    return;
  }
  res.json(GetLlcByIdResponse.parse(formatFiling(llc)));
});

// POST /llcs/:id/recruit
router.post("/llcs/:id/recruit", requireAuth, async (req, res): Promise<void> => {
  const params = MarkLlcRecruitedParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const body = MarkLlcRecruitedBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const [existing] = await db.select().from(llcFilingsTable).where(eq(llcFilingsTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "LLC not found" });
    return;
  }
  const [updated] = await db
    .update(llcFilingsTable)
    .set({
      recruited: true,
      recruitedAt: new Date(),
      recruitNote: body.data.note ?? null,
    })
    .where(eq(llcFilingsTable.id, params.data.id))
    .returning();
  res.json(MarkLlcRecruitedResponse.parse(formatFiling(updated)));
});

// POST /llcs/scrape
router.post("/llcs/scrape", requireAuth, async (req, res): Promise<void> => {
  const body = TriggerScrapeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const stateParam = body.data.state ?? "ALL";
  const today = new Date().toISOString().split("T")[0];
  const dateStr = body.data.date ?? today;
  if (stateParam !== "ALL" && !CONFIGURED_STATES.includes(stateParam)) {
    res.status(400).json({ error: `state must be ALL or one of: ${CONFIGURED_STATES.join(", ")}` });
    return;
  }
  const statesToScrape: SosState[] = stateParam === "ALL" ? CONFIGURED_STATES : [stateParam];
  const sources = await runSosRefresh(statesToScrape, dateStr, "manual");
  const totalFound = sources.reduce((sum, source) => sum + source.found, 0);
  const totalStored = sources.reduce((sum, source) => sum + source.stored, 0);
  const failedSources = sources.filter((source) => source.status === "failed");

  const result = TriggerScrapeResponse.parse({
    state: stateParam,
    date: dateStr,
    found: totalFound,
    stored: totalStored,
    message: failedSources.length > 0
      ? `Refresh completed with ${failedSources.length} source failure(s); found ${totalFound} filings and stored ${totalStored} new filings.`
      : `Fetched ${totalFound} LLCs from ${stateParam === "ALL" ? "KS + MO" : stateParam}, stored ${totalStored} new filings.`,
    sources,
  });

  // Fire webhook to portaltreasurekc.org with the new LLCs
  if (totalStored > 0) {
    const newLlcs = await db
      .select()
      .from(llcFilingsTable)
      .where(and(
        eq(llcFilingsTable.filingDate, dateStr),
        stateParam === "ALL" ? undefined : eq(llcFilingsTable.state, stateParam),
      ))
      .orderBy(desc(llcFilingsTable.createdAt))
      .limit(totalStored);

    fireWebhook({
      event: "new_llcs",
      timestamp: new Date().toISOString(),
      state: stateParam,
      date: dateStr,
      count: totalStored,
      llcs: newLlcs.map(l => ({
        id: l.id,
        name: l.name,
        state: l.state,
        city: l.city,
        filingDate: l.filingDate,
        agentName: l.agentName,
        agentAddress: l.agentAddress,
        status: l.status,
      })),
    }).catch(() => {}); // fire-and-forget, errors logged inside
  }

  res.json(result);
});

function formatFiling(llc: typeof llcFilingsTable.$inferSelect) {
  return {
    ...llc,
    recruitedAt: llc.recruitedAt ? llc.recruitedAt.toISOString() : null,
    createdAt: llc.createdAt.toISOString(),
  };
}

export default router;
