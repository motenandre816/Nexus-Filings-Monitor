import { Router, type IRouter } from "express";
import { eq, desc, count, sql } from "drizzle-orm";
import { db, llcFilingsTable } from "@workspace/db";
import {
  GetDashboardStatsResponse,
  GetRecentActivityQueryParams,
  GetRecentActivityResponse,
  GetLlcsByCityResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /dashboard/stats
router.get("/dashboard/stats", async (req, res): Promise<void> => {
  const today = new Date().toISOString().split("T")[0];

  const [{ total }] = await db.select({ total: count() }).from(llcFilingsTable);
  const [{ todayCount }] = await db
    .select({ todayCount: count() })
    .from(llcFilingsTable)
    .where(eq(llcFilingsTable.filingDate, today));
  const [{ ksCount }] = await db
    .select({ ksCount: count() })
    .from(llcFilingsTable)
    .where(eq(llcFilingsTable.state, "KS"));
  const [{ moCount }] = await db
    .select({ moCount: count() })
    .from(llcFilingsTable)
    .where(eq(llcFilingsTable.state, "MO"));
  const [{ recruitedCount }] = await db
    .select({ recruitedCount: count() })
    .from(llcFilingsTable)
    .where(eq(llcFilingsTable.recruited, true));

  const totalNum = Number(total);
  const recruitedNum = Number(recruitedCount);

  const [lastRow] = await db
    .select({ createdAt: llcFilingsTable.createdAt })
    .from(llcFilingsTable)
    .orderBy(desc(llcFilingsTable.createdAt))
    .limit(1);

  res.json(GetDashboardStatsResponse.parse({
    totalLlcs: totalNum,
    todayLlcs: Number(todayCount),
    kansasLlcs: Number(ksCount),
    missouriLlcs: Number(moCount),
    recruitedCount: recruitedNum,
    pendingRecruitment: totalNum - recruitedNum,
    lastScrapeAt: lastRow ? lastRow.createdAt.toISOString() : null,
  }));
});

// GET /dashboard/recent-activity
router.get("/dashboard/recent-activity", async (req, res): Promise<void> => {
  const parsed = GetRecentActivityQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const limit = parsed.data.limit ?? 10;
  const llcs = await db
    .select()
    .from(llcFilingsTable)
    .orderBy(desc(llcFilingsTable.createdAt))
    .limit(limit);

  res.json(GetRecentActivityResponse.parse(llcs.map(llc => ({
    ...llc,
    recruitedAt: llc.recruitedAt ? llc.recruitedAt.toISOString() : null,
    createdAt: llc.createdAt.toISOString(),
  }))));
});

// GET /dashboard/by-city
router.get("/dashboard/by-city", async (req, res): Promise<void> => {
  const rows = await db
    .select({
      city: llcFilingsTable.city,
      state: llcFilingsTable.state,
      count: count(),
    })
    .from(llcFilingsTable)
    .where(sql`${llcFilingsTable.city} IS NOT NULL`)
    .groupBy(llcFilingsTable.city, llcFilingsTable.state)
    .orderBy(desc(count()));

  res.json(GetLlcsByCityResponse.parse(
    rows.map(r => ({ city: r.city!, state: r.state, count: Number(r.count) }))
  ));
});

export default router;
