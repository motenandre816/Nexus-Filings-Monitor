import { and, eq } from "drizzle-orm";
import { db } from "./index";
import { businessesTable, businessLocationsTable, filingsTable } from "./schema/business-network";

export interface UpsertBusinessInput {
  state: string;
  filingId: string;
  legalName: string;
  tradeName?: string;
  status?: string;
  filedDate?: string;
  sourceRecordId: number;
  operatingStatusConfidence?: number;
  location: {
    addressType: string;
    address: string;
    city?: string;
    state?: string;
    zip?: string;
    coordinates?: string;
    verified?: boolean;
    confidence?: number;
  };
}

export interface UpsertBusinessResult {
  action: "added" | "updated";
  businessId: number;
}

function earliestDate(current: string | null, next?: string): string | null {
  if (!next) return current;
  if (!current) return next;
  return new Date(next) < new Date(current) ? next : current;
}

export async function upsertBusinessRecord(
  input: UpsertBusinessInput,
): Promise<UpsertBusinessResult> {
  return db.transaction(async (tx) => {
    const [existingFiling] = await tx
      .select()
      .from(filingsTable)
      .where(and(eq(filingsTable.state, input.state), eq(filingsTable.filingId, input.filingId)))
      .limit(1);

    if (!existingFiling) {
      const [business] = await tx
        .insert(businessesTable)
        .values({
          legalName: input.legalName,
          tradeName: input.tradeName ?? null,
          firstFiledDate: input.filedDate ?? null,
          lastSeen: new Date(),
          operatingStatusConfidence: input.operatingStatusConfidence ?? null,
        })
        .returning();

      const [location] = await tx
        .insert(businessLocationsTable)
        .values({
          businessId: business.id,
          addressType: input.location.addressType,
          address: input.location.address,
          city: input.location.city ?? null,
          state: input.location.state ?? null,
          zip: input.location.zip ?? null,
          coordinates: input.location.coordinates ?? null,
          verified: input.location.verified ?? false,
          confidence: input.location.confidence ?? null,
          lastSeen: new Date(),
        })
        .returning();

      await tx
        .update(businessesTable)
        .set({ primaryLocationId: location.id })
        .where(eq(businessesTable.id, business.id));

      await tx.insert(filingsTable).values({
        businessId: business.id,
        state: input.state,
        filingId: input.filingId,
        legalName: input.legalName,
        status: input.status ?? null,
        filedDate: input.filedDate ?? null,
        sourceRecordId: input.sourceRecordId,
      });

      return { action: "added", businessId: business.id };
    }

    const businessId = existingFiling.businessId;
    const [business] = await tx
      .select()
      .from(businessesTable)
      .where(eq(businessesTable.id, businessId))
      .limit(1);

    const [existingLocation] = await tx
      .select()
      .from(businessLocationsTable)
      .where(
        and(
          eq(businessLocationsTable.businessId, businessId),
          eq(businessLocationsTable.addressType, input.location.addressType),
          eq(businessLocationsTable.address, input.location.address),
        ),
      )
      .limit(1);

    if (existingLocation) {
      await tx
        .update(businessLocationsTable)
        .set({
          city: input.location.city ?? null,
          state: input.location.state ?? null,
          zip: input.location.zip ?? null,
          coordinates: input.location.coordinates ?? null,
          verified: input.location.verified ?? false,
          confidence: input.location.confidence ?? null,
          lastSeen: new Date(),
        })
        .where(eq(businessLocationsTable.id, existingLocation.id));
    } else {
      const [newLocation] = await tx
        .insert(businessLocationsTable)
        .values({
          businessId,
          addressType: input.location.addressType,
          address: input.location.address,
          city: input.location.city ?? null,
          state: input.location.state ?? null,
          zip: input.location.zip ?? null,
          coordinates: input.location.coordinates ?? null,
          verified: input.location.verified ?? false,
          confidence: input.location.confidence ?? null,
          lastSeen: new Date(),
        })
        .returning();

      if (!business?.primaryLocationId) {
        await tx
          .update(businessesTable)
          .set({ primaryLocationId: newLocation.id })
          .where(eq(businessesTable.id, businessId));
      }
    }

    await tx
      .update(businessesTable)
      .set({
        legalName: input.legalName,
        tradeName: input.tradeName ?? null,
        firstFiledDate: earliestDate(business?.firstFiledDate ?? null, input.filedDate),
        lastSeen: new Date(),
        operatingStatusConfidence: input.operatingStatusConfidence ?? null,
      })
      .where(eq(businessesTable.id, businessId));

    await tx
      .update(filingsTable)
      .set({
        legalName: input.legalName,
        status: input.status ?? null,
        filedDate: input.filedDate ?? null,
        sourceRecordId: input.sourceRecordId,
      })
      .where(eq(filingsTable.id, existingFiling.id));

    return { action: "updated", businessId };
  });
}
