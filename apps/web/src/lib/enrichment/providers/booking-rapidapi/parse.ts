/**
 * RapidAPI Booking — defensive payload parser (v1).
 *
 * Takes the raw `RapidApiHotelData` (or `RapidApiSearchHit`) shape and
 * produces a `ParsedHotel` with typed, validated, normalized values.
 *
 * The parser is intentionally **lossy in one direction**: if a field is
 * malformed it becomes `null` AND a warning is emitted. The original
 * payload is preserved upstream in `hotel_source_record.payload`, so
 * nothing is ever lost from the audit trail.
 */

import type {
  BookingEnvelope,
  RapidApiHotelData,
  RapidApiSearchHit,
  RapidApiFacilitiesResponse,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
// Envelope unwrap (booking-com15 wraps every response in
// `{ status, message, timestamp, data: {...} }`). Defensive — handles
// both envelope-wrapped and direct-shape inputs (for backward compat
// with the original synthetic fixtures).
// ───────────────────────────────────────────────────────────────────────────

export function unwrapEnvelope<T>(input: unknown): T {
  if (input && typeof input === "object") {
    const obj = input as BookingEnvelope<T> & Record<string, unknown>;
    // If the input looks like an envelope (has `status` and `data`), unwrap.
    if ("data" in obj && ("status" in obj || "message" in obj || "timestamp" in obj)) {
      return obj.data as T;
    }
  }
  return input as T;
}

export interface ParsedHotel {
  // Identity
  bookingHotelId: string | null;
  name: string | null;
  legalName: string | null;
  nameTranslations: Record<string, string>;

  // Location
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  countryCode: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;

  // Classification
  starRating: number | null;
  accommodationTypeName: string | null;
  accommodationTypeId: number | null;

  // Capacity
  totalRooms: number | null;

  // Brand
  chainId: string | null;
  chainName: string | null;
  brand: string | null;

  // Reviews
  reviewScore: number | null;
  reviewCount: number | null;
  reviewScoreWord: string | null;

  // Contact
  bookingUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;

  // Media
  mainPhotoUrl: string | null;

  // Facilities
  rawFacilities: string[];   // best-effort union of all facility arrays present

  // Lifecycle
  isClosed: boolean;

  // Diagnostics
  warnings: string[];
}

export interface ParseResult {
  parsed: ParsedHotel;
  hasCriticalGaps: boolean;
  criticalGaps: string[];
}

const CRITICAL_FIELDS: readonly (keyof ParsedHotel)[] = [
  "bookingHotelId",
  "name",
  "city",
  "countryCode",
  "lat",
  "lng",
];

// ───────────────────────────────────────────────────────────────────────────
// Helpers
// ───────────────────────────────────────────────────────────────────────────

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim() !== "") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asTrimString(v: unknown): string | null {
  const s = asString(v);
  return s ? s.trim() : null;
}

function asInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return Math.trunc(v);
  if (typeof v === "string") {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asFloat(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asBool(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") return v === "true" || v === "1";
  return false;
}

function validateLat(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  if (v < -90 || v > 90) {
    warnings.push(`lat_out_of_range:${v}`);
    return null;
  }
  return Math.round(v * 1_000_000) / 1_000_000;
}

function validateLng(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  if (v < -180 || v > 180) {
    warnings.push(`lng_out_of_range:${v}`);
    return null;
  }
  return Math.round(v * 1_000_000) / 1_000_000;
}

function validateCountryCode(v: string | null, warnings: string[]): string | null {
  if (!v) return null;
  const cc = v.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) {
    warnings.push(`country_code_invalid:${v}`);
    return null;
  }
  return cc;
}

function validateStarRating(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  if (v < 1 || v > 5) {
    warnings.push(`star_out_of_range:${v}`);
    return null;
  }
  return Math.round(v);
}

function validatePostalCodeEs(v: string | null, warnings: string[], countryCode: string | null): string | null {
  if (!v) return null;
  if (countryCode === "ES" && !/^\d{5}$/.test(v.trim())) {
    warnings.push(`postal_code_invalid_es:${v}`);
    return null;
  }
  return v.trim();
}

function validateReviewScore(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  // Booking review_score is in 0..10. Some publishers return 0..5; we
  // do NOT auto-rescale (ambiguity risk); we flag the suspicious case.
  if (v < 0 || v > 10) {
    warnings.push(`review_score_out_of_range:${v}`);
    return null;
  }
  return Math.round(v * 100) / 100;
}

function dedupeStrings(arr: ReadonlyArray<string | null | undefined>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    if (!s) continue;
    const k = s.trim();
    if (!k) continue;
    if (seen.has(k.toLowerCase())) continue;
    seen.add(k.toLowerCase());
    out.push(k);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// Main parser
// ───────────────────────────────────────────────────────────────────────────

export function parseHotelData(rawOrEnvelope: RapidApiHotelData | unknown): ParseResult {
  const warnings: string[] = [];
  // Defensive envelope handling — accept both shapes
  const raw: RapidApiHotelData = unwrapEnvelope<RapidApiHotelData>(rawOrEnvelope);
  // booking-com15 nests E1.property-style fields inside `data.rawData`
  const rd = raw.rawData ?? {};

  const countryCode = validateCountryCode(
    asTrimString(raw.cc1) ?? asTrimString(raw.countrycode) ?? asTrimString(rd.countryCode) ?? asTrimString(raw.country),
    warnings,
  );
  const lat = validateLat(asFloat(raw.latitude) ?? asFloat(rd.latitude), warnings);
  const lng = validateLng(asFloat(raw.longitude) ?? asFloat(rd.longitude), warnings);

  // Star rating — priority chain per booking-com15:
  //   1. rawData.accuratePropertyClass (verified, when non-zero)
  //   2. rawData.propertyClass         (declared)
  //   3. legacy raw.class / raw.property_class (for synthetic fixtures)
  //   4. rawData.qualityClass          (last resort — Booking's internal estimate)
  const starCandidates = [
    asInt(rd.accuratePropertyClass),
    asInt(rd.propertyClass),
    asInt(raw.class),
    asInt(raw.property_class),
    asInt(rd.qualityClass),
  ];
  const firstNonZero = starCandidates.find((n): n is number => typeof n === "number" && n > 0) ?? null;
  const starRating = validateStarRating(firstNonZero, warnings);

  const postalCode = validatePostalCodeEs(asTrimString(raw.zip), warnings, countryCode);

  // Total rooms — try multiple paths (booking-com15 omits both top-level paths)
  const totalRooms = asInt(raw.room_count) ?? asInt(raw.nr_rooms);

  // Review score — booking-com15 keeps this in rawData.reviewScore
  const reviewScore = validateReviewScore(
    asFloat(raw.review_score) ?? asFloat(rd.reviewScore),
    warnings,
  );
  const reviewCount = asInt(raw.review_nr) ?? asInt(rd.reviewCount);

  // Facility list — defensive union of every shape Booking exposes
  const facilityCandidates: Array<string | null | undefined> = [];
  if (Array.isArray(raw.facilities)) facilityCandidates.push(...raw.facilities);
  if (Array.isArray(raw.hotel_facilities)) facilityCandidates.push(...raw.hotel_facilities);
  if (Array.isArray(raw.hotel_facilities_filtered)) facilityCandidates.push(...raw.hotel_facilities_filtered);
  if (raw.facilities_block?.facilities) {
    for (const f of raw.facilities_block.facilities) {
      if (f?.name) facilityCandidates.push(f.name);
    }
  }
  const rawFacilities = dedupeStrings(facilityCandidates);

  // Name — booking-com15 uses `hotel_name`; legacy/synthetic uses `name`;
  // fallback to EN translation, then rawData.name
  const name =
    asTrimString(raw.hotel_name) ??
    asTrimString(raw.name) ??
    asTrimString(raw.name_trans?.en) ??
    asTrimString(rd.name) ??
    null;

  const parsed: ParsedHotel = {
    bookingHotelId: asString(raw.hotel_id),
    name,
    legalName: asTrimString(raw.legal_name),
    nameTranslations: raw.name_trans ?? {},

    addressLine1: asTrimString(raw.address),
    addressLine2: asTrimString(raw.address_extra),
    city: asTrimString(raw.city_trans) ?? asTrimString(raw.city_name_en) ?? asTrimString(raw.city),
    district: asTrimString(raw.district),
    postalCode,
    countryCode,
    region: asTrimString(raw.region),
    lat,
    lng,

    starRating,
    accommodationTypeName: asTrimString(raw.accommodation_type_name),
    accommodationTypeId: asInt(raw.accommodation_type_id),

    totalRooms,

    chainId: asString(raw.chain_id),
    chainName: asTrimString(raw.chain_name),
    brand: asTrimString(raw.brand) ?? asTrimString(raw.chain_name),

    reviewScore,
    reviewCount,
    reviewScoreWord: asTrimString(raw.review_score_word),

    bookingUrl: asTrimString(raw.url),
    websiteUrl: asTrimString(raw.website),
    phone: asTrimString(raw.phone),
    email: asTrimString(raw.email),

    // Photos — booking-com15 puts them in rawData.photoUrls[] (3 sizes;
    // we prefer the largest = index 2 for institutional rendering).
    // Legacy/synthetic uses main_photo_url / hotel_photo at top level.
    mainPhotoUrl:
      (Array.isArray(rd.photoUrls) && rd.photoUrls.length > 0
        ? (rd.photoUrls[2] ?? rd.photoUrls[rd.photoUrls.length - 1] ?? rd.photoUrls[0])
        : null) ??
      asTrimString(raw.main_photo_url) ??
      asTrimString(raw.hotel_photo),

    rawFacilities,

    isClosed: asBool(raw.is_closed),

    warnings,
  };

  const criticalGaps: string[] = [];
  for (const f of CRITICAL_FIELDS) {
    if (parsed[f] === null || parsed[f] === undefined) {
      criticalGaps.push(f as string);
    }
  }

  return {
    parsed,
    hasCriticalGaps: criticalGaps.length > 0,
    criticalGaps,
  };
}

/**
 * Parse the granular E3 facilities response. Returns the extra
 * facility strings to merge into `rawFacilities`.
 */
export function parseFacilitiesResponse(raw: RapidApiFacilitiesResponse): {
  facilities: string[];
  unavailableFlags: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const facilities: string[] = [];
  const unavailableFlags: string[] = [];
  const blocks = raw.facility_blocks ?? raw.facilities ?? [];
  for (const block of blocks) {
    if (!block?.facilities) continue;
    for (const f of block.facilities) {
      const name = asTrimString(f.name);
      if (!name) continue;
      if (asBool(f.available) === false) {
        unavailableFlags.push(name);
      } else {
        facilities.push(name);
      }
    }
  }
  return {
    facilities: dedupeStrings(facilities),
    unavailableFlags: dedupeStrings(unavailableFlags),
    warnings,
  };
}
