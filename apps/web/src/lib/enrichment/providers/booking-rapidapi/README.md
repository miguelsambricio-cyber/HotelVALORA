# Booking RapidAPI Provider (dry-run · v1)

Phase 1 scaffold of the RapidAPI Booking provider client for HotelVALORA's hotel enrichment pipeline.

**Status:** dry-run + recorded-fixture modes implemented · live HTTP mode stubbed (throws) — Phase 3 work item.

## What this owns

- HTTP request shape for E0/E1/E2/E3 endpoints (paths + params + headers).
- Mode-aware client: `live` (Phase 3), `dry-run` (no-op for shape inspection), `recorded-fixture` (loads canned payloads).
- Typed defensive parser: every Booking field is optional; malformed values become null + warning.
- Mapping from parsed Booking payload to a `CanonicalHotelDraft` plus per-field provenance trail.
- Dry-run orchestrator that produces inspectable `DryRunReport` objects.

## What this does NOT own

- Rate limiting (worker layer, Phase 3+).
- Retry / backoff (worker layer, Phase 3+).
- Persistence to Supabase (writer layer, Phase 3+).
- Image binary download (image stage, Phase 3+).
- DLQ routing (orchestrator, Phase 3+).

## File layout

```
booking-rapidapi/
  types.ts              — typed response shapes for E0/E1/E2/E3
  config.ts             — env contract + loadConfig() + tier helpers
  client.ts             — mode-aware BookingRapidApiClient
  endpoints.ts          — typed endpoint wrappers (searchLocations, searchHotels, getHotelData, getHotelFacilities)
  parse.ts              — defensive payload parser (parseHotelData, parseFacilitiesResponse)
  map-to-canonical.ts   — parsed → CanonicalHotelDraft + ProvenanceEntry[]
  dry-run.ts            — runDryRun() orchestrator with TIER-0/1/2 counts
  fixtures/             — 3 representative Madrid hotel payloads + sample outputs
  index.ts              — barrel
  README.md             — this file
```

## How to run dry-run

```ts
import { runDryRun } from "@/lib/enrichment/providers/booking-rapidapi";
import ritz from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-ritz-by-belmond.json";
import nh from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-nh-collection-eurobuilding.json";
import ibis from "@/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-ibis-centro-las-ventas.json";

const out = runDryRun({
  fixtures: [
    { label: "ritz-by-belmond-madrid", e2: ritz },
    { label: "nh-collection-eurobuilding", e2: nh },
    { label: "ibis-centro-las-ventas",    e2: ibis },
  ],
});

console.log(JSON.stringify(out, null, 2));
```

Or via the runnable script:

```bash
# From repo root (apps/web)
pnpm tsx apps/web/scripts/enrichment-booking-dry-run.ts
```

## Confidence floor (Phase 1, Booking-only)

| Field shape | Confidence | Why |
|---|---|---|
| Self-authoritative (booking_hotel_id, booking_url) | 1.00 | The ID is the truth |
| Validated structural fields (cc1, postal_code, lat/lng) | 0.85–0.95 | Tier A × validation pass |
| Standard fields (name, address, star, phone, photo, brand, …) | 0.85 | Tier A baseline |
| Counts (review_count) | 0.90 | Verifiable, higher floor |
| Derivations (segment, region) | 0.70–0.85 | Heuristic / lower trust |
| Registry-driven (brand_family, chain_scale, city_normalized) | 0.85–0.95 | Deterministic if registry matches |

These can be raised by Phase E fallback corroboration (agreement bonus up to +0.25 per main doc §3.1).

## Confidence floor (Phase 1, Booking-only) — Madrid expected coverage

A typical Madrid Booking-indexed hotel coming out of this pipeline will see:

| Tier | Filled / Total | Notes |
|---|---|---|
| TIER-0 | 8 / 8 | All mandatory fields populated when Booking returns valid lat/lng |
| TIER-1 | 11–12 / 12 | Star, segment, type, reviews, status all populated; amenities ≥ 5 keys |
| TIER-2 | 8–12 / 19 | brand, brand_family, chain_scale, address, postal, neighborhood, photo, phone — but **missing**: operator_id, operator_type, room_type_mix, meeting fields, year_opened, google_place_id, market/submarket IDs |
| TIER-3 | sparse | gallery (deferred), year_renovated, legal_name, email, cross-IDs |

This confirms the Booking-only ceiling around **8–12 of 19 TIER-2 fields (~42-63%)** — below the 80% goal. Fallback dispatch is mandatory in Phase E.

## Switching to live mode (Phase 3+)

1. Provision env vars (see `config.ts`).
2. Implement `BookingRapidApiClient.executeLive` (currently throws).
3. Add rate-limit middleware (token bucket per provider, reads `rate_limit_state` table).
4. Add retry/backoff middleware (per error class, see sidecar §6).
5. Add writer middleware (persist `hotel_source_record` + canonical mutation pipeline).
6. Add DLQ on terminal failures.

Each of these is a separate, gated PR. None happens without operator sign-off on this dry-run.
