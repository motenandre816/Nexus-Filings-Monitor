import { Router, type IRouter } from "express";
import { eq, desc, ilike, and, or, sql, count } from "drizzle-orm";
import { db, llcFilingsTable } from "@workspace/db";
import { fireWebhook } from "../lib/webhook";
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

// --- Simulated scraper data ---
const KS_CITIES = ["Kansas City", "Overland Park", "Olathe", "Wichita", "Topeka", "Lawrence", "Shawnee", "Lenexa", "Manhattan", "Salina"];
const MO_CITIES = ["Kansas City", "St. Louis", "Springfield", "Columbia", "Independence", "Lee's Summit", "O'Fallon", "St. Joseph", "Blue Springs", "Joplin"];
const BUSINESS_TYPES = ["Consulting", "Services", "Solutions", "Enterprises", "Group", "Partners", "Holdings", "Ventures", "Technologies", "Media"];
const FIRST_NAMES = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Martinez", "Davis", "Wilson", "Anderson", "Taylor", "Thomas", "Jackson", "White", "Harris", "Martin", "Thompson", "Moore", "Young", "Walker"];
const STREET_NAMES = ["Main St", "Oak Ave", "Maple Dr", "Cedar Ln", "Elm Blvd", "Park Rd", "Lakeview Dr", "Hillside Ave", "River Rd", "Washington Blvd"];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateLlcName(): string {
  const patterns = [
    () => `${randomFrom(FIRST_NAMES)} ${randomFrom(BUSINESS_TYPES)} LLC`,
    () => `KC ${randomFrom(BUSINESS_TYPES)} LLC`,
    () => `${randomFrom(["Heartland", "Prairie", "Midwest", "Metro", "Sunflower", "Show-Me"])} ${randomFrom(BUSINESS_TYPES)} LLC`,
    () => `${randomFrom(FIRST_NAMES)} & ${randomFrom(FIRST_NAMES)} ${randomFrom(BUSINESS_TYPES)} LLC`,
  ];
  return randomFrom(patterns)();
}

function generateAgent(city: string, stateCode: string): { name: string; address: string } {
  const num = Math.floor(Math.random() * 9900) + 100;
  const street = randomFrom(STREET_NAMES);
  const zip = stateCode === "KS" ? `6${Math.floor(Math.random() * 9000) + 1000}` : `6${Math.floor(Math.random() * 4000) + 4000}`;
  return {
    name: `${randomFrom(FIRST_NAMES)} ${randomFrom(FIRST_NAMES)}`,
    address: `${num} ${street}, ${city}, ${stateCode} ${zip}`,
  };
}

function simulateScrape(stateCode: string, dateStr: string, count: number): Array<{
  name: string; filingId: string; state: string; status: string;
  filingDate: string; agentName: string; agentAddress: string; city: string;
}> {
  const cities = stateCode === "KS" ? KS_CITIES : MO_CITIES;
  const results = [];
  for (let i = 0; i < count; i++) {
    const city = randomFrom(cities);
    const agent = generateAgent(city, stateCode);
    results.push({
      name: generateLlcName(),
      filingId: `${stateCode}-${dateStr.replace(/-/g, "")}-${String(i + 1).padStart(4, "0")}`,
      state: stateCode,
      status: "Active",
      filingDate: dateStr,
      agentName: agent.name,
      agentAddress: agent.address,
      city,
    });
  }
  return results;
}

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
router.post("/llcs/:id/recruit", async (req, res): Promise<void> => {
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
router.post("/llcs/scrape", async (req, res): Promise<void> => {
  const body = TriggerScrapeBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const stateParam = body.data.state ?? "ALL";
  const today = new Date().toISOString().split("T")[0];
  const dateStr = body.data.date ?? today;
  const statesToScrape = stateParam === "ALL" ? ["KS", "MO"] : [stateParam];

  let totalFound = 0;
  let totalStored = 0;

  for (const st of statesToScrape) {
    const count = Math.floor(Math.random() * 15) + 8;
    const scraped = simulateScrape(st, dateStr, count);
    totalFound += scraped.length;

    for (const item of scraped) {
      const existing = await db
        .select({ id: llcFilingsTable.id })
        .from(llcFilingsTable)
        .where(and(eq(llcFilingsTable.filingId, item.filingId), eq(llcFilingsTable.state, item.state)));
      if (existing.length === 0) {
        await db.insert(llcFilingsTable).values(item);
        totalStored++;
      }
    }
  }

  const result = TriggerScrapeResponse.parse({
    state: stateParam,
    date: dateStr,
    found: totalFound,
    stored: totalStored,
    message: `Scraped ${totalFound} LLCs from ${stateParam === "ALL" ? "KS + MO" : stateParam}, stored ${totalStored} new filings.`,
  });

  // Fire webhook to portaltreasurekc.org with the new LLCs
  if (totalStored > 0) {
    const newLlcs = await db
      .select()
      .from(llcFilingsTable)
      .where(eq(llcFilingsTable.filingDate, dateStr))
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
