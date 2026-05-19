/**
 * RapidAPI Booking — defensive payload parser (v2 — live-validated).
 *
 * Translates raw booking-com15 envelopes (E0/E1/E2) into a `ParsedHotel`
 * with typed, validated, normalized values. The shape contract was
 * validated against live responses on 2026-05-19:
 *
 *   - Every response is wrapped: `{status, message, timestamp, data}`.
 *     Use `unwrapEnvelope()` before passing to the field parsers.
 *   - E1 hit is camelCase under `data.hotels[i].property` (id, name,
 *     propertyClass, accuratePropertyClass, reviewScore, photoUrls).
 *   - E2 detail is snake_case under `data` (hotel_name, address, city,
 *     district, zip, cc1, facilities_block, accommodation_type_name).
 *   - chain_name/chain_id/star/review_score/rooms/phone/email/website
 *     are NOT in E2 (verified on both branded NH Collection AND
 *     independent Hostel). Chain extraction is registry-driven; rooms/
 *     contact require fallback chain.
 *
 * The parser is lossy in one direction: malformed values become `null`
 * with a warning. Raw payloads remain in `hotel_source_record` for
 * audit.
 */

import type {
  BookingDualSource,
  BookingEnvelope,
  BookingFacilitiesData,
  BookingHotelDetailsData,
  BookingSearchHit,
  BookingSearchHitProperty,
} from "./types";

// ───────────────────────────────────────────────────────────────────────────
// ParsedHotel — the canonical-builder intermediate shape (unchanged from v1)
// ───────────────────────────────────────────────────────────────────────────

export interface ParsedHotel {
  bookingHotelId: string | null;
  name: string | null;
  legalName: string | null;
  nameTranslations: Record<string, string>;

  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  district: string | null;
  postalCode: string | null;
  countryCode: string | null;
  region: string | null;
  lat: number | null;
  lng: number | null;

  starRating: number | null;
  accommodationTypeName: string | null;
  accommodationTypeId: number | null;

  totalRooms: number | null;

  chainId: string | null;            // Booking does NOT expose this; always null Phase 1
  chainName: string | null;          // Same
  brand: string | null;              // Derived from hotel name via registry by mapper

  reviewScore: number | null;
  reviewCount: number | null;
  reviewScoreWord: string | null;

  bookingUrl: string | null;
  websiteUrl: string | null;         // Always null from booking-com15 — fallback required
  phone: string | null;              // Always null — fallback required
  email: string | null;              // Always null — fallback required

  mainPhotoUrl: string | null;       // Sourced from E1 property.photoUrls[0]

  rawFacilities: string[];

  isClosed: boolean;

  // Bonus institutional signals (branded properties get richer values)
  wifiReviewScore: number | null;
  breakfastReviewScore: number | null;
  isFamilyFriendly: boolean | null;

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
// Casts + validators
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
  if (v < -90 || v > 90) { warnings.push(`lat_out_of_range:${v}`); return null; }
  return Math.round(v * 1_000_000) / 1_000_000;
}

function validateLng(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  if (v < -180 || v > 180) { warnings.push(`lng_out_of_range:${v}`); return null; }
  return Math.round(v * 1_000_000) / 1_000_000;
}

function validateCountryCode(v: string | null, warnings: string[]): string | null {
  if (!v) return null;
  const cc = v.trim().toUpperCase();
  if (cc.length !== 2 || !/^[A-Z]{2}$/.test(cc)) {
    warnings.push(`country_code_invalid:${v}`); return null;
  }
  return cc;
}

function validateStarRating(v: number | null, warnings: string[]): number | null {
  if (v === null || v === 0) return null;   // 0 = unrated, not a 0-star hotel
  if (v < 1 || v > 5) { warnings.push(`star_out_of_range:${v}`); return null; }
  return Math.round(v);
}

function validatePostalCodeEs(v: string | null, warnings: string[], cc: string | null): string | null {
  if (!v) return null;
  if (cc === "ES" && !/^\d{5}$/.test(v.trim())) {
    warnings.push(`postal_code_invalid_es:${v}`); return null;
  }
  return v.trim();
}

function validateReviewScore(v: number | null, warnings: string[]): number | null {
  if (v === null) return null;
  if (v < 0 || v > 10) { warnings.push(`review_score_out_of_range:${v}`); return null; }
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
// Envelope unwrapper
// ───────────────────────────────────────────────────────────────────────────

/**
 * If the input looks like a booking-com15 envelope, return `data`.
 * If it looks like already-unwrapped detail, return it as-is.
 * If neither, return null.
 */
export function unwrapEnvelope<T>(input: BookingEnvelope<T> | T | null | undefined): T | null {
  if (input == null) return null;
  if (typeof input === "object" && input !== null && "data" in (input as object)) {
    const envelope = input as BookingEnvelope<T>;
    return (envelope.data as T) ?? null;
  }
  return input as T;
}

// ───────────────────────────────────────────────────────────────────────────
// Star tiebreaker (per architecture doc + live findings)
//
//   accuratePropertyClass > propertyClass > qualityClass
//
// All three can disagree; accuratePropertyClass is the verified-by-Booking
// rating, propertyClass is the operator-declared rating, qualityClass is
// Booking's internal quality estimate.
// ───────────────────────────────────────────────────────────────────────────

export function pickStarRating(property: BookingSearchHitProperty | null | undefined, warnings: string[]): number | null {
  if (!property) return null;
  const candidates = [property.accuratePropertyClass, property.propertyClass, property.qualityClass];
  for (const c of candidates) {
    const n = asInt(c);
    const validated = validateStarRating(n, warnings);
    if (validated !== null) return validated;
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────────────
// E1 hit parser
// ───────────────────────────────────────────────────────────────────────────

export function parseE1Hit(hit: BookingSearchHit | null | undefined): Partial<ParsedHotel> {
  const out: Partial<ParsedHotel> = { warnings: [] };
  if (!hit) return out;
  const warnings = out.warnings as string[];

  const p = hit.property;
  if (!p) return out;

  out.bookingHotelId = asString(p.id) ?? asString(hit.hotel_id);
  out.name = asTrimString(p.name);
  out.lat = validateLat(asFloat(p.latitude), warnings);
  out.lng = validateLng(asFloat(p.longitude), warnings);
  out.countryCode = validateCountryCode(asTrimString(p.countryCode), warnings);
  out.starRating = pickStarRating(p, warnings);
  out.reviewScore = validateReviewScore(asFloat(p.reviewScore), warnings);
  out.reviewCount = asInt(p.reviewCount);
  out.reviewScoreWord = asTrimString(p.reviewScoreWord);
  // Photo URLs come in 3 sizes; prefer square1024 (index 1) over square500 (index 0)
  if (Array.isArray(p.photoUrls) && p.photoUrls.length > 0) {
    out.mainPhotoUrl = asTrimString(p.photoUrls[1]) ?? asTrimString(p.photoUrls[0]);
  }
  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// E2 detail parser
// ───────────────────────────────────────────────────────────────────────────

export function parseE2Detail(detail: BookingHotelDetailsData | null | undefined): Partial<ParsedHotel> {
  const out: Partial<ParsedHotel> = { warnings: [] };
  if (!detail) return out;
  const warnings = out.warnings as string[];

  const countryCode = validateCountryCode(
    asTrimString(detail.cc1) ?? asTrimString(detail.countrycode) ?? asTrimString(detail.country_trans),
    warnings,
  );
  out.countryCode = countryCode;

  out.bookingHotelId = asString(detail.hotel_id);
  out.name = asTrimString(detail.hotel_name);
  out.nameTranslations = detail.hotel_name_trans
    ? { en: detail.hotel_name_trans }
    : {};
  out.addressLine1 = asTrimString(detail.address);
  out.city = asTrimString(detail.city_trans) ?? asTrimString(detail.city_name_en) ?? asTrimString(detail.city);
  out.district = asTrimString(detail.district);
  out.postalCode = validatePostalCodeEs(asTrimString(detail.zip), warnings, countryCode);
  out.region = asTrimString(detail.region);
  out.lat = validateLat(asFloat(detail.latitude), warnings);
  out.lng = validateLng(asFloat(detail.longitude), warnings);

  out.accommodationTypeName = asTrimString(detail.accommodation_type_name);
  out.bookingUrl = asTrimString(detail.url);
  out.isClosed = asBool(detail.is_closed);

  // E2 only carries review COUNT (review_nr) — review_score is in E1
  out.reviewCount = asInt(detail.review_nr);

  // Bonus signals
  if (detail.wifi_review_score?.rating != null) {
    out.wifiReviewScore = asFloat(detail.wifi_review_score.rating);
  }
  if (detail.breakfast_review_score?.rating != null || detail.breakfast_review_score?.review_score != null) {
    out.breakfastReviewScore = asFloat(detail.breakfast_review_score.rating ?? detail.breakfast_review_score.review_score);
  }
  if (detail.is_family_friendly != null) out.isFamilyFriendly = asBool(detail.is_family_friendly);

  // Facilities (granular bitmap source — primary amenity input)
  const facilityCandidates: Array<string | null | undefined> = [];
  if (detail.facilities_block?.facilities) {
    for (const f of detail.facilities_block.facilities) {
      if (f?.name) facilityCandidates.push(f.name);
    }
  }
  if (detail.aggregated_data?.common_kitchen_fac) {
    for (const f of detail.aggregated_data.common_kitchen_fac) {
      if (f?.name) facilityCandidates.push(f.name);
    }
  }
  if (Array.isArray(detail.family_facilities)) {
    facilityCandidates.push(...detail.family_facilities);
  }
  out.rawFacilities = dedupeStrings(facilityCandidates);

  // Fields booking-com15 does NOT carry — explicit nulls so downstream
  // knows fallback is required.
  out.chainName = null;
  out.chainId = null;
  out.brand = null;
  out.totalRooms = null;
  out.phone = null;
  out.email = null;
  out.websiteUrl = null;
  out.legalName = null;
  out.accommodationTypeId = null;

  return out;
}

// ───────────────────────────────────────────────────────────────────────────
// E3 facilities granular parser
// ───────────────────────────────────────────────────────────────────────────

export function parseFacilitiesResponse(raw: BookingFacilitiesData | null | undefined): {
  facilities: string[];
  unavailableFlags: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const facilities: string[] = [];
  const unavailableFlags: string[] = [];
  if (!raw) return { facilities, unavailableFlags, warnings };
  const blocks = raw.facility_blocks ?? raw.facilities ?? [];
  for (const block of blocks) {
    if (!block?.facilities) continue;
    for (const f of block.facilities) {
      const name = asTrimString(f.name);
      if (!name) continue;
      if (f.available === false || f.available === 0) {
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

// ───────────────────────────────────────────────────────────────────────────
// Dual-source merge (the new primary entry point)
// ───────────────────────────────────────────────────────────────────────────

/**
 * Merge E1 hit + E2 detail into a single `ParsedHotel`. E2 wins on
 * address/facilities/district fields; E1 wins on star/review/photo.
 * Overlap fields (lat/lng/countryCode/bookingHotelId/name) prefer E2
 * when present, else E1.
 */
export function parseHotelDualSource(source: BookingDualSource): ParseResult {
  const e1 = parseE1Hit(source.e1Hit);
  const e2 = parseE2Detail(source.e2Detail);
  const e3 = source.e3Facilities ? parseFacilitiesResponse(source.e3Facilities) : null;

  const warnings: string[] = [];
  if (Array.isArray(e1.warnings)) warnings.push(...e1.warnings);
  if (Array.isArray(e2.warnings)) warnings.push(...e2.warnings);
  if (e3?.warnings) warnings.push(...e3.warnings);

  // E2 wins on overlap when present
  const pick = <K extends keyof ParsedHotel>(k: K): ParsedHotel[K] => {
    const v2 = e2[k];
    if (v2 !== undefined && v2 !== null) return v2 as ParsedHotel[K];
    const v1 = e1[k];
    return (v1 ?? null) as ParsedHotel[K];
  };

  const allFacilities = dedupeStrings([
    ...(e2.rawFacilities ?? []),
    ...(e3?.facilities ?? []),
  ]);

  const parsed: ParsedHotel = {
    bookingHotelId: pick("bookingHotelId"),
    name:           pick("name"),
    legalName:      null,
    nameTranslations: e2.nameTranslations ?? e1.nameTranslations ?? {},

    addressLine1: pick("addressLine1"),
    addressLine2: null,
    city:         pick("city"),
    district:     pick("district"),
    postalCode:   pick("postalCode"),
    countryCode:  pick("countryCode"),
    region:       pick("region"),
    lat:          pick("lat"),
    lng:          pick("lng"),

    starRating:             pick("starRating"),        // E1 source typically
    accommodationTypeName:  pick("accommodationTypeName"),
    accommodationTypeId:    null,

    totalRooms: null,         // booking-com15 has neither
    chainId:    null,         // booking-com15 has neither
    chainName:  null,         // ditto
    brand:      null,         // derived from name by mapper (registry-driven)

    reviewScore:     e1.reviewScore ?? null,            // E1 only
    reviewCount:     pick("reviewCount"),
    reviewScoreWord: e1.reviewScoreWord ?? null,

    bookingUrl:   pick("bookingUrl"),
    websiteUrl:   null,
    phone:        null,
    email:        null,

    mainPhotoUrl: e1.mainPhotoUrl ?? null,              // E1 only

    rawFacilities: allFacilities,

    isClosed: e2.isClosed ?? false,

    wifiReviewScore:    e2.wifiReviewScore ?? null,
    breakfastReviewScore: e2.breakfastReviewScore ?? null,
    isFamilyFriendly:   e2.isFamilyFriendly ?? null,

    warnings,
  };

  const criticalGaps: string[] = [];
  for (const f of CRITICAL_FIELDS) {
    if (parsed[f] === null || parsed[f] === undefined) criticalGaps.push(f as string);
  }
  return { parsed, hasCriticalGaps: criticalGaps.length > 0, criticalGaps };
}

// ───────────────────────────────────────────────────────────────────────────
// Backwards-compat shim — legacy single-source parser
//
// Some existing call sites (orchestrator runner, dry-run, demo trace)
// invoke `parseHotelData(payload)` with a single object. The shim:
//   1. If `payload` is an envelope, unwrap to data.
//   2. Treat as E2 detail (snake_case).
//   3. Return parsed shape (missing star/review_score/photo unless the
//      caller also passes an E1 hit).
//
// New code should use `parseHotelDualSource({ e1Hit, e2Detail })`.
// ───────────────────────────────────────────────────────────────────────────

export function parseHotelData(raw: BookingHotelDetailsData | BookingEnvelope<BookingHotelDetailsData>): ParseResult {
  const detail = unwrapEnvelope<BookingHotelDetailsData>(raw as BookingEnvelope<BookingHotelDetailsData>);
  return parseHotelDualSource({ e2Detail: detail ?? null });
}
