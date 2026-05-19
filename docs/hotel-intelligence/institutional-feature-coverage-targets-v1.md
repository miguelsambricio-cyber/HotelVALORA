# Institutional Feature Coverage Targets — v1

**Workstream:** `feature/hotel-enrichment-pipeline`.
**Status:** Operational target — drives the 80% Madrid enrichment goal.
**Companion to:** [`madrid-enrichment-architecture-v1.md`](./madrid-enrichment-architecture-v1.md) (canonical schema lives there).
**Goal stated by operator:** "≈ 80% of the features needed for HotelVALORA institutional reports."

This document operationalises what "80%" means. Without a concrete field-by-field target, "80%" is rhetoric. With it, we can measure, gate, and report progress.

---

## 1 · The four tiers

Each canonical field is classified into exactly one tier. Tiers stack — TIER-2 includes TIER-1 includes TIER-0.

| Tier | Meaning | Pipeline policy |
|---|---|---|
| **TIER-0 — Mandatory** | Row cannot enter `hotel_canonical` without these. If any TIER-0 is missing or fails validation → row goes to quarantine, **never to canonical**. | Pipeline rejects insert; logs to DLQ. |
| **TIER-1 — Institutional Minimum** | Floor for any report surface to render the hotel at all. Library list rendering, Executive Summary, CompSet matching all require TIER-1 complete. | `quality_tier = bronze` requires ≥ 90% TIER-1 at conf ≥ 0.70. |
| **TIER-2 — Institutional 80% Target** | The headline workstream metric. Full institutional report quality. | **Goal:** ≥ 80% of TIER-2 fields populated at conf ≥ 0.70, across ≥ 70% of Madrid hotels. |
| **TIER-3 — Nice-to-have** | Above 80%. Drives premium analysis (full gallery, location highlights, cross-source IDs for CoStar/STR linkage). | Best-effort; not gated. |

The **80% target metric** is computed as:

```
madrid_t2_coverage =
    (count of TIER-2 fields populated at conf ≥ 0.70, across all non-quarantined Madrid hotels)
  / (count of TIER-2 fields × count of non-quarantined Madrid hotels)
```

Workstream goal: `madrid_t2_coverage ≥ 0.80`.

A secondary metric tracks **per-hotel coverage distribution** (what % of hotels are at ≥80% themselves) — see [`coverage-measurement-spec-v1.md`](./coverage-measurement-spec-v1.md).

---

## 2 · TIER-0 — Mandatory (8 fields)

| # | Canonical field | Validation | Why mandatory |
|---|---|---|---|
| 1 | `booking_hotel_id` | non-null string from Booking | Self-identity; prevents duplicates across sweeps |
| 2 | `canonical_name` | non-null, normalized | No nameless rows; everything keys off it |
| 3 | `city` | non-null after normalize | Required by every aggregation |
| 4 | `city_normalized` | non-null, derived via Madrid alias table | Stable join key for market views |
| 5 | `country_code` | ISO-3166-1 alpha-2, exactly 2 chars | Required by every market query |
| 6 | `lat` | numeric, -90..90, 6dp | Geo joins, CompSet radius, map rendering |
| 7 | `lng` | numeric, -180..180, 6dp | Same |
| 8 | `geom` | derived geography(POINT,4326), non-null | GIST index lookups |

**Quarantine rule:** any null OR validation failure on TIER-0 → `quality_tier = quarantined`. Row is preserved in `hotel_canonical` for audit but excluded from every consuming surface (Library, Reports, CompSet, Match Engine) until repaired.

---

## 3 · TIER-1 — Institutional Minimum (12 fields)

Required for the hotel to render in any institutional surface.

| # | Canonical field | Confidence floor | Primary source | Notes |
|---|---|---|---|---|
| 9 | `star_rating` | 0.70 | E2 Booking | 1–5 integer |
| 10 | `total_rooms` | 0.70 | E2 Booking → fallback chain | Often missing → fallback critical |
| 11 | `segment` | 0.70 | derived from star_rating + brand_family | Uses existing `hotel_segment` enum (migration 0006) |
| 12 | `hotel_type` | 0.70 | E2 Booking `accommodation_type_id` → registry map | hotel / aparthotel / resort / boutique / airport / extended_stay / flex_living |
| 13 | `amenities` ≥ 5 of 14 keys explicitly determined (true OR false) | 0.70 per key | E2 + E3 Booking | Canonical 14-key bitmap; "unknown" counts as not-determined |
| 14 | `review_score` | 0.70 | E2 Booking | 0–10 normalised; Booking-only Phase 1 |
| 15 | `review_count` | 0.80 | E2 Booking | Count is verifiable, higher floor |
| 16 | `booking_url` | 1.00 | E2 Booking `url` | Self-authoritative |
| 17 | `primary_source` | 1.00 | constant `"booking_rapidapi"` for Madrid Phase 1 | |
| 18 | `data_quality_tier` | derived | computed post-enrichment | bronze / silver / gold / quarantined |
| 19 | `status` | 1.00 | E2 Booking `is_closed` flag | active / closed / under_construction / planned / unverified |
| 20 | `enrichment_version` | 1.00 | starts at 1 | Increments on every successful run that mutates canonical |

**Bronze threshold:** ≥ 90% of TIER-1 fields populated at conf ≥ 0.70.

---

## 4 · TIER-2 — Institutional 80% Target (19 fields)

The headline metric. Every field below counts equally in the 80% calculation.

| # | Canonical field | Confidence floor | Primary source | Fallback chain |
|---|---|---|---|---|
| 21 | `brand` | 0.75 | E2 Booking `chain_name` → brand registry | Wikidata (F) |
| 22 | `brand_family` | 0.80 (derived deterministic) | derived via brand → brand_family lookup | n/a (registry-driven) |
| 23 | `chain_scale` | 0.75 (derived deterministic) | derived via brand_family → scale lookup | star-rating heuristic |
| 24 | `operator_id` | 0.70 | FK to existing `public.operators(id)` (migration 0006) via slug match | Manual curator override |
| 25 | `operator_type` | 0.70 | E2 (rare) → Wikidata → registry inference | unknown if undetermined |
| 26 | `amenities` ALL 14 keys explicitly determined | 0.70 per key | E2 + E3 Booking | Tripadvisor (D) → hotel website (B) |
| 27 | `address_line1` | 0.75 | E2 Booking `address` | Google Places (C) |
| 28 | `postal_code` | 0.85 (validated `^\d{5}$` for ES) | E2 Booking `zip` | Google Places |
| 29 | `neighborhood` | 0.70 | E2 Booking `district` | Google Places `neighborhood` |
| 30 | `room_type_mix` | 0.65 | E2/E3 Booking (when granular available) | E8 room-list (deferred) |
| 31 | `meeting_rooms_count` | 0.70 | E3 Booking facility flags | Hotel website (B) |
| 32 | `meeting_space_sqm` | 0.65 | Hotel website (B) | E3 inference |
| 33 | `year_opened` | 0.65 | Wikidata (F) → Hotel website (B) | E2 rarely returns this |
| 34 | `hero_image_path` | 0.80 | E4 Booking first photo OR E2 `main_photo_url` | Hotel website hero |
| 35 | `website_url` | 0.70 | Hotel website discovery (B) | E2 Booking `url` (often listing URL — lower confidence) |
| 36 | `phone` | 0.75 | E2 Booking → E164 normalise | Google Places |
| 37 | `google_place_id` | 1.00 | Google Places resolution call | Self-authoritative |
| 38 | `market_id` | 0.85 (deterministic FK derivation) | derived from `city_normalized` + geo → CoStar markets | Manual curator |
| 39 | `submarket_id` | 0.80 (deterministic FK derivation) | derived from geo + neighborhood → CoStar submarkets | Manual curator |

**Silver threshold:** ≥ 60% TIER-2 fields at conf ≥ 0.70 (and TIER-1 complete).
**Gold threshold:** ≥ 85% TIER-2 fields at conf ≥ 0.80 AND ≥ 2 independent sources corroborating any 3 fields.

---

## 5 · TIER-3 — Nice-to-have (above 80%)

Not gated. Drives premium analysis. Not counted in headline coverage metric.

| Canonical field | Source | Notes |
|---|---|---|
| `gallery_paths` (full, ≥ 5 photos) | E4 Booking | Phase 3+ download |
| `year_renovated_last` | Wikidata / Hotel website | Sparse |
| `legal_name` | Hotel website / Registry | Distinct from canonical only ~10% of cases |
| `email` | Hotel website | MX-validated |
| `tripadvisor_id` | TA cross-link | Phase 3+ |
| `expedia_id` | Expedia cross-link | Phase 4+ |
| `str_property_id` | STR feed | When STR contracted |
| `costar_property_id` | CoStar match | Manual curator + fuzzy |
| `wikidata_qid` | Wikidata cross-link | SPARQL pass |
| `osm_id` | OSM cross-link | OSM Overpass pass |
| `region` | E2 / Google Places | Spain: "Comunidad de Madrid" |
| `ownership_structure` | Wikidata / Registry | Sparse, sometimes inferred |
| `meeting_rooms_count > 0` AND `meeting_space_sqm` known | Hotel website | Drives MICE positioning analysis |
| `room_type_mix` (granular ≥ 4 categories) | E8 / Hotel website | Drives ADR sensitivity |
| `address_line2` | E2 Booking | Optional locality detail |

---

## 6 · Per-report-surface field demand

Cross-reference: which report surface consumes which canonical fields. Drives prioritisation when multiple report surfaces compete for incomplete data.

| Surface | TIER-0 required | TIER-1 required | TIER-2 required (for full quality) | TIER-3 enhances |
|---|---|---|---|---|
| **Library institutional table** (39/40 cols — `apps/web/src/components/library/favorites-table.tsx`) | All 8 | All 12 | 21,22,23,26,27,29,34,35,36,38,39 | gallery, year_renovated, email |
| **Executive Summary** | All 8 | 9,10,11,12,16,17 | 21,22,23,33,34 | — |
| **Asset Analysis · Hotel personalizado** | All 8 | All 12 (esp. 13 amenities full) | All TIER-2 | gallery, year_renovated, room_type_mix granular |
| **Asset Analysis · CAPEX & Renders** | All 8 | 12 (hotel_type), 11 (segment) | 23 (chain_scale drives default CAPEX) | gallery |
| **Competitive Set** | All 8 | 9, 10, 11, 16 | 21, 22, 23, 26, 38 | — |
| **Market Overview** | All 8 | 11, 12 | 22 (brand_family), 23, 26, 38, 39 | — |
| **Financials (planned)** | All 8 | 10 (rooms), 11 (segment) | 30 (room_type_mix), 31, 32 (MICE) | — |
| **Match Engine 🟢🟡🔴** | All 8 | All 12 | All TIER-2 except 32 | — |

**Implication:** TIER-2 = 19 fields, all explicitly demanded by ≥ 1 institutional surface. None of them is "decorative".

---

## 7 · 80% Coverage decomposition

Maximum possible TIER-2 score per hotel = 19 fields.
80% of 19 = **15.2 → round up to 16 fields populated at conf ≥ 0.70**.

So per-hotel passing condition for the institutional 80% target:

```
hotel passes if:
  TIER-0 complete (8/8)
  AND TIER-1 ≥ 11/12 at conf ≥ 0.70 (≈ 92%)
  AND TIER-2 ≥ 16/19 at conf ≥ 0.70 (≈ 84%)
```

**Madrid-level passing condition:**

```
≥ 70% of non-quarantined Madrid hotels pass the per-hotel condition
```

70% of ~1,800 Madrid hotels ≈ **1,260 hotels at institutional 80% coverage**.

This is the operational target the pipeline must drive toward.

---

## 8 · Source allocation toward the target

How each tier of source contributes (cross-references main doc §2 source hierarchy):

| Source | Drives TIER-0 | Drives TIER-1 | Drives TIER-2 | Drives TIER-3 |
|---|---|---|---|---|
| Booking RapidAPI E2 + E3 | 7/8 (lat,lng,city,country,name,booking_id; geom derived) | 11/12 (all but operator_id) | 13/19 (brand, scale, amenities, address, postal, neighborhood, hero, phone, partial others) | photos, partial |
| Google Places (fallback) | reinforces lat/lng/city/postal | reinforces phone | google_place_id, phone, postal_code, address | reviews snapshot |
| Hotel website (fallback) | — | — | year_opened, legal_name, meeting_space_sqm, website_url, operator | email |
| Tripadvisor (fallback Phase 3+) | — | — | amenities corroboration | tripadvisor_id |
| Wikidata SPARQL (fallback) | — | — | year_opened, operator inference, ownership | wikidata_qid, region |
| Manual curator | always wins | always wins | always wins | always wins |

**Phase 1 single-source ceiling (Booking only):** ~70% TIER-2 per hotel on average. This is short of 80% — fallback chain is **mandatory** to hit goal.

**Phase 2 estimated reach with Booking + Google Places fallback:** ~78% TIER-2 per hotel on average.

**Phase 3 estimated reach with full fallback chain (Google + website + Wikidata):** ~85–90% TIER-2 per hotel — at 70% Madrid passing rate, comfortably above the 80% target.

---

## 9 · Confidence calibration policy

The 80% target uses conf ≥ 0.70 as the threshold. Rationale:

- 0.70 is one notch below the existing `/review` low-confidence boundary (0.65 → enters review queue) — it represents data confident enough to surface in institutional reports but not yet "auto-merge" quality.
- For TIER-1 fields, 0.70 is the rendering floor.
- For TIER-2, 0.70 is the institutional-quality floor.
- 0.80+ is the "trust this without flag" threshold — drives gold quality tier.
- 0.92+ is the auto-merge threshold (per main doc §3.4).

A field present but at conf < 0.70 does **not count** toward the 80% target. Quantity without quality does not pass.

---

## 10 · Decisions taken under autonomy (assumptions to flag)

These are reasonable defaults chosen without operator review. Documented per operating principle "document assumptions". Escalation only if any of these turn out to materially diverge from operator intent.

1. **TIER-2 = 19 fields, all weighted equally.** A weighted scheme (e.g., amenities count 2×) was considered and rejected as Phase 1 over-engineering. Re-visit at Phase 5 (Library integration) if specific fields turn out to drive disproportionate report value.
2. **Madrid passing target = 70% of hotels at ≥80% TIER-2.** Operator stated "approximately 80%" coverage; 70%×80% interpreted as the operational realisation. If operator means "100% of hotels at 80%", target shifts dramatically — flag if so.
3. **Quarantined hotels excluded from denominator.** A hotel missing TIER-0 (e.g., no geo) is structurally unfit for institutional reports; counting it in the denominator would penalise the pipeline for cases it cannot remediate without source quality improvement.
4. **`hotel_segment` enum reused for both `segment` AND `chain_scale` columns.** Avoids enum proliferation; existing enum from migration 0006 has the required values (`luxury`, `upper_upscale`, `upscale`, `upper_midscale`, `midscale`, `economy`, `lifestyle`, `resort`, `boutique`, `mixed_use`, `serviced_apartments`, `unknown`).
5. **`operator_id` FK to existing `public.operators`.** Avoids duplicate operator table. Brand registry resolves to existing `operators.slug` via slug match; missing operators are created (insert-if-not-exists) by the pipeline rather than maintained separately.
6. **Booking-only confidence ceiling ≈ 70% TIER-2.** Means the fallback chain is mandatory before the workstream can declare success. Phase 1 doc-only milestone does not breach this; Phase 2 implementation must include at minimum Google Places fallback to reach the target.

---

## 11 · What this doc does NOT do

- Does NOT define the schema (lives in main arch doc §1 + migration `0024_hotel_enrichment_schema.sql`).
- Does NOT define the confidence formula (lives in main arch doc §3).
- Does NOT define the dedup scoring (lives in main arch doc §4).
- Does NOT define provider-specific call counts or cost (lives in RapidAPI sidecar).
- Does NOT modify any underwriting, report-system, or synchronization surface.

---

## 12 · Forward references

| Future doc | Will live at | Purpose |
|---|---|---|
| Coverage measurement spec | `docs/hotel-intelligence/coverage-measurement-spec-v1.md` | SQL views, queries, dashboard wiring |
| Migration DDL | `docs/database/migrations/0024_hotel_enrichment_schema.sql` | Schema realisation |
| Canonical registries | `apps/web/src/lib/enrichment/registries/` | Brand, amenity, municipio, hotel-type lookups |
| Madrid bootstrap plan | `docs/hotel-intelligence/madrid-bootstrap-plan-v1.md` | Phase-2 execution sequencing |
| Coverage dashboard route | `apps/web/src/app/dev/hotel-enrichment-coverage/` | Operator-facing coverage view (Phase 3+) |
