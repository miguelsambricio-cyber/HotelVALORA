/**
 * Fallback dispatcher (v1).
 *
 * Consumes a `JobExecutionResult` and emits the next round of
 * `EnrichmentJob` entries targeted at fallback providers. Only fields
 * that are (a) missing or (b) below TIER-2 confidence threshold get
 * fallback-dispatched.
 *
 * Field-authority map (architecture doc §2.2, codified here):
 *
 *   lat, lng, geo                → google_places  (Tier C, geo strength)
 *   phone, postal_code, address  → google_places
 *   google_place_id              → google_places
 *   year_opened, legal_name      → hotel_website  (Tier B)
 *   meeting_space_sqm            → hotel_website
 *   operator (clarification)     → hotel_website
 *   email                        → hotel_website
 *   year_renovated_last          → hotel_website
 *   wikidata_qid, ownership      → wikidata       (Tier F)
 *   year_opened (confirmation)   → wikidata (corroboration)
 *
 * Discipline:
 *   - Each fallback job carries an explicit `targetFields` list so
 *     the provider knows what to fetch (and ONLY that).
 *   - Priority lane defaults: P3 for new discovery, P4 for critical
 *     gap, P5 for stale refresh. The dispatcher emits at P4 — the
 *     candidate row already exists, missing fields block institutional
 *     coverage.
 *   - No mass scraping. The hotel_website provider is HEAD-only +
 *     robots.txt compliant by construction.
 */

import type {
  EnrichmentJob,
  JobExecutionResult,
} from "./types";
import type { SourceKey } from "../confidence/tier-registry";

// ───────────────────────────────────────────────────────────────────────────
// Field → preferred fallback source
// ───────────────────────────────────────────────────────────────────────────

const FIELD_TO_FALLBACK: Readonly<Record<string, SourceKey>> = Object.freeze({
  lat:                  "google_places",
  lng:                  "google_places",
  phone:                "google_places",
  postal_code:          "google_places",
  address_line1:        "google_places",
  neighborhood:         "google_places",
  google_place_id:      "google_places",

  year_opened:          "hotel_website",
  year_renovated_last:  "hotel_website",
  legal_name:           "hotel_website",
  meeting_space_sqm:    "hotel_website",
  meeting_rooms_count:  "hotel_website",
  email:                "hotel_website",
  website_url:          "hotel_website",
  room_type_mix:        "hotel_website",
  operator_type:        "hotel_website",

  wikidata_qid:         "wikidata",
  ownership_structure:  "wikidata",
});

/**
 * The full set of TIER-2 fields the institutional 80% target depends on.
 * Used to short-circuit dispatch: only missing TIER-2 fields trigger
 * fallback. TIER-0/T1 missing fields cause quarantine, not fallback.
 */
const TIER_2_FIELDS: ReadonlySet<string> = new Set([
  "brand", "brand_family", "chain_scale",
  "operator_id", "operator_type",
  "amenities", // composite — never directly fetched via fallback
  "address_line1", "postal_code", "neighborhood",
  "room_type_mix", "meeting_rooms_count", "meeting_space_sqm",
  "year_opened",
  "hero_image_path",
  "website_url", "phone",
  "google_place_id",
  "market_id", "submarket_id",
]);

// ───────────────────────────────────────────────────────────────────────────
// Dispatch result
// ───────────────────────────────────────────────────────────────────────────

export interface DispatchedFallback {
  provider: SourceKey;
  targetFields: string[];
  reason: string;
}

export interface FallbackDispatchOutput {
  hotelId: string | null;
  dispatched: DispatchedFallback[];
  jobs: EnrichmentJob[];
  /** Fields that are missing but no fallback provider is registered. */
  unrouted: string[];
}

// ───────────────────────────────────────────────────────────────────────────
// Inspect draft and determine which TIER-2 fields are still gaps
// ───────────────────────────────────────────────────────────────────────────

function missingTier2Fields(result: JobExecutionResult): string[] {
  const missing: string[] = [];
  const d = result.draft;
  if (!d) return missing;

  // The list below mirrors TIER-2 in the coverage targets doc §4.
  // Each entry asks: is this slot empty or under-determined?
  const checks: Array<[string, boolean]> = [
    ["brand", d.brand == null],
    ["brand_family", d.brand_family == null],
    ["chain_scale", d.chain_scale === "unknown"],
    // operator_id and operator_type — Booking does not populate, always missing Phase 1
    ["operator_type", true],
    ["address_line1", d.address_line1 == null],
    ["postal_code", d.postal_code == null],
    ["neighborhood", d.neighborhood == null],
    ["room_type_mix", true], // never from Booking Phase 1
    ["meeting_rooms_count", true],
    ["meeting_space_sqm", true],
    ["year_opened", true], // Booking E2 rarely returns this
    ["hero_image_path", d.hero_image_path == null],
    ["website_url", d.website_url == null],
    ["phone", d.phone == null],
    ["google_place_id", true], // always fetched via Google Places fallback
  ];
  for (const [field, isMissing] of checks) {
    if (isMissing && TIER_2_FIELDS.has(field)) missing.push(field);
  }
  return missing;
}

// ───────────────────────────────────────────────────────────────────────────
// Public entry point
// ───────────────────────────────────────────────────────────────────────────

export interface DispatchFallbackOptions {
  /** Now-clock for deterministic test replay. */
  now?: () => Date;
  /** Caller-supplied prefix for job ids (e.g., "fallback:"). */
  jobIdPrefix?: string;
  /** Override default priority (4). */
  priority?: number;
}

export function dispatchFallback(
  result: JobExecutionResult,
  opts: DispatchFallbackOptions = {},
): FallbackDispatchOutput {
  const now = opts.now ? opts.now() : new Date();
  const priority = opts.priority ?? 4;
  const prefix = opts.jobIdPrefix ?? "fallback";
  const hotelId = result.draft?.booking_hotel_id ?? null;

  if (result.outcome === "routed_to_dlq" || result.outcome === "circuit_breaker_open") {
    return { hotelId, dispatched: [], jobs: [], unrouted: [] };
  }

  // Identify the missing TIER-2 fields
  const missing = missingTier2Fields(result);

  // Group missing fields by their preferred fallback source
  const byProvider = new Map<SourceKey, string[]>();
  const unrouted: string[] = [];
  for (const field of missing) {
    const provider = FIELD_TO_FALLBACK[field];
    if (!provider) {
      unrouted.push(field);
      continue;
    }
    if (!byProvider.has(provider)) byProvider.set(provider, []);
    byProvider.get(provider)!.push(field);
  }

  const dispatched: DispatchedFallback[] = [];
  const jobs: EnrichmentJob[] = [];

  for (const [provider, fields] of byProvider) {
    dispatched.push({
      provider,
      targetFields: fields,
      reason: `tier2_gap_count:${fields.length}`,
    });
    jobs.push({
      id: `${prefix}:${result.job.id}:${provider}`,
      type: "fallback_dispatch",
      source: provider,
      hotelId,
      priority,
      scheduledFor: now,
      attemptCount: 0,
      dedupKey: `${provider}::${hotelId ?? "unknown"}::${now.toISOString().slice(0, 10)}`,
      params: {
        parentJobId: result.job.id,
        targetFields: fields,
        candidate: {
          name: result.draft?.canonical_name ?? null,
          city: result.draft?.city_normalized ?? null,
          countryCode: result.draft?.country_code ?? null,
          lat: result.draft?.lat ?? null,
          lng: result.draft?.lng ?? null,
          bookingHotelId: result.draft?.booking_hotel_id ?? null,
        },
      },
      createdAt: now,
    });
  }

  return { hotelId, dispatched, jobs, unrouted };
}
