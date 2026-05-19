# Phase D Enrichment — Completion Report v1

**Workstream:** `feature/hotel-enrichment-pipeline`
**Date:** 2026-05-19
**Scope:** Madrid 224-hotel canonical corpus · post-pilot uplift via Google Places + Wikidata + operator linkage

Companion to:
- [`phase-d3-extended-sweep-report-v1.md`](./phase-d3-extended-sweep-report-v1.md) — preceding 224-hotel sweep
- [`coverage-measurement-spec-v1.md`](./coverage-measurement-spec-v1.md) — coverage views spec applied here

---

## 1 · Headline metrics (Madrid · post Phase D-2 + D-6 + D-7)

| Metric | Pre-D2 | Post-D7 |
|---|---|---|
| Hotels total | 224 | 224 |
| Gold tier | 0 | **109** (48.7%) |
| Silver tier | 55 | 2 |
| Bronze tier | 169 | 113 |
| Quarantined | 0 | 0 |
| `google_place_id` filled | 0 | 218 (97.3%) |
| `phone` filled | ~0 | 209 (93.3%) |
| `website_url` filled | ~0 | 216 (96.4%) |
| `operator_id` linked | 0 | 111 (100% of branded) |
| `wikidata_qid` filled | 0 | _filled by D-7_ |
| T1 passing (≥11/12) | — | 57 |
| T2 passing (≥16/19) | — | 0 (structural blockers remain) |
| avg T1 % | — | 85.4% |
| avg T2 % | — | 55.6% |
| Institutional passing rate | — | 0% (goal 70%) |

---

## 2 · What shipped this phase

### D-2 · Google Places fallback (Madrid 224)

- New script `apps/web/scripts/phase-d2-google-places-fallback.mjs` (Places API New v1, `searchText`).
- Field mask: `places.id,displayName,formattedAddress,addressComponents,location,internationalPhoneNumber,websiteUri,rating,userRatingCount,types,businessStatus`.
- Match scorer: haversine ≤ 200 m for geo agreement + name overlap.
- Results: 219/224 matched (97.8%), 210 phone, 217 website, 215 geo-agree.
- Applied via 2× compact UPDATE FROM VALUES batches (MCP `execute_sql` payload limit).
- Tier promotion rule applied in same UPDATE: `gold` IFF (geo_agree ∧ phone ∧ brand_family).
- One duplicate `place_id` collision detected and surfaced to dedup queue: Booking IDs `94455` ↔ `243091` both map to the same physical AC Hotel Atocha.

### D-4 · Coverage views applied

- `public.hotel_coverage_v` — per-hotel T0/T1/T2 fill counts.
- `public.hotel_coverage_scored_v` — adds `_pct`, `_passing` flags, `institutional_passing`.
- `public.hotel_coverage_market_v` — per-(country, city) aggregate + `institutional_passing_rate`.
- `public.hotel_coverage_madrid_v` — single-row Madrid headline with `goal_reached` boolean.
- Pragmatic adaptation: views use `hotel_canonical` columns directly (not `hotel_field_provenance`) since D-1 backfill not yet executed. Switch to provenance lookup once D-1 ships.

### D-6 · Operators FK linkage

- Operators table already seeded (30 chain rows from earlier infra).
- One UPDATE: `hotel_canonical.operator_id = operators.id WHERE brand_family = operators.name AND operator_id IS NULL`.
- Result: 111/111 branded hotels linked. 113 indie/no-brand remain `operator_id IS NULL` (correct).
- Source confidence updated: `operator_id` 0.90 via registry lookup.

### D-7 · Wikidata SPARQL enrichment

- New script `apps/web/scripts/phase-d7-wikidata-enrichment.mjs`.
- Per-hotel SPARQL with `mwapi:EntitySearch` + hotel/building type filter (Q27686, Q41176, Q1248784, Q3490264) + geo distance scoring.
- Rate limit: 1.1 req/s; runtime ~2.1 min for 111 branded Madrid hotels.
- Properties harvested: P571 inception → `year_opened`; P1106 maximum capacity → `total_rooms`; P856 → `website_url`; QID → `wikidata_qid`.
- Embedded input data inside the script (single-file deliverable) to survive OneDrive sync churn that lost the prior split input/script artifacts.

---

## 3 · Structural blockers identified post-Phase D-7

Even after Booking E2 + Google Places + Wikidata, the following T2 fields remain ≤ 5 % populated for Madrid:

| Field | Coverage | Why structural |
|---|---|---|
| `total_rooms` | < 5 % | Booking E2 does not expose; Wikidata P1106 rarely populated for Spain |
| `year_opened` | < 10 % | Wikidata P571 rarely populated for Spanish hotels; Booking absent |
| `meeting_rooms_count` | 0 % | Only available on the hotel website (D-8 gated) |
| `meeting_space_sqm` | 0 % | Same as above |
| `room_type_mix` | 0 % | Booking E3 facilities not yet parsed (D-5 — pending schema decision) |
| `market_id` / `submarket_id` | 0 % | Needs PostGIS market-boundary polygons (separate workstream) |
| `email` | 0 % | Rare in public sources; needs hotel-website (D-8 gated) |

The **80 % institutional coverage goal cannot be reached** without either:

1. Operator authorization for **D-8 hotel-website HEAD-only fallback** (per-domain allowlist) for `total_rooms` and `year_opened`, OR
2. A separate Madrid market/submarket geometry workstream (PostGIS-based assignment of `market_id`/`submarket_id`), OR
3. Schema change to count populated registry-derived fields differently (e.g. lowering the T2 threshold from 16/19 to 13/19).

---

## 4 · Open items / next steps

| # | Item | Status | Notes |
|---|---|---|---|
| D-1 | Provenance backfill (`hotel_source_record` + `hotel_field_provenance`) | Pending | Can be done from `canonical-rows.json` (Booking) + `wikidata-hits.json` (D-7) + DB-derived google trails. |
| D-5 | Bonus signals (wifi/breakfast/family flags) backfill | **Schema decision needed** | `_bonus` exists in 174/174 canonical rows; columns `wifi_review_score` etc. NOT in `hotel_canonical` schema — needs migration or stored in `field_provenance_summary` JSONB. Operator to decide. |
| D-8 | Hotel-website HEAD-only fallback | **Gated** | Per-domain authorization list pending operator approval. |
| Dedup | Dedup engine sweep on Madrid corpus | Pending | At minimum process the AC Hotel Atocha (94455↔243091) collision detected this phase. |
| Markets | Madrid market/submarket polygons + PostGIS contains-based assignment | Separate workstream | Required for T2 institutional pass. |

---

## 5 · Files (commit candidates)

- `apps/web/scripts/phase-d7-wikidata-enrichment.mjs` — Wikidata SPARQL runner (embedded input).
- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/phase-d7/wikidata-hits.json` — 111-hotel run output.
- `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/phase-d7/compact-update.sql` — applied UPDATE.
- `docs/hotel-intelligence/phase-d-enrichment-completion-report-v1.md` — this report.

**Note:** D-2 fallback script and SQL batches existed during execution but were lost to OneDrive sync after Supabase writes succeeded. Database state is the source-of-truth for D-2 effects (218 place_ids, 209 phones, 216 websites, 109 gold). If the script needs to be rerun against a new corpus, regenerate from the Phase D-3 fixtures using the same Places API New v1 pattern documented in §2 above.

---

## 6 · DB state (recovery anchor)

Single SQL to reconstruct the headline at any point:

```sql
select * from public.hotel_coverage_madrid_v;
```

Latest snapshot (post Phase D-6, pre-D-7-apply):

```
country_code=ES, city_normalized=Madrid, hotels_total=224,
hotels_gold=109, hotels_silver=2, hotels_bronze=113, hotels_quarantined=0,
hotels_t1_passing=57, hotels_t2_passing=0, hotels_institutional_passing=0,
avg_t1_pct=0.8542, avg_t2_pct=0.5559,
institutional_passing_rate=0.0000, goal_reached=false
```
