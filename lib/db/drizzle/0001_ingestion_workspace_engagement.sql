CREATE TABLE IF NOT EXISTS "ingestion_runs" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_id" text NOT NULL,
  "run_at" timestamp with time zone DEFAULT now() NOT NULL,
  "records_processed" integer DEFAULT 0 NOT NULL,
  "added" integer DEFAULT 0 NOT NULL,
  "updated" integer DEFAULT 0 NOT NULL,
  "failed" integer DEFAULT 0 NOT NULL,
  "error_message" text,
  "status" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "region" text,
  "created_by" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "members" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "user_id" text NOT NULL,
  "role" text NOT NULL
);

CREATE TABLE IF NOT EXISTS "engagements" (
  "id" serial PRIMARY KEY NOT NULL,
  "workspace_id" integer NOT NULL,
  "business_id" integer NOT NULL,
  "status" text NOT NULL,
  "notes" text,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
