CREATE TABLE IF NOT EXISTS "source_records" (
  "id" serial PRIMARY KEY NOT NULL,
  "source_id" text NOT NULL,
  "raw_url" text,
  "raw_payload" jsonb NOT NULL,
  "parsed_at" timestamp with time zone,
  "parser_version" text,
  "parser_confidence" double precision,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS "businesses" (
  "id" serial PRIMARY KEY NOT NULL,
  "legal_name" text NOT NULL,
  "trade_name" text,
  "primary_location_id" integer,
  "first_filed_date" date,
  "last_seen" timestamp with time zone,
  "operating_status_confidence" double precision
);

CREATE TABLE IF NOT EXISTS "business_locations" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "address_type" text NOT NULL,
  "address" text NOT NULL,
  "city" text,
  "state" text,
  "zip" text,
  "coordinates" text,
  "verified" boolean DEFAULT false NOT NULL,
  "confidence" double precision,
  "last_seen" timestamp with time zone
);

CREATE TABLE IF NOT EXISTS "filings" (
  "id" serial PRIMARY KEY NOT NULL,
  "business_id" integer NOT NULL,
  "state" text NOT NULL,
  "filing_id" text NOT NULL,
  "legal_name" text NOT NULL,
  "status" text,
  "filed_date" date,
  "source_record_id" integer
);

ALTER TABLE "business_locations"
  ADD CONSTRAINT "business_locations_business_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE cascade;

ALTER TABLE "filings"
  ADD CONSTRAINT "filings_business_id_fk"
  FOREIGN KEY ("business_id") REFERENCES "businesses" ("id") ON DELETE cascade;

ALTER TABLE "filings"
  ADD CONSTRAINT "filings_source_record_id_fk"
  FOREIGN KEY ("source_record_id") REFERENCES "source_records" ("id") ON DELETE set null;

ALTER TABLE "businesses"
  ADD CONSTRAINT "businesses_primary_location_id_fk"
  FOREIGN KEY ("primary_location_id") REFERENCES "business_locations" ("id") ON DELETE set null;

CREATE UNIQUE INDEX IF NOT EXISTS "businesses_primary_location_uidx" ON "businesses" ("primary_location_id");
CREATE UNIQUE INDEX IF NOT EXISTS "filings_state_filing_id_uidx" ON "filings" ("state", "filing_id");
