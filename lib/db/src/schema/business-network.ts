import { type AnyPgColumn, boolean, date, doublePrecision, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const sourceRecordsTable = pgTable("source_records", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  rawUrl: text("raw_url"),
  rawPayload: jsonb("raw_payload").notNull(),
  parsedAt: timestamp("parsed_at", { withTimezone: true }),
  parserVersion: text("parser_version"),
  parserConfidence: doublePrecision("parser_confidence"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const businessesTable = pgTable(
  "businesses",
  {
    id: serial("id").primaryKey(),
    legalName: text("legal_name").notNull(),
    tradeName: text("trade_name"),
    primaryLocationId: integer("primary_location_id").references((): AnyPgColumn => businessLocationsTable.id, {
      onDelete: "set null",
    }),
    firstFiledDate: date("first_filed_date"),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    operatingStatusConfidence: doublePrecision("operating_status_confidence"),
  },
  (table) => [uniqueIndex("businesses_primary_location_uidx").on(table.primaryLocationId)],
);

export const businessLocationsTable = pgTable("business_locations", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  addressType: text("address_type").notNull(),
  address: text("address").notNull(),
  city: text("city"),
  state: text("state"),
  zip: text("zip"),
  coordinates: text("coordinates"),
  verified: boolean("verified").notNull().default(false),
  confidence: doublePrecision("confidence"),
  lastSeen: timestamp("last_seen", { withTimezone: true }),
});

export const filingsTable = pgTable(
  "filings",
  {
    id: serial("id").primaryKey(),
    businessId: integer("business_id")
      .notNull()
      .references(() => businessesTable.id, { onDelete: "cascade" }),
    state: text("state").notNull(),
    filingId: text("filing_id").notNull(),
    legalName: text("legal_name").notNull(),
    status: text("status"),
    filedDate: date("filed_date"),
    sourceRecordId: integer("source_record_id").references(() => sourceRecordsTable.id, {
      onDelete: "set null",
    }),
  },
  (table) => [uniqueIndex("filings_state_filing_id_uidx").on(table.state, table.filingId)],
);

export const ingestionRunsTable = pgTable("ingestion_runs", {
  id: serial("id").primaryKey(),
  sourceId: text("source_id").notNull(),
  runAt: timestamp("run_at", { withTimezone: true }).notNull().defaultNow(),
  recordsProcessed: integer("records_processed").notNull().default(0),
  added: integer("added").notNull().default(0),
  updated: integer("updated").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  errorMessage: text("error_message"),
  status: text("status").notNull(),
});

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  region: text("region"),
  createdBy: text("created_by").notNull(),
});

export const membersTable = pgTable("members", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  role: text("role").notNull(),
});

export const engagementsTable = pgTable("engagements", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  status: text("status").notNull(),
  notes: text("notes"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const communitiesTable = pgTable("communities", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(),
  region: text("region"),
});

export const businessCommunitiesTable = pgTable("business_communities", {
  id: serial("id").primaryKey(),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  communityId: integer("community_id")
    .notNull()
    .references(() => communitiesTable.id, { onDelete: "cascade" }),
  relationshipType: text("relationship_type").notNull(),
  verified: boolean("verified").notNull().default(false),
});

export const outreachMessagesTable = pgTable("outreach_messages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  businessId: integer("business_id")
    .notNull()
    .references(() => businessesTable.id, { onDelete: "cascade" }),
  draft: text("draft"),
  approved: boolean("approved").notNull().default(false),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  provider: text("provider"),
  model: text("model"),
});

export const outreachDeliveriesTable = pgTable("outreach_deliveries", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id")
    .notNull()
    .references(() => outreachMessagesTable.id, { onDelete: "cascade" }),
  deliveryStatus: text("delivery_status").notNull(),
  error: text("error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogTable = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id")
    .notNull()
    .references(() => workspacesTable.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  changes: jsonb("changes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
