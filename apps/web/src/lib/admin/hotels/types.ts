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
    | null;
  /** Phase 2.3.d.6e · brand affiliation axis (CoStar "Escala") · separate
   *  from chain_scale. `independent` here is what previously misclassified
   *  as `chain_scale="independent"`. */
  affiliation_type: "chain" | "independent" | null;
  /** Category · star rating (1–5 stars typical for hotels). Stored as
   *  string to preserve "5 stars" / "5*" / "5★" / "GL" variants from
   *  the CoStar source. The UI normalises to "{N} ★" when numeric. */
  category: string | null;
  /** Property-type axis · what kind of asset this is. Operator
   *  definition 2026-05-14:
   *    - hotel               : operating hotel
   *    - hotel_project       : hotel under development / planned
   *    - tourist_apartments  : tourist apartments / aparthotel
   *  Replaces the previous commercial-segment enum
   *  (business/leisure/extended_stay/resort/convention) which was
   *  the wrong axis · those properties belong to the asset's
   *  market positioning, not the property-type classification. */
  segment_type:
    | "hotel"
    | "hotel_project"
    | "tourist_apartments"
    | null;
  rooms_count: number | null;
  year_opened: number | null;
  year_last_renovated: number | null;
  total_floors: number | null;
  /** Gross built area in m² · "Superficie construida" in CoStar ES.
   *  The institutional underwriting headline alongside rooms_count. */
  gross_building_sqm: number | null;
  /** Lot / plot area in m² · "Superficie de la parcela". */
  lot_size_sqm: number | null;
  /** Typical-floor area in m² · "Planta tipo". */
  typical_floor_sqm: number | null;
  /** Floors above ground · CoStar splits this from `total_floors`
   *  (which is the headline · all floors incl. basement). */
  floors_above_ground: number | null;
  /** Floors below ground (basement levels). */
  floors_below_ground: number | null;

  // Location
  address_line: string | null;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  neighborhood: string | null;
  /** Spanish cadastre identifier (Catastro). Manual operator entry today;
   *  future Catastro API enrichment will populate automatically. Other
   *  countries will get their own local-registry IDs later. */
  catastro_id?: string | null;

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

  // Phase 3.e · enrichment layer (Booking / manual operator / etc.)
  // Optional · canonical CoStar fields above always win institutionally;
  // enrichment fills the operator-experience gap.
  profile?: HotelProfile;
  _enrichment_meta?: EnrichmentMeta;
}

/**
 * Phase 3.e · canonical institutional hotel profile.
 *
 * Sourced from Booking + manual operator entry + (future) other public
 * providers. NOT a replacement for the CoStar institutional fields on
 * the parent record — those still own ownership, operator, rooms,
 * year_opened, owner. This layer carries the operational + guest-
 * experience attributes that COSTAR doesn't track.
 */
export interface HotelProfile {
  /** Detailed facility codes (e.g. "outdoor_pool", "indoor_pool",
   *  "kosher_kitchen") · superset of the basic `facilities` on the
   *  parent record. */
  facilities_detailed?: string[];
  /** Amenities (free-text · less structured than facilities). */
  amenities?: string[];
  /** Room mix · [{name: "Deluxe King", count: 24, ...}, ...] */
  room_types?: Array<{
    name: string;
    count?: number | null;
    sqm?: number | null;
    max_occupancy?: number | null;
  }>;
  /** Services offered (concierge · laundry · 24h reception ...). */
  services?: string[];
  /** Food & beverage outlets. */
  fnb?: {
    restaurants_count?: number | null;
    bars_count?: number | null;
    cuisines?: string[];
    breakfast_included?: boolean | null;
    michelin_stars?: number | null;
  };
  spa?: {
    has_spa?: boolean | null;
    treatments?: string[];
    sqm?: number | null;
  };
  gym?: {
    has_gym?: boolean | null;
    equipment?: string[];
    sqm?: number | null;
    open_24h?: boolean | null;
  };
  coworking?: {
    has_coworking?: boolean | null;
    seats?: number | null;
  };
  parking?: {
    has_parking?: boolean | null;
    spaces?: number | null;
    price_eur?: number | null;
    valet?: boolean | null;
    ev_charging?: boolean | null;
  };
  meeting_rooms?: {
    count?: number | null;
    total_sqm?: number | null;
    max_capacity?: number | null;
  };
  rooftop?: {
    has_rooftop?: boolean | null;
    views?: string[];
  };
  pool?: {
    has_pool?: boolean | null;
    indoor?: boolean | null;
    outdoor?: boolean | null;
    heated?: boolean | null;
  };
  /** Sustainability certifications · BREEAM, LEED, Green Key, EarthCheck */
  sustainability?: string[];
  /** Accessibility features · wheelchair, hearing-impaired, vision-impaired, etc. */
  accessibility?: string[];
  /** Family-oriented features. */
  family_features?: string[];

  // ── Guest experience ────────────────────────────────────────────
  /** Aggregate review score (0-10 Booking scale typical; normalise upstream). */
  review_score?: number | null;
  review_count?: number | null;
  review_source?: "booking" | "tripadvisor" | "google" | "aggregated" | string;
  /** Per-category review sub-scores from Booking's getHotelReviewScores
   *  `score_breakdown.question[]`. Each is the latest-year score on the
   *  same 0-10 scale. These feed the HotelVALORA composite score. */
  location_score?: number | null;
  comfort_score?: number | null;
  cleanliness_score?: number | null;
  staff_score?: number | null;
  value_score?: number | null;
  facilities_score?: number | null;
  wifi_score?: number | null;

  // ── External references ─────────────────────────────────────────
  booking_url?: string | null;
  website_url?: string | null;
  image_refs?: string[];

  // ── Location intelligence ───────────────────────────────────────
  /** Lat/lng captured at enrichment time · used as fallback when the
   *  CoStar canonical record has no coordinates. */
  latitude?: number | null;
  longitude?: number | null;
  geo_context?: {
    nearby_poi?: Array<{
      name: string;
      type: string; // "metro" | "airport" | "monument" | "convention_center"
      distance_m?: number | null;
    }>;
    transport_score?: number | null; // 0-100 composite walk/transit access
    walkscore?: number | null;
  };

  // ── Policies ────────────────────────────────────────────────────
  check_in_time?: string | null;  // "15:00"
  check_out_time?: string | null; // "12:00"
  pet_policy?: string | null;     // free-text
  cancellation_policy?: string | null;
  smoking_policy?: string | null;
}

/** Provenance + freshness for the enrichment layer. */
export interface EnrichmentMeta {
  /** Which sources contributed to this hotel's profile. */
  enrichment_sources?: Array<"manual_operator" | "booking" | "tripadvisor" | string>;
  /** Per-source priority (higher = wins on conflict). Manual operator
   *  defaults to 100 (highest) so operator corrections never get
   *  overwritten by an automated re-scrape. */
  source_priority?: Record<string, number>;
  /** 0–1 composite confidence across the enrichment fields. */
  enrichment_confidence?: number | null;
  /** Booking.com hotel_id when this record was sourced from the
   *  RapidAPI booking-com15 pipeline. Surfaced in the Identification
   *  section · also lets the patcher re-enrich without re-resolving. */
  booking_hotel_id?: number | null;
  /** ISO timestamp of the most recent scrape / manual edit. */
  last_scraped_at?: string | null;
  /** ISO timestamp of the last `patch-enrichment-policies` run that
   *  touched this record. Lets the operator see when policies were
   *  back-filled separately from the main enrichment. */
  last_policies_patched_at?: string | null;
  /** 0–100 percent of priority enrichment fields populated. */
  profile_completeness_score?: number | null;
  /** Operator who submitted the last manual enrichment. */
  submitted_by?: string;
  submitted_at?: string;
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
