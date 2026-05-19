# Enrichment Providers

Source adapters for the canonical hotel pipeline. Each provider follows the same institutional shape: `types.ts` for response shapes, a mode-aware client, parser, mapper to canonical, and a README.

## Hierarchy (institutional fallback chain)

| Order | Provider | Tier | Role | Discipline |
|---|---|---|---|---|
| 1 | `booking-rapidapi/` | A (0.85) | **Primary** — broad coverage in one call | Subscription, daily/monthly budget guards |
| 2 | `google-places/` | C (0.70) | First fallback for geo, phone, address, place_id | Per-call cost discipline, field-mask |
| 3 | `hotel-website/` | B (0.80) | Second fallback for year_opened, legal_name, MICE | **HEAD-only · robots.txt · per-domain authorisation · 4–8s jitter** |
| 4 | `wikidata/` | F (0.50) | Last fallback for institutional knowledge graph | 1 req/s · batched SPARQL · public endpoint, no cost |

## Phase 1 vs Phase 4+

| Provider | Phase 1 (now) | Phase 4+ (live) |
|---|---|---|
| Booking | Dry-run + recorded-fixture · live throws | Phase B operator gate · then live RapidAPI calls |
| Google Places | Dry-run · live throws | Per-call cost monitoring, monthly budget guard |
| Hotel website | Dry-run · per-domain authorisation list empty | Authorisation list grows per-domain with operator opt-in |
| Wikidata | Dry-run | 1 req/s public endpoint, structured UA |

## Cross-provider invariants

All providers honor:

1. **Mode-aware execution.** `live | dry-run | recorded-fixture`. Live mode is gated behind explicit throws until Phase 4+ implementation lands.
2. **Source key consistency.** The `source` string is stable across publishers (e.g., switching the RapidAPI Booking publisher does NOT change `booking_rapidapi` as the source key downstream).
3. **Per-field confidence floors.** Each mapper emits `provenance` entries with calibrated confidence per architecture doc §3.1. The aggregator at the orchestrator level produces the final field confidence.
4. **Defensive parsing.** Every field is optional in the response; malformed values are dropped with a warning rather than crashing.
5. **No silent overwrite.** All output flows through the confidence-aware conflict resolver. Disagreements route to the review queue.

## What providers do NOT do

- They do not persist anything. Persistence is the writer's job.
- They do not own dedup logic. Dedup runs on the parsed/mapped output via the dedup engine.
- They do not enforce rate limits. The worker layer (Phase 3+) reads `rate_limit_state` and gates concurrency before invoking providers.
- They do not handle retry. Retry policy lives in the orchestrator.

## Adding a new provider

Drop a sibling directory next to `booking-rapidapi/`. Implement the same 5 files: `types.ts`, `client.ts`, `parse.ts` (if HTTP) or `map-to-canonical.ts` directly, `index.ts`, `README.md`. Wire into `orchestrator/fallback-dispatcher.ts`'s `FIELD_TO_FALLBACK` map if it owns specific canonical fields.
