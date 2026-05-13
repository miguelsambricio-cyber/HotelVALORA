/**
 * Canonical hotel-reference record — mirrors the planned schema in
 * `docs/intelligence/costar-hotels-by-market-schema.md`. Today this
 * type only describes the shape; the data plane lives in the XLSX
 * masters at `services/costar/HOTELESperMARKET/`. The
 * `/user/admin/hotels` admin surface reads no live data yet — it
 * renders the registry as a read-only scaffold until the Phase-5
 * Supabase mirror lands.
 *
 * Source of truth for column inventory: `costar-hotels-by-market-schema.md`.
 */
export interface HotelReferenceRecord {
  // Identification
  country: string;          // ISO-3166-1 alpha-2 uppercase
  market_name: string;
  submarket_name: string | null;
  hotel_id: string;
  hotel_id_synthetic: boolean;
  name: string;
  brand: string | null;
  operator: string | null;
  owner: string | null;

  // Property characteristics
  chain_scale:
    | "luxury"
    | "upper_upscale"
    | "upscale"
    | "upper_midscale"
    | "midscale"
    | "economy"
    | "independent"
    | null;
  category: string | null;
  segment_type:
    | "business"
    | "leisure"
    | "extended_stay"
    | "resort"
    | "convention"
    | null;
  rooms_count: number | null;
  year_opened: number | null;
  year_last_renovated: number | null;
  total_floors: number | null;

  // Location
  address_line: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;

  // Facilities · amenities · scoring
  facilities: string[];
  amenities: string[];
  meeting_space_sqm: number | null;
  parking_spaces: number | null;
  score_costar: number | null;
  score_external: Record<string, number>;

  // Commercial context
  competitive_set_ids: string[];
  transactions_history_ref: string | null;
  notes: string | null;
}

export type HotelDatasetStatus =
  | "xlsx_master"        // Phase 1 — data lives in services/costar/ XLSX
  | "supabase_mirror"    // Phase 5 — read path is Postgres
  | "supabase_canonical"; // Phase 6 — XLSX retired, Postgres is source of truth

export interface HotelsRegistryStatus {
  /** Where the data plane currently lives. */
  dataPlane: HotelDatasetStatus;
  /** Last time the XLSX master was regenerated (build_masters version). */
  normalizationVersion: string;
  /** Total rows in the master — null until the v1.2 generator ships. */
  rowsInMaster: number | null;
  /** Markets currently represented in the master. */
  marketsRepresented: string[];
  /** Reconciliation-queue size — rows flagged for operator review. */
  reconciliationQueueSize: number;
}
