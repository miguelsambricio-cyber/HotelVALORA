/**
 * RapidAPI Booking — parsed hotel → canonical row mapping (v1).
 *
 * This is the institutional core of the provider layer. Takes a
 * `ParsedHotel` (and optional granular facilities from E3) and produces:
 *
 *   1. A `CanonicalHotelDraft` matching the shape of `hotel_canonical`
 *      (Partial — only fields Booking can populate).
 *   2. A `ProvenanceTrail` of per-field source/value/confidence triples
 *      that the writer will persist into `hotel_field_provenance`.
 *   3. Diagnostics for any unmapped amenities / failed lookups.
 *
 * Confidence scoring follows main arch doc §3:
 *   confidence = tier_weight × freshness_decay × validation_multiplier
 *              + agreement_bonus
 *
 * For Phase 1 (single source, freshly fetched):
 *   - tier_weight = 0.85 (Booking RapidAPI = Tier A)
 *   - freshness_decay = 1.0 (just fetched)
 *   - validation_multiplier = 1.0 (assumed already validated by parser)
 *   - agreement_bonus = 0 (no other source yet)
 *
 * So Booking-only confidence floor = 0.85 for any field present.
 * Some fields get slightly higher floors (counts) or lower floors
 * (heuristic derivations) per the mapping table.
 *
 * Aligns precisely with the field-confidence matrix in the RapidAPI
 * sidecar §2.
 */

import {
  resolveBrandFamily,
  type ChainScale,
} from "../../registries/brands";
import {
  resolveAmenityList,
  emptyAmenityBitmap,
  countDeterminedKeys,
  type AmenityBitmap,
  type AmenityResolution,
} from "../../registries/amenities";
import {
  resolveMunicipio,
  type MunicipioResolution,
} from "../../registries/madrid-municipios";
import {
  resolveHotelType,
  deriveSegment,
  type HotelSegment,
  type HotelType,
  type SegmentResolution,
} from "../../registries/hotel-types";
import type { ParsedHotel } from "./parse";

// ───────────────────────────────────────────────────────────────────────────
// Canonical draft (subset of hotel_canonical writable by Booking alone)
// ───────────────────────────────────────────────────────────────────────────

export interface CanonicalHotelDraft {
  // Identity
  canonical_name: string | null;
  legal_name: string | null;
  brand: string | null;
  brand_family: string | null;
  chain_scale: ChainScale;

  // Classification
  star_rating: number | null;
  hotel_type: HotelType | null;
  segment: HotelSegment;

  // Location
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  city_normalized: string | null;
  postal_code: string | null;
  country_code: string | null;
  region: string | null;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  // geom is derived in SQL via ST_MakePoint(lng,lat) — not represented here

  // Capacity
  total_rooms: number | null;

  // Amenities
  amenities: AmenityBitmap;

  // Reviews
  review_score: number | null;
  review_count: number | null;
  primary_review_source: "booking_rapidapi" | null;

  // Contact
  website_url: string | null;
  phone: string | null;
  booking_url: string | null;

  // Media
  hero_image_path: string | null; // populated as URL initially; binary-key swap-in happens in image stage

  // External IDs
  booking_hotel_id: string | null;

  // Governance / lifecycle
  primary_source: "booking_rapidapi";
  status: "active" | "closed";
}

// ───────────────────────────────────────────────────────────────────────────
// Provenance trail
// ───────────────────────────────────────────────────────────────────────────

export interface ProvenanceEntry {
  field: keyof CanonicalHotelDraft | "amenities.bar" | "amenities.restaurant" | "amenities.rooftop"
       | "amenities.spa" | "amenities.gym" | "amenities.pool" | "amenities.parking"
       | "amenities.meet" | "amenities.business_center" | "amenities.kids_club"
       | "amenities.beach_access" | "amenities.golf" | "amenities.casino" | "amenities.marina";
  source: "booking_rapidapi";
  value: unknown;
  confidence: number;
  rationale: string;
}

export interface MappingDiagnostics {
  unmappedAmenities: string[];
  brandUnresolved: boolean;
  municipioUnresolved: boolean;
  hotelTypeUnresolved: boolean;
  parserWarnings: string[];
  notes: string[];
}

export interface MappingResult {
  draft: CanonicalHotelDraft;
  provenance: ProvenanceEntry[];
  diagnostics: MappingDiagnostics;
  /** Number of canonical fields populated (non-null) in the draft. */
  populatedFieldCount: number;
  /** Per-amenity-key resolutions returned by the amenity registry. */
  amenityResolutions: AmenityResolution[];
  /** Municipio lookup result (null if unresolved). */
  municipioResolution: MunicipioResolution | null;
  /** Segment derivation summary. */
  segmentResolution: SegmentResolution;
}

// ───────────────────────────────────────────────────────────────────────────
// Tier-A confidence constants (Booking RapidAPI baseline)
// ───────────────────────────────────────────────────────────────────────────

const TIER_A_BASE = 0.85;
const TIER_A_HIGH = 0.9;           // counts (review_count) — verifiable
const TIER_A_LOW = 0.7;            // heuristic / lower-trust derivations
const SELF_AUTHORITATIVE = 1.0;    // ids that ARE the truth (booking_hotel_id, booking_url)

// ───────────────────────────────────────────────────────────────────────────
// Mapper
// ───────────────────────────────────────────────────────────────────────────

export function mapToCanonical(
  parsed: ParsedHotel,
  options: {
    extraFacilities?: string[];
    enrichmentVersion?: number;
  } = {},
): MappingResult {
  const provenance: ProvenanceEntry[] = [];
  const diagnostics: MappingDiagnostics = {
    unmappedAmenities: [],
    brandUnresolved: false,
    municipioUnresolved: false,
    hotelTypeUnresolved: false,
    parserWarnings: parsed.warnings.slice(),
    notes: [],
  };

  function pushProv(
    field: ProvenanceEntry["field"],
    value: unknown,
    confidence: number,
    rationale: string,
  ): void {
    if (value === null || value === undefined) return;
    provenance.push({ field, source: "booking_rapidapi", value, confidence, rationale });
  }

  // ─── Brand resolution ────────────────────────────────────────────────────
  const brandLookup = resolveBrandFamily(parsed.brand ?? parsed.chainName);
  if (parsed.brand && !brandLookup) {
    diagnostics.brandUnresolved = true;
    diagnostics.notes.push(`Brand "${parsed.brand}" not in registry — routed to review.`);
  }

  // ─── Hotel type resolution ───────────────────────────────────────────────
  const typeResolution = resolveHotelType(parsed.accommodationTypeName);
  if (parsed.accommodationTypeName && !typeResolution) {
    diagnostics.hotelTypeUnresolved = true;
  }

  // ─── Municipio (city_normalized) ────────────────────────────────────────
  const municipio = resolveMunicipio(parsed.city, parsed.postalCode);
  if (parsed.city && !municipio) {
    diagnostics.municipioUnresolved = true;
    diagnostics.notes.push(`Municipio "${parsed.city}" not in registry — city_normalized falls back to verbatim city.`);
  }

  // ─── Segment derivation ──────────────────────────────────────────────────
  const segmentResolution = deriveSegment({
    starRating: parsed.starRating,
    chainScale: brandLookup?.chainScale ?? null,
    hotelType: typeResolution?.hotelType ?? null,
  });

  // ─── Amenities ───────────────────────────────────────────────────────────
  const allAmenityStrings = [...parsed.rawFacilities, ...(options.extraFacilities ?? [])];
  const amenityResolution = resolveAmenityList(allAmenityStrings);
  diagnostics.unmappedAmenities = amenityResolution.unmapped.slice();
  const bitmap: AmenityBitmap = amenityResolution.bitmap;

  // Emit provenance per resolved amenity key (one entry per positive flip)
  for (const r of amenityResolution.resolutions) {
    pushProv(
      `amenities.${r.key}` as ProvenanceEntry["field"],
      true,
      Math.min(SELF_AUTHORITATIVE, r.baseConfidence * 1.0),
      `amenity_matched:${r.matchedAlias}`,
    );
  }

  // ─── Build the canonical draft ───────────────────────────────────────────
  const status: "active" | "closed" = parsed.isClosed ? "closed" : "active";

  const draft: CanonicalHotelDraft = {
    // Identity
    canonical_name: parsed.name,
    legal_name: parsed.legalName,
    brand: brandLookup?.brandFamilyDisplayName ? (parsed.brand ?? parsed.chainName) : parsed.brand,
    brand_family: brandLookup?.brandFamilyDisplayName ?? null,
    chain_scale: brandLookup?.chainScale ?? "unknown",

    // Classification
    star_rating: parsed.starRating,
    hotel_type: typeResolution?.hotelType ?? null,
    segment: segmentResolution.segment,

    // Location
    address_line1: parsed.addressLine1,
    address_line2: parsed.addressLine2,
    city: parsed.city,
    city_normalized: municipio?.cityNormalized ?? parsed.city,
    postal_code: parsed.postalCode,
    country_code: parsed.countryCode,
    region: parsed.region,
    neighborhood: parsed.district,
    lat: parsed.lat,
    lng: parsed.lng,

    // Capacity
    total_rooms: parsed.totalRooms,

    // Amenities
    amenities: bitmap,

    // Reviews
    review_score: parsed.reviewScore,
    review_count: parsed.reviewCount,
    primary_review_source: parsed.reviewScore !== null ? "booking_rapidapi" : null,

    // Contact
    website_url: parsed.websiteUrl,
    phone: parsed.phone,
    booking_url: parsed.bookingUrl,

    // Media
    hero_image_path: parsed.mainPhotoUrl,

    // External IDs
    booking_hotel_id: parsed.bookingHotelId,

    // Governance / lifecycle
    primary_source: "booking_rapidapi",
    status,
  };

  // ─── Provenance for non-amenity fields ──────────────────────────────────
  pushProv("canonical_name", draft.canonical_name, TIER_A_BASE, "booking_e2_name");
  pushProv("legal_name", draft.legal_name, TIER_A_LOW, "booking_e2_legal_name_rare");
  pushProv("address_line1", draft.address_line1, TIER_A_BASE, "booking_e2_address");
  pushProv("address_line2", draft.address_line2, TIER_A_BASE, "booking_e2_address_extra");
  pushProv("city", draft.city, TIER_A_BASE, "booking_e2_city");
  pushProv(
    "city_normalized",
    draft.city_normalized,
    municipio ? municipio.confidence : 0.55,
    municipio ? `municipio_registry_${municipio.source}` : "fallback_verbatim_city",
  );
  pushProv("postal_code", draft.postal_code, TIER_A_BASE, "booking_e2_zip_validated");
  pushProv("country_code", draft.country_code, 0.95, "booking_e2_cc1_validated");
  pushProv("region", draft.region, TIER_A_LOW, "booking_e2_region");
  pushProv("neighborhood", draft.neighborhood, TIER_A_LOW, "booking_e2_district");
  pushProv("lat", draft.lat, TIER_A_BASE, "booking_e2_latitude_validated");
  pushProv("lng", draft.lng, TIER_A_BASE, "booking_e2_longitude_validated");
  pushProv("star_rating", draft.star_rating, TIER_A_BASE, "booking_e2_class_validated");
  pushProv(
    "hotel_type",
    draft.hotel_type,
    typeResolution ? typeResolution.confidence : 0.5,
    typeResolution ? `type_registry_match:${typeResolution.matchedSource}` : "type_unresolved",
  );
  pushProv(
    "segment",
    draft.segment,
    segmentResolution.confidence,
    `segment_derived:${segmentResolution.rationale}`,
  );
  pushProv("total_rooms", draft.total_rooms, TIER_A_BASE, "booking_e2_room_count");
  pushProv(
    "brand",
    draft.brand,
    brandLookup ? TIER_A_BASE : TIER_A_LOW,
    brandLookup ? "booking_e2_chain_name_registry_hit" : "booking_e2_chain_name_unresolved",
  );
  pushProv(
    "brand_family",
    draft.brand_family,
    brandLookup ? 0.85 : 0,
    brandLookup ? "registry_brand_family_lookup" : "brand_family_unresolved",
  );
  pushProv(
    "chain_scale",
    draft.chain_scale,
    brandLookup ? 0.85 : 0,
    brandLookup ? "registry_chain_scale_lookup" : "chain_scale_unresolved",
  );
  pushProv("review_score", draft.review_score, TIER_A_BASE, "booking_e2_review_score");
  pushProv("review_count", draft.review_count, TIER_A_HIGH, "booking_e2_review_nr");
  pushProv("primary_review_source", draft.primary_review_source, SELF_AUTHORITATIVE, "constant_for_phase_1");
  pushProv("website_url", draft.website_url, TIER_A_LOW, "booking_e2_url_or_listing_warning");
  pushProv("phone", draft.phone, TIER_A_BASE, "booking_e2_phone");
  pushProv("booking_url", draft.booking_url, SELF_AUTHORITATIVE, "booking_e2_url_self_authoritative");
  pushProv("hero_image_path", draft.hero_image_path, TIER_A_BASE, "booking_e2_main_photo_url");
  pushProv("booking_hotel_id", draft.booking_hotel_id, SELF_AUTHORITATIVE, "self_authoritative");
  pushProv("primary_source", draft.primary_source, SELF_AUTHORITATIVE, "constant_phase_1");
  pushProv("status", draft.status, SELF_AUTHORITATIVE, "booking_e2_is_closed");

  // ─── Populated-field count ───────────────────────────────────────────────
  let populated = 0;
  for (const [k, v] of Object.entries(draft)) {
    if (k === "amenities") {
      populated += countDeterminedKeys(v as AmenityBitmap);
      continue;
    }
    if (v !== null && v !== undefined && v !== "unknown") populated++;
  }

  return {
    draft,
    provenance,
    diagnostics,
    populatedFieldCount: populated,
    amenityResolutions: amenityResolution.resolutions,
    municipioResolution: municipio,
    segmentResolution,
  };
}

/** Default empty amenity bitmap, re-exported for convenience to dry-run callers. */
export { emptyAmenityBitmap };
