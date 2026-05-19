/**
 * In-memory canonical store (v1).
 *
 * Implements the `ExecutionContext.canonicalStore` interface against a
 * JS Map. Used by the dry-run orchestrator to simulate the dedup +
 * conflict-resolution loop without touching Supabase.
 *
 * In Phase 3+ a Supabase-backed implementation replaces this; the
 * interface stays identical.
 */

import { blockKey } from "../dedup/scoring";
import type { CanonicalHotelDraft } from "../providers/booking-rapidapi/map-to-canonical";

export class InMemoryCanonicalStore {
  private byId = new Map<string, CanonicalHotelDraft>();
  private byBookingId = new Map<string, CanonicalHotelDraft>();
  private byBlockKey = new Map<string, Set<string>>();

  findByBlockKey(bk: string): readonly CanonicalHotelDraft[] {
    const ids = this.byBlockKey.get(bk);
    if (!ids) return [];
    const out: CanonicalHotelDraft[] = [];
    for (const id of ids) {
      const row = this.byId.get(id);
      if (row) out.push(row);
    }
    return out;
  }

  findByExternalId(idType: string, id: string): CanonicalHotelDraft | null {
    if (idType === "booking_hotel_id") {
      return this.byBookingId.get(id) ?? null;
    }
    return null;
  }

  upsert(row: CanonicalHotelDraft): void {
    const key = row.booking_hotel_id ?? `${row.canonical_name}@${row.city_normalized}`;
    this.byId.set(key, row);
    if (row.booking_hotel_id) this.byBookingId.set(row.booking_hotel_id, row);
    const bk = blockKey({
      name: row.canonical_name,
      cityNormalized: row.city_normalized,
      countryCode: row.country_code,
    });
    if (!this.byBlockKey.has(bk)) this.byBlockKey.set(bk, new Set());
    this.byBlockKey.get(bk)!.add(key);
  }

  size(): number {
    return this.byId.size;
  }

  values(): CanonicalHotelDraft[] {
    return Array.from(this.byId.values());
  }
}
