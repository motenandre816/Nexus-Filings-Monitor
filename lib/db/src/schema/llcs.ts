import { pgTable, serial, text, boolean, timestamp, index, uniqueIndex, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const llcFilingsTable = pgTable(
  "llc_filings",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    filingId: text("filing_id"),
    state: text("state").notNull(), // KS or MO
    status: text("status").notNull().default("Active"),
    filingDate: text("filing_date").notNull(),
    agentName: text("agent_name"),
    agentAddress: text("agent_address"),
    city: text("city"),
    recruited: boolean("recruited").notNull().default(false),
    recruitedAt: timestamp("recruited_at"),
    recruitNote: text("recruit_note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("llc_state_filing_id_unique").on(table.state, table.filingId),
    index("llc_state_idx").on(table.state),
    index("llc_filing_date_idx").on(table.filingDate),
    index("llc_city_idx").on(table.city),
    index("llc_recruited_idx").on(table.recruited),
  ]
);

export const insertLlcFilingSchema = createInsertSchema(llcFilingsTable).omit({ id: true, createdAt: true });
export type InsertLlcFiling = z.infer<typeof insertLlcFilingSchema>;
export type LlcFiling = typeof llcFilingsTable.$inferSelect;

export const sosRefreshRunsTable = pgTable(
  "sos_refresh_runs",
  {
    id: serial("id").primaryKey(),
    state: text("state").notNull(), // KS or MO
    sourceUrl: text("source_url").notNull(),
    status: text("status").notNull(), // success or failed
    found: integer("found").notNull().default(0),
    stored: integer("stored").notNull().default(0),
    error: text("error"),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
  },
  (table) => [
    index("sos_refresh_state_idx").on(table.state),
    index("sos_refresh_completed_idx").on(table.completedAt),
  ],
);

export const insertSosRefreshRunSchema = createInsertSchema(sosRefreshRunsTable).omit({ id: true });
export type InsertSosRefreshRun = z.infer<typeof insertSosRefreshRunSchema>;
export type SosRefreshRun = typeof sosRefreshRunsTable.$inferSelect;
