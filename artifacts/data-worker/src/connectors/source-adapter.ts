export interface RawSourceRecord {
  rawUrl?: string;
  payload: unknown;
}

export interface NormalizedBusinessLocation {
  addressType: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  coordinates?: string;
  verified?: boolean;
  confidence?: number;
}

export interface NormalizedFilingRecord {
  state: string;
  filingId: string;
  legalName: string;
  tradeName?: string;
  status?: string;
  filedDate?: string;
  location: NormalizedBusinessLocation;
  operatingStatusConfidence?: number;
}

export interface SourceAdapter {
  sourceId: string;
  parserVersion: string;
  fetchRecords(): Promise<RawSourceRecord[]>;
  parseRecord(record: RawSourceRecord): NormalizedFilingRecord;
}
