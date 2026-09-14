# Ingestion Pipeline Definition

## Goal
Ingest official Secretary of State business filing data in an idempotent, auditable pipeline that preserves raw evidence and updates normalized business entities.

## Pipeline stages

1. **Fetch**
   - Pull records from the Secretary of State source API or bulk endpoint.
   - Record source metadata (source id, request timestamp, source URL).

2. **Archive**
   - Persist raw payloads to `source_records.raw_payload` with source URL/version metadata.
   - Keep immutable evidence for replay, debugging, and parser upgrades.

3. **Parse**
   - Normalize records into canonical shapes for:
     - `filings`
     - `businesses`
     - `business_locations`

4. **Validate**
   - Enforce required fields:
     - `state`
     - `filing_id`
     - `legal_name`
     - `filed_date` (when provided by source)
   - Route malformed records to failure tracking with reason codes.

5. **Deduplicate**
   - Use `(state, filing_id)` as idempotency key.
   - Reprocessing the same source record must not create duplicate filing rows.

6. **Upsert**
   - Upsert normalized data into:
     - `businesses`
     - `filings`
     - `business_locations`
     - `source_records`
   - Track inserted/updated/skipped counters.

7. **Publish events**
   - Emit downstream events for added/updated businesses.
   - Support alerting/webhook delivery without blocking ingestion.

## Idempotency guarantees
- Re-running the same fetch batch is safe.
- Filing uniqueness is guaranteed by unique key `(state, filing_id)`.
- Business/location records are updated in place using deterministic matching rules.

## Run tracking
- Each execution writes `ingestion_runs` with:
  - source id
  - run time
  - processed/added/updated/failed counts
  - status + error message (if any)
