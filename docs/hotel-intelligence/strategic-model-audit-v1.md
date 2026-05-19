# Strategic Model Audit · institutional / indie cohort decision

**Workstream:** `feature/hotel-enrichment-pipeline` · audit pre-decision
**Date:** 2026-05-20
**Trigger:** before consolidating institutional/indie T2 split, validate against existing strategic docs.
**Goal:** build the right hospitality intelligence model for underwriting, valuation, and benchmarking — NOT optimise a coverage KPI.

---

## 1 · Verdict (read this first)

**The current T2 coverage spec is measuring the wrong thing.** It gives equal weight to UI/cosmetic fields (amenities bitmap, hero image, phone, website, google_place_id, address_line1) and underwriting-critical fields (chain_scale, market_id, submarket_id, total_rooms, year_opened, operator_type). The branded-vs-indie cohort split I proposed in `phase-d8-hotel-website-design-v1.md` is **the wrong axis** — the right axis is **use-case readiness**, not source-attribution.

The 70 % goal is reachable when scored against the right cohorts. The Madrid corpus does not need to be redefined; the **scoring model does**.

Three corrective moves below (§7) re-anchor the workstream on the institutional truth that HotelVALORA already encoded in its master docs — most importantly the load-bearing `market-vs-underwriting-separation` decision and the `dynamic-cap-rate-engine` field demand.

---

## 2 · Sources cross-referenced

| Doc | Verdict on Phase D-8 design |
|---|---|
| `docs/HOTELVALORA_MASTER_SYSTEM.md` | Validates strategic position: "Bloomberg × CoStar × MSCI × hospitality"; PREMIUM = funds/REITs/banks; **dataset density per asset** is the moat. Phase D's amenity-heavy T2 spec is inconsistent with this audience. |
| `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` | Validates "comparable transactions is the dataset moat", not amenity bitmaps. §2.1: "Underwriting is only as good as its comparables." |
| `docs/architecture/market-vs-underwriting-separation.md` | **Load-bearing.** TWO distinct layers — Market Warehouse (CoStar) vs Underwriting Operations (CompSet). Phase D-1..D-7 falls in the Market Warehouse / hotel_canonical reference-data layer, NOT in the per-deal underwriting layer. The 70 % goal must be re-anchored to its actual layer. |
| `docs/agents/compset-underwriting-agent.md` | Confirms underwriting inputs come from `HOTEL_POSITIONING_MASTER` (CompSet workspace), NOT from `hotel_canonical`. Subject RevPAR/ADR/occupancy + MPI/ARI/RGI are operator-provided + compset-derived, not from Booking enrichment. |
| `docs/intelligence/hotel-positioning-schema.md` | Per-hotel underwriting snapshot needs: chain_scale, hotel_segment, country/market/submarket, KPIs (RevPAR/ADR/occ), MPI/ARI/RGI, ADR/occ/RevPAR/GOP assumptions, valuation_anchor_eur_per_key, cap_rate_assumption_pct, confidence, assumptions_basis. **Zero amenity / hero_image / phone / website fields.** |
| `docs/intelligence/compset-schema.md` | "Single most load-bearing dataset for HOTELVALORA underwriting **after the transactions corpus**." CompSet KPIs live here, not in canonical. |
| `docs/underwriting/dynamic-cap-rate-engine.md` | "CORE IP." 8 adjustments: base · category · size · renovation · operator · macro · liquidity · scenario · side. **Drives cap rate from comps + chain_scale + size + year_renovated + operator_type.** No amenity / image / contact field appears. |
| `docs/underwriting/investment-memorandum.md` | Section 6 inputs: pricing + dynamic cap rate stack (5 layers) + acquisition costs + CAPEX breakdown + D&A. Needs total_rooms, chain_scale, year_opened, segment. Not amenities, not photos. |
| `docs/business-rules/tier-system.md` | Premium/Institutional tier = "CAPEX modelling, Underwriting & IRR Equity, AI imagery, full financial strategy". Amenities/photos are tier-3 polish, NOT institutional gate. |
| `docs/hotel-intelligence/institutional-feature-coverage-targets-v1.md` | **§10 explicitly flags as autonomous-assumption-to-revisit:** "TIER-2 = 19 fields, all weighted equally"; "Madrid passing target = 70 % of hotels at ≥ 80 % TIER-2"; the assumption to be challenged is the unweighted equal-field model. |
| `docs/hotel-intelligence/madrid-enrichment-architecture-v1.md` | Validates `hotel_canonical` schema as canonical reference layer feeding 5 downstream consumers (CompSet builder, Underwriting, Library, Market Overview, Match engine). Each consumer needs a different subset — equal weighting is wrong. |
| `docs/hotel-intelligence/phase-d-enrichment-completion-report-v1.md` (this workstream) | Validated facts: 109 gold, 218 place_id, 209 phone, 111 operator_id, 66 wikidata_qid. Tier promotion logic worked. |
| `docs/hotel-intelligence/phase-d8-hotel-website-design-v1.md` (this workstream) | The framework is sound but the cohort axis is wrong — branded/indie is source-led, should be use-case-led. |

---

## 3 · Contradictions detected (verbatim)

### 3.1 · Equal-weight T2 vs actual field demand

`institutional-feature-coverage-targets-v1.md` §10.1 (verbatim):
> "**TIER-2 = 19 fields, all weighted equally.** A weighted scheme (e.g., amenities count 2×) was considered and rejected as Phase 1 over-engineering. Re-visit at Phase 5 (Library integration) if specific fields turn out to drive disproportionate report value."

**Problem.** Equal weight gives `amenities (14 keys all explicit)` the same coverage contribution as `chain_scale` and `market_id`. The dynamic-cap-rate-engine doc (verbatim §1):
> "8 named adjustments: base · category · size · renovation · operator · macro · liquidity · scenario · side"

`category = chain_scale` AND `size = total_rooms` AND `renovation = year_opened/year_renovated_last` AND `operator = operator_type` ARE the cap-rate inputs. Amenities are not.

The §6 per-report-surface field demand table inside the same doc reveals the contradiction — only the Library institutional table and the Asset Analysis Hotel personalizado surface need amenity coverage; Underwriting + Cap-Rate + Investment Memorandum surfaces do not list amenities at all.

### 3.2 · Goal denominator scale mismatch

`institutional-feature-coverage-targets-v1.md` §7 (verbatim):
> "70 % of ~1,800 Madrid hotels ≈ 1,260 hotels at institutional 80 % coverage."

**Reality.** Phase D sweep returned **224 institutional-grade hotels** after class_descending + Hotels-only filter (90 % Booking E1 quality slice). The 1,800 denominator references Madrid's full accommodation inventory (incl. hostels, apartments, guesthouses) — most of which would be quarantined by the same Phase 1 TIER-0 rules already in place. The 70 % goal should be **70 % of the 224 institutional corpus**, not 70 % of 1,800. The denominator clarification flips reachability:

| Denominator | 70 % goal | Currently passing T2 |
|---|---|---|
| 1,800 (full inventory) | 1,260 hotels | 0 |
| 224 (institutional class-descending) | 157 hotels | 0 |
| 111 (branded subset) | 78 hotels | 0 |
| 55 (D-8 allowlist subset) | 39 hotels | 0 |

### 3.3 · Cohort axis (branded/indie) is source-led, not use-case-led

`market-vs-underwriting-separation.md` §1 (verbatim):
> "Cadence: monthly / quarterly batch ingestion." (Market Warehouse)
> "Cadence: on-demand (operator-triggered) + quarterly per-hotel refresh." (Underwriting Operations)

The separation between aggregate vs per-hotel work is by **operational rhythm and risk profile**, not by brand attribution. Indies are absorbed by the Underwriting Agent the same way branded are — compset is built from market context + operator brief regardless of brand. **An indie 5-star Madrid Centro hotel is just as institutional as a 5-star Marriott** for underwriting purposes; what matters is the comp set + cap-rate inputs + transactions corpus.

The proposed branded/indie split in `phase-d8-hotel-website-design-v1.md` § 1 is therefore looking at the wrong axis. The right axis is **functional readiness per consumer**, not provider availability.

### 3.4 · `total_keys` vs `total_rooms` collision

`madrid-enrichment-architecture-v1.md` §1.1 schema (verbatim):
```
total_rooms           SMALLINT,
total_keys            SMALLINT,              -- rooms + apartments + suites unified count
```

`institutional-feature-coverage-targets-v1.md` §4 T2 field list includes only `total_rooms` (field 10 in TIER-1 actually) and never references `total_keys`. The underwriting `valuation_anchor_eur_per_key` uses **keys**, not rooms. For aparthotel / serviced apartments / suites this discrepancy distorts the valuation. The T2 spec must reference `total_keys` (or `coalesce(total_keys, total_rooms)`) — currently it does not.

### 3.5 · Provenance threshold floor mismatch

`institutional-feature-coverage-targets-v1.md` §9 sets the T2 conf floor at **0.70**. But our Phase D-2 google_places provenance is written at **0.85 for phone, 0.70 for website, 1.00 for place_id, 0.95 for geo_corroboration**. The Wikidata layer is **0.65 for year_opened, 0.55 for total_rooms, 0.50 for website_url**. The 0.65 year_opened is **below the 0.70 T2 floor** — so the Wikidata year_opened we just inserted does NOT count toward T2 under the current spec.

This is internally inconsistent — the spec demands 0.70 for year_opened (§4 field 33) but the fallback chain's authoritative Wikidata tier is 0.65. Either the Wikidata tier should be raised (defensible — Wikidata curates manually) or the year_opened T2 floor should drop to 0.65.

### 3.6 · `region` is TIER-3 but inherited from TIER-0 jurisdiction

`institutional-feature-coverage-targets-v1.md` §5 lists `region` ("Comunidad de Madrid") as TIER-3 nice-to-have. But `country_code` is TIER-0 mandatory. For Spain, `region` is functionally derived from `postal_code` (TIER-2 field 28) via a Madrid municipios table that we already maintain (`registries/madrid-municipios.ts`). Should not be TIER-3 — should be TIER-1 derived deterministically.

---

## 4 · Duplications detected

| Concept | Lives in (1) | Lives in (2) | Resolution |
|---|---|---|---|
| Hotel canonical schema | `madrid-enrichment-architecture-v1.md` §1.1 | `database/migrations/0024_hotel_enrichment_schema.sql` | Migration is the source of truth; arch doc must reference it. |
| Cap-rate adjustment fields | `dynamic-cap-rate-engine.md` §1 (8 adjustments) | `institutional-feature-coverage-targets-v1.md` §4 (T2 fields 21-25 implicitly) | Reuse engine's 8 adjustment field set as the T2 underwriting-critical subset. |
| Confidence band labels | `dynamic-cap-rate-engine.md` (very_low/low/medium/high/very_high 0-100) | `dedup_service.py` (auto_merge/needs_review/likely_duplicate 0.65/0.80/0.92) | Different domains using different bands — OK, but document the per-domain scale. |
| Quality tiers | `madrid-enrichment-architecture-v1.md` (gold/silver/bronze/quarantined) | `business-rules/tier-system.md` (free/pro/premium/team/enterprise) | Disjoint domains — data quality vs user tier. No conflict. Just clarify in doc preambles. |

---

## 5 · Fields by criticality (the actual model)

### 5.1 · CRITICAL for underwriting (drives cap rate / ADR / valuation)

| Field | Used by | Why critical |
|---|---|---|
| `chain_scale` | dynamic-cap-rate-engine §1 (category adjustment) | Drives base yield + category premium/discount |
| `total_rooms` / `total_keys` | dynamic-cap-rate-engine (size adjustment) + valuation_anchor_eur_per_key | Drives buyer pool segment + per-key valuation |
| `year_opened` / `year_renovated_last` | dynamic-cap-rate-engine (renovation adjustment) | Drives CAPEX assumption + renovation premium/discount |
| `operator_type` | dynamic-cap-rate-engine (operator adjustment) | Franchise/managed/owned/lease drives GOP & cap rate |
| `segment` | All underwriting docs | Luxury/upscale/midscale drives every benchmark |
| `market_id` + `submarket_id` | dynamic-cap-rate-engine (comps filter) | Drives transaction evidence selection |
| `postal_code` | submarket derivation + jurisdiction | Drives compset boundary |
| `country_code` | every market query | Mandatory |
| `lat`/`lng`/`geom` | comp radius + map | Mandatory |

### 5.2 · USEFUL for institutional reporting (secondary inputs)

| Field | Used by | Why useful |
|---|---|---|
| `brand` / `brand_family` | Library table + Asset Analysis | Display + operator dossier — but **not required for valuation** |
| `operator_id` (FK) | Operator dossier · brand-family lookup | Useful for CRM but cap-rate uses `operator_type` only |
| `hotel_type` | CAPEX defaults · segment derivation | Drives default CAPEX matrix per category × keys |
| `room_type_mix` | ADR sensitivity in financials | Refines ADR projection when granular |
| `meeting_rooms_count` / `meeting_space_sqm` | Financials MICE revenue line | Drives F&B + MICE % of total revenue |
| `neighborhood` | Submarket derivation + display | Useful when submarket_id missing |
| `review_score` / `review_count` | Library + Match engine | Demand-quality signal |

### 5.3 · COSMETIC / NON-UNDERWRITING (UI / CRM / cross-ref only)

| Field | Used by | Why cosmetic for underwriting |
|---|---|---|
| `amenities` (14-key bitmap) | Library institutional table icons + Asset Analysis amenities card | **Not** an underwriting input. UI display + match engine soft signal. |
| `hero_image_path` | Library map markers + report hero | Pure UI. |
| `gallery_paths` | Library report gallery | Pure UI. |
| `website_url` | Library contact link · CRM | Operator dossier only. |
| `phone` | Library contact card · CRM | Operator dossier only. |
| `email` | Library contact card · CRM · email outreach | CRM only. |
| `address_line1` | Library + report display | Display; postal_code already drives jurisdiction. |
| `google_place_id` | Dedup utility + cross-ref | Internal tool only — not consumed by any institutional surface. |
| `wikidata_qid` | Cross-ref utility | Internal only. |
| `tripadvisor_id` / `expedia_id` / `agoda_id` / `osm_id` | Cross-ref utility | Internal only. |
| `booking_url` | Library report → "View on Booking" link | Display only. |
| `legal_name` | Compliance / contracts (rare) | Sparse, rarely needed. |
| `ownership_structure` | Operator dossier | CRM / dossier only. |

### 5.4 · ARTIFICIAL KPIs (no real value to the workstream)

| KPI | Currently tracked by | Why artificial |
|---|---|---|
| `madrid_t2_coverage = filled / (19 × n_hotels)` | `coverage-measurement-spec-v1.md` §1 | Sums 19 fields with equal weight including 8+ cosmetic. Maximizing this maximizes UI polish, not underwriting. |
| `T2 ≥ 16/19 per-hotel threshold` | `institutional-feature-coverage-targets-v1.md` §7 | 84% threshold is arbitrary — driven by "80% of 19 fields, round up" rather than which fields actually pass. |
| `Per-hotel passing rate ≥ 70%` | Same | The composition of the 70% is what matters, not the count. A 70% pass rate composed entirely of branded hotels with no comps in submarket = still un-underwritable. |
| `gold tier = ≥85 % T2 at conf ≥ 0.80 AND 2-source corroboration on 3 fields` | `institutional-feature-coverage-targets-v1.md` §4 silver/gold thresholds | The corroboration field choice is undefined — any 3 fields agreeing trivially passes (e.g. 3 cosmetic fields). Should anchor to the 8 cap-rate adjustment fields specifically. |

---

## 6 · What's validated in the current model

These are sound, no revision needed:

1. **TIER-0 = the 8 quarantine-gate fields.** Geo + identity + jurisdiction. Correct.
2. **Provenance + confidence + dedup as the institutional moat.** Architecturally correct per the master strategic doc — dataset density per asset, not UI.
3. **`hotel_canonical` as the reference-data canonical layer.** Correct separation from CompSet (per-hotel underwriting) and from Library (UI surface).
4. **Per-source tier hierarchy** (Booking A 0.85 → Hotel website B 0.80 → Google C 0.70 → Wikidata F 0.50). Correct.
5. **The dedup composite scoring** (35/30/20/10/5) — surfaces real edge cases without false positives.
6. **D-1 provenance backfill model.** 508 source records + 5176 field provenance — correct schema and partitioning.
7. **Quality tiers (gold/silver/bronze/quarantined)** as a data-quality dimension distinct from user tier. Correct.
8. **Market-vs-underwriting separation.** Load-bearing. The Phase D enrichment work lives in the Market Warehouse / reference layer; CompSet KPIs live in the Underwriting Operations workspace. Do not conflate.

---

## 7 · Recommendation — what to redefine

### 7.1 · Replace the equal-weighted T2 metric with three orthogonal readiness scores

Three cohort scores per hotel — each measures a different consumer's needs:

**A · `underwriting_ready` (the institutional metric that matters):**
```
underwriting_ready = (
  TIER-0 complete
  AND chain_scale present (derivable from segment + star_rating for indies)
  AND segment present
  AND coalesce(total_keys, total_rooms) present
  AND market_id present
  AND submarket_id present
  AND postal_code present
  AND (year_opened present OR year_renovated_last present OR operator override)
  AND operator_type present
)
```

8 hard-required fields above TIER-0 = 16 total. **No brand_family requirement.** Indies pass if structurally complete.

**B · `library_ready`:**
```
library_ready = underwriting_ready
  AND hero_image_path
  AND amenities ≥ 5 explicit keys
  AND review_score (any source)
```

**C · `premium_report_ready`:**
```
premium_report_ready = library_ready
  AND (brand_family present OR documented_independent flag)
  AND room_type_mix (granular ≥ 3 categories)
  AND meeting_rooms_count + meeting_space_sqm (if hotel_type is conference/upper-upscale/business)
```

### 7.2 · Re-anchor the 70 % goal to underwriting_ready

```
Madrid institutional cohort = the 224 non-quarantined hotels currently in canonical
70 % underwriting_ready = 157 hotels passing the §7.1.A criteria
```

This is **achievable** with:
- PostGIS markets workstream → +market_id +submarket_id for all 224 (closes the 0 → 224 gap on those 2 fields)
- D-8 hotel-website fallback for the 55 allowlist hotels → +total_rooms, +year_opened (closes for the branded subset)
- For indies + out-of-allowlist branded: derive `chain_scale` deterministically from `star_rating` + `hotel_type` (indie + 5-star urban → `luxury`; indie + 3-star urban → `midscale`). Already done for current corpus.
- `operator_type` derivable from `brand_family` presence (branded → managed by default unless overridden; indie → owned/independent).

Projected pass rate post-implementation: **~180-200 / 224 ≈ 80-89 %**, well above the 70 % goal.

### 7.3 · Demote the cosmetic-field push

Drop `amenities (full 14 keys)` from the institutional readiness gate. Keep it as a `library_ready` requirement only. Same for `hero_image_path`, `phone`, `website_url`, `google_place_id`, `address_line1`.

This is **not** about reducing data quality — these fields still populate via the existing pipeline (Phase D-2 already filled phone/website/place_id for 218 hotels). It's about **stopping the artificial scoring of UI polish as institutional readiness**.

### 7.4 · Reframe D-8 as an underwriting-readiness boost, not a cohort fix

D-8 hotel-website fallback as designed (7-chain allowlist, 4 targets: `total_rooms`, `year_opened`, `meeting_rooms_count`, `meeting_space_sqm`) is **correctly scoped** for institutional readiness:
- `total_rooms` + `year_opened` are critical underwriting inputs.
- MICE fields are useful for premium_report_ready.

The 55-hotel scope was framed as "the only addressable cohort." Reframe: D-8 lifts the **branded allowlist subset to premium_report_ready** while PostGIS + deterministic chain_scale derivation lift the **entire 224 corpus to underwriting_ready**.

### 7.5 · Drop the branded-vs-indie axis

The split proposed in `phase-d8-hotel-website-design-v1.md` § 7 ("Split T2 into branded-T2 (19) and indie-T2 (15)") was reaching for a fix in the wrong place. With the three-cohort scoring above, indies pass `underwriting_ready` just like branded hotels. The natural difference (brand presence) becomes a `premium_report_ready` differentiator, not an institutional gate.

### 7.6 · Confidence-floor alignment

Drop the T2 confidence floor for `year_opened` from 0.70 to 0.65 (matches the Wikidata tier-F authoritative confidence for that field). Or raise the Wikidata year_opened source confidence to 0.70 if curated externally. The mismatch is internally inconsistent.

---

## 8 · Concrete implications for next steps

### 8.1 · For Phase D continuation

| Workstream | Current spec | Revised under §7 |
|---|---|---|
| PostGIS markets | "Adds 2 fields, +2 to T2 count" | **Top priority** — adds 2 underwriting-critical fields that close the biggest current gap (0 → 224 on market_id/submarket_id) |
| D-8 hotel-website | "Will unlock 55 hotels of 224" | **Lifts the allowlist subset to premium_report_ready**, while the rest of the 224 is independently liftable to underwriting_ready via PostGIS |
| D-5 bonus signals (wifi/breakfast/family) | "Schema decision needed" | **Defer indefinitely** — these are not underwriting inputs. Cosmetic at best. |
| `total_keys` column | Not in T2 spec | Add to canonical layer; T2 references `coalesce(total_keys, total_rooms)` |
| `region` field tier | TIER-3 | Promote to TIER-1 derived deterministically from postal_code via Madrid municipios table |

### 8.2 · For documentation

| Doc | Action |
|---|---|
| `institutional-feature-coverage-targets-v1.md` | Supersede with v2 — explicit three-cohort readiness scoring; deprecate equal-weighted T2 |
| `coverage-measurement-spec-v1.md` | Add three new views: `hotel_underwriting_ready_v`, `hotel_library_ready_v`, `hotel_premium_report_ready_v` |
| `phase-d8-hotel-website-design-v1.md` | Update §1 ROI table — D-8 is for premium_report_ready uplift on the 55 allowlist branded; not a fix for institutional gate |
| `dynamic-cap-rate-engine.md` | Add cross-reference: T2 fields 23/24/25/33/38/39 are the underwriting-readiness 8 |
| `madrid-bootstrap-plan-v1.md` | Add Phase E re-spec note (cohort score change) |

### 8.3 · For schema

No schema changes required. The 8 underwriting-critical fields already exist in `hotel_canonical`. The three cohort scores are pure VIEW logic over the same table.

### 8.4 · For the strategic narrative

The institutional moat narrative in `HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` §2 is **strengthened** by this audit, not weakened. The moat is **per-asset underwriting depth backed by comps + cap-rate + confidence audit trail**, not amenity bitmap completeness. Phase D's real value isn't 97 % phone coverage — it's the canonical foundation that lets PostGIS + deterministic chain_scale + operator_type derivation drive 80 % institutional readiness for 224 Madrid hotels with no further external scraping.

---

## 9 · One-line summary

**Don't split branded/indie. Split by consumer (underwriting / library / premium-report) and re-anchor the 70 % goal to underwriting readiness — already 80 %+ achievable with PostGIS + deterministic derivations, no D-8 dependency.**

---

## 10 · Open questions for operator before locking the v2 spec

1. Confirm denominator: 224 institutional corpus (class_descending) vs ~1,800 full Madrid inventory?
2. Confirm `documented_independent` flag — a new boolean on `hotel_canonical` for indies that operators explicitly mark as institutional-grade indie (e.g. boutiques)?
3. Confirm `chain_scale` for indies — deterministic from star_rating + hotel_type, or manual curator override required?
4. Confirm `operator_type` default for indies — "owned" / "independent" / "unknown"?
5. Confirm whether D-5 bonus signals (wifi/breakfast/family) is fully dropped or kept for library_ready only.
6. Confirm whether D-8 stays scoped to the 7-chain allowlist or is repointed (e.g. add Hotusa for the 16 hotels currently lacking total_rooms).

---

**End of audit. Awaiting operator decision before any v2 spec implementation.**
