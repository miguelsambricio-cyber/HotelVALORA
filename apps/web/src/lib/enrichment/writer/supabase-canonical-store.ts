/**
 * Supabase canonical store (v1).
 *
 * Implements the read-side of the canonical store backed by Supabase.
 * Returns a populated `InMemoryCanonicalStore` for the orchestrator to
 * consume — preserving the **clean interface swap** invariant: the
 * orchestrator core never touches Supabase directly.
 *
 *   ┌──────────────────────────────────────────────┐
 *   │  worker layer (Phase 3+)                      │
 *   │   1. computeBlockKey(candidate)               │
 *   │   2. const seeded = await                     │
 *   │      seedFromBlockKey(client, bk)             │
 *   │   3. runEnrichmentJob(job, { ...ctx,          │
 *   │        canonicalStore: seeded })              │
 *   │   4. await writer.persist(result, runId)      │
 *   └──────────────────────────────────────────────┘
 *
 * Sync orchestrator interface is preserved. Async Supabase queries
 * happen OUTSIDE the orchestrator's run.
 *
 * Phase 1: this module is type-checked but not invoked at runtime.
 * The actual SupabaseClient handoff happens at Phase A (post-migration
 * apply) — see Madrid bootstrap plan §2.
 */

import { InMemoryCanonicalStore } from "../orchestrator/in-memory-store";
import { blockKey } from "../dedup/scoring";
import type { CanonicalHotelDraft } from "../providers/booking-rapidapi/map-to-canonical";

// ───────────────────────────────────────────────────────────────────────────
// Supabase client — type-only import (no runtime dependency at load)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Narrow shape of the Supabase client we actually use here. Typed as
 * a structural type so we can swap in a mock client for tests without
 * pulling the full `@supabase/supabase-js` types.
 */
export interface SupabaseQueryClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string | number): {
        limit(n: number): Promise<{ data: unknown[] | null; error: { message: string } | null }>;
      };
      in(column: string, values: (string | number)[]): Promise<{
        data: unknown[] | null;
        error: { message: string } | null;
      }>;
    };
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Row → draft adapter
// ───────────────────────────────────────────────────────────────────────────

/**
 * Maps a `hotel_canonical` row (database shape) into the
 * `CanonicalHotelDraft` shape the orchestrator consumes. Defensive on
 * missing columns; never throws.
 */
export function rowToDraft(row: Record<string, unknown>): CanonicalHotelDraft {
  return {
    canonical_name: (row.canonical_name as string | null) ?? null,
    legal_name: (row.legal_name as string | null) ?? null,
    brand: (row.brand as string | null) ?? null,
    brand_family: (row.brand_family as string | null) ?? null,
    chain_scale: (row.chain_scale as CanonicalHotelDraft["chain_scale"]) ?? "unknown",

    star_rating: (row.star_rating as number | null) ?? null,
    hotel_type: (row.hotel_type as CanonicalHotelDraft["hotel_type"]) ?? null,
    segment: (row.segment as CanonicalHotelDraft["segment"]) ?? "unknown",

    address_line1: (row.address_line1 as string | null) ?? null,
    address_line2: (row.address_line2 as string | null) ?? null,
    city: (row.city as string | null) ?? null,
    city_normalized: (row.city_normalized as string | null) ?? null,
    postal_code: (row.postal_code as string | null) ?? null,
    country_code: (row.country_code as string | null) ?? null,
    region: (row.region as string | null) ?? null,
    neighborhood: (row.neighborhood as string | null) ?? null,
    lat: (row.lat as number | null) ?? null,
    lng: (row.lng as number | null) ?? null,

    total_rooms: (row.total_rooms as number | null) ?? null,

    amenities: ((row.amenities as CanonicalHotelDraft["amenities"]) ?? {
      bar: null, restaurant: null, rooftop: null, spa: null, gym: null, pool: null,
      parking: null, meet: null, business_center: null, kids_club: null,
      beach_access: null, golf: null, casino: null, marina: null,
    }) as CanonicalHotelDraft["amenities"],

    review_score: (row.review_score as number | null) ?? null,
    review_count: (row.review_count as number | null) ?? null,
    primary_review_source: (row.primary_review_source as CanonicalHotelDraft["primary_review_source"]) ?? null,

    website_url: (row.website_url as string | null) ?? null,
    phone: (row.phone as string | null) ?? null,
    booking_url: (row.booking_url as string | null) ?? null,
    hero_image_path: (row.hero_image_path as string | null) ?? null,

    booking_hotel_id: (row.booking_hotel_id as string | null) ?? null,

    primary_source: ((row.primary_source as CanonicalHotelDraft["primary_source"]) ?? "booking_rapidapi"),
    status: (row.status as CanonicalHotelDraft["status"]) ?? "active",
  };
}

// ───────────────────────────────────────────────────────────────────────────
// Seeders
// ───────────────────────────────────────────────────────────────────────────

const HOTEL_CANONICAL_COLUMNS = `
  id, canonical_name, legal_name, brand, brand_family, chain_scale,
  star_rating, hotel_type, segment,
  address_line1, address_line2, city, city_normalized, postal_code,
  country_code, region, neighborhood, lat, lng,
  total_rooms, amenities, review_score, review_count, primary_review_source,
  website_url, phone, booking_url, hero_image_path,
  booking_hotel_id, primary_source, status, block_key
`.trim();

/**
 * Load all canonical rows sharing a block_key (non-deleted) and return
 * a populated `InMemoryCanonicalStore`. The orchestrator consumes the
 * store synchronously.
 */
export async function seedFromBlockKey(
  client: SupabaseQueryClient,
  bk: string,
): Promise<InMemoryCanonicalStore> {
  const store = new InMemoryCanonicalStore();
  const { data, error } = await client.from("hotel_canonical").select(HOTEL_CANONICAL_COLUMNS).eq("block_key", bk).limit(100);
  if (error) {
    throw new Error(`[SupabaseCanonicalStore.seedFromBlockKey] ${error.message}`);
  }
  for (const r of data ?? []) {
    store.upsert(rowToDraft(r as Record<string, unknown>));
  }
  return store;
}

/**
 * Convenience: compute block_key + seed in one call.
 */
export async function seedFromCandidate(
  client: SupabaseQueryClient,
  candidate: { name: string | null; cityNormalized: string | null; countryCode: string | null },
): Promise<{ store: InMemoryCanonicalStore; blockKey: string }> {
  const bk = blockKey(candidate);
  const store = await seedFromBlockKey(client, bk);
  return { store, blockKey: bk };
}

/**
 * Load a canonical row by external identifier. Used by the writer
 * to resolve `hotel_id` AFTER a canonical.upsert lands.
 */
export async function loadByExternalId(
  client: SupabaseQueryClient,
  idType: "booking_hotel_id" | "google_place_id",
  id: string,
): Promise<CanonicalHotelDraft | null> {
  const { data, error } = await client
    .from("hotel_canonical")
    .select(HOTEL_CANONICAL_COLUMNS)
    .eq(idType, id)
    .limit(1);
  if (error) {
    throw new Error(`[SupabaseCanonicalStore.loadByExternalId] ${error.message}`);
  }
  const row = (data ?? [])[0];
  return row ? rowToDraft(row as Record<string, unknown>) : null;
}
