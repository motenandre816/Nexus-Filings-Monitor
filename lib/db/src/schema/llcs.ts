import { pgTable, serial, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
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
    index("llc_state_idx").on(table.state),
    index("llc_filing_date_idx").on(table.filingDate),
    index("llc_city_idx").on(table.city),
    index("llc_recruited_idx").on(table.recruited),
  ]
);

export const insertLlcFilingSchema = createInsertSchema(llcFilingsTable).omit({ id: true, createdAt: true });
export type InsertLlcFiling = z.infer<typeof insertLlcFilingSchema>;
export type LlcFiling = typeof llcFilingsTable.$inferSelect;
