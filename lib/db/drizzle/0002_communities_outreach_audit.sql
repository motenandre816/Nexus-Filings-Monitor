CREATE TABLE IF NOT EXISTS "communities" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "name" text NOT NULL,
  "type" text NOT NULL,
  "region" text
);

CREATE TABLE IF NOT EXISTS "business_communities" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "community_id" integer NOT NULL,
  "relationship_type" text NOT NULL,
  "verified" boolean DEFAULT false NOT NULL
);

CREATE TABLE IF NOT EXISTS "outreach_messages" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "business_id" integer NOT NULL,
  "draft" text,
  "approved" boolean DEFAULT false NOT NULL,
  "sent_at" timestamp with time zone,
  "provider" text,
  "model" text
);

CREATE TABLE IF NOT EXISTS "outreach_deliveries" (
  "id" serial PRIMARY KEY NOT NULL,
  "message_id" integer NOT NULL,
  "delivery_status" text NOT NULL,
  "error" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text NOT NULL,
  "changes" jsonb,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "communities"
  ADD CONSTRAINT "communities_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE cascade;

ALTER TABLE "business_communities"
  ADD CONSTRAINT "business_communities_business_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE cascade;

ALTER TABLE "business_communities"
  ADD CONSTRAINT "business_communities_community_id_fk"
  FOREIGN KEY ("community_id") REFERENCES "communities" ("id") ON DELETE cascade;

ALTER TABLE "outreach_messages"
  ADD CONSTRAINT "outreach_messages_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE cascade;

ALTER TABLE "outreach_messages"
  ADD CONSTRAINT "outreach_messages_business_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE cascade;

ALTER TABLE "outreach_deliveries"
  ADD CONSTRAINT "outreach_deliveries_message_id_fk"
  FOREIGN KEY ("message_id") REFERENCES "outreach_messages" ("id") ON DELETE cascade;

ALTER TABLE "audit_log"
  ADD CONSTRAINT "audit_log_workspace_id_fk"
  FOREIGN KEY ("workspace_id") REFERENCES "workspaces" ("id") ON DELETE cascade;
