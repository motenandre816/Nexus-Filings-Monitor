import { KansasLlcSourceAdapter } from "../connectors/ks-llc-connector";
import { ingestSource } from "../pipeline/ingest-source";
import { DbIngestionStore } from "../storage/db-ingestion-store";

export async function ingestKansasLlcs() {
  const adapter = new KansasLlcSourceAdapter();
  const store = new DbIngestionStore();
  return ingestSource({
    adapter,
    store,
    retryAttempts: 3,
  });
}
