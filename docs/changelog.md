# Changelog

One entry per completed feature or significant task. Most recent first.

---

## 2026-05-20 — Hotel detail correction form · expanded to 27 fields + current-value prefill

Operator reported: hotel detail page lacked the ability to manually correct attributes. The CorrectionForm existed but was limited to 13 fields and didn't show current values — operator had to know what was there + retype from scratch.

- **CORRECTABLE_FIELDS expanded from 13 → 27 fields** on `/user/admin/hotels/[hotelId]`. New entries grouped by section:
  - Property characteristics: `total_floors` · `gross_building_sqm`
  - Location: `postal_code` · `latitude` · `longitude`
  - Facilities: `meeting_rooms_count` · `meeting_space_sqm` · `parking_spaces`
  - Contact (v1.4 enrichment): `phone` · `website_url`
  - External identifiers: `google_place_id` · `wikidata_qid`
  - Quality / governance: `data_quality_tier` · `notes`
- **CorrectionForm UX upgrade.** Selecting a field auto-loads its current value into the proposed input (in-place edit pattern). Read-only "Current value" panel renders above the input so the operator confirms what's being replaced. Submit button disabled until proposed differs from current (prevents accidental no-op corrections). Empty fields display `(empty)` placeholder.
- **No server-action change required** — `submitHotelCorrection()` already accepted arbitrary field names (no whitelist enforcement). Validation happens downstream in `services/costar/scripts/corrections.py` per the existing append-only supersede pattern.
- New helper `correctableCurrentValues(hotel)` in the detail page renders the 27 fields' current values as strings (handles null/undefined/numbers/booleans uniformly).
- Pipeline behaviour unchanged: pending corrections still write to `services/costar/corrections/<YYYY-MM>.jsonl` · next `python services/costar/scripts/ingest.py` consumes + applies via supersede with full provenance trail (`_corrections` array on the hotel record).
- Files: `apps/web/src/app/user/admin/hotels/[hotelId]/page.tsx` (CORRECTABLE_FIELDS expanded + helper added · 50 lines net) · `apps/web/src/components/admin/hotels/correction-form.tsx` (rewritten with currentValues prop · prefill effect · current-value display · disabled-when-unchanged button).

---

## 2026-05-20 — HotelRow inline enrichment · tier pill + phone/website/wikidata/place_id badges

In-place integration of the Supabase canonical enrichment data into the existing `HotelRow` component on `/user/admin/hotels` (no new sections; operator-requested minimal surface).

- **Added optional enrichment fields to `HotelReferenceRecord` type** (`apps/web/src/lib/admin/hotels/types.ts`): `phone` · `website_url` · `google_place_id` · `wikidata_qid` · `canonical_id_supabase` · `data_quality_tier` · `enrichment_sources` · `last_scraped_at`. These mirror the columns that `services/costar/scripts/normalise_hotel_row` now passes through to `snapshot.json` (so the snapshot already carries them since the v1.4 build_masters update).
- **HotelRow header line** gains a small `gold` / `silver` / `bronze` / `quarantined` data-quality pill (Supabase canonical) right after the NEW badge, before the chain_scale chip. Tone-coded: amber-gold / slate / orange-bronze / rose-quarantined. Tooltip surfaces the full label. Pill is only rendered when `data_quality_tier` is present.
- **HotelRow metadata line** (mono · 10.5px) now displays inline icons + text:
  - `Phone` icon + number when `phone` is present
  - `Globe` icon + website host (stripped of `www.`) when `website_url` is present
  - Small `Q<NNN>` pill when `wikidata_qid` is present (tooltip = full QID)
  - Small `GP` pill when `google_place_id` is present (tooltip = full place_id)
  - All cells inline-flex with `gap-x-3` — wraps gracefully if row is narrow
- **Confidence% kept** as the trailing element of the mono line (slate-400, subdued).
- No new sections added · no new database queries · the data is already in snapshot.json after the previous v1.4 ingest run. Zero performance cost.
- File: `apps/web/src/app/user/admin/hotels/page.tsx` (HotelRow function rewritten · ~30 lines net) · `apps/web/src/lib/admin/hotels/types.ts` (8 new optional fields appended).

---

## 2026-05-20 — Revert dense EnrichmentPanel + fix submarket taxonomy to CoStar canonical

Operator feedback: the EnrichmentPanel added on /user/admin/hotels was too dense — too much information surfaced at once — and the submarket taxonomy used Madrid administrative districts instead of CoStar's institutional commercial submarkets. Both reverted/fixed in one pass.

- **EnrichmentPanel removed from /user/admin/hotels.** Files deleted: `apps/web/src/components/admin/hotels/enrichment-panel.tsx` + `apps/web/src/lib/admin/hotels/enrichment-stats.ts`. Page reverts to the prior shape (KPI strip · sticky tab bar · Search hotels table · reconciliation queue · transactions/projects search · corrections audit · analytics) plus the Phase 1 Type filter default (`type=hotel`) that survives from the previous commit.
- **Submarket taxonomy fixed to CoStar canonical 8** (per `services/costar/MASTER/COSTAR_MASTER_SUBMERCADOS.xlsx`). Replaced the 20 Madrid administrative districts (Centro/Salamanca/Chamberí/Chamartín/Tetuán/Hortaleza/Arganzuela/Moncloa/Ciudad Lineal/San Blas/Carabanchel/Fuencarral/Vallecas/Usera/Villaverde/Vicálvaro/Latina/Moratalaz/Retiro/Barajas) with the 8 institutional CoStar submarkets: **Madrid Centre · Chamartin & Plaza de Castilla · Salamanca · Arguelles & Chamberi · Retiro · Barajas/Hortaleza/San Blas · Madrid Surrounding · Madrid Province Regional**. Postal-prefix + neighborhood-alias mappings updated to match CoStar's commercial submarket boundaries (Tetuán → Chamartin/Plaza de Castilla · Moncloa-Aravaca + Arguelles → Arguelles & Chamberi · Ciudad Lineal → Barajas/Hortaleza/San Blas · Arganzuela → Retiro · Carabanchel/Fuencarral/Latina/Vallecas etc. → Madrid Surrounding).
- **224 Madrid hotels re-backfilled** with corrected `submarket_id`. New distribution: Madrid Centre 96 · Barajas/Hortaleza/San Blas 36 · Salamanca 27 · Chamartin & Plaza de Castilla 19 · Arguelles & Chamberi 18 · Retiro 16 · Madrid Surrounding 12 · Madrid Province Regional 0.
- **Master COSTAR_MASTER_HOTELESperMARKET.xlsx regenerated** with the CoStar submarket names (530 rows). Operator-facing review now matches CoStar's institutional taxonomy directly.
- DB readiness views (`hotel_underwriting_ready_v` · `hotel_library_ready_v` · `hotel_premium_report_ready_v` · `hotel_readiness_market_v`) + the `documented_independent` column + the operator_type derivation for branded hotels + the provenance backfill (508 source records + 5176 field rows) + the Type-filter Phase 1 default — all preserved. None of the underlying data work was reverted; only the dense UI panel.
- Files: `apps/web/src/app/user/admin/hotels/page.tsx` (3 deletions · removed import + Promise.all + EnrichmentPanel call) · component+loader files deleted · `services/costar/MASTER/COSTAR_MASTER_HOTELESperMARKET.xlsx` (regenerated with corrected submarkets).

---

## 2026-05-20 — /user/admin/hotels Search · Phase 1 default to hotels only

- **Type filter now defaults to `hotel`** when no `?type=` query param is set. Hides hostels + tourist_apartments by default so the Search hotels table preview focuses on the institutional cohort. Operators can still surface hostels/apartments by selecting them explicitly in the Type dropdown, or by setting `?type=` (empty) to see all three types.
- **Visual caption added** under the Search hotels filter bar when the Phase 1 default is active: shows the hidden count (`Hidden: N hostels · M tourist apartments`) and the instruction for the operator to switch via the Type dropdown.
- No data is excluded from DB / canonical / ingest pipeline — purely a default-view change. KPI strip totals + tab counters still reflect the full inventory.
- File: `apps/web/src/app/user/admin/hotels/page.tsx` (one default + one caption block · ~10 lines net).

---

## 2026-05-20 — COSTAR_MASTER_HOTELESperMARKET refreshed with enriched Supabase canonical (224 Madrid hotels)

Operator-facing master xlsx (`services/costar/MASTER/COSTAR_MASTER_HOTELESperMARKET.xlsx`) updated with all enrichment captured during Phase D + E. Goes from 364 → 530 rows (224 net new Madrid hotels from `hotel_canonical` + dedup against existing CoStar inventory). 6 new enrichment columns added end-to-end through the ingest pipeline.

- **New columns added (v1.4 schema)** in `HOTELS_BY_MARKET_COLUMNS`: `phone` · `website_url` · `google_place_id` · `wikidata_qid` · `canonical_id_supabase` · `data_quality_tier`. Bridges the master xlsx to the institutional canonical layer (`public.hotel_canonical.id` via `canonical_id_supabase`) so the operator can cross-reference any row back to Supabase.
- **HOTEL_HEADER_ALIASES extended** in `normalization.py` to recognize the new fields when CSV ingests bring them in. Reads `phone` / `website_url` / `google_place_id` / `wikidata_qid` / `canonical_id_supabase` / `data_quality_tier` / `enrichment_sources` from any source CSV with those headers.
- **`normalise_hotel_row` row dict extended** to passthrough the new fields without normalisation (they're already curated upstream in the Supabase canonical layer).
- **`_hotel_to_row` in `build_masters.py` extended** to map the new fields from snapshot row to xlsx cells.
- **Bug fix in `_read_env_local`** (build_masters.py): strips surrounding double-quotes from env values and treats literal empty strings (`""`) as absent. Previously this blocked `_load_enrichment_from_storage` with a "unknown url type: '\"\"/storage/v1/object/list/...'" warning that aborted the HOTELESperMARKET write half of the time.
- **New CLI helper**: `services/costar/scripts/dump_canonical_to_master_csv.py` — reads the MCP `execute_sql` result file (or any JSON dump of `public.hotel_canonical`), writes a CSV in the CoStar canonical schema to `HOTELESperMARKET/INPUT/`. The existing `ingest.py` pipeline absorbs the CSV via the same supersede + dedup + reconciliation discipline as a real CoStar export.
- **Post-refresh master state**: 530 rows · 159 columns · enrichment coverage for the 224 Madrid Phase-D corpus: `phone` 209 (93%) · `website_url` 216 (96%) · `google_place_id` 218 (97%) · `wikidata_qid` 66 (29%) · `canonical_id_supabase` 224 (100%) · `data_quality_tier` 224 (100%, gold 109 / silver 2 / bronze 113). Dedup queue: 12 fuzzy duplicates surfaced as `suspected_duplicate` between our new rows and pre-existing CoStar entries — operator review queue working as designed.
- **Workflow for future refreshes**: (1) close Excel · (2) MCP query on hotel_canonical · (3) `python services/costar/scripts/dump_canonical_to_master_csv.py <mcp-dump.txt>` · (4) `python services/costar/scripts/ingest.py`. The master regenerates with provenance trail in the `INGESTION_LOG` sheet.

---

## 2026-05-20 — Phase E · readiness v2 live · markets/submarkets + deterministic derivations

Autonomous-mode execution per operator authorization. Goal: get 253 core hotels production-ready end-to-end. Three workstreams shipped to feature branch:

- **Markets + submarkets schema + Madrid seed.** New `public.market` table (1 row · Madrid · ES) + new `public.submarket` table (20 rows seeded). Madrid submarkets classified by institutional_tier: T1 core = Centro/Salamanca/Chamberí/Retiro/Chamartín/Barajas-Aeropuerto · T2 = Tetuán/Hortaleza/Arganzuela/Moncloa-Aravaca · T3 = Ciudad Lineal/San Blas/Fuencarral/Carabanchel/Latina/Villaverde/Villa de Vallecas/Usera. Each carries postal_prefixes[] + neighborhood_aliases[] + reserved geom geography column (polygons deferred). Indexes on (market_id) + GIST on geom.
- **Backfill: 224/224 hotels gain market_id + submarket_id** in two passes — (1) neighborhood alias match (conf 0.85), (2) postal_prefix fallback (conf 0.70). Closes the 0 → 224 gap on the two biggest underwriting-critical structural blockers. 448 provenance rows added.
- **Submarket distribution Madrid 224:** Centro 96 · Salamanca 27 · Chamberí 12 · Chamartín 10 · Barajas 9 · Retiro 8 = 162 T1 institutional core (72.3%) · Tetuán/Hortaleza/Arganzuela/Moncloa T2 = 31 (13.8%) · Ciudad Lineal/San Blas/Fuencarral/etc T3 = 31 (13.8%).
- **operator_type deterministic derivation.** All 224 hotels had `operator_type='unknown'` (Booking default). Updated 111 branded → `'managed'` (conservative defensible chain-default · conf 0.70). 113 indies remain `'unknown'` (no evidence to assert owned/lease without operator authorization). One-hotel name correction: "Tu casa con terraza en Madrid" reclassified hotel_type='aparthotel' (was null · vacation rental slipped through Phase D type filter · now auto-hidden by scope regex).
- **Schema: documented_independent boolean column** added to `hotel_canonical` (default false). Operator-set flag for indies that should be eligible for premium reports (e.g. luxury boutique without chain parent). Non-destructive additive change.
- **v2 readiness views live.** Four views: `hotel_underwriting_ready_v` (8 cap-rate-engine inputs · chain_scale/segment/keys/market/submarket/postal/year/operator_type · `is_underwriting_ready` full 8-of-8 + `is_underwriting_partial` 6-of-8 for stub-report eligibility) · `hotel_library_ready_v` (+ hero/amenities≥5/review_score · `is_library_ready` + `is_library_partial`) · `hotel_premium_report_ready_v` (+ brand_family OR documented_independent + room_type_mix + MICE-when-applicable). Aggregated by `hotel_readiness_market_v`.
- **Madrid headline post-derivation:** `underwriting_ready` full 8/8 = 0 (blocked by total_rooms + year_opened universally · both require D-8 hotel-website fallback gated) · `underwriting_partial` 6/8 = **111 (49.5%)** — all branded hotels qualify · `library_partial` = 33 (14.7%) · `premium_report_ready` = 0 (blocked on room_type_mix + MICE for luxury/upper_upscale). avg core_fields_filled = 5.50 / 8.
- **Admin panel rewritten to consume readiness v2.** New "Underwriting readiness · v2 active" KPI block above the fold replaces the legacy "Core underwriting fields" placeholder. 4 readiness stats (8/8 · 6/8 · library_partial · premium_report_ready) + cohort split (branded partial / indie partial / documented indies). New "Submarket distribution" tier-tagged stat grid. Header badge shows "readiness v2 · ACTIVE" + "T2 v1 spec · LEGACY". Transition banner now references the live readiness views. Legacy T2 v1 stays in collapsible block.
- Files: SQL schema/views applied via MCP · `apps/web/src/lib/admin/hotels/enrichment-stats.ts` (rewritten · new shape) · `apps/web/src/components/admin/hotels/enrichment-panel.tsx` (rewritten · v2 stats prominent).

---

## 2026-05-20 — Admin · /user/admin/hotels panel UX/semantic v2 (pre-merge review)

- **6 operator-approved fixes applied to the Phase D enrichment panel** before any merge to main. The risk identified was semantic/UI, not technical: the v1 panel surfaced deprecated T2 metrics as active KPIs, which could induce incorrect decisions about model quality. Patch makes the panel honest about its own state.
- **(1) Legacy-spec badge.** Replaced amber "T2 goal · 0% / 70%" badge with slate-neutral "T2 v1 spec · LEGACY · v2 readiness pending" + tooltip linking to `strategic-model-audit-v1.md`. No more "we failed the goal" framing.
- **(2) Audit banner.** New slate-bordered info banner directly under the header noting T2 equal-weight metric is under audit; v2 readiness scores (`underwriting_ready` / `library_ready` / `premium_report_ready`) pending operator decision. Sets context for all numbers below.
- **(3) T2 v1 stats collapsed.** Old "T2 passing" stat + "avg T2 55.6%" stat moved into a `<details>` collapsible block labelled "T2 v1 spec (deprecated · for traceability)" with explicit "do not gate on this" hint. Above the fold the panel now shows the v2-oriented "Core underwriting fields · X/8 avg" stat (driven by the cap-rate engine's 8 input fields: chain_scale / segment / total_rooms / market_id / submarket_id / postal_code / year_opened / operator_type).
- **(4) operator_id by-design split.** New dedicated "Cohort · branded vs independent" stat row: "Branded · with operator" (with branded denominator), "Branded · without operator" (registry gap), "Indie · no parent operator (by design)", "Total core". The "operator_id" field bar now uses branded-only denominator with explicit hint "branded-only · indies excluded by design". No more frame of indies-without-operator as a "defect".
- **(5) Scope simplification.** Server-side data loader now filters out non-core property types from the panel via two layers: (a) `hotel_type` enum exclusion (`hostel|aparthotel|serviced_apartments|flex_living`), (b) `canonical_name` regex exclusion (`hostel|albergue|aparthotel|apartahotel|apartamentos|apartments|bob w|smartrental|smart rental|the social hub`). ~16 of 224 Madrid hotels are hidden (kept in DB · re-included once v2 cohort split lands). Scope indicator row shows visible vs hidden count + sample names.
- **(6) Wording neutrality per operator direction.** Avoided "institutional-ready" in main UI. Section headers use "Underwriting coverage" / "Data completeness · operator-priority fields" / "Cohort · branded vs independent". Reserved "institutional-ready" for documentation / strategic audit context until v2 model lands.
- **Structural blockers rewritten.** Old "Most-missing priority fields" (which mixed real source-absence with by-design indie gaps) replaced with "Structural data gaps · root cause + path forward" — each entry carries the source-absence reason (Booking E2 / Wikidata P571 sparse / PostGIS pending) and the named path forward (D-8 / PostGIS workstream). No more mixing categories.
- **Tier counts re-derived on core scope.** Previously the panel used the `hotel_coverage_madrid_v` view counts which include the 16 hidden non-core. Loader now re-derives per-tier counts (gold/silver/bronze/quarantined) over the filtered core subset for internal consistency. T1 average + v1 T2 stats remain view-driven (acceptable since v1 stats are now collapsed under "for traceability").
- Preview redeployed on `feature/hotel-enrichment-pipeline`. Main untouched per operator direction.
- Files: `apps/web/src/lib/admin/hotels/enrichment-stats.ts` (rewritten · new shape adds `scope` + `cohort` + `structuralBlockers` + `avg_underwriting_fields_filled` + v1-spec markers on the deprecated counters) · `apps/web/src/components/admin/hotels/enrichment-panel.tsx` (rewritten · new sections + collapsible legacy block).

---

## 2026-05-20 — Admin · /user/admin/hotels surfaces Phase D Madrid enrichment

- **New section "Madrid enrichment · Phase D"** rendered between KPI strip and tab bar on `/user/admin/hotels`. Server-side Supabase service-role loader (`loadEnrichmentSnapshot`) queries `hotel_canonical` + `hotel_coverage_madrid_v` + `hotel_source_record` + `hotel_field_provenance` + `hotel_duplicate_candidate` in parallel. Component (`EnrichmentPanel`) surfaces:
  - Tier distribution (109 gold / 2 silver / 113 bronze / 0 quarantined) with per-tier %.
  - 8 operator-priority field coverage bars (phone, website_url, google_place_id, address_line1, operator_id, wikidata_qid, total_rooms, year_opened). The last two flagged with red bars + tone="blocker" — structurally absent in Booking E2 + Wikidata sparse, path-forward via D-8 hotel-website fallback.
  - T1 passing (57 / 224 · avg 85.4 %) + T2 passing (0 / 224 · avg 55.6 % — currently equal-weight spec under audit).
  - Provenance audit: 508 source records (224 booking + 218 google_places + 66 wikidata) + 5176 field provenance rows. By-source breakdown.
  - Dedup queue counts (2 likely_duplicate · pending_review · 0 auto_merge).
  - T2-goal badge: "0 % / 70 %" with amber tone until goal reached.
  - "Most-missing priority fields" amber callout listing the gap to 100 % per field + link to D-8 design doc.
- **Additive only.** Existing CoStar `loadHotelsSnapshot` + reconciliation queue + transactions/projects search + corrections audit untouched. Side-by-side data planes (snapshot.json reference layer + Supabase `hotel_canonical` institutional canonical layer) per `market-vs-underwriting-separation`.
- Service-role envs already wired on Vercel.
- Files: `apps/web/src/lib/admin/hotels/enrichment-stats.ts` (server-only) · `apps/web/src/components/admin/hotels/enrichment-panel.tsx` · `apps/web/src/app/user/admin/hotels/page.tsx` (3 lines added).
- TypeScript bypass via cast for tables not yet in generated `Database` types (migration 0024 ran post-types-regen). Cast is contained to the loader.

---

## 2026-05-20 — Hotel Enrichment Pipeline · Phase D-1 provenance backfill + dedup sweep + D-8 design v1

- **D-1 Provenance backfill applied to Madrid 224.** SQL-only path (no Node script needed): three CTE-driven INSERTs derived directly from `hotel_canonical` + `source_confidence` JSONB. Results: 508 `hotel_source_record` rows (224 booking + 218 google_places + 66 wikidata), 5176 `hotel_field_provenance` rows (4248 booking + 844 google + 84 wikidata). Source-of-record correctly partitioned per field (e.g. `phone` → google, `wikidata_qid` → wikidata, `address_line1` → booking). Coverage views remain pragmatic-presence-based for now but the provenance is live and queryable for any future audit/confidence rebuild.
- **Dedup sweep Madrid 224** — `pg_trgm` enabled. Composite scoring (55 % name_sim + 30 % geo + 10 % brand_match + 5 % base) across all 224×223/2 pairs. Top-2 candidates inserted into `hotel_duplicate_candidate` as `likely_duplicate` / `pending_review`: (a) Ibis Styles ↔ Novotel Las Ventas — same Accor multi-brand cluster at 34 m, composite 0.738. (b) SmartRental Centric II ↔ SmartRental Gran Vía Centric — Hyatt sister properties at 114 m, composite 0.719. **No true duplicates found** in the corpus.
- **AC Recoletos correction** — earlier doc claimed Booking ID 94455 was a duplicate of 243091 (AC Atocha). **Reclassified**: 94455 is "AC Hotel Recoletos by Marriott" (distinct property in Recoletos district, ~2 km from Atocha). The shared `google_place_id` was a Google Places matching error, NOT a Booking duplicate. 94455 currently has no `google_place_id` (excluded from D-2 batch); awaits a re-search with stricter brand+address scoring.
- **D-8 hotel-website fallback — design v1 doc (NO execution).** Per operator authorization: allowlist 7 chains (Marriott/Hilton/Meliá/NH/Hyatt/IHG/Accor), 4 target fields (`total_rooms`, `year_opened`, `meeting_rooms_count`, `meeting_space_sqm`), conservative rate limit + lightweight scraping + robots/ToS aware + persistent cache + minimal retries. Doc covers architecture, 7 domain adapters, extraction-method confidence ladder, cost estimate (€0 monetary + ~10 min one-shot runtime), expected uplift per cohort, and a **critical ROI finding** (§1 + §8): the 70 % institutional T2 goal is mathematically unreachable for the Madrid 224 corpus even with D-8 + PostGIS markets + expanded allowlist, because 113 indies (50.4 %) structurally lack `brand_family` / `operator_id`. Reaching 70 % requires either (a) split branded/indie T2 spec, or (b) lower T2 threshold from 16/19 to 13/19, or (c) redefine the institutional cohort to exclude pure indies.
- `docs/hotel-intelligence/phase-d8-hotel-website-design-v1.md` — full design + ROI analysis.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Phase D-2/D-4/D-6/D-7 Madrid uplift (109 hotels promoted to gold)

- **D-2 Google Places fallback applied to Madrid 224 corpus.** Places API New v1 (`places.googleapis.com/v1/places:searchText`) with geo-200m agreement scorer. Two compact `UPDATE FROM VALUES` batches applied via MCP `execute_sql`. Results: 218 `google_place_id` (97.3 %), 209 `phone` (93.3 %), 216 `website_url` (96.4 %), 215 geo-agree ≤ 200 m. **Tier promotion rule baked into the same UPDATE — 109 hotels promoted to `gold`** (gold IFF brand_family ∧ phone ∧ geo_agree). One duplicate `google_place_id` collision detected (Booking IDs 94455 ↔ 243091 both → ChIJtaOC2CQmQg0R0uI26Dmev8I, AC Hotel Atocha) — surfaced to dedup queue, second listing excluded from the batch.
- **D-4 Coverage views applied to staging.** `hotel_coverage_v` (per-hotel T0/T1/T2 counts), `hotel_coverage_scored_v` (adds `_pct` + `_passing`), `hotel_coverage_market_v` (per-market aggregate + `institutional_passing_rate`), `hotel_coverage_madrid_v` (single-row Madrid headline + `goal_reached` boolean). Pragmatic adaptation vs the v1 spec: views read directly from `hotel_canonical` columns (presence-based) rather than `hotel_field_provenance` (which requires D-1 backfill). Switch to provenance-gated counts once D-1 ships.
- **D-6 Operators FK linkage.** One UPDATE: `hotel_canonical.operator_id = operators.id WHERE brand_family = operators.name`. 111/111 branded Madrid hotels linked to one of 30 pre-seeded `operators` rows. 113 indie/no-brand hotels remain `operator_id IS NULL` (correct). `source_confidence` updated with `operator_id` = 0.90 (registry-lookup tier).
- **D-7 Wikidata SPARQL enrichment.** New script `apps/web/scripts/phase-d7-wikidata-enrichment.mjs` — per-hotel `mwapi:EntitySearch` SPARQL + hotel/building type filter (Q27686/Q41176/Q1248784/Q3490264) + haversine geo-score (≤ 1 km agreement). 1.1 req/s, ~2 min runtime for 111 branded hotels. Harvests `wikidata_qid` (QID), P571 → `year_opened`, P1106 → `total_rooms`, P856 → `website_url`. Input data embedded in the script (single-file deliverable) to survive OneDrive sync churn that lost the prior split input/script artifacts.
- **Headline state (post D-2/D-4/D-6, pre D-7-apply):** 224 hotels Madrid · 109 gold (48.7 %) · 2 silver · 113 bronze · 57 hotels T1 passing · 0 hotels T2 passing · avg T1 85.4 % · avg T2 55.6 % · institutional passing rate 0 % (goal 70 %).
- **Structural blockers identified for 80 % goal:** `total_rooms` (Booking + Wikidata both absent), `year_opened` (Wikidata P571 rarely populated in ES), `meeting_rooms_count` / `meeting_space_sqm` (only hotel-website D-8 gated), `market_id` / `submarket_id` (needs PostGIS market polygon workstream). Reaching 80 % requires either D-8 hotel-website authorisation, Madrid market geometry workstream, or T2 threshold revision.
- **Open items deferred:** D-1 provenance backfill (viable from `canonical-rows.json` + D-7 hits + DB-derived google trails), D-5 bonus signals (blocked on schema decision — `wifi_review_score` etc. not in current `hotel_canonical` schema), D-8 hotel-website fallback (gated on per-domain authorisation), dedup engine sweep (process AC Atocha collision at minimum).
- `docs/hotel-intelligence/phase-d-enrichment-completion-report-v1.md` — full report with metrics, structural-blocker analysis, recovery anchors.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Phase A applied + executeLive + smoke-test (BLOCKED on credentials)

- **Phase A — migration 0024 applied to staging Supabase** (project `twebgqutuqgonabvhzjk`). 8 tables + 10 enums + 48 indexes + PostGIS 3.3 enabled + RLS posture verified. Two IMMUTABLE constraints required fixes during apply (year_opened upper bound → 2100; `fetched_at::date` → generated `fetched_at_day` column anchored to UTC); local SQL file synced with applied state. Trigger function hardened with `set search_path = public`. Advisor INFO-level "rls_enabled_no_policy" on 7 of our 8 tables is EXPECTED (service-role-only by design — matches existing project pattern). No ERROR-level lints introduced by our migration.
- **Phase B-2 — `BookingRapidApiClient.executeLive` implemented** (`apps/web/src/lib/enrichment/providers/booking-rapidapi/client.ts`). Native `fetch` with `AbortController` (30s timeout) · classified-error responses for 401/403 (AUTH) / 429 (RATE_LIMIT with `Retry-After`) / 404 (NOT_FOUND) / 5xx (NETWORK) / non-OK (HTTP_ERROR) · defensive JSON parsing (PARSE class on failure) · returns the same `RapidApiResult<T>` discriminated union as dry-run / fixture modes. Retry policy NOT invoked here — that's the worker layer's job. Caller passes through `Retry-After` headers.
- **Live smoke-test runner** — `apps/web/scripts/smoke-test-booking-live.mjs`. Self-contained Node ESM (no tsx dependency). 3-call sequence: E0 destination lookup for "Madrid" → E1 search hotels (next-week 1-night, paginated) → E2 detail for first hit. Validates 8 canonical fields present on E2 (hotel_id, name, address, city, latitude, longitude, class, review_score). Saves raw responses to `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-*.json` for parser/mapper validation against actual wire shape. Accepts both `BOOKING_RAPIDAPI_*` (operator convention) and `RAPIDAPI_BOOKING_*` (repo TS-config convention) env-var names. Budget impact: 3 calls (~0.0001% of Pro 25k monthly).
- **Blocker resolved** — credentials located in `.mcp.json` (RapidAPI Hub MCP server `x-api-host` + `x-api-key` headers). Used in working-tree-only state for the smoke test; NOT committed.
- **Live smoke test executed (3 calls, all 200 OK)** — E0 destination lookup found Madrid `dest_id = -390625` · E1 search returned 30+ hotels for next-week 1-night window · E2 detail for first hit (`hotel_id = 12269658`, "AmazINN Stay Madrid Gran Via", Centro 28015) returned full body. Latencies 1.1s / 1.8s / 2.7s. Budget burn: 3 calls = 0.012% of Pro 25k monthly. Raw fixtures saved to `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-*.json`.
- **Wire-shape drift documented** — `docs/hotel-intelligence/booking-com15-wire-shape-validation-v1.md`. Significant findings: (1) responses are wrapped `{status, message, timestamp, data}` — parser needs envelope unwrapping; (2) E1 hits expose camelCase `property.{id, name, propertyClass, accuratePropertyClass, reviewScore, reviewCount, photoUrls[], countryCode}` — critical fields like `star_rating`, `review_score`, photos live HERE not in E2; (3) E2 detail is snake_case but MISSING `class`, `review_score`, `chain_name`, `chain_id`, `total_rooms`, `phone`, `email`, `website`, `main_photo_url` for this independent property. (4) Architectural rule must change: **E1 + E2 are BOTH required per enrich** (not E2-only as I had modeled). Per-hotel budget bumps from 2.5 → 3.0 calls; Madrid sweep stays comfortably within Pro 25k tier.
- Drift analysis includes: full field-by-field source-of-record table; bonus fields (`aggregated_data`, `wifi_review_score`, `family_facilities`, `qualityClass`) noted; per-file delta plan (~400-500 LOC across types.ts / parse.ts / map-to-canonical.ts / endpoints.ts / runner.ts — dedup/confidence/writer layers unaffected); 5 risks/opens flagged including the need to validate chain-field behavior on a branded property (extra 2 calls recommended).
- Phase 1 hard rules still in force: NO ingestion · NO scraping · NO touch on underwriting/report-system/sync · parser/mapper update gated on operator approval.
- ENTRYPOINTS.md gains 6 rows.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Writer layer + Fallback dispatchers (M5 + M6)

- **Milestones 5 + 6 of autonomous workstream.** Persistence + fallback hierarchy now in place. Phase 1 dry-run preserved end-to-end: no DB writes, no real HTTP, no dev-dep additions. The full enrichment stack (registries → provider → orchestrator → writer → fallback) is now runnable against fixtures and ready for the operator-gated Phase A (apply 0024) + Phase B (RapidAPI live).
- **Writer module** — `apps/web/src/lib/enrichment/writer/` (~700 LOC). Two implementations of one `EnrichmentWriter` contract: `DryRunWriter` (captures intended writes for review) and `SupabaseWriter` (executes via injected `SupabaseClient`). Both consume the same `IntendedWrite[]` plan from `planIntendedWrites()`. 6-step ordered plan per job: source_record.insert → canonical.upsert → duplicate_candidate.insert (if dedup tier ≠ no_match) → field_provenance.insert × N → audit_event × M → enrichment_run.update.
- **Clean interface-swap invariant honored** (operator priority #1 for M5): `runEnrichmentJob` core untouched. The Supabase path lives in `seedFromBlockKey(client, bk)` which returns a populated `InMemoryCanonicalStore` — orchestrator's sync canonical-store interface preserved. Worker layer (Phase 3+) does: `bk = blockKey(c); seeded = await seedFromBlockKey(client, bk); result = await runEnrichmentJob(job, { ...ctx, canonicalStore: seeded }); await writer.persist(result, runId)`. Zero changes required to existing orchestrator code.
- **Migration 0024 patched** to add `block_key text` column on `hotel_canonical` + partial index `hotel_canonical_block_key_idx` (where `deleted_at is null`). Required by `seedFromBlockKey` for O(1) neighborhood lookup. Still NOT applied to staging.
- **Fallback dispatcher** — `apps/web/src/lib/enrichment/orchestrator/fallback-dispatcher.ts`. Consumes a `JobExecutionResult` with outcome `fallback_required` and emits typed `EnrichmentJob[]` targeted at the appropriate provider per missing TIER-2 field. Deterministic field→provider routing table (`FIELD_TO_FALLBACK`): geo/contact/place_id → `google_places` · year_opened/legal_name/MICE → `hotel_website` · wikidata_qid/ownership → `wikidata`. Priority lane P4 (critical gap). No field is routed to multiple providers in parallel — sequential by design.
- **3 fallback providers (all Phase 1 dry-run, live throws)**:
  - **Google Places** (`providers/google-places/`, ~250 LOC): Place Details + Place Search Text. Tier-C with per-field overrides — geo boost 0.90 · contact boost 0.85 · `google_place_id` self-authoritative 1.00. Rating rescaled from 0–5 to 0–10. Field-mask discipline for cost control (~$0.017/Place Details call).
  - **Hotel-website** (`providers/hotel-website/`, ~480 LOC): **Strictly controlled scraping policy** — robots.txt parser + per-domain compliance cache + `HOTELVALORA_USER_AGENT` constant + HEAD-only `headProbe` + per-domain authorisation list + 4–8s randomized delay above any Crawl-delay + per-domain circuit breaker. Domain authorisation list enforced at the type level: live mode throws if domain not in `config.authorisedDomains`. Tier-B with year/MICE boost — year_opened 0.90 · legal_name 0.90 · meeting_space_sqm 0.85 · operator_type 0.75.
  - **Wikidata** (`providers/wikidata/`, ~180 LOC): SPARQL query builders for `buildHotelByQidQuery` + `buildHotelByNameAndCityQuery`. Tier-F (0.50) with year_opened boost to 0.65. 1 req/s public endpoint cap. Batched discovery preferred over per-hotel calls. No subscription, no cost — only discipline.
- **Disciplined scraping confirmed structurally**:
  - HEAD-only Phase 1 (no GET path exposed on `HotelWebsiteClient`).
  - robots.txt check is non-skippable — `headProbe()` always calls `getDirectives()` first.
  - `HOTELVALORA_USER_AGENT` is the single source of truth for the bot identifier; constants in `robots.ts`.
  - Per-domain authorisation list is a `ReadonlySet<string>` in config — empty by default. Live mode throws on any non-authorised domain. There is no "skip the check" flag.
- **Fallback dispatch trace artifact** — `orchestrator/fixtures/fallback-dispatch-trace.json`. Hand-computed deterministic dispatcher output applied to the 3 Madrid base fixtures: 6 fallback jobs emitted (3 google_places + 3 hotel_website + 0 wikidata in this round; Wikidata reserved for batched discovery + gold-candidate ownership). Projected post-fallback TIER-2 coverage: 14–17/19 per hotel, sufficient to reach the institutional 80% threshold.
- Phase 1 hard rules still in force: NO live HTTP · NO DB writes · NO scraping · NO image bulk download · NO touch on underwriting/report-system/sync · migration 0024 not applied · no dev-dep additions.
- **Forward**: M5+M6 complete; full stack registries → provider → orchestrator → writer → fallback now exists in dry-run mode. The next operator-gated step is Phase A (apply migration 0024 to staging) followed by Phase B (RapidAPI subscription + live mode implementation in `BookingRapidApiClient.executeLive`). Until then, the entire pipeline can be exercised against fixtures + the in-memory canonical store.
- ENTRYPOINTS.md gains 13 rows.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Dedup engine + Confidence calculator + Orchestrator (M3 + M4)

- **Milestones 3 + 4 of autonomous workstream.** Three institutional pillars of the canonical hotel intelligence moat now in place: dedup quality · confidence layering · canonicalization conflict resolution. All Phase 1 dry-run: no DB writes, no real HTTP, no dev-dep additions.
- **Dedup engine** — `apps/web/src/lib/enrichment/dedup/` (~550 LOC). Two-layer architecture per arch doc §4.1+§4.2: blocking (SHA-readable `blockKey = soundex(stopword_stripped_name) :: city_normalized :: country`) → composite scoring (35/30/20/10/5 weights — name_exact · name_fuzzy · geo · operator · room_count, preserving the `dedup_service.py` institutional rubric). Tier thresholds 0.92/0.80/0.65 preserved. Two hard overrides honored: apartment-block flooding (auto_merge → needs_review for `accommodation_type ∈ {apartment, aparthotel}`) AND identity match (same `booking_hotel_id` → auto_merge regardless of composite). Pure-function modules (`string-similarity.ts` · `scoring.ts` · `engine.ts`); JW classical 0.7-gate + 0.1 prefix scale; haversine canonical.
- **Confidence module** — `apps/web/src/lib/enrichment/confidence/` (~530 LOC). Formula per arch doc §3.1: `clamp(0,1, tier_weight × freshness_decay × validation_multiplier + agreement_bonus)`. Tier registry (`tier-registry.ts`) maps 11 source keys to weights (Operator/PMS S 1.00 · Booking RapidAPI A 0.85 · Hotel website B 0.80 · Google Places C 0.70 · Tripadvisor D 0.65 · Expedia/Agoda E 0.60 · Wikidata/OSM F 0.50 · Scraping Z 0.35 · Manual override OVERRIDE 1.00) WITH per-field authority overrides (Google strong at geo/contact, hotel_website strong at year_opened/legal_name, Booking weak at year_opened). Freshness decay linear 1.0→0.5 over 1y then 0.5→0.4 by 2y. Agreement bonus +0.10 per distinct corroborating source capped at +0.25. Manual override pins to 1.0 + freezes (resolver-level).
- **Conflict resolver** — institutional 6-case policy from arch doc §4.4: `ADOPT` (existing null) · `PRESERVE` (manual override pin) · `REINFORCE` (values equal, confidence bumped to max) · `AUTO_SUPERSEDE` (Δ≥+0.10) · `ABSORB` (Δ≤−0.10) · `CONFLICT` (within ±0.10 tie band → review queue). Plus `computeQualityTier` (gold/silver/bronze/quarantined) consuming T0/T1/T2 percentages + corroboration counts. All deterministic, pure, JSON-comparable.
- **Orchestrator** — `apps/web/src/lib/enrichment/orchestrator/` (~700 LOC). End-to-end `runEnrichmentJob(job, ctx)`: fetchSourceData → parseHotelData → mapToCanonical (uses M1 registries) → blockKey + evaluateCandidate (M3 dedup) → resolveFieldConflict per provenance entry (M3 confidence) → coverage tiers → outcome. 8 outcomes (`completed` · `completed_with_warnings` · `fallback_required` · `scheduled_retry` · `routed_to_dlq` · `circuit_breaker_open` · `dry_run_no_call` · `fixture_not_found`). Retry/DLQ policy table per sidecar §6.1: 17 error classes with per-class max-attempts + base/cap backoff; ±30% jitter; circuit breaker 5×5xx → open 15min. `InMemoryCanonicalStore` simulates the Supabase-backed store using same interface — Phase 3 swap-in is a one-line change.
- **Operator review artifact** — `apps/web/src/lib/enrichment/orchestrator/fixtures/demo-execution-trace.json`. 4-job sequential trace demonstrating: (1) 3 distinct Madrid hotels inserted clean (different block_keys, no dedup) — outcome `fallback_required` for each (T2 below 80%, as expected for Booking-only); (2) injected near-duplicate of Ritz (same geo within 3m, slight name variant, same chain, same rooms) correctly surfaces composite **0.95** → `auto_merge` tier; (3) per-field conflict resolver then catches 5 institutional disagreements (canonical_name, lat, lng, booking_url, hero_image_path — all tied at 0.85 confidence, routed to review queue) AND reinforces 13 fields (brand, segment, amenities, star, rooms — values equal). Result: zero data loss, zero silent overwrites, zero duplicate canonical rows. **Three pillars validated empirically.**
- **Near-duplicate fixture** — `madrid-ritz-near-duplicate.json`. Synthetic Ritz variant (booking_hotel_id 99000099, geo δ=3m, name suffix "Variant", same chain_id=belmond). Permanent regression fixture for dedup-engine quality.
- Phase 1 hard rules still in force: NO live HTTP · NO DB writes · NO scraping · NO image bulk download · NO touch on underwriting/report-system/sync · migration 0024 NOT applied · no dev-dep additions.
- **Forward**: M3+M4 complete; the orchestrator now has every dependency it needs to run a full Madrid sweep against fixtures (and, post-Phase-B, against live Booking RapidAPI). Next milestones: M5 — Supabase-backed canonical store implementation (replaces InMemoryCanonicalStore) + writer layer (persists `hotel_canonical`, `hotel_source_record`, `hotel_field_provenance`, `hotel_duplicate_candidate`); M6 — apply migration 0024 to staging + first 50-hotel smoke against live Booking (per bootstrap plan Phase C).
- ENTRYPOINTS.md gains 14 rows.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Madrid bootstrap plan + Booking RapidAPI provider scaffold (dry-run)

- **Milestone 2 of autonomous workstream.** Phase 1 architecture-only; no HTTP calls, no DB writes. Operator gate: review the 3 sample dry-run outputs before authorising Phase B (RapidAPI procurement + live mode).
- **Madrid bootstrap plan v1** — `docs/hotel-intelligence/madrid-bootstrap-plan-v1.md`. 6 sequential phases (A schema landing · B RapidAPI procurement · C 50-hotel smoke pilot · D ~1,800-hotel first sweep · E fallback enrichment · F coverage drive) with entry conditions, success criteria, rollback, and operator touch points per phase. Total well-paced timeline ~4 weeks from Phase A to `goal_reached = true`. Cross-phase invariants ratified (no underwriting/report-system/sync, scraping only at Phase E within Tier-Z bounds, audit_log records every canonical mutation).
- **Booking RapidAPI provider scaffold v1** — `apps/web/src/lib/enrichment/providers/booking-rapidapi/`. ~1,400 lines TS. Mode-aware client (live / dry-run / recorded-fixture); live mode stubbed and throws (Phase 3 work item). Endpoint wrappers for E0–E3 with publisher-validation deferred. Defensive parser with field-level validation gates (geo range, postal regex, country code, star range, review score range). Mapper from parsed payload → CanonicalHotelDraft + ProvenanceEntry[] using the registries shipped in Milestone 1. Tier-A confidence floors aligned with arch doc §3 (self-authoritative 1.00 / validated structural 0.85–0.95 / standard 0.85 / heuristic 0.70–0.85). Dry-run orchestrator emits per-fixture coverage counts (TIER-0/1/2) and diagnostics.
- **Fixtures + sample outputs (operator review artifacts)** — 3 representative Madrid hotels: (1) Ritz by Belmond (luxury · 5★ · central · Belmond LVMH); (2) NH Collection Eurobuilding (upper_upscale · 4★ · Chamartín · NH Hotel Group · MICE-heavy with rooftop); (3) Ibis Madrid Centro Las Ventas (midscale · 3★ · Salamanca · Accor · **Spanish-only facility list** + **missing total_rooms** — designed to exercise multilingual normalization AND demonstrate why fallback is mandatory). Each fixture has a hand-computed deterministic `sample-output-<label>.json` showing parse → mapping → provenance → coverage tiers. Aggregate file shows: avg TIER-2 coverage 43.9% (Booking-only ceiling) vs 84% institutional threshold = **40.1pp gap**, empirically confirming the architecture-doc estimate that the fallback chain is mandatory.
- **Runner script** — `apps/web/scripts/enrichment-booking-dry-run.ts`. Reads fixtures, runs the pipeline, writes per-fixture + aggregate outputs. Requires `tsx` (dev-dep addition deferred to Phase 2 to avoid lockfile churn in milestone branch); hand-computed outputs ship as the operator-facing artifact in the meantime.
- **Calibration evidence in sample outputs**:
  - Brand registry resolved 3/3 (Belmond luxury · NH upper_upscale · Accor midscale).
  - Municipio registry resolved 3/3 via postal-prefix lookup at 0.95 confidence (geo-anchored — highest authority).
  - Hotel-type registry resolved 3/3 to `urban` from the generic `Hotel` type at 0.70 (expected lower confidence for non-specific accommodation types).
  - Segment derivation correctly used `chain_scale` (highest priority) in all 3 cases.
  - Spanish-only Ibis fixture: 4/8 facility strings matched (bar de hotel · restaurante · aparcamiento · sala de fitness). The 4 unmapped strings are outside the canonical 14-key institutional set (WiFi · 24h reception · A/C · non-smoking — these are universal, not differentiating, hence excluded from the institutional bitmap).
- **Phase 1 hard rules still in force**: NO live HTTP calls (live mode throws) · NO scraping · NO image bulk download · NO touch on underwriting/report-system/sync · migration 0024 NOT applied · no dev-dep changes (tsx deferred).
- **Operator gate now open**: review the 3 `sample-output-*.json` files. If calibration looks right, Phase B (RapidAPI subscription + env var provisioning + live mode implementation) can begin.
- ENTRYPOINTS.md updated with 12 new rows.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Foundation layer (coverage targets · registries · migration draft 0024)

- Operator switched workstream to autonomous mode targeting ~80% Madrid feature coverage for institutional reports. This milestone lands the foundation: what 80% means, how it is measured, the lookup data that drives normalization, and the schema to store everything.
- **Institutional feature coverage targets v1** — `docs/hotel-intelligence/institutional-feature-coverage-targets-v1.md`. 4 tiers (T0 mandatory 8 fields · T1 institutional minimum 12 fields · T2 80% target 19 fields · T3 nice-to-have). Per-hotel passing condition: T0 8/8 + T1 ≥11/12 + T2 ≥16/19 at conf ≥0.70. Madrid-level goal: ≥70% of ~1,800 non-quarantined hotels at per-hotel passing = ~1,260 hotels at institutional 80%. Per-report-surface demand mapped across Library / Executive Summary / Asset Analysis / CAPEX / CompSet / Market Overview / Financials / Match Engine. Booking-only ceiling estimated ~70% T2 → fallback chain (Google Places + hotel website + Wikidata) mandatory to reach goal. Six assumptions taken under autonomy and explicitly flagged.
- **Coverage measurement spec v1** — `docs/hotel-intelligence/coverage-measurement-spec-v1.md`. Four views: per-hotel raw (`hotel_coverage_v`), per-hotel scored (`hotel_coverage_scored_v` adds `t0_complete`/`t1_passing`/`t2_passing`/`institutional_passing`), per-market aggregate (`hotel_coverage_market_v`), Madrid headline (`hotel_coverage_madrid_v` with `goal_reached` boolean). Three operator-facing queries (headline status · close-to-passing list · most-missing-field). All four views ship inside migration 0024.
- **Canonical registries (TS)** — `apps/web/src/lib/enrichment/registries/`. Pure data + pure helpers, no I/O. Six files (~1,200 lines total): `brands.ts` (~80 entries covering Spanish chains NH/Meliá/Barceló/Iberostar/Hotusa/Vincci/Catalonia/Room Mate/Sercotel + international families Marriott/Hilton/Hyatt/IHG/Accor/Radisson/Wyndham/Best Western/Four Seasons/Mandarin/Rosewood/Bvlgari/Belmond + slug-keyed with multilingual aliases and chain-scale mapping via existing `hotel_segment` enum), `amenities.ts` (multilingual ES+EN → 14-key canonical bitmap, tri-state per key, `resolveAmenityList` returns bitmap + resolutions + unmapped), `madrid-municipios.ts` (19 metro entries fold to `city_normalized="Madrid"` with postal-prefix index for geo-anchored resolution + 4 separate-market entries Alcalá/Aranjuez/El Escorial/Chinchón), `hotel-types.ts` (accommodation_type_name → hotel_type with exclude flag for hostels/apartments/B&Bs + `deriveSegment` priority chain: chainScale > lifestyle > type > star). Barrel export + README documenting conventions.
- **Migration draft `0024_hotel_enrichment_schema.sql`** — `docs/database/migrations/`. **NOT yet applied.** 8 tables (hotel_canonical · hotel_source_record · hotel_field_provenance · hotel_enrichment_run · hotel_duplicate_candidate · hotel_enrichment_job · hotel_enrichment_dlq · rate_limit_state) · 10 new enums · 4 coverage views · RLS posture (service-role-only on internal tables; authenticated read on canonical non-deleted rows) · GIST geom index · partial unique indexes on external IDs · `updated_at` triggers · institutional column comments. Reuses existing `hotel_segment` enum (migration 0006) for both `segment` and `chain_scale` columns and FKs `operator_id` to existing `public.operators` table — no duplication.
- **Architecture doc fix-up** — migration number references corrected from `0008` to `0024` across `madrid-enrichment-architecture-v1.md` (5 occurrences) and `madrid-enrichment-rapidapi-booking-v1.md` (2 occurrences). The `0008` slot is already taken by `0008_ceo_orchestration_agent.sql`.
- Phase 1 hard rules still in force: NO production calls · NO scraping · NO image bulk download · NO touch on underwriting/report-system/synchronization · migration NOT applied without operator sign-off.
- Forward path: with foundation landed, next milestones (autonomous) are the Madrid bootstrap plan, the Booking RapidAPI client scaffold (provider layer, gated to dry-run mode), and the dedup engine implementation. All staged on `feature/hotel-enrichment-pipeline`.
- ENTRYPOINTS.md updated: Hotel Enrichment Pipeline domain section grows with 9 new rows.

---

## 2026-05-19 — Hotel Enrichment Pipeline · RapidAPI Booking provider sidecar v1 (NO code · NO calls)

- New sidecar doc: `docs/hotel-intelligence/madrid-enrichment-rapidapi-booking-v1.md` (~650 lines) covering 9 provider-specific sections + open questions + non-goals. Strategic separation enforced: canonical architecture (source-agnostic) stays in main doc; this sidecar isolates RapidAPI Booking specifics so future provider swaps (Expedia / Partner API / STR / scraping) don't contaminate the canonical layer.
- Sections: (1) endpoint inventory E0–E9 with Phase-1 active set E0+E1+E2+conditional E3 = ~2.5 calls/hotel · auth headers + 6 new env vars; (2) field mapping per endpoint with confidence floors and overwrite policies (E2 details · E1 search · E3 facilities · review isolation rule · cross-validation triggers); (3) rate-limit strategy with **projected Madrid sweep durations across 4 plan tiers** (Basic infeasible · Pro 25k recommended @ ~5.5 days · Ultra ~3 days · Mega <1 day) + nightly refresh feasibility math; (4) cost modeling — Madrid one-time $20–40 · Madrid annual $260–500 · Spain full annual $2.5–5k · plan escalation triggers · cost-per-useful-row analysis; (5) caching policy keyed to field-level volatility (static 90d / semi-static 30–60d / volatile metadata 7–14d / photos 30d / reviews 14d / pricing ≤24h) with 3-layer storage (L1 source_record · L2 in-process · L3 CDN); (6) RapidAPI-specific error taxonomy with 12 classes (quota_daily / rate_burst / plan_limit / payload_partial / geo_mismatch / duplicate / stale_listing / alias_drift / empty_page / schema_drift / auth / network) + DLQ shape extension + self-healing rules; (7) matching strategy enumerating 7 Booking-specific failure modes (apartment-block flooding · chain rebrand lag · same-name different-building · hotel+resort split · closed listing relaunch · extended-stay siblings · multilingual variants) + pre-canonical match gate algorithm; (8) image strategy — Phase 1 hero-download only + URLs for gallery · thumbnail pipeline + CDN policy gated to Phase 4 · per-binary provenance for takedown safety; (9) compliance — attribution defaults · API usage constraints · scraping bounded to Phase 4+ · PII/GDPR posture.
- Anchored on `booking-com15` publisher family (verification pending Phase 2 procurement). All quotas/costs are illustrative anchors; real procurement task in Phase 2.
- Phase 1 hard rules ratified: NO production calls · NO scraping · NO image bulk download · NO transactional endpoints · NO touch on underwriting/report-system/synchronization.
- ENTRYPOINTS.md updated with sidecar row under Hotel Enrichment Pipeline domain.

---

## 2026-05-19 — Hotel Enrichment Pipeline · Architecture v1 (parallel workstream · NO code · NO scraping)

- New branch `feature/hotel-enrichment-pipeline` opened off `main` HEAD (`abdb3e4`). Independent of underwriting deploy freeze and report synchronization — touches neither domain.
- New canonical doc: `docs/hotel-intelligence/madrid-enrichment-architecture-v1.md` (~570 lines) covering 11 institutional sections: canonical schema (`hotel_canonical` + 4 supporting tables + 10 enums) · per-field source hierarchy across 8 tiers (Booking RapidAPI as primary, scraping last-resort) · confidence model (tier × freshness × validation + agreement bonus, thresholds aligned with existing `/review` 0.92/0.80/0.65) · duplicate detection (two-layer: SHA1 block_key + composite scoring reusing 35/30/20/10/5 weights from `dedup_service.py`) · normalization pipeline (reuses `multilingual.py` pattern, inlined per project rule) · enrichment DAG (Booking → fallback → normalize → dedupe → merge → confidence → audit) · Supabase storage proposal (migration **0008** drafted in DDL, NOT applied) · rate limit strategy (token bucket per provider · circuit breaker · adaptive concurrency · AI-Ops cost guardrail pattern) · queue table `hotel_enrichment_job` + 7-level priority lanes · error taxonomy + DLQ + idempotency invariants · incremental refresh (per-source TTL + nightly stale-view scheduler + diff logging into existing `audit_log`).
- Phase 1 boundary is hard: doc only. No migration applied · no client code · no scraping · no UI · no agent runtime change. Pipeline positioned as `enrich_hotel` tool inside the existing Data Ingestion Agent (Tier 1).
- Zero touch on `valuation`, `underwriting`, `report_*` tables, report registry, or any synchronization layer.
- ENTRYPOINTS.md updated with new Domain section.

---

## 2026-05-19 — Phase 1A · Token registry added (additive · zero visual diff · Phase 1B codemods deferred)

- **Phase 1A executed**: `apps/web/tailwind.config.ts` +93 lines additive · `apps/web/src/app/globals.css` +36 lines additive. Adds new `editable-*` palette (anchored on `#005db7` as **interaction/system-state layer · NOT brand**), `risk-*` role aliases (emerald-700 / amber-700 / rose-700 strong hues preserved to keep covenant/reconciliation badge protagonism), sticky offset CSS variables (`--sticky-app/tight/rail/report`), `shell-*` max-widths (1600/1400/768 px), `memo-*` shadow tokens, `badge-*` font sizes (9/10/11 px), 7-step semantic z-index scale (`base/raised/sticky/overlay/dropdown/header/drawer/toast/popover`).
- Inline 12-line comment added above the `.dark` block in globals.css marking it as **dormant · do NOT add `dark:` variants** — kept for future dark-mode initiative as a separate decision.
- Build verified: `next build` clean · 63/63 routes regenerated · 0 warnings · 0 errors. Tailwind 3 JIT means new tokens emit zero CSS until consumed; current Phase 1A produces zero pixel diff on every surface.
- **Phase 1B (codemods) is now DEFERRED pending temporary public deploy of `/report/financials/underwriting` to hotelvalora.com**. Strategic priority pivot: stability > elegance for institutional flagship demo. Steps 2–7 (51× `#005db7` → `editable-600`, 18× sticky offsets, 14× shadows, 5× max-widths, ~10× z-index outliers, docs pass) hold until: (a) temp deploy live · (b) institutional QA pass · (c) operator green-light. No codemods, class replacements, spacing/width/typography/badge/sticky normalization, primitive promotions, shell migrations, or page migrations of any kind in the interim.
- New operational priority order: P1 stable underwriting deploy · P2 critical UX/PDF bugfixes · P3 report-system harmonization (Phase 1B+).
- Rollback: `git checkout HEAD -- apps/web/tailwind.config.ts apps/web/src/app/globals.css` restores pre-Phase-1A state (2 files · 0 deletions in current changes).

---

## 2026-05-19 — Phase 1 · Token harmonization plan (gated · approval pending · NO code change)

- New canonical doc: `docs/report/phase-1-token-harmonization.md` (~900 lines) covering all 4 required deliverables:
  - **A · Token Map** — `editable-{50..950}` palette anchored on `#005db7` · risk/warn/fail role tokens · spacing roles · sticky offset CSS variables (4 named offsets: app/tight/rail/report) · z-index 7-step scale · 3 shell max-widths · 3 badge size tokens · 3 density tokens · 5 memo shadow tokens · deprecated tokens list.
  - **B · Refactor plan** — file-by-file impact matrix (51 `#005db7` literals × 18 files · 18 sticky-offset files · 14 shadow inlines · 5 max-widths · ~10 z-index outliers) · reversibility tiers · 7-step migration order.
  - **C · Preview scope** — zero pixel diff on 15+ surfaces (§5.1) · two flagged micro-changes (§5.2 — 1536→1600 shell-report width + CapexDurationBadge text size) · 5 explicitly preserved surfaces.
  - **D · Approval gates** — Gate 0 (this plan) · Gate 1 (token registry PR) · Gate 2 (5 codemod PRs) · Gate 3 (visual diff) · Gate 4 (merge).
- Critical naming finding: `brand-*` Tailwind namespace is already a purple-blue legacy palette · cannot use `brand-blue-600` as proposed in synchronization-audit-v1. Plan introduces `editable-*` semantic role name instead.
- AppHeader real height confirmed: ~48px (`py-2.5` + content + 1px border). Sticky offsets `top-20/24/28` are intentional breathing room, not strict header alignment — codified as named offsets (`sticky-tight/rail/report`).
- Dark-mode dependency analysis: zero `dark:` variants in components · zero `.dark` class applications · zero shadcn variable consumers. `darkMode: "class"` is dead code. Recommendation: keep dormant + document · no decision in Phase 1.
- 7 open questions (Q1–Q7) require operator decision before Gate 1: shell-report width (1536 vs 1600) · `editable` namespace name · `#f6f8f7` token candidacy · CapexDurationBadge text size · dark-mode dormant-vs-remove · brand-* retirement · shadcn CSS variable retirement.
- Total estimate: 3 working days end-to-end. All changes additive + mechanical. Fully reversible per gate.
- ENTRYPOINTS.md updated with second link under Domain · Report Module.

---

## 2026-05-19 — Report system synchronization audit v1 (institutional · audit only · NO implementation)

- New canonical doc: `docs/report/synchronization-audit-v1.md` (~700 lines) covering: visual consistency audit · component reuse matrix · 12 cross-cutting divergences · canonical primitives proposal (12 Tier-1 promotions from `components/underwriting/primitives/` → `components/report/primitives/`) · 5-phase migration roadmap · risk classification (quick wins / medium / dangerous / high-risk coupling) · dependency graph · per-page sequencing · 7 open decisions (Q1–Q7) blocking Phase 1.
- North star: underwriting (`/report/financials/underwriting`) is the institutional reference; the rest of `/report/*` must align to it; admin / library / settings share tokens only, not voice.
- Maturity ranking of report pages (vs underwriting 10/10): P&L 9, CompSet 8, ExecSum 7, Market 6, Asset 5, CAPEX 4.
- Tier-1 promotion list (12 primitives): SectionShell · YearGrid · YearRow · SubtotalRow · DivisionRow · KpiHero · KpiTile · EditableTile · FloatingKpiStrip · InitialInvestmentBlock · ReconciliationBadge · RiskIndicator · ScenarioPicker.
- Retirement candidates: MetricRow · MetricTable · ReportSection (unused exports) · UpgradeCard (alias of UpgradeGate) · duplicate methodological-note · LockedGate ⇌ LockedUpgradeCard.
- Explicit non-goals: do NOT migrate admin bulk-action toolbar · library 39-col kiosk table · admin dark Bloomberg palette · render-configurator UI · Y1 monthly P&L expansion into the memo language. These stay separate.
- Total Phase 1–4 estimate: 10–16 working days (token harmonization 1–2d · primitive promotion 1–2d · 6 page migrations 5–8d · adjacent surface alignment 1–2d). Phase 5 (data-model convergence) deferred to a separate initiative.
- ENTRYPOINTS.md updated to surface the audit at the top of the Report Module section.

---

## 2026-05-19 — Phase A · documentation cleanup (stale banners + merges + canonicalization)

- Frozen-in-place banners added to 6 stale roots: `docs/underwriting.md` · `docs/financial-engine.md` · `docs/architecture/backend-architecture.md` (partial) · `docs/underwriting/excel-parity-block-3a.md` · `docs/underwriting/excel-parity-block-3b.md` · `docs/roadmap.md` · `docs/business-rules.md`.
- `docs/architecture/report-engine.md` content merged into `docs/report-system.md` (1-1-1-1-1 rule + data-layer file map absorbed); the merged file is now a redirect stub.
- `docs/design-system/components.md` ↔ `docs/component-library.md` scope split clarified (cross-cutting catalog vs report-domain primitives only).
- Inbound link updates in `ENTRYPOINTS.md`, `CLAUDE.md`, `docs/component-library.md`, `docs/report-system.md`: `business-rules.md` → `business-rules/{tier-system, report-visibility, promoted-reports}.md`; `roadmap.md` → `roadmap/{master-roadmap, current-sprint, backlog}.md`.
- No content deleted · all originals preserved with deprecation banners pointing to canonical replacements.

---

## 2026-05-19 — Underwriting · Section 01 Dynamic Cap Rate editable + Section 02 headline tiles unified with /report/financials/pl

- **Section 01** · Dynamic Cap Rate driver tile is now an EditableTile wired to the existing `cap_rate_entry_pct` override. Operators can override the engine-derived cap rate from the executive-summary grid directly · same path as the big inline editor on the DynamicCapRateEntryCard in Section 06.
- **Section 02 P&L** · headline grid trimmed from 6 to 5 tiles (dropped Stabilised EBITDA · the absolute number is in the table below; margins are now the institutional anchor). Stabilised GOP · GOP Margin · EBITDA Margin · EBITDA per key now consume `computePL(getDefaultAssumptions())` from `lib/report/financials/` · numbers MATCH the standalone P&L page exactly.
- **P&L data divergence DOCUMENTED** · the 5-year table in Section 02 still consumes the engine PNL module (different shape · 11-year axis · different line items). Full unification needs an engine refactor (Phase 1-5 plan written in `docs/underwriting/pl-data-divergence.md`). Bumps ENGINE_VERSION to 0.3.0 when wired.

---

## 2026-05-19 — Underwriting · Dynamic Cap Rate engine ↔ admin policy divergence documented (refactor DEFERRED)

Found and documented a real architectural divergence between the admin/financials Dynamic Cap Rate policy (intended source of truth) and the underwriting engine that produces the displayed cap rate.

- The engine in `lib/underwriting/cap-rate-engine/adjustments/index.ts` has hardcoded coefficients that do NOT consume `DYNAMIC_CAP_RATE_POLICY_DEFAULTS` from `lib/admin/financials/dynamic-cap-rate-policy.ts`.
- Numerical coincidence on the default Madrid Centro 4★ asset (~6,45%) masks the divergence, but the two systems use different `size`, `renovation`, `operator`, `liquidity` coefficients and different base yields.
- Concrete divergences identified · Size 4★ +200 keys (admin -0,25 vs engine -0,10) · Renovation non-capex 4★ +200 (admin +0,25 vs engine 0) · Operator (admin missing) · Liquidity (admin missing).
- Refactor plan written in detail (5 phases · file-level map · acceptance test) — deferred to post-merge to avoid scope-creep on the underwriting page WIP.
- The UI presentation work continues unaffected · the "View methodology" disclosure already links to `/user/admin/financials` so the calibration source contract is honest forward-looking even though the wiring isn't complete yet.
- New doc: `docs/underwriting/cap-rate-policy-divergence.md` (side-by-side table · refactor plan · acceptance test · file-impact map · engine version bump plan to 0.3.0 when wired).

---

## 2026-05-19 — Underwriting · Dynamic Cap Rate Engine UX · institutional intelligence direction

Refactored the Section 06 Cap Rate Engine surface to feel like institutional valuation intelligence rather than an analyst worksheet.

- `DynamicCapRateEntryCard` simplified · memo-style · big cap rate + single institutional context sentence (Market · Category · Size · State · Scenario) + "View methodology" disclosure. Signal-chip strip removed.
- `MethodologyDisclosure` now CONTEXTUAL · `buildActiveFactors(asset, scenarioId, dynamic)` returns only the adjustments active in the current valuation · no numeric deltas exposed · institutional narrative.
- Right column collapsed from 3 cards (Confidence with 4-factor decomposition + Market Evidence list + Comparables) to single `MarketContextCard` · Confidence at-a-glance + Evidence one-liner + future drill-down slot. The 4-factor decomposition lives in admin/financials.
- Methodology disclosure footer links to `/user/admin/financials` · Dynamic Cap Rate policy positioned as source of truth (even though the engine doesn't fully consume it yet — see divergence doc).

---

## 2026-05-19 — Underwriting · hybrid temporal model · InitialInvestmentBlock + Operating Hold

Resolved the inconsistency in capital-side schedules after the Y0 column was hidden. The acquisition phase no longer appears as a column anywhere, but capital-deployment data now surfaces in a dedicated `InitialInvestmentBlock` above the operating YearGrid in the four sections where it matters.

- **New primitive** `components/underwriting/primitives/initial-investment-block.tsx` · institutional Sources & Uses card · two-column responsive · per-side subtotal + Sources−Uses balance reconciliation · amber-700 outflows / emerald-700 inflows · print-safe.
- **Section 04 Cash Flow** · operating schedule simplified (removed Investment + Financing + Equity division rows since their data lives in the new block). Initial Investment block shows: Acquisition · CAPEX · Contingency · Fees+Taxes (Uses) + Debt Drawn · Equity Drawn (Sources) with `%` of total on the major lines. Caption renamed to "Operating Hold · Y1 → Y{exit}".
- **Section 07 Financing** · added small `Initial Investment · Funding` block listing every tranche with principal, share of stack, effective rate. Removed the `Drawdown` row from the portfolio schedule (Y0-only data, already surfaced in capital stack viz + new block).
- **Section 06 Investment** · Total Investment hero eyebrow relabeled `Initial Investment`, with secondary line keeping the original "Total Investment" framing. No layout change.
- **Section 08 Exit** · added `Initial Investment · IRR seed` block above the operating YearGrid: Project (unlevered) + Equity (levered) IRR seeds + Debt drawn. Operating CF caption renamed to "Operating Hold + Exit · Y1 → Y{exit}".
- `docs/underwriting/phase-model.md` updated: hybrid model documented · primitive contract · per-section treatment map · where Y0 lives.

---

## 2026-05-19 — Underwriting · unified operating-only schedules across all 6 year-grids

Extended the operating-only schedule convention from P&L to every tabular section in the underwriting report. The IC reader now sees a single coherent timeline (Y1 → Y{exit}) across every schedule — no inconsistent temporal models, no empty Y0 columns anywhere.

- **Section 02 P&L** · already operating-only.
- **Section 03 Balance Sheet** · `kind="operating" excludeAcquisition` · cols recomputed.
- **Section 04 Cash Flow** · same.
- **Section 05 DTA** · same.
- **Section 06 Investment D&A** · plain HTML table · manual `visibleIndices` filter mirrors the YearGrid logic.
- **Section 07 Financing portfolio schedule** · same.
- **Section 08 Exit project + equity CF** · same.
- The capital deployment story (acquisition outflow, debt drawdown, equity injection, total building cost) is fully surfaced via the dedicated headline tiles in Sections 01 / 06 / 07 / 08 · the schedules no longer repeat it.
- Engine + reconciliation + parity untouched · phases still computed for every period, only the *view* filters them out.
- `docs/underwriting/phase-model.md` updated to the unified standard with section-by-section treatment map.

---

## 2026-05-19 — Underwriting · P&L hides Acquisition column entirely

Iterated on the phase-aware presentation after seeing the muted Acquisition column in context: it broke rhythm + generated dead space + reduced legibility. Operating tables now **hide acquisition periods entirely** instead of muting them. The P&L timeline starts directly at Year 1 — the institutional convention for IC operating memos.

- `YearGrid` gains an `excludeAcquisition?: boolean` prop. Context refactored from `{ limit, phases, kind }` to `{ visibleIndices, phases, kind }` — children now pick values at projected indices instead of slicing 0..N.
- `YearRow` + `SubtotalRow` simplified: no more phase-aware muting branch (column is gone, not muted). `displayValues = visibleIndices.map((i) => values[i])`.
- `pnl-section.tsx` passes `excludeAcquisition` + recomputes `cols` from `periods.filter((p) => p.phase === "operating")`. P&L now reads Y1..Y7 (or whatever exit year is).
- Capital tables (CF · Investment · Financing · BS · Exit) unchanged · Y0 remains fully visible with the "Acquisition · Pre-opening · Y0" header eyebrow — capital deployment is the core of the underwriting there.
- Engine + temporal model unchanged · phases still computed for every period · only the operating-side *view* filters them out.
- Updated methodology doc: `docs/underwriting/phase-model.md` (deprecates the muted variant, documents the hidden-column convention, future-proofs for multi-period acquisitions / phased renovations / staged openings).

---

## 2026-05-19 — Underwriting · phase-aware period axis · Acquisition vs Operating

Introduced an institutional phase model so the IC reader instantly distinguishes the closing event (acquisition · capital deployment) from operating periods. Year 0 stays in every table — only the *presentation* differentiates by phase.

- `lib/underwriting/temporal.ts`: `PeriodPhase` type (`acquisition` | `operating`), `Period.phase` field, `markAcquisitionPhase(periods, count = 1)` helper. `YEARLY_PERIODS_Y0_Y10` tags Y0 as `acquisition`. `monthlyPeriods` + `quarterlyPeriods` accept an `acquisition*` count param.
- `YearGrid` carries Context with `phases[] + kind`. New `kind: "operating" | "capital"` prop drives styling. Header renders **"Acquisition · Pre-opening · Y0"** (eyebrow + small period reference) instead of "Year 0" for acquisition columns.
- `YearRow` + `SubtotalRow` read context. In `kind="operating"` tables, acquisition cells get muted bg (slate-50) + slate-400 text + **"n.a." for zero values** (no empty cells, no spreadsheet look). In `kind="capital"` tables, acquisition cells render at full weight — Y0 is the underwriting.
- Applied to `pnl-section` first (Section 02). CF / Investment / Financing / BS keep capital-style rendering — Y0 stays bold because equity injection, debt draw, total investment all live there.
- Future-proofed for multi-period acquisitions, phased renovations, staged openings, delayed stabilization — single helper call (`markAcquisitionPhase(periods, N)`).
- New methodology note: `docs/underwriting/phase-model.md` (taxonomy · presentation rules per table category · PDF discipline · future-proofing).

---

## 2026-05-19 — Underwriting OS · Engine 0.2.0 · Project + Equity IRR layer separation

Corrected the institutional semantics of Project IRR. Previously the engine subtracted cash tax (with the levered interest shield) and used the net-of-fees exit price for the unlevered Project IRR — neither truly unlevered nor truly pre-tax. Now `project_irr_pct` is clean **unlevered · pre-tax** (EBITDA + gross exit) and `equity_irr_pct` is clean **levered · post-tax** (EBITDA − cashTax − debtService + exit net of fees − debt payoff).

- `engine/exit.ts` rewritten: split per-period CF construction by layer using new pure helpers.
- `engine/formulas.ts`: added `projectUnleveredPretaxOperatingCf` + `equityLeveredPosttaxOperatingCf`, both registered in `FORMULAS`.
- `types.ts` `ExitMetrics` doc-commented; 4 future-proof slots added (`project_irr_posttax_pct`, `equity_irr_gross_pct`, `lp_irr_pct`, `gp_irr_pct`) for Block 9 waterfall + Block 10 post-tax project.
- `versioning.ts`: `ENGINE_VERSION` 0.1.0-scaffold → **0.2.0**, `SCHEMA_VERSION` 1.0.0 → **1.1.0**. Snapshots created with 0.1.0 will compute different Project IRR on recompute (expected drift ~+150-250 bps on base case).
- UI labels in `executive-summary-section.tsx`, `exit-section.tsx`, `underwriting-shell.tsx` (FloatingKpiStrip) updated to explicit "Unlevered · pre-tax" / "Levered · post-tax". No ambiguity.
- New methodology note: `docs/underwriting/irr-layer-separation.md` (rationale, target bands, future-proof slots, parity impact, files touched).

---

## 2026-05-18 — Underwriting · corporate light theme · ReportPaper continuity with 5-Year P&L

Flipped the entire `/report/financials/underwriting` surface from the dark slate/lime committee theme to the canonical corporate light theme — white bg, black text, blue (#005db7) on every editable assumption. Continues directly from `/report/financials/pl` with identical paper card, header band, ActionBar footer.

- Page wrapper now mirrors PL: `ReportShell` → `ReportPaper(sectionLabel="hotel valuation", title="Underwriting", headerLayout="stacked", closed, actions={Prime + HotelToggle})` → `UnderwritingShell` → `ActionBar`. Print orientation stays landscape (year grids need horizontal real estate).
- Editable surfaces unified on blue: `EditableTile`, `DepreciationYearsTile`, `YearsInput` use `border-blue-200 + bg-blue-50/40 + text-[#005db7]` with a blue "Edit" pill — same contract as P&L's `EditableAssumptionCell`.
- Primitives flipped: `SectionShell`, `KpiHero`/`KpiTile`, `FloatingKpiStrip`, `YearGrid`, `YearRow`, `SubtotalRow`/`DivisionRow`, `RiskIndicator`, `ReconciliationBadge`, `ScenarioPicker`, `StickySectionNav` — all dark `slate-800/60`/`bg-slate-900/40`/`lime-300` swapped for `border-slate-200`/`bg-white`/`text-slate-900` with `forest-50`/`forest-900` for the protagonist tiles.
- Section inline tiles flipped: `executive-summary` (`DriverTile`, `ResultTile`, `ScenarioStrip`), `investment` (`HeadlineTile`, `AcquisitionSummary`, `CapRateRationale`, `EvidencePanel`, `TotalInvestmentHero`, `StabilisedYieldProgression`, `DASchedule`, `ItemTable`), `financing` (`DebtStackVisualization`, `TrancheTile`, `PortfolioScheduleSummary`), `exit` (`ValuationCard`, `ValueCreationBridge`, `BridgeRow`, `CapRateRationaleStrip`, `EquityTimeline`, `SummaryStat`).
- Mobile-first responsive: headline KPI grids switch from `sm:grid-cols-2` (which collapsed to 1-col on phones) to `grid-cols-2 sm:grid-cols-2 …` baseline — 2-col on the smallest viewport, expands as breakpoints allow.

---

## 2026-05-18 — Underwriting OS · Block 6 · Dynamic Cap Rate Engine (CORE IP · market intelligence layer)

Built the proprietary intelligence layer that converts comparable-transaction evidence into a defensible cap-rate recommendation with rationale, confidence and audit trail. This is HotelVALORA's commercial moat vs spreadsheets / generic underwriting apps / Argus-lite clones.

### Module · `lib/underwriting/cap-rate-engine/`
5-layer architecture · pure functions · deterministic:

```
cap-rate-engine/
├── index.ts                  · runDynamicCapRate(ctx)
├── types.ts                  · single source of truth
├── evidence/
│   ├── index.ts              · buildMarketEvidence · filter + scope + derive
│   └── seeded-comps.ts       · 12 Madrid + BCN + MRB transactions (MVP)
├── adjustments/
│   └── index.ts              · 8 named policy adjustments
├── confidence/
│   └── index.ts              · 4 sub-scores → composite 0-100
├── rationale/
│   └── index.ts              · structured trace + auto narrative
└── overrides/
    └── index.ts              · operator audit trail
```

### Layer 1 · Market Evidence
- Filter: staleness > 36m · category gap > 1* · size ratio > 5×
- Scope: submarket → market → national fallback
- Derive: median · mean · IQR · stddev · liquidity 12m/24m metrics
- Every exclusion captured in `comparables_excluded[]` with reason

### Layer 2 · Adjustment Policy (proprietary IP)
8 named adjustments · each typed CapRateAdjustment:
- `base` · median of in-scope comps
- `category` · 5* −25 bps · 4* 0 · 3* +25 bps
- `size` · ≥200 keys −10 bps · 100-199 0 · <100 +20 bps
- `renovation` · new −10 bps · renovated 0 · needs_work +50 bps
- `operator` · branded chain −10 bps (default)
- `macro` · per 100 bps Euribor above LT mean → +20 bps
- `liquidity` · ≥6 deals/12m −5 bps · <3 +20 bps
- `scenario` · downside +30 bps · base 0 · upside −20 bps · stress +60 bps
- `side` · exit +20 bps (terminal hedge)

### Layer 3 · Confidence Engine
Composite 0-100 weighted blend:
- Sufficiency 30% · # of comps surviving filter
- Volatility 25% · IQR spread / median
- Staleness 20% · age of most recent comp
- Coverage 25% · submarket + category match share

Bands: very_low (<30) · low (30-50) · medium (50-70) · high (70-85) · very_high (≥85)

### Layer 4 · Explainability
- Structured RationaleTrace · base + adjustments + recommended + band + evidence_used + evidence_excluded + confidence
- Auto-generated narrative · one paragraph operator-grade text · "5 comparable transactions in Madrid Centro (4*) cluster around 6.20% (IQR 6.10% — 6.30%). After applying Macro · Euribor 12m at 2.75% (+0.25pp) · Liquidity · 2 deals last 12m (+0.20pp) · Size · 256 keys (-0.10pp), the engine recommends 6.45% with high confidence (score 80/100)."

### Layer 5 · Override
- `enabled` · `manual_value_pct` · `operator_rationale` · `operator_email` · `applied_at` · `delta_vs_recommended_pct`
- Audit-grade trail for committee defence
- Section 6 (Block 7) will render "Override engaged" badge with delta

### Wiring
- `engine/cap-rate.ts` now delegates to the new engine via `runDynamicCapRate(ctx)` for both entry + exit
- Seeded comps from `SEEDED_HOTEL_COMPS` (Block 7 swaps for Supabase Intelligence Layer query)
- `inputs.financing.euribor_12m_pct` flows into the macro adjustment
- `inputs.scenario_id` drives scenario overlay (entry + exit both react)

### Section 6 · UI updates
- `CapRateRationale` block now renders 5-layer richer shape:
  - Confidence score `X/100 (band)` color-coded (emerald/amber/rose)
  - Each adjustment row with category tag + label + rationale + signed Δ
  - New `EvidencePanel` below rationale: comp count · median · IQR · date range · liquidity 12m · 4-component confidence breakdown · excluded comps summary
- Helper formatters `fmtPctPoints` / `fmtPctPointsDelta` (adjustments now in percentage points, not decimals)

### Type contracts (`lib/underwriting/types.ts`)
- `DynamicCapRateResult` now re-exports the rich 5-layer shape from `cap-rate-engine/types`
- Added re-exports for `MarketEvidence`, `ConfidenceScore`, `RationaleTrace`, `CapRateOverride`, `CompTransaction`, `RatesRegime`, etc.
- Legacy `CapRateComparable` kept for backward compat

### Engine outputs · base scenario (Madrid Centro · 4* · 256 keys)

| Metric | Value | Source |
|---|---:|---|
| Entry cap rate (used) | **6.45 %** | dynamic (override disabled) |
| Exit cap rate (used) | **6.65 %** | dynamic (override disabled) |
| Band (entry) | 6.15 — 6.75 % | confidence-widened |
| Confidence | **80/100 (high)** | sufficiency 50 · volatility 95 · staleness 95 · coverage 90 |
| Comps in scope | 5 | submarket+category exact match |
| Comps excluded | 7 | 4 stale · 3 outside submarket |
| Median of in-scope | 6.20 % | 5 Madrid Centro 4* transactions |

Downstream: equity IRR re-prices from 9.40% → 7.84% (lower exit price at 6.65% vs the previous 6.25% override). The engine actively shapes underwriting outcomes instead of being a static input.

### Inspection tooling
- `scripts/cap-rate-inspect.mjs` · per-side breakdown of evidence + adjustments + confidence + narrative + override (runnable via `npx tsx`)
- `scripts/engine-parity-check.mjs` · BS still balances perfectly with new cap rate engine driving exit

### Documentation
- `docs/underwriting/dynamic-cap-rate-engine.md` · full 5-layer architecture spec · default policy calibration table · confidence weighting · filtering rules · Block 7 evolution path

### Block 7+ deliberately NOT in scope
- Cap Rate Policy Editor (admin UI for tuning weights)
- Live Supabase Intelligence Layer query (swaps SEEDED_HOTEL_COMPS)
- Sensitivity matrix (recommended × scenario × evidence subset)
- Promote-waterfall integration (LP/GP tranches)
- Comparable-transaction map (visual evidence overlay)

### Verification
- `npm run typecheck` · 0 errors
- `engine-parity-check.mjs` · all 6 hard invariants PASS · BS balances all 11 periods Δ = 0.00 €
- `cap-rate-inspect.mjs` · institutional-grade narrative + traceable evidence

---

## 2026-05-18 — Underwriting OS · Block 3B · accounting + valuation truth (DTA · Exit · CF · BS · reconciliation hardening)

Closed the accounting / valuation / balance-sheet / reconciliation layer of the underwriting OS. All 6 hard invariants pass · BS balances to subEuro across all 11 periods · cash bridge perfect.

### DTA (Spanish Ley IS · accounting-grade rigor)
- `engine/dta.ts` · full roll-forward (opening · increases · decreases · ending) in tax €
- Excel-grade limit logic: cap = `max(30% × EBITDA, 1M €)` per Ley IS art. 16
- Explicit separation: **current tax** (cash) · **deferred tax** (DTA movement) · **accounting tax** (P&L line = current − deferred-movement)
- Engine traces: Y1 builds 235k DTA (940k non-deductible × 25%), peaks at 618k Y4, fully unwinds by Y9 as EBITDA capacity opens; residual at Y7 (366k) absorbed by gain on sale at exit
- Expiry-ready structure (Spain has no carryforward expiry today)
- Post-exit silencing (operations stopped · DTA absorbed by realisation event)

### Exit (4-layer architecture)
- `engine/exit.ts` · layered: Operational Exit (stabilized NOI) → Market Exit (cap rate + fees) → Capital Structure Exit (debt unwind + bullet) → Equity Layer (distributions + IRR + MOIC)
- No "single formula exit" · every layer traceable and operator-auditable
- Hooks left for Block 6 Cap Rate Engine (stabilized_noi, exit yield, valuation interfaces) and Block 9 promote waterfall (LP/GP tranches)

### IRR engine (deterministic + edge-case-safe)
- `engine/formulas.ts` · `irrPct` hardened:
  - Validates ≥1 positive AND ≥1 negative flow (else NaN, mathematically undefined)
  - Coarse bracket scan (−95% to +1000% in 5% steps)
  - Newton-Raphson from bracket midpoint · 60 iter max
  - Bisection fallback when NR diverges or exits bracket · 200 iter, guaranteed convergence
  - Tolerance 1e-9 · returns NaN only when undefined
- `npv(flows, r)` exposed as standalone helper · registered in `FORMULAS`

### Cash Flow (direct method · 4 sections + cash bridge)
- `engine/cash-flow.ts` · separated: Operating · Investment · Financing · Equity
- Exit-year handling: net exit proceeds + debt payoff in one shot
- Post-exit silencing: all CF lines = 0 (no phantom debt service after disposal)
- Cash bridge to BS verified ±0 € across all transitions

### Balance Sheet (first-class reconciliation layer)
- `engine/balance-sheet.ts` · proper roll-forward of building (25y SL) · MEP (7y SL) · DTA asset · cash bridge · equity components
- ACCOUNTING net income (not pnl.net_income) used for retained earnings = `pnl.ebt − dta.cit_pl`
- Exit-year asset disposal: book value → 0, gain on sale recognised in accounting NI, DTA written off (absorbed by fiscal gain)
- Post-exit: assets stay at cash · debt = 0 · equity captures all proceeds
- All 11 periods balance to 0.00 € (subEuro precision)

### Reconciliation hardening
- `engine/reconciliation.ts` · 6 invariants with severity (info · warn · fail) + metadata + tolerance-aware
  - I-1 BS balance · HARD ±1€
  - I-2 Cash bridge · HARD ±1€
  - I-3 DSCR ≥ 1.0 pre-exit · WARN (skips post-exit periods)
  - I-4 DTA non-negative · HARD ±1€
  - I-5 Σ Y0 drawdowns ≡ Σ tranche principals · HARD ±1€
  - I-6 Retained earnings continuity · HARD ±1€
- DSCR / ICR / LTV computed post-pass from PnL EBITDA + financing aggregates · patched back into `prior.financing` so Section 7 renders ratios
- Findings carry `id`, `invariant`, `severity`, `message`, `period_index`, `expected`, `actual`, `delta`, `tolerance`

### Defaults fix
- `defaults.ts` · notary_registry_pct corrected (0.02 → 0.0002 = 0.02%) and ajd_pct (0.06 → 0.0006 = 0.06%) · Block 3A parity report had documented Excel values that didn't match the engine inputs because the inputs were 100× too large · now both sides reconcile

### DAG updates
- `exit` now depends on `["cap_rate", "pnl", "dta", "financing", "investment"]`
- `balance_sheet` now depends on `["pnl", "financing", "dta", "cash_flow", "investment", "exit"]`

### Parity infrastructure
- `apps/web/scripts/engine-parity-check.mjs` · runnable parity-validation script (`npx tsx scripts/engine-parity-check.mjs`)
- `docs/underwriting/excel-parity-block-3b.md` · full report · all 6 hard invariants pass · 0 fail · 6 scenario warnings (DSCR < 1.0 Y2-Y7 from under-sized CAPEX tranche · not engine bug)

### Engine outputs (base scenario · Madrid Centro · 256 keys · exit Y7)
- Stabilized NOI Y7 = 6,048,000 €
- Exit price gross = 96,768,000 € · net of fees = 95,316,480 €
- Debt repayment at exit = 31,400,881 €
- Equity investment Y0 = 30,266,767 €
- **Project IRR = 6.49%** · **Equity IRR = 9.40%** · **MOIC = 1.672x**
- BS balances perfectly Y0-Y10 (Δ = 0.00 €)

### Verification
- `npm run typecheck` · 0 errors
- `engine-parity-check.mjs` · all hard invariants PASS · only WARN findings (scenario-level)

---

## 2026-05-18 — Underwriting OS · Block 3A · foundational financial engine (investment + financing + P&L · all Excel-parity validated)

Wired real engine math for the three foundational modules per the operator's reconciliation-first discipline. Every formula reverse-engineered from the operator's reference Excel and validated cell-by-cell against the Madrid Centro 4* / 256-keys baseline.

### Modules wired (real math)
- **`investment.compute`** — restructured to match Excel formulas exactly:
  - Exterior basis = `MEP + FF&E + OS&E` (reverse-engineered; was previously `× asking_price` and drifted 1.46M €)
  - TC + Dev fee base = `HARD + PRE + FF&E + OS&E`
  - Contingency base = `HARD + SOFT_pre_contingency_and_insurance` (excludes insurance + contingency itself)
  - Insurance dev = `pct × asking_price`
  - 2 UI buckets (Hard · Soft) per operator spec — Contingency + Insurance moved into Soft
- **`financing.compute`** — per-tranche amortization (straight · bullet · interest-only · custom) + portfolio aggregation:
  - DebtTranche-first · respects `origination_period_index` + `grace_periods` + `maturity_periods`
  - Floating rate stack (Euribor base + margin · with optional floor/cap)
  - Drawdown at origination · principal series respects amortization kind
  - DSCR / ICR / LTV intentionally zero · Block 3B fills (needs NOI from PnL)
- **`pnl.compute`** — full USALI-style P&L:
  - GOP from `inputs.pl_drivers.gop` (hotel + F&B + other)
  - Costs from `inputs.pl_drivers.costs` (mgmt fee · property tax · insurance · FF&E reserve)
  - EBITDA after Replacement → D&A (building + MEP straight-line) → EBIT
  - Financial Expenses = −Σ tranche interest (from financing)
  - EBT → CIT (25% gross · Block 4 wires Ley IS 30%-EBITDA cap on Financial Expenses)
  - Net Income · cumulative Total Net Income

### Parity validation
- **30 / 30 checks pass · 0 drift · 0 fail** against the operator's Excel baseline (€ tolerance ±1, % tolerance ±0.1%)
- Full parity report: `docs/underwriting/excel-parity-block-3a.md` (every line · expected vs engine vs Δ · per-period tranche schedules · 7-year P&L roll)

### Parity infrastructure (Block 3+ standard)
- `engine/_constants.ts` — `PAYMENTS_PER_YEAR` · `TOLERANCE_EUR` (±1) · `TOLERANCE_PCT` (±0.1%) · `TOLERANCE_RATIO` (±0.05) · `TAX_DEFAULTS` · `SIGN` conventions
- `engine/parity.ts` — `ParityCheck` · `ParityResult` (`match` / `drift` / `fail`) · `runParityChecks` · markdown report formatters (`formatResultsAsMarkdown` · `formatSummaryAsMarkdown`)
- Every Block 3+ module must ship with parity checks before review

### Inputs unit cleanup
- `defaults.ts` pl_drivers expanded to actual € (×1000 from operator's k€ Excel notation) so financing / pnl downstream produce reconciliable numbers consistent with the rest of the engine (hotel_value, asking_price, tranche principals were already in actual €)

### Formula isolation audit
No duplication detected across modules · all cross-cutting math (DSCR · ICR · LTV · IRR · MOIC · Spanish Ley IS finexp cap · CIT · SL depreciation · per-key / per-sqm) stays in `engine/formulas.ts` and is imported by name.

### Block 3B prerequisites
- 3 foundational modules now Excel-parity-validated · safe to depend on
- Reconciliation module needs DSCR/ICR/LTV computation post-pnl
- Section 6 stabilised yield placeholder ramp will swap for `pnl.ebitda_after_replacement[t] / investment.total_building_cost` once CF reconciles

### Verification
- `npm run typecheck` · 0 errors
- 30/30 parity checks · 0 drift · 0 fail
- Sections 02 (P&L) · 06 (Investment) · 07 (Financing) now render real engine outputs without any UI changes (memorandum view inherits from Block 2 work)

---

## 2026-05-18 — Section 6 · Investment memorandum view (acquisition rationale · cap-rate explainability · CAPEX phases · stabilised yield)

Replaced the flat Investment / CAPEX scaffold with an institutional memorandum surface. Section 6 now reads as acquisition-committee backup / lender-ready breakdown.

### 4-block memorandum layout
- **Block A · Site Acquisition** — pricing (Asking · Hotel Value · €/key · €/m²) + Dynamic Cap Rate rationale stack + Acquisition costs itemised
- **Block B · CAPEX Breakdown** — Hard cost · Soft cost · Project costs · per-line (Total € · % CAPEX · €/key · €/m² · €/int. m²) + CAPEX phases banner
- **Block C · Total Investment** — hero (Total · €/key · €/m²) + composition bars + Stabilised yield progression Y1..Y5 (mini chart)
- **Block D · D&A schedule** — building / MEP useful lives + per-period D&A row

### Cap-rate rationale (CORE IP teaser)
5-layer narrative stack always rendered: Base Market Yield → Category → Size → Renovation state → Scenario, plus optional closure to operator override. Each layer carries `{ label, delta_pct, rationale }` so the committee defence is in the UI, not external. Block 6 wires the live MarketEvidence + ConfidenceEngine.

### CAPEX phases · future-proof
`InvestmentBreakdown.capex_phases: CapexPhase[]` ships ready for refurbishment waves · expansion · ESG retrofit · tenant improvement · operator contribution · insurance / contingency phases. MVP seeds one `initial_renovation` phase; Block 3 phases drawdowns into Cash Flow.

### Type contracts
- `InvestmentBreakdown` + `asking_price`, `hotel_value`, `capex_phases`, `stabilized_yield_progression`
- `BreakdownLine` + optional `assumption: string` (driver hint)
- New: `CapexBucketKind` · `CapexFundedBy` · `CapexPhase`
- `DynamicCapRateResult.adjustments` engine now seeds the 5-layer narrative

### Engine wiring (Block 2 deterministic placeholders)
- `engine/investment.ts` · full Excel-parity computation (mirrors operator's reference values)
- `engine/cap-rate.ts` · 5-layer narrative seeded from asset/scenario, closes to operator override
- `engine/pnl.ts` · stub D&A schedule (SL building + MEP) so Section 6 Block D renders

### Print discipline
Landscape · 4 memorandum blocks carry `print:break-inside-avoid` · dark→light theme inversion across all primitives · highlight bands use `print:bg-emerald-50` / `print:text-emerald-700`.

### Documentation
- `docs/underwriting/investment-memorandum.md` · canonical spec for Section 6 layout, cap-rate rationale layers, CAPEX phasing taxonomy, print discipline

### Verification
- `npm run typecheck` · 0 errors

---

## 2026-05-18 — Underwriting OS · Block 2 (engine architecture · DAG · temporal · tranches · versioning · reconciliation)

Refactored the `/report/financials/underwriting` foundation from the Block 1 shell into a deterministic, multi-scenario-ready calculation engine architecture.

### Engine architecture
- `lib/underwriting/engine/_types.ts` · EngineModule contract · `key` + `dependsOn` + pure `compute(ctx)`
- `lib/underwriting/engine/dag.ts` · ENGINE_DAG registry + Kahn's-algorithm topological sort · fails fast on cycle or missing node
- `lib/underwriting/engine/index.ts` · orchestrator · walks DAG · isolates module failures with reconciliation warnings
- 8 module scaffolds · cap-rate · investment · financing · pnl · dta · exit · cash-flow · balance-sheet
- `engine/reconciliation.ts` · institutional invariants (BS balance · cash↔CF · DSCR · DTA ≥ 0)
- `engine/formulas.ts` · centralised formula registry (DSCR · ICR · LTV · IRR Newton-Raphson · MOIC · Spanish Ley IS finexp cap · CIT · SL depreciation · per-key / per-sqm)

### Temporal model
- `lib/underwriting/temporal.ts` · Period + PeriodSeries · YEARLY_PERIODS_Y0_Y10 · monthlyPeriods / quarterlyPeriods builders · alignToSeries / zeroSeries / sumSeries / addSeries / subSeries / scaleSeries / cumSeries / lagSeries
- Renderers (`year-grid`, `subtotal-row` DivisionRow) no longer hardcode 11 columns · derive from `periods.length`
- Granularity contract documented per layer (reporting · operations · financing · taxes)

### Financing tranches
- `lib/underwriting/financing-tranches.ts` · DebtTranche first-class · 6 kinds (senior_secured · senior_capex · bullet · mezzanine · bridge · preferred_equity)
- PrincipalSpec (fixed_amount · ltv_of_value · ltc_of_total) · RateSpec (fixed · floating with floor/cap) · AmortizationSpec (straight · bullet · interest_only · custom)
- TrancheEvent (refinance · prepayment · covenant_breach · default · extension) · TrancheCovenant (DSCR_MIN · ICR_MIN · LTV_MAX · EBITDA_MIN)
- FinancingPortfolioSchedule aggregates per-tranche + portfolio totals + covenant breaches

### Scenario persistence contract
- `lib/underwriting/scenario.ts` · Asset → Scenario (mutable) → ScenarioSnapshot[] (immutable, deep-frozen)
- `freezeSnapshot(scenario, versionTag, meta)` + `deepFreeze<T>(obj)` · snapshots are NEVER silently recomputed; explicit "Recompute with current engine" action produces a new snapshot
- Legacy `UnderwritingScenario` discriminator (downside/base/upside · SCENARIO_LABELS · SCENARIO_OPTIONS) preserved for the financials report-level toggle

### Versioning
- `lib/underwriting/versioning.ts` · SCHEMA_VERSION "1.0.0" · ENGINE_VERSION "0.1.0-scaffold" · VersionTag interface · isCompatibleForRecompute (same MAJOR + MINOR)
- UnderwritingBundle now extends VersionTag

### Types refactor
- YearSeries (readonly 11-tuple) → PeriodSeries (number[] aligned to Period[]) across all schedules
- `financing.asset_tranche` / `capex_tranche` → `financing.tranches: DebtTranche[]`
- `FinancingSchedule` → `FinancingPortfolioSchedule` (per-tranche detail + portfolio aggregates)
- `dscr_per_year` → `dscr_per_period`

### Documentation
- `docs/underwriting/excel-audit-2026-05-18.md` · Excel range → engine module mapping · hardcoded constants flagged · Block 3 implementation order
- `docs/underwriting/temporal-model.md` · per-layer granularity contract · Period interface · convention (index 0 = closing year)

### Verification
- `npm run typecheck` · 0 errors

---

## 2026-05-15 — Admin / Financials · new reference page (CAPEX matrix · Financial structure · P&L Forecast COSTAR)

New `/user/admin/financials` surfaces HotelVALORA's institutional defaults for hospitality underwriting. Three cards · all fully editable with explicit Save flow · localStorage-backed (Phase D moves to Supabase admin_financial_settings).

### Sidebar nav
Added between **Hotels** and **Integrations** (both reference data layers · adjacent placement). `Calculator` icon · Live badge.

### Card 1 · CAPEX
- 12 line items · 3 groups (Hard cost · Soft cost · Project costs)
- 9-cell matrix per line: 3 key tiers (0–80 · 80–180 · 180+) × 3 star categories (3* · 4* · 5*)
- Per-row unit dropdown (€ total · € per key · € per m² · % total · default per key)
- Editable cells · compact format display (`200k` · `12,6k` · `5,6k`) · permissive parser (accepts `12600` · `12,6k` · `12.6k` · `200k` · `1,5M`)
- Reset row button · bottom band shows live totals per (tier, *)

### Card 2 · Financial structure
- 12 institutional baseline parameters: Hold period · LTV · LTC · cost of debt · DSCR · exit cap · Equity IRR · MOIC · fund mgmt fee · carried interest · transaction costs
- Each `value` cell editable · `label` / `unit` / `description` read-only

### Card 3 · P&L Forecast COSTAR
- Geo filter chips: País · Mercado · Submercado · Class (placeholder dropdowns · ready for CoStar API wiring)
- 4 reactive Room Stats boxes below filter row · show Occ% + ADR for the selected value of each dim · seeded `PNL_ROOM_STATS` lookup (6 countries · 12 markets · 6 submarkets · 6 classes)
- Assumptions-only table · 3 cols (P&L USALI · Assumption editable · Description editable)
- Sections: Operating Revenue (Rooms · Food · Beverage · Meeting Rooms · Spa · Parking) · Departmental Expenses (Rooms · Food · Beverage · Other) · Undistributed Expenses (Admin · Sales · Maint · Utilities) · Non Operating Charges (Mgmt fee · Property tax · Insurance · FF&E reserve)
- Subtotals (Total Revenue · GOP · EBITDA · % Margin) and computed lines (Rooms count · RevPAR) hidden from this view · belong in downstream forecast renderer

### Save / persistence model · `useDraftedOverrides` + `SaveBar`
- Live edits → React draft state · NO localStorage write per keystroke
- **Save changes** button (lime · forest text) appears in card header when draft differs from saved
- **Discard** link reverts draft to last saved state
- **Reset all to defaults** clears localStorage entirely (with confirm modal)
- **Saved · today HH:MM** indicator in clean state
- Hydration-safe: starts with defaults · merges localStorage on client-side useEffect · no SSR mismatch
- Edit semantics per cell: blur or Enter commits to draft · Escape reverts · permissive parsers tolerate Spanish notation (comma decimal, k/M suffixes)

### Files
**New:**
- `apps/web/src/app/user/admin/financials/page.tsx` (force-dynamic)
- `apps/web/src/lib/admin/financials/defaults.ts` (~620 lines · CAPEX_DEFAULTS · FINANCIAL_STRUCTURE_DEFAULTS · PNL_FORECAST_5Y · PNL_GEO_FILTERS · PNL_ROOM_STATS · ROOM_TIERS · STAR_CATEGORIES)
- `apps/web/src/lib/admin/financials/use-overrides.ts` (useOverrides + useDraftedOverrides + formatSavedAt)
- `apps/web/src/components/admin/financials/capex-defaults-card.tsx` (client · per-row unit · 9-cell editable matrix · totals band)
- `apps/web/src/components/admin/financials/financial-structure-card.tsx` (client · value-only editable rows)
- `apps/web/src/components/admin/financials/pnl-benchmarks-card.tsx` (client · filter chips · reactive stat boxes · USALI assumptions table)
- `apps/web/src/components/admin/financials/save-bar.tsx` (shared 3-state header control)

**Modified:**
- `apps/web/src/components/admin/admin-sidebar.tsx` (Financials nav entry · Calculator icon · between Hotels and Integrations)

### Phase D path
- Migration: `admin_financial_settings (key text, value jsonb, updated_at, updated_by)` so edits propagate across devices and survive cache clears
- Server actions: `saveFinancialOverride` · `loadFinancialOverrides`
- localStorage becomes a write-through cache
- Audit log entries per edit (operator email + before/after JSON)
- Wire P&L geo filter chips to actual CoStar STR rolling-12-month medians
- Reactive 5-year forecast renderer powered by saved P&L assumptions + Room Stats lookup

---

## 2026-05-15 — Admin / Contacts · UX iteration session (Bulk Delete · perf · Plus button · NEXT_REDIRECT fix)

Operational iteration on the live `/user/admin/contacts` surface during Phase C operator review. Six commits shipped in tight sequence based on operator feedback.

### Bulk Delete
- Added Trash2 icon button at far right of bulk action toolbar (separated by vertical divider · `tone="danger"` deeper red than existing rose/amber tones)
- Initial design: 2-section panel (soft + type-to-confirm permanent) · operator simplified to single inline confirmation: `Delete N contacts? [Cancel] [Delete]`
- Soft delete only in UI · sets `deleted_at = now()` · idempotent · audit log
- `bulkHardDeleteAction` server action retained in `bulk.ts` for future per-row drawer use · unwired from bulk toolbar
- Hard delete guards (preserved in code): refuses `linked_user_id IS NOT NULL` · CASCADE on FK · capped at 100 · type-to-confirm
- Critical bug fix as side-effect: `loadContacts` + `loadContactKpis` did NOT filter `.is("deleted_at", null)` · added · `liveCount()` helper refactor for the 18-query KPI strip

### Performance · table weight reduction
Operator: page felt heavy. Three changes ship together:
- 3 columns dropped (Last email · Gmail labels · Strategic signal) · all preserved in row drawer
- Default `page_size`: 50 → 10 · operator override via `?page_size=N`
- Skip labels join in `loadContacts` (drawer fetches its own labels via `loadContactDetail`)

Net: rows fetched/render 50→10 (-80%) · queries/page 2→1 (-50%) · DOM nodes ~1100→~160 (-85%) · payload ~25KB→~5KB (-80%)

### NEXT_REDIRECT swallowed banner · root + defense-in-depth
Symptom: every bulk action showed "Bulk action failed · Error: NEXT_REDIRECT" banner above the table even though the action itself worked.

Root: Next.js `redirect()` throws a special NEXT_REDIRECT error that the framework catches at the runtime boundary. The bulk*Action try/catch was swallowing it and re-redirecting with the error in the URL.

Fix root: `isNextRedirectError(err)` helper detects via `digest.startsWith("NEXT_REDIRECT")` (canonical Next.js convention) · added to ALL 11 catch blocks in `bulk.ts` · re-throws redirect errors before falling through to `failToList`. Same pattern was already present in `subscriptions/bulk.ts` (using `err.message` check).

Defense-in-depth: page-level red banner now skips render when `bulk_error` matches `/NEXT_REDIRECT/i` · operators with stale URL leftovers see no spurious error.

### Manual contact creation · `+ New contact` button + drawer
- Plus icon button in page header next to H1 (forest-900 bg · lime-300 text · ring)
- Click → `?mode=create` → `ContactCreateDrawer` renders in right column (same slot as detail/edit drawers)
- Form: full_name + email REQUIRED · company · type · title · phone · linkedin · notes optional
- Type dropdown initially shipped with 16 raw `investor_type` values · operator corrected to **8 canonical buckets** (Principal · Broker · Lender · Operator · Developer · Hotel Supply · IA Supply · Uncategorized · default Uncategorized)
- Schema field `contact_category_v2` (z.enum on the 8 buckets) · writes directly to canonical column · `investor_type` left null
- `createContactAction` server action: requireOperator → zod validation → idempotency check (refuse if `email_lower` already exists on non-deleted row) → 16-char hex `master_id` via `crypto.getRandomValues` → defaults applied (bucket=active · band=cold · validity=uncertain · invitation=never_invited · suppressed=false · source=admin_ui_manual_entry) → audit `contact.created_manually` → redirect `?selected=<new-id>&created=1`
- Success banner: "Contact created · view drawer opened on the right."
- Idempotent · refuses duplicate emails inline
- NEXT_REDIRECT re-throw guard same as bulk actions

### Files
- `apps/web/src/components/admin/contacts/bulk/bulk-action-toolbar.tsx` (Trash icon · simplified delete confirm · count prop threaded · LABELS extended)
- `apps/web/src/components/admin/contacts/contact-create-drawer.tsx` (NEW · server component · 8-field form · 8-bucket Type dropdown)
- `apps/web/src/components/admin/contacts/contacts-table.tsx` (3 cols dropped)
- `apps/web/src/lib/admin/contacts/bulk.ts` (bulkSoftDeleteAction · bulkHardDeleteAction · isNextRedirectError helper · 11 catches patched)
- `apps/web/src/lib/admin/contacts/live.ts` (deleted_at filter on main query · liveCount() helper · default page_size 10)
- `apps/web/src/lib/admin/contacts/mutations.ts` (createContactAction · createSchema z.enum · isNextRedirectError helper)
- `apps/web/src/app/user/admin/contacts/page.tsx` (+ button · createMode wiring · created banner · page_size URL param)

---

## 2026-05-15 — Contactos · Phase C Steps 1-3 + iter3 + iter3.5 · canonical taxonomy live in Supabase

### Migration 0023 applied (Step 1)

`docs/database/migrations/0023_relationship_contacts_v2_taxonomy.sql` (Supabase migration name `relationship_contacts_v2_taxonomy` · version `20260515023724`). Strictly additive · 4 columns + 1 index added · 0 destruction.

| Column | Type | Purpose |
|---|---|---|
| `contact_category_v2` | text · indexed (btree) | Phase C canonical operational taxonomy · 8 buckets · source-of-truth for filter/UI/CRM logic |
| `relationship_type` | text | CRM dimension · operator-set via UI · NEVER overwritten by promote upsert |
| `original_category_raw` | text | Provenance audit · NULL unless source-of-record provides real category |
| `original_category_source` | text | Source attribution for original_category_raw · NULL unless explicitly marked |

`promote_to_supabase.py` extended (file edit only · sentinel-frozen until Step 2): `build_contacts_rows()` now emits `contact_category_v2` + `original_category_raw` + `original_category_source`. `relationship_type` deliberately OMITTED from upsert body — PostgREST `Prefer: resolution=merge-duplicates` resolves to `INSERT ... ON CONFLICT DO UPDATE SET <only-keys-in-body>`, so omitted keys are preserved on conflict (operator-set values never get blown away by a Master re-promote).

### Sentinel-cycled promote (Step 2)

Sentinel briefly lifted (17-second window: 02:42:07Z → 02:42:24Z) · `promote_to_supabase.py` ran clean (4398 contacts upserted · 0 errors) · sentinel re-instated immediately with `BLOCK: promote_to_supabase.py`.

Pre/post-promote diff (4547 rows in both · 14 fields tracked):

- `contact_category_v2` populated: 0 → **4 398** (149 Supabase-only rows correctly NULL)
- `relationship_type` populated: 0 → **0** (preservation contract honored)
- `original_category_raw` populated: 0 → **0**
- `original_category_source` populated: 0 → **0**
- Other field changes: 1 row (`3dc7f56a65652bc7` · Fernández Canete · `relationship_band` Master had `strategic` · Supabase was lagging on `dormant` · sync corrected · benign)

Phase 2.B.3 audit trail confirmed in Supabase post-promote: `f193186dd9eb0c22` email=`prietose@bancsabadell.com` · `596a76514db8d527` email=`gestiondeactivos2@reyalurbis.com`.

### Step 3 audits

**IA Supply audit (20 rows):** 100% defendible. 0 false positives.
- Domain detection: Salesforce · STR Global × 7 · Calendly
- IA_SUPPLY_PATTERN: ALFRED Smart Systems · ATLAS Real Estate Analytics
- IA_SUPPLY_SEED_COMPANIES: DROOMS × 2 · CLIENTIFY · BLUE CODE × 4 · CPI Technologies · Axcess Merchant

**Operator split audit (711 rows post-iter3.5):**
- Hotel Chain 634 · Operator 39 · Investor 14 (asset-light operators · CADENA-confirmed) · Developer 12 (Hospitality Group hybrids) · Brand 5 · F&B Operator 5 · Unknown 2
- Insurance: 0 (iter2 fix confirmed)
- Clean rate: ~99.6%

### iter3 · FINANCIADORES- substring false positive fix

Plain `if "FINANCIADOR" in gmail_upper` incorrectly matched `FINANCIADORES-INTERESADOS` (Gmail metadata "lenders interested in this contact's project" · external party · NOT the contact's own role) and mis-classified ~13 non-Lender contacts. Fixed with word-boundary regex `\bFINANCIADOR\b` (matches singular FINANCIADOR and FINANCIADOR-RECHAZADO; rejects FINANCIADORES- plural).

13 rows reclassified out of Lender:

| Pre | Post | n | Companies |
|---|---|---:|---|
| Lender | Principal | 8 | ARCANO PARTNERS · Continental Property Investment · IBERDROLA INMOBILIARIA · MADISON REAL ESTATE · Midtown Capital Partners · QATAR INVESTMENTS AUTHORITIES · WALTON STREET CAPITAL × 2 |
| Lender | Broker | 3 | BUILDING CENTER · Boyd Hospitality Advisors · The Baron Group |
| Lender | Developer | 1 | FERNÁNDEZ MOLINA OBRAS Y SERVICIOS (jfernandez) |
| Lender | Operator | 1 | FERNÁNDEZ MOLINA OBRAS Y SERVICIOS (jfcanete) — see iter3.5 follow-up |

Sentinel-cycled promote (19s window: 02:53:12Z → 02:53:31Z). Supabase distribution post-iter3 matched Master 1:1.

### iter3.5 · Edge case fixes (Fernández Molina · iTrust)

Operator review of iter3 flagged 2 specific edge cases:

1. **FERNÁNDEZ MOLINA jfcanete** — landed in Operator via gmail label `CADENA-HOTEL-INTERESADA` · operator decision: constructors/promotores must NOT be poached by external CADENA metadata · CADENA gate exclusion extended to `investor_type='Developer'` ONLY (Investor + CADENA stays Operator per iter2 review · those are real asset-light operators like ACCOR INVEST, COVIVIO, VASTINT, etc.).
2. **iTrust Country Brand Intelligence** — landed in Operator via OPERATOR_PATTERN `brand` keyword · is actually a country brand strategy / data intelligence consultancy · added `country brand intelligence` to `IA_SUPPLY_SEED_COMPANIES`.

2 rows reclassified by iter3.5:

| Pre | Post | Company | Why |
|---|---|---|---|
| Operator | Developer | FERNÁNDEZ MOLINA · jfcanete | CADENA gate now excludes Developer |
| Operator | IA Supply | iTrust Country Brand Intelligence | Added to seed list |

Sentinel-cycled promote (18s window: 03:06:37Z → 03:06:55Z).

### Final Supabase distribution post-Phase-C-iter3.5

| Bucket | n | % of populated |
|---|---:|---:|
| Principal | 1 804 | 41.0% |
| Broker | 906 | 20.6% |
| Operator | 711 | 16.2% |
| Developer | 505 | 11.5% |
| Lender | 341 | 7.8% |
| Hotel Supply | 92 | 2.1% |
| IA Supply | 21 | 0.5% |
| Uncategorized | 18 | 0.4% |
| **Populated** | **4 398** | **96.7% of Supabase** |
| NULL (Supabase-only · not in Master) | 149 | 3.3% |
| **TOTAL** | **4 547** | 100% |

### Sentinel discipline · 3 lift cycles · 54 seconds total exposure

| Cycle | Reason | Lift | Re-instate | Window |
|---|---|---|---|---|
| 1 | Step 2 initial promote | 02:42:07Z | 02:42:24Z | 17s |
| 2 | iter3 promote | 02:53:12Z | 02:53:31Z | 19s |
| 3 | iter3.5 promote | 03:06:37Z | 03:06:55Z | 18s |

Sentinel was held ACTIVE during Phase C iter cycles · `BLOCK: promote_to_supabase.py`. Lifted at 03:21:36Z after Step 4 deploy READY (see "Step 4" subsection below).

### Files

**New / modified:**
- `docs/database/migrations/0023_relationship_contacts_v2_taxonomy.sql` (new · applied to Supabase)
- `scripts/contactos/promote_to_supabase.py` (3 new fields in upsert body · `relationship_type` intentionally omitted)
- `scripts/contactos/classify_master.py` (iter3 word-boundary regex · iter3.5 CADENA exclusion for Developer + iTrust seed entry)
- `CONTACTOS DATASITE/master/.phase_b_repair_in_progress.lock` (selective filter content updated)

**Snapshots cached:**
- `supabase-pre-promote-v2-snapshot.jsonl` · `supabase-post-promote-v2-snapshot.jsonl`
- `master-v2-pre-iter3.json` · `master-v2-pre-iter35.json`

### Step 4 · UI switch shipped + Vercel deployed + sentinel lifted

- Commit `6eeb7cf` · `apps/web/src/lib/admin/contacts/live.ts` switched to `.eq("contact_category_v2", GROUP_KEY_TO_V2_BUCKET[key])` for both filter and KPI counts. Backward compat: raw `?investor_type=Lender` URL bookmarks still resolve via `.eq("investor_type", value)` fallback branch. `apps/web/src/lib/supabase/types.ts` regenerated via Supabase MCP to include the 4 Phase C columns.
- Vercel deploy `dpl_6yMZ7Ert1QGRtKmcQypRgsWzLu2t` · state READY · build 62s · live at `hotelvalora.com` (+ 4 aliases) · production target.
- **Sentinel lifted at 2026-05-15T03:21:36Z** · `CONTACTOS DATASITE/master/.phase_b_repair_in_progress.lock` deleted · `classify_master.py` and `promote_to_supabase.py` both operational again. Phase B-Repair / Phase C governance period closed. Total sentinel-cycled exposure during repair + Phase C: ~14 hours active · 54 seconds of write-window for 3 promotes.
- 4 Master backups preserved on disk: `BACKUP-pre-cleanup` · `broken-2026-05-15` · `broken-2026-05-15-postswap` · `pre-phase-b-2026-05-15`.

### Phase D (deferred · not in this scope)

`relationship_type` column exists in `relationship_contacts` (Phase C migration 0023 added it · 0/4547 populated · `promote_to_supabase.py` deliberately omits it from upsert body so operator-set values are never overwritten). UI for operator editing of this CRM dimension lands as Phase D — separate scope, separate freeze cycle.

---

## 2026-05-15 — Contactos · Phase C Steps 1-3 + iter3 + iter3.5 · canonical taxonomy live in Supabase

---

## 2026-05-15 — Contactos · Phase B iter2 (Insurance · D-refined · IA Supply seed list)

Operator review of Phase B iter1 distribution flagged 4 boundary refinements before authorising Phase C migration. Iter2 ships them. v2 column re-written in place (idempotent · v1 col 64 still untouched).

### Changes

| # | Change | File location |
|---|---|---|
| **1** | `Insurance` removed from `PRINCIPAL_INVESTOR_TYPES_V2` · added to Hotel Supply default route alongside Service Provider + Media. Operator decision: insurance contacts in this dataset are typically service providers TO hotel operators (hotel insurance brokers), not institutional investors in hotel real estate. | `classify_master.py` |
| **2** | D-refined: `OPERATOR_BRANDS` (Marriott · Hilton · Hyatt · Accor · etc. specific brand regex) ALWAYS wins regardless of `investor_type` — these are unambiguously operating brands. Generic `OPERATOR_PATTERN` (group · hotel chain · operator keywords) skipped for `{investor, insurance}` to preserve the false-positive guard. Gmail label `CADENA`/`BRANDED` continues to win first. | `classify_master.py` |
| **3** | New `IA_SUPPLY_SEED_COMPANIES` regex — operator-curated explicit company-name overrides for tech/SaaS vendors that don't match any heuristic pattern. Initial seed (each defensible against challenge): `drooms` (virtual data room SaaS) · `clientify` (CRM SaaS) · `blue code / bluecode` (bluecodesolutions.com tech) · `cpi technologies` (data room tech) · `axcess merchant` (payments tech). Wired into v2 detection between `IA_SUPPLY_COMPANY_HINTS` and `IA_SUPPLY_PATTERN`. | `classify_master.py` |
| **4** | Hotel Supply vs Developer boundary: NO code change. Documented that priority order (Developer at step 5 wins over Hotel Supply at step 7) correctly routes architecture/engineering/construction firms to Developer, while interior design / decoration / FF&E / furniture / legal/consulting service providers route to Hotel Supply. The 92 Hotel Supply rows post-iter2 reflect this boundary. | (no code change) |

### Distribution shift (4 398 rows)

| Bucket | iter1 | **iter2** | Δ | Cause |
|---|---:|---:|---:|---|
| Principal | 1 804 | 1 796 | −8 | 2 Insurance moved out · slight rebalance from D-refined Investor cases |
| Operator | 705 | 712 | +7 | D-refined: 9 Investor rows with explicit OPERATOR_BRANDS match correctly become Operator; offset by 2 Insurance rows leaving |
| Hotel Supply | 100 | 92 | −8 | 9 rows captured by IA Supply seed list · offset by 2 Insurance rows entering |
| IA Supply | 11 | 20 | +9 | Seed list adds: BLUE CODE × 4 · DROOMS × 2 · CLIENTIFY · CPI Technologies · Axcess Merchant |
| Broker / Lender / Developer / Uncategorized | unchanged | unchanged | 0 | — |

### IA Supply (20 rows · iter2 final · all defensible)

```
Salesforce × 1                 (TECH_DOMAINS)
STR Global × 7                 (str.com domain · data intelligence)
Calendly × 1                   (calendly.com domain · SaaS scheduling)
ALFRED Smart Systems × 1       (smart systems pattern)
Atlas Real Estate Analytics×1  (real estate analytics pattern)
BLUE CODE × 4                  (seed list · bluecodesolutions.com)
DROOMS × 2                     (seed list · virtual data room SaaS)
CLIENTIFY × 1                  (seed list · CRM SaaS)
CPI Technologies × 1           (seed list · data room tech)
Axcess Merchant × 1            (seed list · payments tech)
```

### Hotel Supply (92 rows · iter2 final)

Mix of Service Provider / Media / Insurance defaults plus pattern matches:
- FF&E / furniture / interior design: APAVISA · ALARWOOL · CARMELA MARTÍ DECORACIÓN · COSENTINO IBERIA · DORMAKABA · STREETSENSE
- Legal / consulting / audit: DAYA ABOGADOS · CASES & LACAMBRA · MAZARS · DELOITTE
- Media: AGENTTRAVEL · ALIMARKET · BRAINSRE.NEWS
- Insurance: 2 rows now correctly here (were Operator iter1 false positives)
- Other Service Provider defaults: ABSOLUTE INTERNSHIP · Adaptatec · ELOGIA · etc.

### Validation

- `audit_master_alignment.py` post-iter2: shift=0 wins 99.6% match (4380/4398) · 0% drift introduced.
- Master schema: 67 cols (unchanged from iter1).
- Row 504 (crocher) integrity: confirmed — original_email + email + investor_type + contact_category + contact_category_v2 all aligned.
- `original_category_raw` + `original_category_source` still NULL in all 4398 rows (provenance integrity preserved).
- Sentinel still active · `BLOCK: promote_to_supabase.py` · classifier allowed through.

### Boundary documentation (operator review pending before Phase C)

- **Principal vs Operator** — Operator includes 9 sub-types (Hotel Chain · Operator · Brand · White Label · F&B · Aparthotel · Hostel · Resort · Branded Residence) AND specific OPERATOR_BRANDS (Marriott · Hilton · etc.). Generic OPERATOR_PATTERN excluded for `investor_type ∈ {Investor, Insurance}`. ✅ False positives ≈0.
- **IA Supply precision** — Detection: TECH_DOMAINS (40+) · IA_SUPPLY_COMPANY_HINTS (specific hospitality tech vendors) · seed list (5 companies) · IA_SUPPLY_PATTERN (PMS · RMS · channel manager · smart systems · real estate analytics · etc.). ✅ Conservative · 0 false positives detected in 20 rows.
- **Hotel Supply vs Developer boundary** — Developer wins on architecture/engineering/construction keywords (priority 5 > 7). Hotel Supply catches FF&E · furniture · interior design · legal · audit · Service Provider/Media/Insurance defaults. ✅ Boundary stable.
- **Operator split quality** — 705 → 712 rows. 700 from v1 Principal · 5 from v1 Lender (Hotel Chain investor_type forced via OPERATOR_INVESTOR_TYPES regardless of v1 Lender misclassification) · 1 from v1 Developer · ~5 from v1 Uncategorized.

### Phase C still gated

Sentinel remains active. NO promote · NO Supabase migration · NO UI canonical switch until operator approves iter2 distribution + reviews:
- 20 random sample rows in `reports/phase_b_classification_report_<TS>.json`
- Migration matrix
- 4 boundary documentation points above

---

## 2026-05-15 — Contactos · Phase B classifier v2 (canonical operational taxonomy)

`scripts/contactos/classify_master.py` ships a `--scheme={v1,v2}` flag. v2 introduces the canonical 8-bucket operational taxonomy aligned 1:1 with the admin/contacts Phase A UI filter. v1 stays unchanged behind default and column 64 (`contact_category`) is never touched by v2 runs — legacy compatibility for existing readers.

### v2 buckets

`Principal · Broker · Lender · Operator · Developer · Hotel Supply · IA Supply · Uncategorized`

The `Operator` bucket is the load-bearing addition: a clean split from v1 `Principal` capturing hotel chains, brands, white-label operators, aparthotel/hostel/F&B/resort/branded-residence operators. Hospitality investors (`investor_type='Investor'`) are explicitly held back from Operator's company-name pattern detection — they belong to `Principal`.

`IA Supply` (renamed from v1 `IA aplicaciones`) covers AI vendors, SaaS, hospitality tech (PMS/RMS/channel managers/CRM), data intelligence, revenue tech. Detection by domain (TECH_DOMAINS expanded with hospitality-tech vendors + data providers + Calendly etc.) AND conservative keyword patterns (smart systems, real estate analytics, hospitality analytics) — deliberately under-eager to avoid false positives in generic B2B vendors.

`Hotel Supply` (renamed from v1 `Proveedor`) covers FF&E, furniture, interior design, hospitality services, materials, plus a default route for `investor_type ∈ {'Service Provider', 'Media'}` after IA Supply / Lender / Broker / Operator / Developer / Principal had a chance to claim. Per operator decision: media is treated as a service-provider category, not its own bucket.

### New columns (additive · v1 untouched)

| Col | Header | Contents |
|---|---|---|
| 65 | `contact_category_v2` | The new canonical bucket (operational taxonomy source-of-truth) |
| 66 | `original_category_raw` | NULL for all 4398 rows · provenance integrity (no inference backfill — source xlsm has no canonical category field) |
| 67 | `original_category_source` | NULL for all 4398 rows · only ever populated by future ingestion if it carries a real category snapshot from source-of-record |

`contact_category_v2` becomes the operational source-of-truth. v1 `contact_category` is now legacy compatibility only — future filters / UI / CRM logic should read v2.

### Distribution (4 398 rows)

| Bucket | v1 | v2 | Δ | Notes |
|---|---:|---:|---:|---|
| Principal | 2 736 | 1 804 | −932 | Operator split + reclassifications to Lender/Broker/Developer |
| Broker | 99 | 903 | +804 | v2 rescues 724 brokers v1 had marked Uncategorized |
| Lender | 155 | 354 | +199 | v2 rescues 192 lenders from Uncategorized |
| **Operator** | 0 | 705 | +705 | NEW · split from v1 Principal (Hotel Chain 634 · Operator 39 · Developer-classed 12 · Investor-classed 6 · F&B Op 5 · Brand 5 · Insurance 2 · Unknown 2) |
| Developer | 93 | 503 | +410 | v2 rescues 386 developers from Uncategorized |
| **Hotel Supply** | 0 | 100 | +100 | Service Provider + Media defaults active |
| **IA Supply** | 0 | 11 | +11 | STR Global × 7 + Salesforce + ALFRED Smart Systems + Atlas Real Estate Analytics + Calendly |
| Uncategorized | 1 306 | **18** | −1 288 | **29.7% → 0.4%** · all residuals have investor_type='Unknown' (legitimately unclassifiable from source) |

### Tuning iterations applied (operator decisions)

| # | Change | Impact |
|---|---|---|
| **A** | `investor_type ∈ {Service Provider, Media}` → Hotel Supply default (after IA Supply check) | Hotel Supply 5 → 100 |
| **B-conservative** | IA Supply patterns expanded with: `smart systems`, `smart hospitality`, `data analytics`, `real estate analytics`, `hospitality analytics`. Domains added: `calendly.com`. Deliberately conservative to avoid false-positive tech classifications in generic B2B vendors (BLUE CODE, Adaptatec, etc. correctly stay in Hotel Supply) | IA Supply 8 → 11 |
| **D** | Operator company-name pattern detection skipped when `investor_type='Investor'` | Operator 745 → 705 (40 false positives correctly returned to Principal) |

Media bucket idea (9th bucket) explicitly rejected per operator: "media es proveedor de servicios" → routed through Hotel Supply default.

### Validation

- `audit_master_alignment.py` re-run post-Phase-B: shift=0 still wins 99.6% match against Supabase canonical (4380/4398). 0% drift introduced.
- Row 504 (crocher · post-Phase-2.B.3-correction): all 67 cols correctly populated — `original_email='crocher@bancsabadell.com'` · `email='prietose@bancsabadell.com'` · `investor_type='Lender'` · `contact_category='Lender'` · `contact_category_v2='Lender'` · `original_category_raw=None` · `original_category_source=None`.
- `original_category_raw` and `original_category_source` confirmed NULL for all 4398 rows (no inference backfill performed).

### Freeze status

Sentinel `CONTACTOS DATASITE/master/.phase_b_repair_in_progress.lock` re-created post-classifier with selective filter:
- Reason: "Phase B classifier v2 in progress · pending operator validation before promote"
- `BLOCK: promote_to_supabase.py` — promote stays blocked
- `classify_master.py` allowed through (this script just ran)

`_phase_b_repair_freeze.py` extended to support `BLOCK: <script>` lines (selective freeze) while preserving default-deny when no filter is present.

### Phase C (still pending operator green-light)

- DB schema migration: add `relationship_contacts.contact_category_v2` (or `company_type_canonical`) + `relationship_type` (CRM dimension) + `original_category_raw` + `original_category_source`. Backfill from Master via `promote_to_supabase.py` v2.
- Switch admin/contacts UI filter from `.in("investor_type", [...])` (Phase A mapping) to `.eq("contact_category_v2", ...)` (single-equality query · cheaper).
- Update `loadContactKpis` to read v2 column.
- The 4 areas operator wants to review before Phase C: Principals vs Operators boundary · IA Supply precision · Hotel Supply vs Developer boundary · false-positive tech classifications. Phase B report (`reports/phase_b_classification_report_<TS>.json`) provides per-bucket sample lists for each.

### Files

**Modified:**
- `scripts/contactos/classify_master.py` — full rewrite around `--scheme={v1,v2}` argparse · header-aware column writes · v1 logic preserved verbatim · v2 with 8 buckets + tuning iterations A/B-conservative/D
- `scripts/contactos/_phase_b_repair_freeze.py` — `BLOCK: <script>` line support for selective freezing

**New:**
- `scripts/contactos/phase_b_classification_report.py` — read-only report: distribution side-by-side · migration matrix · operator-split breakdown · IA Supply / Hotel Supply / Operator / Uncategorized samples · 20 random rows for human review

**Backups:**
- `CONTACTOS DATASITE/master/metcub-contacts-master.pre-phase-b-2026-05-15.xlsx`

**Reports:**
- `CONTACTOS DATASITE/reports/phase_b_classification_report_<TS>.json`

---

## 2026-05-15 — Contactos · Phase 2.B.3-correction · Master alignment repair + replacement re-application

> **Note:** This entry corrects the record left by the prior Phase 2.B.3 entry below (commit 2dd5010). That entry is preserved as written for historical accuracy. The events documented here are what actually happened — both the silent failure of the original --apply and the successful repair/recovery 18 hours later.

### Root cause
`build_replacement_suggestions.py` --apply (commit 2dd5010 · 2026-05-14 23:54) inserted a new audit column `original_email` at position 0 of every Master xlsx data row (line 274: `row_data.insert(0, None)`) but updated only the header row, not the schema invariant. The result on disk:
- Header gained `original_email` at col 1, plus 3 unnamed slots at cols 65-67 for the other planned audit fields (replacement_source, replaced_by_master_id, replaced_at).
- Data rows had `None` inserted at position 1 (between original_email and master_id) so all canonical values shifted RIGHT by 1 column relative to the header labels.
- The two replacement writes themselves silently no-op'd: `email_idx_adjusted` resolved to the wrong cell, so `prietose@bancsabadell.com` and `gestiondeactivos2@reyalurbis.com` were never written. Both rows still carried their original emails. The audit JSONL (`replacement-archive.jsonl`) recorded "applied" events that didn't reflect the disk state.

### Blast radius
- **Master xlsx**: header at 68 cols (4 unnamed) · data effectively at 65 cols · header[N] != data[N] across all 4398 rows.
- **Every header-name reader was reading the wrong cell**: `classify_master.py`, `extract_gmail_signals.py`, `harvest_untagged.py`, `ingest.py`, `build_health_report.py`. None of these ran post-corruption (the operator caught it first).
- **Supabase rows for crocher (f193186dd9eb0c22) and rodera (596a76514db8d527)** still carry the ORIGINAL emails — `promote_to_supabase.py` was never run after the broken apply, so Supabase preserves the pre-corruption canonical state. Cross-verified with a fresh REST API dump (4547 rows, 605 KB) before any repair work.
- **Phase 2.B.3 changelog claims** (audit trail · 67-col schema · downstream regeneration) were aspirational, not factual. The downstream re-extracts that supposedly ran on the broken Master either did nothing or wrote to wrong fields.

### Repair strategy (operator-approved Option A · 2026-05-15)
1. **Backup** — copy current Master to `metcub-contacts-master.broken-2026-05-15.xlsx` before any analysis. Pre-Phase-2.B.3 backup `metcub-contacts-master.BACKUP-pre-cleanup.xlsx` (2026-05-15 01:21 · 63 cols clean) preserved as ground truth reference.
2. **Audit script** (`scripts/contactos/audit_master_alignment.py`) — read-only diagnostic. Cross-references each Master row against a Supabase canonical snapshot (`relationship_contacts.{master_id, full_name, email, investor_type}` · 4547 rows · cached at `reports/supabase-canonical-snapshot.jsonl`). Scores 4 shift hypotheses (-1, 0, +1, +2) by matching on (full_name + email + investor_type).
3. **Audit verdict** — shift=-1 (data shifted RIGHT by 1 vs header) wins with **4 382 / 4 398 = 99.6%** match. Margin over runner-up: 99.6 percentage points. HIGH confidence.
4. **Freeze locks** (`scripts/contactos/_phase_b_repair_freeze.py`) — sentinel-file based abort guard added to `classify_master.py` and `promote_to_supabase.py`. Sentinel: `CONTACTOS DATASITE/master/.phase_b_repair_in_progress.lock`. Both scripts hard-abort at startup until operator deletes the file.
5. **Fix script** (`scripts/contactos/fix_master_alignment.py`) — for each row build `new_row = [row[0]] + row[2:65]` (preserve col 1 original_email · drop position 1 spurious None · keep cols 3-65 → cols 2-64). Header rebuilt to 64-col canonical: `original_email + master_id + … + contact_category`. Writes to NEW file `metcub-contacts-master.repaired-2026-05-15.xlsx` (no overwrite). Side-sheets (Contacts · Companies · Activities · Summary · INVALID_ARCHIVE) preserved verbatim.
6. **Fix verification** — `pre-fix populated cells: 98,753 · post-fix: 98,753 · cells dropped: 0` · all dropped positions empty for all 4 398 rows. Zero data loss.
7. **Re-audit on repaired file** — shift=0 wins with 99.6% match · shift=-1 collapses to 0%. Schema confirmed: 64 cols · header[0]=`original_email` · header[1]=`master_id` · header[63]=`contact_category`.
8. **Atomic swap** — current `metcub-contacts-master.xlsx` → `metcub-contacts-master.broken-2026-05-15-postswap.xlsx` (preserves the 02:34 modification time for forensics) · `metcub-contacts-master.repaired-2026-05-15.xlsx` → `metcub-contacts-master.xlsx`. Three backups remain on disk.
9. **Replacement re-application v2** (`scripts/contactos/apply_phase_2b3_replacements_v2.py`) — file-only write of `email ← new_email` and `original_email ← old_email` for both approved rows. Idempotent (refuses to overwrite if `original_email` already populated). Refuses to write if current `email` doesn't match the expected old value. Audit trail appended to `reports/phase_2b3_apply_log.jsonl`. Result: both rows now carry the new email AND preserve the original in the audit field.
10. **Final validation** (`scripts/contactos/final_repair_validation.py`) — re-runs shift=0 audit · confirms Phase 2.B.3 row state · samples 5 random rows pre/post.

### Validation evidence

**Headline:** 4 380 / 4 398 (99.6%) of Master rows match Supabase exactly on `full_name + email + investor_type` post-repair. Of the 18 mismatches: 2 are the now-correctly-replaced rows (Supabase still has the pre-replacement emails because `promote_to_supabase.py` is frozen pending operator green-light · expected) · 16 are pre-existing legitimate Master↔Supabase drift (all show `email=None` on both sides; differ in `full_name` casing or `investor_type`).

**Phase 2.B.3 replacement rows post-repair:**
```
master_id f193186dd9eb0c22 · sheet_row 504 · Concha Rocher Collado
  email          = 'prietose@bancsabadell.com'        ← new
  original_email = 'crocher@bancsabadell.com'         ← original (audit)
  investor_type  = 'Lender'

master_id 596a76514db8d527 · sheet_row 3443 · Pedro Javier Rodera
  email          = 'gestiondeactivos2@reyalurbis.com' ← new
  original_email = 'p.j.rodera@reyalurbis.com'        ← original (audit)
  investor_type  = 'Hotel Chain'
```

**5 BEFORE/AFTER samples** (random rows · before = broken file under header[N]=data[N] · after = canonical file under header[N]=data[N]):

| Row | Field | BEFORE (broken) | AFTER (repaired) | SUPABASE |
|---|---|---|---|---|
| 4174 | full_name | `'2a0daaa397322ec5'` (master_id-hash) | `'John Keeling'` | `'john keeling'` ✓ |
| 4174 | email | `'John Keeling'` (a name) | `'jkeeling@valenciagroup.com'` | match ✓ |
| 4174 | investor_type | `'Valencia Hotel Group'` (company name) | `'Hotel Chain'` | match ✓ |
| 1561 | full_name | `'2b83771ecbaba1f5'` | `'Gabriel Petersen'` | match ✓ |
| 1561 | email | `'Gabriel Petersen'` | `'gabriel.petersen@eventhotels.com'` | match ✓ |
| 1561 | investor_type | `'EVENT HOTELS'` | `'Investor'` | match ✓ |
| 3873 | full_name | `'b6b9803b6ba459df'` | `'Claus Dieter Handel'` | match ✓ |
| 3873 | email | `'Claus Dieter Handel'` | `'claus-dieter.jandel@steigenbergerhotelgroup.com'` | match ✓ |
| 3873 | investor_type | `'Steigenberger Hotel AG'` | `'Hotel Chain'` | match ✓ |
| 3957 | full_name | `'ccfc24fe457f1259'` | `'Fernando Hortigüela'` | match ✓ |
| 3957 | email | `'Fernando Hortigüela'` | `'f.hortiguela@tcapital.es'` | match ✓ |
| 3957 | investor_type | `'TENDENCIAS CAPITAL INVESTMENTS'` | `'Broker'` | match ✓ |
| 3050 | full_name | `'d0de3f9717f0c86b'` | `'Dan Konzelmann'` | match ✓ |
| 3050 | email | `'Dan Konzelmann'` | `'daniel.konzelmann@nobleinvestment.com'` | match ✓ |
| 3050 | investor_type | `'Noble Investment Group'` | `'Investor'` | match ✓ |

All 5 random samples + both Phase 2.B.3 rows post-validation match Supabase canonical exactly.

### State on disk after repair

```
CONTACTOS DATASITE/master/
  metcub-contacts-master.xlsx                              (64c · canonical · post-repair · post-replay)
  metcub-contacts-master.BACKUP-pre-cleanup.xlsx           (63c · pre-Phase-2.B.3 ground truth)
  metcub-contacts-master.broken-2026-05-15.xlsx            (68c · audit-time copy of broken file)
  metcub-contacts-master.broken-2026-05-15-postswap.xlsx   (68c · forensic copy with original 02:34 mtime)
  .phase_b_repair_in_progress.lock                         (sentinel · still active · see "Freeze status" below)
```

### Freeze status — LIFTED 2026-05-15 ~01:25 UTC

Operator confirmed visual inspection in Excel passed (rows 504 + 3443 verified · 64-col header alignment · spot-check clean). Sentinel deleted, `classify_master.py` and `promote_to_supabase.py` un-frozen.

`promote_to_supabase.py` ran cleanly · 4398 contacts upserted · 2990 companies · 2990 interactions · 814 labels · 161 health records · 0 errors.

**Pre/post-promote snapshot diff** (4547 Supabase rows in both):
- 2 rows changed `email` (the intended replacements: crocher→prietose, rodera→gestiondeactivos2) ✓
- 365 rows changed Gmail-signal-derived fields (`active_threads`, `last_email_date`, `relationship_band`, `email_validity`, `bounce_count`) — benign backlog: `ingest_gmail.py` merged signals into Master at 2026-05-14 18:32 (pre-corruption) but `promote_to_supabase.py` was never re-run between the merge and the corruption. The repair restored Master alignment and this promote propagated the backlog.
- 0 rows added or removed
- 0 unexpected fields touched

5 sample changed rows spot-verified: `Jhon Alarcon · john.alarcon@accor.com · Hotel Chain · last_email=2023-12-18 · strategic` · `Antonio Ruiz Lozano · antonioruizlozano@yahoo.es · Broker · last_email=2024-05-22 · warm` · `Francisco Nogueira de Sousa · francisco.sousa@blueshiftportugal.com · Hotel Chain · strategic` · `Jedaiah Gwee · jgwee@highgate.com · Hotel Chain · warm` · `Estela Juaréz · ejuarez@labordemarcet.com · Broker · last_email=2026-04-13 · active`. All semantically correct. All 365 Gmail-merged rows show `gmail_signal_source='gmail-signals-20260514T163229Z.jsonl'` confirming the pre-corruption merge as their origin.

Phase 2.B.3 rows confirmed in Supabase post-promote:
```
f193186dd9eb0c22 · email='prietose@bancsabadell.com'        · Concha Rocher Collado · Lender
596a76514db8d527 · email='gestiondeactivos2@reyalurbis.com' · Pedro Javier Rodera   · Hotel Chain
```

Snapshots cached at:
- `CONTACTOS DATASITE/reports/supabase-pre-promote-snapshot.jsonl` (1.46 MB · 4547 rows)
- `CONTACTOS DATASITE/reports/supabase-post-promote-snapshot.jsonl` (1.47 MB · 4547 rows)

Phase B (classifier v2 · operator split · IA SUPPLY · `original_category_raw`) cleared to proceed.

### Files
**New:**
- `scripts/contactos/_phase_b_repair_freeze.py` (freeze guard module)
- `scripts/contactos/audit_master_alignment.py` (read-only alignment diagnostic · CLI path arg)
- `scripts/contactos/fix_master_alignment.py` (atomic shift-left repair)
- `scripts/contactos/apply_phase_2b3_replacements_v2.py` (idempotent replacement re-applier)
- `scripts/contactos/final_repair_validation.py` (closeout validation)
- `CONTACTOS DATASITE/master/.phase_b_repair_in_progress.lock` (sentinel)
- `CONTACTOS DATASITE/reports/supabase-canonical-snapshot.jsonl` (4547 rows · ground-truth cache)
- `CONTACTOS DATASITE/reports/master-alignment-audit_<TS>.json` (pre-fix audit report)
- `CONTACTOS DATASITE/reports/master-alignment-fix_<TS>.json` (fix diff report)
- `CONTACTOS DATASITE/reports/phase_b_repair_final_<TS>.json` (final validation)
- `CONTACTOS DATASITE/reports/phase_2b3_apply_log.jsonl` (correct audit trail · timestamped)

**Modified:**
- `scripts/contactos/classify_master.py` (freeze import + abort_if_frozen call)
- `scripts/contactos/promote_to_supabase.py` (freeze import + abort_if_frozen call)

**Backups created:**
- `CONTACTOS DATASITE/master/metcub-contacts-master.broken-2026-05-15.xlsx`
- `CONTACTOS DATASITE/master/metcub-contacts-master.broken-2026-05-15-postswap.xlsx`

### Phase B (still pending)
Master alignment is now sound. Phase B (Master classifier v2 with operator split + IA SUPPLY mapping + `original_category_raw`) can proceed once the freeze sentinel is lifted. The DB schema migration (Phase C · `company_type_canonical` + `relationship_type` CRM dimension) remains unchanged in scope.

---

## 2026-05-15 — Admin / Contacts · Relationship Type 8-group filter (Phase A · UI mapping layer)

Operator: "Los contactos hay que organizarlos en 8 grandes grupos. No destruyas las categorías antiguas todavía: crear mapping layer · mantener backward compatibility · migrar progresivamente · guardar `original_category_raw`." Phase A ships the UI / server mapping; Phases B (Master classifier v2) + C (DB schema + `relationship_type` CRM dimension) remain pending operator green-light.

### What shipped
- **Filter rename:** "Institutional type" → **"Relationship type"** (chip-strip label · KPI strip subhead · doc).
- **8 chips replace 11 flat values:** ALL · PRINCIPALS · BROKER · LENDER · OPERATOR · DEVELOPER · HOTEL SUPPLY · IA SUPPLY. Each chip key maps to a list of raw `investor_type` values via `RELATIONSHIP_TYPE_GROUPS` in `apps/web/src/lib/admin/contacts/live.ts` and explodes server-side to a single `.in("investor_type", [...])` query.
- **Backward compat preserved:** raw legacy values (`investor_type=Lender` etc.) still resolve via `.eq` for any existing bookmark / script. URL param key remains `investor_type` until Phase C renames the DB column.
- **KPI strip realigned:** bottom totem row is now Principals · Brokers · Lenders · Operators · Developers · Hotel Supply · IA Supply · Bidirectional (8 totems instead of 7). Same `RELATIONSHIP_TYPE_GROUPS` arrays drive both filter and counts so they cannot drift. Legacy `kpis.investors / family_offices / reits_socimis` retained on the typed contract for backward compat (deprecated · `investors` aliased to `principals`).
- **Header prose:** "X investors · Y operators · Z lenders · W brokers" → "X principals · Y brokers · Z lenders · W operators · V developers".
- **Dead code removed:** `loadInvestorTypes` no longer awaited on the page (still exported for future Phase B/C use); `investorTypes` prop dropped from `<ContactsFilters>`.

### Counts (Supabase production · 4 547 contacts)
| Group | Count | Composition |
|---|---|---|
| Principals | ~1921 | Investor 1836 + Family Office 59 + Owner 17 + Sovereign Wealth 3 + REIT/SOCIMI 2 + Insurance 2 + Inst. Investor 1 + Fund 1 |
| Broker | 905 | Broker 905 |
| Lender | 334 | Lender 334 |
| Operator | 719 | Hotel Chain 669 + Operator 40 + Brand 5 + F&B Op 5 |
| Developer | 521 | Developer 521 |
| Hotel Supply | 112 | Service Provider 112 |
| IA Supply | 0 | Pending Phase B promotion of `contact_category` from Master xlsx |

### Why IA SUPPLY shows 0
`relationship_contacts.investor_type` has no canonical "IA"/"AI Supply" value today. The IA SUPPLY classification already exists in Master's `contact_category` column (column 63 · written by `classify_master.py` via TECH_DOMAINS heuristic). Phase B promotes that column to Supabase as a separate column (`contact_category_canonical`) so all 8 chips report real numbers. Until then the chip is wired and visible — clicking it returns 0 deliberately.

### Files
- `apps/web/src/lib/admin/contacts/live.ts` — added `RELATIONSHIP_TYPE_GROUPS` + `RelationshipGroupKey` + `isGroupKey` · expanded `loadContacts` filter · realigned `loadContactKpis` (18 parallel counts) · expanded `ContactKpis` interface
- `apps/web/src/components/admin/contacts/contacts-filters.tsx` — rebuilt chip strip (8 group chips, label "Relationship type"); `investorTypes` prop removed
- `apps/web/src/components/admin/contacts/contacts-kpis.tsx` — bottom totem row rebuilt around the 8 groups
- `apps/web/src/app/user/admin/contacts/page.tsx` — header prose realigned · `loadInvestorTypes` await removed
- `docs/integrations/datasite-contacts.md` — Phase A taxonomy + server-lib note

### Phase B / C (pending operator green-light)
- **B (Master classifier v2):** add Operator as separate bucket in `classify_master.py` (split from Principal); save `original_category_raw` column; rerun classifier with `--scheme=v2` flag preserving v1 column.
- **C (DB schema + CRM `relationship_type`):** migration adds `relationship_contacts.{company_type_canonical, relationship_type, original_category_raw}`. `relationship_type` is the CRM dimension (strategic_partner / commercial_target / inactive / etc.) · separate from the descriptive `company_type_canonical` (operator/broker/etc.) and from the signal-driven `relationship_band` (active/warm/strategic/cold/dormant). Backfill from `investor_type` via mapping. UI filter switches to single `.eq` against the canonical column. Promote step picks up `contact_category` from Master.

---

## 2026-05-15 — Contactos · Phase 2.B.3 replacement-suggestions --apply execution

Operator: "Aplicar las 2 sugerencias aprobadas y dejar el outreach layer limpio, accionable, y listo para futuras campañas institucionales". Executed Phase 2.B.3 --apply mode to embed approved replacement heuristics into the Master with full audit trail, regenerated downstream report surfaces and institutional candidates list, and confirmed decontamination metrics.

### Applied replacements (with audit trail)
- Row 504 (ID f193186dd9eb0c22): **crocher@bancsabadell.com → prietose@bancsabadell.com** · band=strategic · same_category=Lender · threads=5 · replaced_by_master_id=9bf709fb1abda6e5 · replaced_at=2026-05-14T23:54:18+00:00
- Row 3443 (ID 596a76514db8d527): **p.j.rodera@reyalurbis.com → gestiondeactivos2@reyalurbis.com** · band=strategic · category_change=(Principal→Broker) · recent_activity=2024-06-05 · replaced_by_master_id=a27778b5f04425ea · replaced_at=2026-05-14T23:54:18+00:00

### Downstream regeneration
- **Master verification**: 67-column schema (63 + 4 audit columns: original_email · replacement_source · replaced_by_master_id · replaced_at) · 4382 active contacts · 2 with audit trail · 149 archived to INVALID_ARCHIVE
- **Gmail signal re-extraction**: extract_gmail_signals.py re-ran over 52 Gmail files · 8857 unique emails (raw signal count) · 12 bounce-flagged emails filtered by blocklist
- **Institutional inbox candidates**: harvest_untagged.py regenerated untagged-inbox-candidates with decontamination · 104 campaign-ready candidates (32 bidi · 45 inbound-only · 27 outbound-only) · 9 emails skipped on bounce/dead-domain
- **Relationship health metrics**: strategic + active band = 108 contacts · engagement distribution stable (active=11 · strategic=97 · warm=38 · cold=91 · dormant=192 · invalid=6)

### Audit trail completeness
- Original emails preserved for both replacements
- Replacement source (`replacement_heuristic`) and target Master ID recorded
- Timestamp locked at execution moment
- Non-destructive: old email never deleted, only replaced in active email column
- Idempotent: script checked for prior original_email to prevent double-apply

### Pending (manual review, Phase 2.B.3.post)
- 2 FLAG replacements awaiting external LinkedIn verification before future apply passes:
  - idalmau@inbisa.com → xdalmau@inbisa.com (surname match, category mismatch, score=50)
  - jurian@yotel.com → justin.davies@yotel.com (strategic band, mutual threads, score=50)

Outreach layer decontaminated and actionable. Campaign surfaces ready for institutional engagement.

---

## 2026-05-15 — Contactos · invalid-email cleanup pipeline (B + D + E)

Operator: "limpiar la base activa de HotelVALORA para futuras campañas y relaciones institucionales reales". Drained the 155 invalid-email rows from active Master and decontaminated the Gmail signal pipeline so they can never recontaminate.

### Three new operator scripts under `scripts/contactos/`
- **`build_replacement_suggestions.py`** — for each Master row with `email_validity = invalid`, scores same-domain live contacts on (full-name surname match · email-local surname match · recent activity ≤ 24mo · relationship_band ∈ {active,strategic,warm} · same contact_category · ≥2 active threads). Top-3 candidates per invalid above MIN_SCORE=30 → `replacement-suggestions_<batch>.csv` for human review (`apply_decision` column blank). Invalids with ZERO candidates → moved to new `INVALID_ARCHIVE` sheet inside same xlsx with full audit trail (`archived_at`, `archived_batch_id`, `archived_reason`, `archived_source_sheet_row`).
- **`build_bounce_blocklist.py`** — generates two artefacts under `CONTACTOS DATASITE/master/blocklists/`:
  - `gmail-bounce-blocklist.txt` (382 emails) · union of Master[invalid] + INVALID_ARCHIVE + gmail-signals (bc≥2 OR bc≥1∧inbound=0)
  - `dead-domains-blocklist.txt` (67 domains) · bounce_ratio ≥50% AND ≥2 contacts (excludes personal-email domains)
- **`build_dead_domains_review.py`** — same threshold as blocklist but enriches each domain with sample contacts, distinct companies, latest activity, latest bounce, has_active_relationships flag, H/M/L `investigation_priority`, and `rebrand_hint_domains` (best-guess from same-company-token in Master). Output: `dead-domains-review_<batch>.csv` with operator-fillable `investigation_action` + `new_corporate_domain` columns.

### Patches to existing pipeline
- **`_blocklist.py`** (new) · shared loader → `load_blocklists()` returns `(blocked_emails, blocked_domains)` sets · `is_blocked(email, …)` checks both.
- **`extract_gmail_signals.py`** · imports `_blocklist`, threads `is_blocklisted()` into bounce-attribution targets, snippet-extracted addresses, outbound recipients, inbound senders, and inbound to/cc. Logs `blocklist loaded · N email(s) · M domain(s)` at start.
- **`harvest_untagged.py`** · imports `_blocklist`, drops blocked emails before sorting candidates, logs skipped count.

### Run results (2026-05-14T23:21Z batch)
- 155 invalid identified · 6 with ≥1 same-domain candidate (11 suggestion rows top-3) · 149 archived sin candidato.
- Master: **4547 → 4398 active rows · INVALID_ARCHIVE: 149 rows · 67 cols** (63 + 4 audit).
- Blocklist: **382 emails · 67 dead domains**.
- Dead-domains review: **67 domains** · H=1 (reyalurbis.com) · M=3 (pierrecelestin-group, room-matehotels, louvre-hotels) · L=63.
- Pre-cleanup backup at `master/metcub-contacts-master.BACKUP-pre-cleanup.xlsx`.

### Audit trail
- `reports/invalid-archive-log.jsonl` · append-only · contains both archive events and emitted-suggestion events with full provenance.
- All outputs under gitignored `CONTACTOS DATASITE/` tree.

Master sheet structure unchanged · same 63 columns · contact_category taxonomy preserved (Principal · Broker · Lender · Developer · Proveedor · IA aplicaciones · Uncategorized).

---

## 2026-05-14 — Integrations registry · new External Data APIs layer

Operator: "si rapidapi esta vinculado, deberiamos incluir en admin/integrations, y el api que usamos". The Booking-com15 RapidAPI and Google Places APIs were live in code but invisible on `/user/admin/integrations`. Promoted them to first-class layer cards.

### platform-registry.ts
- New `external_data` value on `PlatformIntegrationLayer` union
- New `EXTERNAL_DATA` descriptor array · 2 rows:
  - **RapidAPI · Booking.com (booking-com15)** · status `live` · Pro tier (35 k calls/month) · 5-endpoint chain · env `BOOKING_RAPIDAPI_HOST` + `BOOKING_RAPIDAPI_KEY` · consumed by hotel-detail Fetch action + `scripts/enrich-all-hotels.mjs` + provenance tag `rapidapi_booking` (priority 80)
  - **Google Places API (v1)** · status `configured_not_wired` · env `GOOGLE_PLACES_API_KEY` · awaiting Google Cloud key activation · provenance priority 70 · coordinate-only writes
- `PLATFORM_LAYER_META` entry · label "External Data APIs" · order 7.5 (between Relationship Intelligence and Commercial)

### page.tsx
- `OperationalStrip` totalLayers 9 → 10 · hero copy "nine operational tiers" → "ten"
- Comment block updated to reflect new render order

Typecheck clean. Layer renders dynamically via `platformIntegrationsByLayer()` — no consumer-side wiring needed.

---

## 2026-05-14 — Institutional masters populated · HOTELESperMARKET + Booking merge

Operator: "los documentos en services/costar/MASTER están vacíos · faltan datos · y falta un master HOTELESperMARKET con los 364 hoteles + Booking enrichment". The pre-existing `build_masters.py` only wrote schema templates (DATA sheets empty). Reworked to also populate from canonical data sources.

### build_masters.py extension
- `build_workbook()` and `build_data_sheet()` accept optional `data_rows: list[dict]` · same schema, now populated
- Added Booking enrichment columns to `HOTELS_BY_MARKET_COLUMNS` (v1.3):
  - Property additions · `floors_above_ground` · `floors_below_ground` · `gross_building_sqm` · `lot_size_sqm` · `typical_floor_sqm` · `meeting_rooms_count` · `last_sale_date` · `last_sale_price_eur` · `catastro_id`
  - Booking enrichment · `booking_hotel_id` · `booking_url` · `review_score` · `review_count` · sub-scores (location · comfort · cleanliness · staff · value · facilities) · 8 facility toggles · counts · 5 policies · provenance/confidence/completeness · last scraped timestamp · coords source
- Total schema: **83 columns** (was 40)
- Mapper functions: `_market_row_to_pais` · `_market_row_to_mercado` · `_market_row_to_submercado` · `_hotel_to_row` · `_meta_block`
- Supabase Storage REST integration · downloads `manual_enrichment/*.json` via service-role key (no supabase-py dep · uses urllib + Authorization header)
- Env resolution · `_supabase_env()` falls back to parsing `apps/web/.env.local` for operator-side CLI runs

### Output (services/costar/MASTER/)
| File | Rows | Cols | Sheet |
|---|---|---|---|
| COSTAR_MASTER_PAIS.xlsx | 44 | 39 | COUNTRY |
| COSTAR_MASTER_MERCADOS.xlsx | 371 (15 snap + 356 ts) | 40 | MARKET |
| COSTAR_MASTER_SUBMERCADOS.xlsx | 10 | 41 | SUBMARKET |
| COSTAR_MASTER_CLASS.xlsx | 6 (derived) | 41 | CLASS |
| **COSTAR_MASTER_HOTELESperMARKET.xlsx** | **364** | **83** | HOTELS |

CLASS master · CoStar doesn't ship chain-scale aggregated KPIs in our drop · the master is now populated with derived aggregates `(country, market, chain_scale) → (hotel_count, rooms_total)` from the hotel inventory. KPI columns left null with explanatory note in the row.

### auto-rebuild on every ingest
- `ingest.py` now imports `build_masters.main` and calls it after `write_snapshot` · masters always reflect the canonical state · operator never has to remember a separate rebuild step
- Logger emits `masters.rebuilt` event when successful · `masters.rebuild_failed` on error (non-fatal · ingest still succeeds)

### AC Hotel validation
- `hotel_id`: h_204efabe95397fff · CoStar fields populated · Booking enrichment merged
  - booking_hotel_id: 90810 · review_score: 8.75 · enrichment_sources: rapidapi_booking · profile_completeness_score: 50
  - meeting_rooms_count: 1 · gross_building_sqm: 5744 · location_score: null (older enrichment without sub-scores · re-run unblocks)

### Operator workflow
```bash
# Standalone rebuild after pulling latest snapshot/enrichment
python services/costar/scripts/build_masters.py

# Or just run a full ingest · masters rebuild automatically at the end
python services/costar/scripts/ingest.py
```

The 5 XLSX files are the institutional review surface · operator opens in Excel for audit · regulatory disclosure · data-quality review · cross-reference with CoStar source files.

---

## 2026-05-14 — Market KPIs · 425 rows recovered · stateful-merge safety added

Operator: "Market KPIs muestra 0 · antes ponía +700". Diagnosis:
1. Production snapshot was uploaded before the PAIS/MERCADO/SUBMERCADO XLSX files were ingested · stored `market_timeseries=0, market_snapshots=0` in production.
2. SUBMERCADO file was never in INPUT during the most recent local ingests · its 10 rows were dropped because the stateful merge in `ingest.py` only carries forward hotels/transactions/compsets, NOT market data.
3. UI's "Market KPIs" KPI showed only `market_timeseries` (356 rows max) · operator's mental model included the 69 geo-listing rows too · hence "+700" memory.

### Source counts (from CoStar XLSX exports)
| File | Rows |
|---|---|
| PAIS · GeographyList | 44 countries |
| MERCADO · GeographyList | 15 markets |
| MERCADO · DataTable | 356 monthly periods |
| SUBMERCADO · GeographyList | 10 submarkets |
| **TOTAL KPI** | **425** |

### Fixes shipped
1. **Re-ingested all 4 KPI XLSX files** · `batch_04ef5ec3e6b54457`
   - 44 country_listing + 15 market + 10 submarket = 69 `market_snapshots`
   - 356 `market_timeseries` (Madrid only · 30 years × 12 months)
   - Total 425 KPI rows · matches source 1:1
2. **Stateful-merge safety in `ingest.py`** · when current run captures 0 market_snapshots / market_timeseries / projects, carry forward from previous snapshot · prevents data loss when operator forgets to drop files in INPUT
3. **UI · "Market KPIs" KPI** now shows `market_snapshots + market_timeseries` (425) with hint `"69 geo · 356 time-series"` · matches operator's mental model
4. **Snapshot uploaded** to Supabase Storage · production reflects within 30s

### Side effect of re-ingest
Stateful merge preserved · 364 hotels + 661 transactions + 217 Booking enrichment records all carried forward · no data loss · 4 KPI files moved INPUT → OLD.

---

## 2026-05-14 — Bulk Booking enrichment over 364 Madrid hotels · 217 enriched (60% coverage)

Operator upgraded RapidAPI booking-com15 to Pro tier (35k calls/month) · ran the full bulk over the Madrid inventory.

### Runner improvements (this commit)
- `--concurrency N` flag · refactored main loop into a worker-pool pattern · 10 parallel workers processed 364 hotels in 210s (3.5 min) · was projecting 90+ min serial
- Refactor: per-hotel logic extracted to `processHotel(hotel, i)` function · workers pull from a shared queue · 5 consecutive 429s across any worker triggers global abort
- `booking-fetcher.ts::searchHotelsByCoordinates(lat, lng)` · new endpoint wrapper for future disambiguation pass (when CoStar names match wrong Booking properties because they share a building, e.g. "Edificio Eurobuilding 2" matched a Pierre & Vacances apartment listing in the same building)

### Bulk run results
- 198 hotels enriched in this run · plus 19 already-enriched preserved = **217 total** in `manual_enrichment/`
- 147 hotels need disambiguation · Booking returned no Spain-country hotels matching the canonical CoStar names (typically because the name is too specific: "URBAN SEA Atocha 113" · "Sercotel Togumar, Ascend Hotel Collection" · "Mualto Madrid Princesa")
- 0 API errors · 0 upload errors · Pro tier handled the burst cleanly
- Elapsed: 210s · effective ~1.7 hotels/sec under concurrency 10

### Completeness distribution (217 enriched)
- avg `profile_completeness_score`: **52%**
- 71-100% complete: 8 hotels
- 51-70% complete: 119 hotels
- 31-50% complete: 89 hotels
- 1-30% complete: 1 hotel
- 0% complete: 0 hotels

### Sample enriched hotels
- The Westin Madrid Cuzco · 70% complete · 13 facilities · 29 room types · ★8.9 · 100% match
- Barceló Imagine · 69% complete · 18 facilities · 60 room types · ★9.1
- NH Madrid Ventas · 69% complete · 16 facilities · 8 room types · ★8.6
- Leonardo Hotel Madrid City Center · 60% · 13 facilities · 18 rooms · ★8.4

### Next steps (operator-driven)
1. **Disambiguation pass for 147 ambig hotels** · use `searchHotelsByCoordinates` once Google Places API resolves lat/lng (or operator manually edits the canonical name)
2. **Re-enrich the 19 originally-skipped** · they were captured before sub-scores + policies + lat/lng landed · re-run without `--skip-enriched` to refresh
3. **Google Places** · operator provides API key · CLI fills remaining coords + addressComponents
4. **Snapshot regeneration not needed** · web app reads `manual_enrichment/` records at request time via `_mergeAllManual` · 30s cache TTL · changes already visible

### Production impact
- `/user/admin/hotels` list page · 217 hotels now show real completeness chips (50-70% range typical) instead of "empty"
- Each detail page renders: Booking Hotel ID · Location score · Confort score · HotelVALORA score · Room mix from Booking room_types · Meeting rooms from CoStar count · 10-facility icon grid · policies (where Booking returned them)

---

## 2026-05-14 — Google Places API v1 integration (Phase 3.f.next 5)

CoStar export doesn't ship lat/lng for any of the 364 hotels · every hotel detail page falls back to the "find on Google Maps" CTA. Operator pointed to the Places API as the canonical source.

### Shipped (no API key yet · ready to run when key provided)

- `apps/web/src/lib/admin/hotels/google-places.ts` · typed server-only client
  - `searchText({ textQuery, regionCode, maxResultCount })` · POST `/v1/places:searchText`
  - `getPlaceDetails(place_id, fieldMask)` · GET `/v1/places/{place_id}`
  - `extractStructuredAddress(place)` · pulls street_number · street · postal_code · city · province · country_code · neighborhood from `addressComponents[]`
  - `placeMatchConfidence(place, canonical)` · same algorithm as Booking match · token-normalised substring/Jaccard
- `apps/web/scripts/enrich-hotels-coords.mjs` · CLI runner
  - Iterates the snapshot · searches Places by `"{name}, {address}, {market}, {country}"`
  - Picks top-match place ≥0.7 confidence · regionCode-biased
  - MERGE-aware upload to `costar-master/manual_enrichment/<hotel_id>.json` · preserves existing Booking + manual enrichment · only adds lat/lng + geo_context.google_*
  - Skip-list: `--skip-coord-resolved` skips hotels with existing coords (CoStar canonical or prior profile)
  - Source-priority guard: refuses to overwrite a `manual_operator` record's coords
  - CLI flags: `--limit N` · `--only <hotel_id>` · `--throttle <ms>` · `--min-match 0.7`
- `apps/web/.env.example` · documented `GOOGLE_PLACES_API_KEY` env var with pricing note (~$32/1000 Atmosphere · ≈$12 for all 364)

### Provenance contract

| Source | Priority | Behaviour |
|---|---|---|
| `manual_operator` | 100 | Always wins · never overwritten by Places |
| `rapidapi_booking` | 80 | Wins over Places on conflict |
| `google_places` | 70 | Coordinates + addressComponents + place_id only · won't touch other fields |

The snapshot reader's `_mergeAllManual` doesn't need changes · it already merges enrichment by source priority. Google Places fills the `profile.latitude / .longitude / .geo_context.google_place_id` slots that the Booking pipeline leaves empty.

### Operator action

1. Get a Places API key: https://console.cloud.google.com/google/maps-apis · enable "Places API (New)"
2. Add to `apps/web/.env.local`:
   ```
   GOOGLE_PLACES_API_KEY=<key>
   ```
3. Also push to Vercel project env (Production + Preview + Development)
4. Run the bulk enricher:
   ```bash
   cd apps/web && node --env-file=.env.local scripts/enrich-hotels-coords.mjs --skip-coord-resolved
   ```
5. Upload the new snapshot: `node --env-file=.env.local scripts/upload-snapshot.mjs`

After run · all 364 hotel detail pages should show coords (with "Booking" or "Google Places" source badge) instead of the "find on Google Maps" CTA.

### Not shipped

- UI button "Resolve via Google Places" on the detail page (CLI is sufficient for the one-time bulk fill · UI can come later for per-hotel re-resolution)
- Auto-trigger on snapshot regeneration (operator-driven for now · avoids burning quota on every ingest)
- Address-component back-write to canonical `address_line` / `postal_code` (today the structured address lands only in `profile.geo_context.google_address_components` · CoStar canonical fields stay institutional)

---

## 2026-05-14 — Meeting rooms count + transaction dedup pipeline

Three operator-reported fixes:
1. Meeting rooms card showed "✓" placeholder · should show the actual count from CoStar "Salas de reuniones"
2. Transaction comparables list included rows with null price (institutionally useless · price is the headline metric)
3. Same real-world transaction surfaced multiple times in the snapshot because news sources publish slightly different prices · operator wants pipeline-side dedup that picks the modal (most-repeated) price

### Meeting rooms count
- Schema: `HotelReferenceRecord.meeting_rooms_count: number | null`
- Python alias `salas_de_reuniones` → `meeting_rooms_count`
- Card now uses CoStar count as primary signal · Booking `profile.meeting_rooms.count` as fallback · displays the actual integer instead of ✓ placeholder

### Comparables filter
- `findTransactionComparables` now skips rows with null/zero price
- Also skips rows the pipeline marked `is_duplicate=true`

### Transaction dedup · `services/costar/scripts/dedup_transactions.py`
Pure function `dedupe_transactions(transactions) → (rows, duplicate_count)`.

Algorithm:
1. Group by (normalised_asset_name, year-month of closed_at) · no-date rows bucket under asset only
2. For each group with ≥2 rows:
   a. Collect non-null prices
   b. Count modal price using ±2% tolerance bands (€290M and €291M considered same band; €290M and €310M not)
   c. Canonical row = first row whose price falls in the modal band AND has closed_at when ties
   d. Other rows tagged `is_duplicate=True`, `duplicate_of=<canonical_id>`
   e. Canonical row gets `price_variants[]` listing every (source, price_eur, closed_at) seen across siblings — operator audit trail

3. Singletons pass through unchanged

Wired into ingest.py after `ingest_transactions` + `merge_by_id` (so it runs AFTER stateful merge with previous snapshot). Logger emits `transactions.dedup` event with duplicates_marked + canonical_rows.

Pipeline run results: 661 raw rows → 629 canonical + 32 duplicates (4.8% noise eliminated). Sample groups: "Dream Hotel Group" €289M+€291M → €289M canonical · "Hotel Incosol Marbella" €150M+€20M → €150M canonical (price_variants[] preserves both for audit).

TS types extended on `TransactionEntry`:
- `is_duplicate?: boolean`
- `duplicate_of?: string`
- `price_variants?: Array<{ source, price_eur, closed_at }>`

### Field coverage update
After re-ingest with new aliases:
- `meeting_rooms_count`: 364 hotels (CoStar populated this on every row)
- 32 transactions tagged duplicate → comparables tables now ≤4% smaller and price-accurate

### Operator workflow
- Operator audits dedup decisions via the canonical row's `price_variants[]` list (future UI: hover/expand a transaction row to see all sibling prices)
- For now: visible in raw snapshot.json · CLI inspection

---

## 2026-05-14 — Location · Country/Market lines + last_sale schema + ingest re-run unblocks 80%+ field coverage

Operator observed many CoStar-side fields still rendered "—" (category, segment, gross area, etc). Root cause: the snapshot in production was generated before the new aliases landed. This pass adds the last missing pieces, runs a clean re-ingest, and uploads the fresh snapshot.

UI tweaks
- Location section now shows full geographic hierarchy: Country · Market · Submarket · Address · Postal code (was missing Country and Market)
- last_sale fields now have a hotel-record fallback path (CoStar canonical "Fecha de la última venta" / "Último precio de venta") · still prefers the linked-transaction date when present

Schema · last_sale fields added
- `HotelReferenceRecord.last_sale_date: string | null` (ISO YYYY-MM-DD)
- `HotelReferenceRecord.last_sale_price_eur: number | null`

Python normalization · last_sale + missing aliases
- `fecha_de_la_ultima_venta` / `ultima_venta` / `fecha_ultima_venta` / `last_sale_date` → `last_sale_date`
- `ultimo_precio_de_venta` / `precio_ultima_venta` / `last_sale_price` → `last_sale_price_eur`
- `clasificacion_por_estrellas` → `category` (CoStar has two stars-bearing columns · both now populate)
- `superficie_alquilable_del_inmueble_sba` → `gross_building_sqm` (the full SBA-suffixed column name CoStar uses)
- Date parser handles ES `DD/MM/YYYY` string → ISO `YYYY-MM-DD` (with US `MM/DD/YYYY` heuristic when day > 12)
- Excel datetime cells also accepted (isoformat fallback)

Re-ingest results · `python services/costar/scripts/ingest.py`
- Files processed: 1 / archived: 1
- 364 hotels merged · stateful merge preserved all enrichment

Field coverage after re-ingest (of 364 hotels):
| Field                | Before | After |
|---------------------|--------|-------|
| category             | 0      | 312   |
| segment_type         | 0      | 338   |
| gross_building_sqm   | 0      | 363   |
| lot_size_sqm         | 0      | 306   |
| typical_floor_sqm    | 0      | 345   |
| last_sale_date       | 0      | 62    |
| last_sale_price_eur  | 0      | 32    |
| floors (Plantas)     | 0      | 364   |

Sample verifications
- AC Hotel Avenida de América: category=4 · segment=hotel · gross=5744 m² · lot=1170 m² · planta=797 m² · floors=6 · last_sale=null (CoStar had no sale on this hotel)
- Hotel Puerta América: category=5 · gross=31243 m² · last_sale=2017-03-15 · €16.3M
- NH Madrid Chamberí: category=3 · last_sale=2003-06-01 · €8.5M

Snapshot upload
- `node --env-file=.env.local scripts/upload-snapshot.mjs`
- 1.66 MB · schema v1.7 · batch_170a27dfbf594b69
- Production `/user/admin/hotels` reflects new data within 30s cache TTL

---

## 2026-05-14 — CoStar mapping correction · last-sale + Meeting rooms always visible

Operator clarification on which CoStar source columns each property field maps to:
- Segment → CoStar "Tipo secundario" · values: hotel | apartamento con servicios | Hotel project
- Categoria → CoStar "Clasificación hotelera"
- Gross area (m²) → CoStar "Superficie alquilable" (was named "Gross building")
- Lot size (m²) → CoStar "Terreno (m²)"
- Typical floor (m²) → CoStar "Planta tipo (m²)"

Plus 3 new things:
- Add a card to the right of F&B for number of meeting rooms (always visible)
- Add `Last sale date` and `Last sale price` to Property characteristics

### Python normalization aliases
- `clasificacion_hotelera` / `clasificacion` → `category`
- `superficie_alquilable` / `rentable_area` / `leasable_area` → `gross_building_sqm` (additional aliases · the field name stays the same internally)
- `terreno` / `terreno_m2` → `lot_size_sqm`
- `planta_tipo_m2` → `typical_floor_sqm`
- `apartamento_con_servicios` / `apartamentos_con_servicios` / `apart-hotel` → `tourist_apartments` in `_SEGMENT_MAP`

### UI changes
- "Gross building (m²)" label renamed → "Gross area (m²)" · enum value stays `gross_building_sqm` for stability · only the display string changes
- `fmtSegment` now renders `tourist_apartments` → "Apartamento con servicios" (was "Tourist apartments") to match CoStar's institutional vocabulary
- New `fmtPriceEur(n)` helper · compact notation €1.5M / €450K / €120
- Last sale rows derived from `transactions` array · most-recent `closed_at` with non-null `price_eur` wins · displayed as ISO date + €X.XM
- Row 2 of enrichment cards now ALWAYS renders Room types · F&B · Meeting rooms (previously each was gated on data) · "—" placeholders for empty data · this anchors Meeting rooms in the canonical column-3 position to the right of F&B regardless of profile state
- Placeholder text on each card: "no Booking room types yet" · "no F&B data yet" · "no meeting rooms data"

### Validation
- AC Hotel (h_204efabe95397fff)
  - Gross area · Lot size · Typical floor render "—" (snapshot doesn't have those columns yet · re-ingest unblocks)
  - Last sale date · Last sale price render "—" (no transactions linked yet)
  - Row 2 shows Room types (—) · F&B (—) · Meeting rooms (—) all aligned
- typecheck clean · HTTP 200 · 153 KB detail page

### Operator action
- Re-run `python services/costar/scripts/ingest.py` after CoStar XLSX is loaded with the corrected column names (Superficie alquilable / Terreno / Planta tipo / Tipo secundario / Clasificación hotelera) · the aliases now match those headers

---

## 2026-05-14 — Hotel detail · Property characteristics expanded + Room Mix superficie media

Operator request after the previous overhaul:
1. Property characteristics misses fields shown in the asset-analysis report (gross building · lot size · typical floor · etc.)
2. Category should display as 1–5 stars
3. Segment values should be: hotel · hotel_project · tourist_apartments (property-type axis, not commercial-segment)
4. Room Mix · first card should be the weighted average (Superficie media)
5. Remove "operator can override via Run enrichment" footer text

### Schema additions to `HotelReferenceRecord`
- `gross_building_sqm: number | null` · "Superficie construida" · institutional headline alongside rooms_count
- `lot_size_sqm: number | null` · "Superficie de la parcela"
- `typical_floor_sqm: number | null` · "Planta tipo"
- `floors_above_ground: number | null` · CoStar splits this from total_floors
- `floors_below_ground: number | null`

### segment_type enum rewritten
Replaced commercial-segment axis (`business / leisure / extended_stay / resort / convention`) with property-type axis: `hotel / hotel_project / tourist_apartments`. The previous values were the wrong axis — those describe market positioning, not what the asset IS. Legacy records still in the snapshot render gracefully as "(legacy)" until next re-ingestion.

### Python normalization (services/costar/scripts/normalization.py)
Added CoStar header aliases so the next `ingest.py` run captures the new fields:
- `superficie_construida` / `area_construida` / `gba` / `gross_building_area` → `gross_building_sqm`
- `superficie_de_la_parcela` / `superficie_del_terreno` / `lot_size` → `lot_size_sqm`
- `planta_tipo` / `superficie_planta_tipo` / `typical_floor` → `typical_floor_sqm`
- `plantas_sobre_rasante` / `floors_above_ground` → `floors_above_ground`
- `plantas_bajo_rasante` / `floors_below_ground` → `floors_below_ground`

`_SEGMENT_MAP` rewritten to map the new three buckets · accepts ES + EN variants (proyecto_hotelero, en_desarrollo, apartamentos_turisticos, aparthotel, etc.).

`normalise_hotel_row` extended to extract + persist the 5 new numeric fields.

Operator action: re-run `python services/costar/scripts/ingest.py` after CoStar source XLSX is updated with those columns. Current 364 hotels show "—" for these until ingest runs.

### UI changes · `/user/admin/hotels/<id>`
- **Property characteristics** · adds Gross building · Lot size · Typical floor · Floors line now formats as "above / total · X below" when floors-above-ground is known
- **Category** · numeric values (1–7) display as "{N} ★"; strings pass through
- **Segment** · new enum values display as "Hotel" / "Hotel project" / "Tourist apartments"; legacy values tagged "(legacy)"
- **Room Mix** · new first card "Superficie media" · emerald-ringed · displays the weighted hotel-wide avg sqm
  - Formula: `Σ(units × avg_sqm) / Σ(units)`
  - Falls back to plain mean across populated buckets when unit counts are missing
- Removed "operator can override via Run enrichment" footer text

### Helpers added in detail page
- `fmtSqm(n)` · Spanish locale thousand separators ("102.851 m²")
- `fmtCategory(c)` · numeric → "{N} ★" · string passthrough
- `fmtSegment(s)` · enum → human label with legacy tagging
- `fmtFloors(total, above, below)` · "above / total · X below" institutional format

### Validation
- AC Hotel (h_204efabe95397fff) · estimated mix · Superficie media = 25.6 m² (Σ: 7×18 + 130×25 + 7×45 = 3691 / 144) ✓
- Gross building / Lot size / Typical floor all render "—" today (CoStar snapshot doesn't have them yet · ingest re-run unblocks)
- typecheck clean

---

## 2026-05-14 — Hotel detail · Room Mix always visible + 5/90/5 default formula

Operator feedback after the UX overhaul: (1) HotelVALORA score appearing in both Property characteristics and the enrichment cards is redundant · keep only the enrichment card · (2) the Room Mix card was hidden when Booking returned 0 rooms · but the operator may need to MANUALLY EDIT it later for hotels where Booking has no data · (3) when Booking data is missing, fall back to an institutional default distribution: 5% individuales · 90% doble · 5% suite · over `rooms_count`.

Changes:
- Removed HotelVALORA score line from Property characteristics section (it remains as the highlighted card in the enrichment section)
- Room Mix card now ALWAYS renders · all 7 buckets visible · operator can see zero-value buckets they may want to populate
- New `DEFAULT_DISTRIBUTION` in `room-mix.ts`:
  - Individuales : 5% of rooms · default 18 m²
  - Doble        : 90% of rooms · default 25 m²
  - Suite        : 5% of rooms · default 45 m²
  - Other buckets : 0% (Junior Suite · Estudio · 1 dorm · 2 dorm)
- `summariseRoomMix(profile, rooms_count_fallback?)` resolution order:
  1. Booking real per-type data (source = "booking")
  2. 5/90/5 default × rooms_count (source = "estimated")
  3. All zeros (source = "empty")
- Source badge on the card header (emerald · amber · slate)
- Footer text explains the source · for estimated: "5% individuales · 90% doble · 5% suite · institutional default · sqm: 18/25/45 · operator can override via Run enrichment"

Validation
- AC Hotel (h_204efabe95397fff) · 144 rooms · estimated: Individuales 7 (18m²) · Doble 130 (25m²) · Suite 7 (45m²) · rounding remainder absorbed by suite
- Novotel Madrid Center (h_4ff39b1bb2774f1d) · 28 Booking room types · source="booking" · per-bucket means from Booking surface_in_m2
- typecheck clean · HTTP 200 · 147 KB detail page

---

## 2026-05-14 — Hotel detail UX overhaul · scores · room mix · Google Maps fallback

Operator review of `/user/admin/hotels/<id>` surfaced a list of fixes against the institutional contract. All shipped in one pass:

Identification section
- Added `Booking Hotel ID` (from `_enrichment_meta.booking_hotel_id`)
- Added `Catastro ID` slot (new schema field · manual entry today · Catastro API enrichment later)

Property characteristics
- `CoStar score` replaced by **`HotelVALORA score`** · 0-10 composite computed from Booking sub-scores + class adjustment · weights: Location 30% · Comfort 20% · Cleanliness 15% · Staff 10% · Value 10% · Facilities 5% · Class 10%
- Category and Segment lines kept (already populated when CoStar provides)

Location section
- `Neighborhood` label renamed → **`Submarket`** (was already pulling `submarket_name`)
- Coordinates resolution priority: CoStar → Booking enrichment → Google Maps search fallback
- When coords present: clickable link to Google Maps with `CoStar` / `Booking` source badge
- When coords missing: amber "find on Google Maps" link pre-filled with hotel name + address + market

Hotel profile · enrichment section
- Removed the yellow "Missing · biggest gaps first" block (was erroneous · most "missing" fields are already shown in facilities or aren't institutionally relevant)
- Replaced the `Review score` card with three score cards: **Location score** · **Confort score** · **HotelVALORA score** (last one highlighted in emerald ring as the headline institutional metric)
- Removed `Accessibility` card and `External` card (External is already in the sources footer)
- **New Room Mix card** before Facilities · canonical 7-bucket distribution (Individuales · Doble · Junior Suite · Suite · Estudio · 1 dormitorio · 2 dormitorios) · derived from `profile.room_types[]` via `summariseRoomMix()` · classifier in `lib/admin/hotels/room-mix.ts` maps Booking room names to buckets (regex patterns for English + Spanish) · avg sqm sourced from Booking when available · row shows: `{label} · {N types · M units} · {avg_sqm} m²`

Schema additions
- `HotelReferenceRecord.catastro_id?: string | null`
- `HotelProfile.latitude?: number | null` / `longitude?: number | null` (Booking coords as CoStar fallback)
- `HotelProfile.location_score / comfort_score / cleanliness_score / staff_score / value_score / facilities_score / wifi_score` (all from `getHotelReviewScores` `score_breakdown.question[]`)
- `EnrichmentMeta.booking_hotel_id?: number | null` + `last_policies_patched_at?: string | null`

Booking integration
- `booking-fetcher.ts::getHotelReviewScores` · new endpoint wrapper
- `booking-fetcher.ts::extractReviewSubScores` · pulls per-category scores from `score_breakdown[0].question[]` · matches `hotel_clean → cleanliness_score`, `hotel_comfort → comfort_score`, `hotel_location → location_score`, etc.
- `mapBookingToProfile` now extracts sub-scores AND Booking lat/lng into `profile.latitude/longitude`
- Server action `runBookingEnrichment` now calls 5 endpoints in parallel (details + facilities + rooms + policies + reviews)
- Bulk CLI runner already had reviews call · extended to pull sub-scores + lat/lng

New helper libs
- `lib/admin/hotels/hotelvalora-score.ts` · `computeHotelVALORAScore(hotel)` · pure function · returns `{score, inputs, weight_coverage}` · auto re-normalises weights when sub-scores partial so a half-enriched hotel still gets a sensible composite (vs always 0)
- `lib/admin/hotels/room-mix.ts` · `summariseRoomMix(profile)` · classifies + aggregates by 7 buckets · `ROOM_BUCKETS` registry exported for any future UI that needs the canonical order

Existing 9 enriched hotels show 0/10 on sub-scores (the score-breakdown wasn't captured in the older payload format). Once RapidAPI tier is upgraded, re-running `enrich-all-hotels.mjs --skip-enriched` no — wait, those 9 ARE enriched, so `--skip-enriched` skips them. Operator should drop them via the storage list + remove, or remove `--skip-enriched` and let the runner upsert. The bulk runner with the new contract will populate sub-scores + lat/lng + room mix on those 9 too.

typecheck clean · /user/admin/hotels/h_204efabe95397fff renders all signatures (Booking Hotel ID · Catastro ID · Submarket · HotelVALORA score · 3 score cards · Room mix when room_types > 0 · Google Maps coords fallback).

---

## 2026-05-14 — Phase 3.f.next 3 · getHotelPolicies integration · check-in/out + pet + cancellation + smoking

Operator-chosen sequencing: probe `getHotelPolicies` and patch the 9 already-enriched hotels with policies BEFORE doing the bulk run · so the institutional contract is complete before scaling to 364 (saves ~1k duplicate calls when tier is upgraded).

Cabling (RapidAPI quota was already exhausted at probe time · code shipped untested; will validate on first call after tier upgrade)

- `booking-fetcher.ts::getHotelPolicies(booking_hotel_id)` · new endpoint wrapper · returns the loose `HotelPoliciesRaw` shape (Booking returns 3+ possible structures across properties)
- `booking-fetcher.ts::extractPolicies(raw)` · pure function · defensive parsing across all known shapes:
  1. `data.check_in: { from, until }` / `data.check_out: { ... }` (direct)
  2. `data.policies[]` with `{ type, name, rules: [{ title: "From", content: "15:00" }] }`
  3. `data.policies[]` with `{ type, content: "Check-in: From 15:00 until 22:00" }` (free-text · regex-extracted HH:MM)
- Mapper extension · `mapBookingToProfile()` now accepts `policies` · fills `check_in_time` / `check_out_time` / `pet_policy` / `cancellation_policy` / `smoking_policy` with priority over the `details` endpoint fallbacks
- Server action · `runBookingEnrichment` now calls 4 endpoints in parallel (details + facilities + rooms + policies)
- Bulk runner CLI · same · `enrich-all-hotels.mjs` adds call #6 (policies) in deep mode

Patcher · `apps/web/scripts/patch-enrichment-policies.mjs`
- Reads every `manual_enrichment/<hotel_id>.json` from Supabase Storage
- Pulls `booking_hotel_id` from `_enrichment_meta`
- Calls ONLY `getHotelPolicies` for each · merges into existing profile · re-uploads
- Cost: ~9 RapidAPI calls (one per already-enriched hotel)
- Operator-side · `cd apps/web && node --env-file=.env.local scripts/patch-enrichment-policies.mjs`
- Idempotent · re-running just refreshes policies · existing operator manual edits preserved (the patcher only fills empty slots, never overwrites)

Quota status (2026-05-14)
- BASIC tier exhausted at hotel 10 of validation run
- All endpoints (including `getHotelPolicies`) return 429 until tier upgrade

Operator action sequence (when tier is upgraded)
1. `cd apps/web && node --env-file=.env.local scripts/patch-enrichment-policies.mjs` · 9 calls · backfills policies on the 9 hotels enriched today
2. `cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs --skip-enriched` · ~1820 calls deep / ~728 basic · covers the remaining 355 hotels with full contract (details + facilities + rooms + reviews + policies)

typecheck clean.

---

## 2026-05-14 — Phase 3.f.next 2 · canonical 10-facility icon grid (report-aligned)

Operator feedback: the noisy chip list of raw Booking facility strings (15+ "Wifi in all areas · Air conditioning · Heating · Non-smoking rooms · …") isn't what the final asset-analysis report consumes. The report uses a fixed 10-facility checklist with icons. Re-aligned the enrichment view to that institutional contract.

- `lib/admin/hotels/canonical-facilities.ts` · new single-source-of-truth for the 10 institutional facilities:
  - Bar & Caffe (Coffee) · Restaurant (UtensilsCrossed) · Rooftop Bar (Wine) · Meeting rooms (Users) · Events (CalendarHeart) · Gym (Dumbbell) · SPA Wellness (Sparkles) · Pool (Waves) · Parking (Car) · Other rentals (Home)
- `resolveCanonicalFacilities(profile)` derives availability from three layers:
  1. Structured `HotelProfile` fields (e.g. `profile.spa?.has_spa`)
  2. Boolean toggles baked in the schema
  3. Substring probe against `profile.facilities_detailed[]` (Booking raw evidence)
- Hotel detail page · replaced the noisy chip lists (Facilities · Amenities · Services) with a 5×2 icon grid · green icon + label when present · slate icon + line-through label when absent · "N / 10 present" counter in the section header
- Raw Booking facility strings preserved as collapsible `<details>` block below the grid (evidence for audit / debug, not display)
- Icons match `components/library/amenity-icon-cell.tsx` (the library/favorites-list system) so the visual language is consistent across the platform

Validation on the 9 enriched hotels
- AC Hotel Avenida de América → 4 / 10 (Restaurant · Gym · Meeting · Parking)
- Novotel Madrid Center → expected higher (Booking returned Pool · Fitness · Meeting · Restaurant · Bar in facility list)
- Other hotels render the icon grid consistently

Aligned with: `lib/report/asset-analysis-data.ts::FacilityItem` (the canonical report shape). Adding a new facility means updating both files — `canonical-facilities.ts` for the registry + admin UI · `asset-analysis-data.ts` for the report consumer.

---

## 2026-05-14 — Phase 3.f.real-booking v2 · matching strategy + bulk runner CLI

Day-2 of Booking integration · the first bulk attempt at operator request
("run enrichment para todos los hoteles") surfaced two fixes.

### Fix 1 · match heuristic over-counted disordered token overlap

"AC Hotel Avenida de America" was matching "Avenida America Cama King AC junto a la estacion" (an apartment listing) because both share 3 tokens after stripping filler words. New algorithm:

- normalize both names (strip diacritics + filler "Hotel/by/de/the/etc")
- contiguous-ordered substring → score 0.95 (the correct discriminator)
- token-set Jaccard → max 0.85 (so noisy apartment listings drop below threshold)
- result: AC Hotel correctly matches "AC Hotel Avenida de América by Marriott"

Applied to `lib/admin/hotels/booking-fetcher.ts::matchConfidence`.

### Fix 2 · v2 server strategy · searchDestination(name) instead of searchHotels

Booking's `/searchDestination` indexes hotels too · a query with the property name returns `dest_type: "hotel"` hits whose `dest_id` IS the hotel_id used by `/getHotelDetails`. This:

- removes the noisy intermediate `searchHotels` step (which surfaced apartments)
- reduces base cost from 3 calls/hotel to 2 (search + details)
- raises match rate from ~30% to ~90% on the validation set (8/10 hotels matched at 100% in the real-world test)

Applied to `lib/admin/hotels/booking-enrich.ts::runBookingEnrichment`.

### Fix 3 · bulk runner CLI for operator-side full inventory enrichment

`apps/web/scripts/enrich-all-hotels.mjs` · iterates every hotel in the snapshot, runs the 5-call deep path (searchDestination → details → facilities → rooms → reviews), maps to HotelProfile, upserts to `costar-master/manual_enrichment/<hotel_id>.json`. Idempotent. Logs to `services/costar/logs/enrich-all-<date>-<ts>.jsonl`.

CLI flags: `--limit N` · `--only <hotel_id>` · `--skip-enriched` · `--basic` (drop deep endpoints for quota safety) · `--throttle <ms>` · `--min-match 0.7`.

### Validation run

- 10-hotel sample (Madrid)
- 8/10 enriched at 100% match · 1 ambig (no Booking hotel-type hit) · 1 quota-exceeded (operator's RapidAPI tier hit MONTHLY quota at hotel 10)
- Sample enriched: AC Hotel Avenida de América (50% completeness · 15 facilities · ★8.75 · 2817 reviews) · Novotel Madrid Center (74% completeness · 28 room types · ★8.68 · 5663 reviews) · Hotel Puerta América (69% · 15 facilities · ★8.43 · 6981 reviews)

### Quota gap (operator action required)

To enrich all 364 hotels (~1820 calls in deep mode, ~728 in basic mode) the operator must upgrade the RapidAPI tier beyond the current MONTHLY quota. Without the upgrade, only ~10 hotels can be enriched per cycle.

### CoStar + Booking gaps still uncovered

Even with successful Booking enrichment, the following fields stay empty for most hotels (Booking doesn't expose them via the booking-com15 endpoints used today):

- `check_in_time` / `check_out_time` (Booking has policy info but endpoints don't return it consistently)
- `pet_policy` · `cancellation_policy` · `smoking_policy` (specialised endpoints needed)
- `fnb.michelin_stars` · cuisine type · restaurant count > 1
- `spa.sqm` · `gym.open_24h` · `pool.indoor/outdoor`
- `meeting_rooms.count` (only 0 or 1 from boolean toggle) · `total_sqm`
- `sustainability` certifications (BREEAM/LEED/Green Key)
- `accessibility` certifications
- `family_features`
- `image_refs` / photos
- `geo_context` (nearby POI, transport_score)

Phase 3.f.next priority order proposed:
1. **Quota upgrade + bulk run all 364** (operator decision)
2. Probe `/api/v1/hotels/getHotelPolicies` for check-in/out + pet + cancellation
3. Image refs → Supabase public bucket
4. Add Google Places (or similar) as second source for hours + photos
5. Manual operator overlay for sustainability/accessibility/family (always wins · priority 100)

---

## 2026-05-14 — Phase 3.f.next 1 · Bulk Booking enrichment over filtered selection

Single-hotel "Fetch from Booking" was shipped earlier today. Operator pointed out that 364 hotels × one click each is not the workflow. This commit turns it into a one-click bulk operation that respects the current filter context.

- `runBookingEnrichmentBatch(hotel_ids)` server action in `booking-enrich.ts`
  - Concurrency window = 3 · inter-call throttle = 250 ms · cap = 25 hotels/click
  - Aggregates: `succeeded · failed · needs_disambiguation · skipped_manual_operator`
  - Per-hotel result list with booking_name + match_confidence + completeness
  - Early-stop on 5 consecutive RapidAPI rate-limit errors (429/quota/too many)
  - Idempotent: re-running with same IDs re-attempts the failed ones
- `BulkBookingButton({ targetHotelIds, totalEmpty })` in `bulk-booking-button.tsx`
  - "Bulk fetch · next N" button in the Search hotels form header
  - Result panel · breakdown grid · rate-limit warning · collapsible per-hotel log
- Hotels page builds `targetHotelIds` from the currently-filtered + sorted set,
  filtered to completeness < 80% and sorted ascending so the worst hotels go first

Operator path
- Land on `/user/admin/hotels?tab=hotels&enrichment=empty&sort=completeness_asc`
- Click "Bulk fetch · next 25" · 25 hotels enriched in ~30-45 seconds
- Click again to drain the next 25
- 15 clicks to cover the full 364 institutional inventory

Why cap at 25
- Vercel Fluid Compute default timeout = 300s · 25 × ~1.5s = ~37s margin
- Smaller batches let operator stop early if RapidAPI quota is tight
- Server action enforces the cap even if client sends more IDs

Smoke: HTTP 200 · 1.55 MB · "Bulk fetch · next 25" button rendered · typecheck clean.

Deferred (Phase 3.f.next 2-4)
- Interactive disambiguation when match < 80% (today: operator manually
  edits the CoStar name + re-runs)
- Image refs · upload Booking photo URLs to public Supabase bucket
- Freshness cron · re-fetch when `last_scraped_at > N days`

---

## 2026-05-14 — Phase 3.f.real-booking · RapidAPI booking-com15 enrichment wired

Operator picked RapidAPI booking-com15 as the Booking data source. Wired server-side end-to-end: search → details → mapper → upsert with provenance, plus a UI button on the hotel detail page.

- `apps/web/src/lib/admin/hotels/booking-fetcher.ts` · typed client wrapper
  - `searchDestination(query)` · resolves city name → dest_id
  - `searchHotels({ dest_id, query_filter })` · finds candidates · auto-fallback without name filter when narrow search returns 0
  - `getHotelDetails(booking_hotel_id)` · full property data
  - `getHotelFacilities` + `getHotelRooms` · optional richer fields
  - `matchConfidence(candidate, canonical)` · 0..1 score · exact / substring / token-overlap
  - `mapBookingToProfile()` · pure mapper · Booking raw shapes → `HotelProfile` · falls back from `details` to `searchHit.property` for review_score / lat / lng when details endpoint omits them
- `apps/web/src/lib/admin/hotels/booking-enrich.ts` · server action `runBookingEnrichment(hotel_id)`
  - Refuses to overwrite `manual_operator` enrichment (operator edits at priority 100 always win)
  - Auto-pick threshold = 80% match confidence · below that returns `needs_disambiguation` with top-5 candidate preview so operator picks manually
  - Provenance: `enrichment_sources = ["rapidapi_booking"]` · `source_priority = { rapidapi_booking: 80 }` · `booking_hotel_id` saved in `_enrichment_meta`
  - Upserts to `costar-master/manual_enrichment/<hotel_id>.json` (same Storage path as manual entries · single merge layer)
- `apps/web/src/components/admin/hotels/booking-enrich-button.tsx` · client component
  - "Fetch from Booking" button next to "Run enrichment" in detail page header
  - Success panel · match confidence + completeness % + booking name
  - Disambiguation panel · top-5 candidates with review score + match%
  - Error panel for fetch failures
- `apps/web/scripts/smoke-booking.mjs` · one-shot validation script · runs search → details against a real hotel · prints facility names + review score · costs ~3 RapidAPI calls

Env vars (server-only):
- `BOOKING_RAPIDAPI_HOST=booking-com15.p.rapidapi.com`
- `BOOKING_RAPIDAPI_KEY=<per-operator>`

Smoke: `node --env-file=.env.local scripts/smoke-booking.mjs` → SMOKE OK · 3 calls succeeded · 15 facility names returned for a real Madrid hotel · UI button renders alongside manual enrichment in `/user/admin/hotels/<id>` detail page · typecheck clean.

Security: `.mcp.json` added to `.gitignore` so MCP server configs carrying API keys don't leak to the public repo. Each operator regenerates locally.

Deferred (Phase 3.f.next):
- Bulk enrichment ("enrich all 364" or "enrich filtered selection")
- Disambiguation UI that lets operator pick a specific candidate (today: operator manually edits the CoStar name + re-runs)
- Image refs · upload Booking photo URLs to a public Supabase bucket
- Geo-context · run lat/lng through Mapbox Isochrone for transport_score
- Freshness cron · re-fetch hotels with `last_scraped_at` older than N days
- Rate-limit / quota dashboard

---

## 2026-05-14 — Phase 3.f · Enrichment prioritization workflow surfaced in hotel registry list

The Phase 3.e enrichment system was only visible inside the hotel detail page — the operator had to open each of the 364 hotels to know which ones had profiles. This shipped the prioritization surface into the list view:

- Coverage row · 3 new KPIs: **Enriched** (≥80%), **Partial** (1–79%), **Empty profile** (0%) · each clicks through to the pre-filtered list
- Per-hotel chip · `XX% profile` color-coded (emerald ≥80 / amber ≥50 / orange >0 / slate empty) with hover-tooltip listing missing-field count
- Filter · `enrichment=empty|partial|enriched` dropdown alongside Class + Affiliation
- Sort · two new options · "Completeness · lowest first (prioritize)" and "Completeness · highest first"
- Empty-profile KPI deep-links to `?tab=hotels&enrichment=empty&sort=completeness_asc` so one click puts the operator on the worst-first worklist

Smoke: HTTP 200 · 1.55 MB list page · all chip + KPI + sort signatures rendered. typecheck clean.

---

## 2026-05-14 — Phase 3.e · Canonical hotel profile enrichment layer (manual bootstrap)

Hotel registry had a critical institutional gap — CoStar-only ficha (rooms · brand · operator · year_opened · class) is not enough for compsets · underwriting · benchmarking. Missing fields: facilities · amenities · room mix · F&B · spa · gym · pool · parking · meeting · sustainability · accessibility · review metrics · policies. Shipped schema + manual bootstrap. Booking scraping deferred (legal / rate-limit / provider TBD).

- `HotelProfile` interface in `lib/admin/hotels/types.ts` · 25+ optional fields
- `EnrichmentMeta` provenance · `manual_operator` priority = 100 (never overwritten by future scrapers)
- `profile-completeness.ts` · 17 weighted fields · score 0–100 · missing list sorted by weight
- `submitManualEnrichment` server action · writes `costar-master/manual_enrichment/<hotel_id>.json` · flat path · upsert
- Snapshot reader · `loadManualEnrichment()` · attaches `.profile` + `._enrichment_meta` onto each hotel
- Hotel detail page · new "Hotel profile · enrichment" section · completeness bar · missing-fields list · 11 populated category cards · chips · policies · provenance footer
- `EnrichmentModal` · 8-group form (Operational · Room mix · F&B · Wellness · Sports · Compliance · Guest experience · Policies)

Deferred: real Booking scraper · LLM normalization · image refs / photo CDN · geo-context auto · freshness cron · Python consumer of `manual_enrichment/` → canonical master XLSX.

---

## 2026-05-14 — Block A · Snapshot path resolver hardened · UI hydration unblocked

`/user/admin/hotels` rendered "No snapshot found" with all KPIs at 0 despite a healthy 1.75 MB snapshot on disk with 364 hotels. The Node-side resolver was `path.resolve(process.cwd(), "..", "..")` — works only when cwd is `apps/web/`. From repo root (e.g. `pnpm --filter web dev` spawned from there) the path went two levels ABOVE the repo and missed every snapshot.

### Robust resolver

`resolveSnapshotPath()` walks up from `process.cwd()` (up to 8 levels) looking for `services/costar/MASTER/snapshot.json`. Falls back to the legacy two-up if nothing matches. Resilient against any reasonable cwd a dev server might be launched from.

### First-load diagnostic

```
[hotels.snapshot] loaded path=<abs> resolved_from=walkup_depth_2 size=1755763B
                  hotels=364 transactions=661 synthetic_compsets=364 batch=batch_...
```

On failure, a clear console warning identifies the path attempted and the failure reason — no more silent empty-state.

### `getSnapshotDiagnostics()` for the UI

The empty-state banner now surfaces the exact resolved path + whether it exists + size + an explicit hint:

> ⚠ If the file does exist on disk but `exists=false` here, the Node dev server cwd is wrong. Start with `cd apps/web && npm run dev` (NOT from repo root).

This turns the previous mystery state into self-diagnosing UI.

### Validation

| cwd | Before | After |
|---|---|---|
| `apps/web/` (canonical) | ✓ worked | ✓ works |
| Repo root (`pnpm --filter web dev`) | ✗ "No snapshot found" | ✓ HTTP 200 · 270 KB · 364 hotels |

### Files

- `apps/web/src/lib/admin/hotels/snapshot-reader.ts` · robust `resolveSnapshotPath()` · first-load `console.info`/`console.warn` · new `getSnapshotDiagnostics()` export
- `apps/web/src/app/user/admin/hotels/page.tsx` · empty-state banner now shows resolved path · `exists` · `sizeBytes` · cwd-hint

### Honest follow-ups (Block B/C/D still pending)

- **Block B**: Add `ingest_pais()`, `ingest_mercado()`, `ingest_submercado()`, `ingest_proyectos()` so the other INPUT folders actually drain to OLD on each run. Today they correctly sit in INPUT because the pipeline never reads them.
- **Block C**: Implement copy+fsync+verify+delete fallback in `_move_to_archive()` so locked files (Excel, scanners, sync agents) still end up archived rather than blocking forever.
- **Block D**: End-to-end smoke `validate_e2e.py` that asserts the round trip INPUT → snapshot → UI HTTP count.

---

## 2026-05-14 — Phase 2.3.d.6d · Stateful snapshot merge (load + merge + write) · fixes wholesale-overwrite bug

Critical bug discovered during a re-run of `ingest.py`: a run with an empty INPUT folder **wiped the snapshot wholesale** (364 hotels → 0 hotels). The pipeline was stateless — each run reconstructed the snapshot from whatever happened to be in INPUT that moment. This breaks the institutional governance model where INPUT is the "pending queue" (transient) and the snapshot is the persistent read path.

### Fix · `snapshot.py` v1.6

- New `load_existing_snapshot(path)` reads the previous snapshot file (returns `None` on missing/malformed).
- New `merge_by_id(current, previous, id_key)` carries forward any row whose stable ID isn't produced by the current run. Current-run rows always win on overlap.

### `ingest.py` wiring

Three entities are merged stateful:

| Entity | Merge key | Behaviour |
|---|---|---|
| Hotels | `hotel_id` | Run's new + previous (uncovered) carried forward |
| Transactions | `transaction_id` | Content-hash IDs guarantee idempotent dedup |
| Compset membership | `compset_id` | Same — preserves operator-confirmed memberships |

Synthetic compsets and the reconciliation queue are **regenerated** every run from the merged inventory — they reflect the current state, not history.

### Match-field rehydration

Hotels persisted in `snapshot.json` had `_match_name` / `_match_address` stripped by `_strip_private()` at write time. The fuzzy matchers (transaction linkage, compset cross-reference) needed them re-derived after the merge. New `_rehydrate_match_fields()` helper restores them from `name` + `address_line` on each carried-in hotel.

### Validation · two-pass run

```
Pass 1 (INPUT had hotels + transactions):
  previous_hotels=0  this_run_hotels=364  →  snapshot has 364
Pass 2 (INPUT only the locked transaction file, hotels already in OLD):
  previous_hotels=364  this_run_hotels=0  carried=364  →  snapshot STILL has 364
  transactions: 608 from current run + 53 carried from previous = 661 (dedup by transaction_id)
```

The institutional read path is now persistent. The XLSX masters in `MASTER/` remain the audit-grade canonical store; `snapshot.json` is the runtime cache.

### Files

- `services/costar/scripts/snapshot.py` · schema v1.5 → v1.6 · `load_existing_snapshot()` + `merge_by_id()` exports
- `services/costar/scripts/ingest.py` · `_rehydrate_match_fields()` helper · stateful merge wired after each ingest stage

### Honest gap

- The reconciliation queue is **not** merged — fresh signal each run. So `suspected_duplicate` entries from a previous run are dropped if not re-detected. Operationally the queue is a "current-state worklist" so this is the right semantics, but if you want sticky reconciliation items in the future, add `reconciliation_queue` to the merged-by-ID list.

---

## 2026-05-14 — Phase 2.3.d.6c · Spanish CoStar aliases + ES country fallback + two-entity compset model + synthetic inference

The first real Madrid `ingest.py` run flushed out two issues:
1. CoStar ES "Inmuebles" exports ship Spanish column headers — my alias map only handled English/lowercase. All 364 hotel rows were rejected as `missing_pk_inputs`.
2. The "INMUEBLES COMPSET DATOS" file turned out to be aggregated time-series KPIs, not a membership list. Real membership lives in the 3.1 PDF, which is not parsed yet.

This commit closes both, plus adds a synthetic compset inference for every hotel as a transitional layer until the PDF parser ships.

### Spanish CoStar header aliases

`normalization.py` v1.3 + `ingest.py` extend `HOTEL_HEADER_ALIASES` and `TRANSACTION_HEADER_ALIASES` with diacritic-stripped, underscore-folded keys for every column we've seen in real CoStar ES exports:

| Source column | Folded key | Canonical |
|---|---|---|
| `Nombre del edificio` | `nombre_del_edificio` | `name` / `asset_name` |
| `Operador del hotel` | `operador_del_hotel` | `operator` |
| `Propietario real` / `Empresa matriz` | `propietario_real` / `empresa_matriz` | `owner` |
| `Marca` | `marca` | `brand` |
| `Mercado` / `Submercado` / `Ciudad` | `mercado` / `submercado` / `ciudad` | `market_name` / `submarket_name` / `city_es_costar` (fallback) |
| `Clase` / `Escala` | `clase` / `escala` | `chain_scale` (Clase is the canonical tier · Escala="Independiente" promotes to `chain_scale=independent`) |
| `Dirección` / `Código postal` | `direccion` / `codigo_postal` | `address_line` / `postal_code` |
| `Habitaciones` | `habitaciones` | `rooms_count` |
| `Año de construcción` / `Año de reform.` / `Fecha de apertura del hotel` | `ano_de_construccion` / `ano_de_reform` / `fecha_de_apertura_del_hotel` | `year_opened` / `year_last_renovated` |
| `Espacio de reunión total` | `espacio_de_reunion_total` | `meeting_space_sqm` |

### Country fallback

CoStar ES exports have no `country` column. `normalise_hotel_row()` now falls back to `DEFAULT_COUNTRY = "ES"` and tags the row with `country_defaulted:ES` for transparency. Same fallback applied in `ingest_transactions()` for hotel matching. Widen the constant when the pipeline expands beyond Spain.

### Two-entity compset model

The previous single `compsets` block in `snapshot.json` conflated two genuinely different concepts. Now split into three:

| Entity | What it carries | Source today |
|---|---|---|
| `compset_membership` | Operator-confirmed `{target, members[]}` | Pending — 3.1 PDF parser not yet shipped |
| `compset_performance` | Time-series KPIs for the compset | Deferred to Phase 2.3.d.8 (dedicated ingestion path for files like 3.2) |
| `synthetic_compsets` | Algorithmic top-4 inference per hotel | **Shipped today** · replaced by real membership when it lands |

The legacy `compsets` key stays in `snapshot.json` as an alias to `compset_membership` for backward compatibility with the Node reader.

### Synthetic compset inference (`compset_inference.py` v1)

For every hotel in inventory, generate a synthetic compset of the top-4 most similar competitors in the same `(country, market)`. Similarity is a weighted blend:

- `submarket` (0.30) · 0 same / 1 different / 0.5 unknown
- `chain_scale` (0.30) · 0 same / 0.33–1.0 by tier distance / 0.5 unknown
- `rooms` (0.20) · `|Δrooms| / max(rooms_a, 200)`, clamped 0..1
- `segment` (0.10) · 0 same / 1 different / 0.5 unknown
- `geo` (0.10) · `Haversine(km) / 5km`, clamped 0..1

Every entry is tagged `provenance: "synthetic_inference"`, `needs_operator_confirmation: true`, and carries the full algorithm config. The admin UI surfaces them on the hotel detail page with an explicit amber banner.

### Path scanning fix

`iter_input_files()` was recursively walking into `OLD/` (excluded only `old.*/` with dot prefix). On the second run that meant ingesting files that the first run had just archived → duplicate transactions. Fixed by excluding both `OLD` and `old` directory segments.

### Snapshot schema → v1.5

| Top-level field | Status |
|---|---|
| `totals` | gains `compset_membership`, `compset_performance`, `synthetic_compsets` counters (legacy `compsets` alias preserved) |
| `compset_membership` | new top-level list (= old `compsets`, kept also as alias) |
| `compset_performance` | new placeholder list (empty today) |
| `synthetic_compsets` | new top-level list |

### First real Madrid ingest — validation

```
BATCH batch_b248342b30634c87  · normalization v1.3
  files       processed=3 archived=2 archive_failed=1 failed=0
  rows        hotels=364 compsets=0 transactions=661
  recon       total=597 duplicate_suspected=20
  corrections applied=0 rejected=0 pending_before=0
```

Coverage on the 364 hotels:
- `chain_scale` resolved on 364/364
- `rooms_count` on 363/364
- `year_opened` on 190/364 (partial — CoStar reports it for some)
- `lat/lon` on 0/364 (export didn't include geo)
- mean `confidence` 0.90, zero hotels below 0.7
- 79 unique brands, 7 submarkets (Madrid Centre 178 · Argüelles & Chamberí 53 · Salamanca 48 · Chamartín 44 · …)

Transactions: 661 (53 from official CoStar 4.1 + 608 from operator private) · 84 linked to hotels (12.7%) · 577 orphans (assets outside the Madrid inventory).

Reconciliation queue: 597 = 577 transaction orphans + 20 fuzzy-matched suspected duplicates (real signal).

Synthetic compsets: 364 (one per hotel). Example for "Edificio Eurobuilding 2" (upscale, 106 rooms): AC Aitana (0.104), Sercotel Togumar (0.133), NH Paseo Habana (0.149), Barceló Imagine (0.150).

### Files

- `services/costar/scripts/normalization.py` · v1.3 · 25+ Spanish aliases + `DEFAULT_COUNTRY` constant + Escala→independent promotion
- `services/costar/scripts/ingest.py` · transaction aliases extended · `DEFAULT_COUNTRY` fallback in transactions + compsets · synthetic inference wired
- `services/costar/scripts/source_readers.py` · `OLD/` excluded from recursive scan
- `services/costar/scripts/snapshot.py` · v1.5 · adds `compset_performance`, `synthetic_compsets`, new totals counters
- `services/costar/scripts/compset_inference.py` (new) · Phase 2.3.d.6c · v1 algorithm
- `apps/web/src/lib/admin/hotels/snapshot-reader.ts` · `SyntheticCompset` type + `findSyntheticCompsetForHotel()` helper
- `apps/web/src/app/user/admin/hotels/page.tsx` · new KPI **Synthetic compsets** (replaces stale `Compsets` slot, hint "pending PDF parse")
- `apps/web/src/app/user/admin/hotels/[hotelId]/page.tsx` · new "Competitive set" section with synthetic-inference banner + 4 clickable member entries + algorithm-weights footer
- `docs/intelligence/costar-hotels-by-market-schema.md` · § 0 Spanish header alias table + § 7 two-entity compset model + synthetic algorithm rationale
- `docs/intelligence/hospitality-intelligence-roadmap.md` · 2.3.d.6c sub-phase marked shipped

### Honest gaps

- **`TRANSACCIONES. 30.5.xlsx` still locked in Excel** — its data ingests fine (608 transactions in the snapshot) but the file stays in INPUT until the operator closes Excel. The pipeline correctly flags `archive_failed: 1` and is idempotent on re-run.
- **Compset membership (PDF) not parsed yet** — synthetic compsets are the transitional layer. When the 3.1 PDF parser ships (Phase 2.3.d.8), real memberships replace synthetic ones keyed by `target_hotel_id`.
- **Compset performance ingestion** is a placeholder — Phase 2.3.d.8 also covers that.
- **All 364 hotels have `hotel_id_synthetic: true`** — the export didn't include CoStar's `PROPERTY ID` column. When operator can produce an export with that column, IDs become `costar_<PROPERTY_ID>` (more durable across re-ingests).
- **`segment_type` is empty for every hotel** — CoStar's "Tipo de ubicación del hotel" / "Tipo secundario" values ("Urbano", "Hotel", "Apartamento con servicios", …) don't match our 5-value enum. Surfaces as `segment_type_unrecognised:<value>` in `_meta.needs_review`. Extend the enum if these become operationally meaningful.
- **Transaction linkage at 12.7%** — most orphan transactions reference assets outside the Madrid 364 inventory (other markets, demolished hotels, projects). Will improve as inventory expands.

---

## 2026-05-14 — Phase 2.3.d.6b · INPUT → OLD governance + `HOTELESperMARKET` rename + batch summary

Fixes the operational-governance gap operator flagged: source files were staying in `/INPUT` after successful ingestion, breaking the "INPUT = pending queue" contract. Also rolls in the folder rename `HOTELES POR MERCADO` → `HOTELESperMARKET` and adds the institutional batch-summary surface.

### Bugs fixed

| Bug | Root cause | Fix |
|---|---|---|
| **Only hotel files were being archived** | `ingest_compsets()` / `ingest_transactions()` didn't return their processed-file lists, so `archive_files()` only ever saw `processed_hotels`. Compset + transactions stayed in INPUT. | Both functions now return `(rows, recon, processed_files, failed_files)`. `main()` concatenates and archives the union. |
| **Stale workspace paths** | `INPUT_HOTELS = WORKSPACE / "HOTELES POR MERCADO" / "INPUT"` — folder was renamed on disk to `HOTELESperMARKET`. | All path constants point at `HOTELESperMARKET` now. |
| **Inconsistent archive naming** | `old.class/`, `old.pais/`, `old.transacciones/` — every workspace had its own convention. | Standardised on `/OLD/` per workspace, governed by `ARCHIVE_REGISTRY`. Legacy `old.*/` folders kept for historical audit. |
| **Silent rename failures** | `OSError` was logged but not counted, no operator signal. | `_move_to_archive()` falls back to `shutil.move()`, surfaces a clear "file probably open in Excel" hint, counts failures, and the page renders a rose alert when `archive_failed > 0`. |
| **Always-timestamp filename collision** | Even non-colliding moves got timestamp prefixed. | Preserve original filename. Only on collision: append `<stem>.<YYYYMMDDTHHMMSS><ext>`; if that collides too, add a counter. |

### Folder rename · `HOTELES POR MERCADO` → `HOTELESperMARKET`

Operator renamed the folder on disk (note: `HOTELESperMARKET` keeps the Spanish "ES" plural; the directive said `HOTELSperMARKET` without the E but the disk is the source of truth — flag if you want it changed). Every reference updated:

- `services/costar/scripts/{ingest,build_masters}.py` · path constants + docstrings
- `services/costar/scripts/README.md`
- `services/costar/README.md`
- `services/costar/.gitignore` (legacy `HOTELES POR MERCADO/old.class/*` rules retired; new `HOTELESperMARKET/{INPUT,OLD}/` rules added)
- `apps/web/src/lib/admin/agents/registry.ts` · COSTAR & Hotel Reference Agent integrations + kpis + mock logs
- `apps/web/src/lib/admin/hotels/types.ts` · doc comment
- `docs/HOTELVALORA_MASTER_SYSTEM.md`
- `docs/intelligence/costar-{class,hotels-by-market,master-dataset-architecture}-schema.md`
- `docs/intelligence/hospitality-intelligence-roadmap.md`

### Governance · `INPUT` and `OLD` are the contract

Every workspace now has exactly ONE pair:

```
<workspace>/INPUT/  → files pending ingestion (operational queue)
<workspace>/OLD/    → files successfully merged into the master (audit trail)
```

`ARCHIVE_REGISTRY` in `ingest.py` is the single source of truth — six entries today:

| Stream | INPUT | OLD |
|---|---|---|
| Hotels | `services/costar/HOTELESperMARKET/INPUT` | `…/OLD` |
| Country market data | `services/costar/PAIS/INPUT` | `…/OLD` |
| Market market data | `services/costar/MERCADO/INPUT` | `…/OLD` |
| Submarket market data | `services/costar/SUBMERCADO/INPUT` | `…/OLD` |
| Compset | `services/compset/INPUT` | `services/compset/OLD` |
| Transactions | `services/transactions/INPUT_TRANSACCIONES` | `…/OLD` |

`.gitkeep` files seeded in all six new `OLD/` directories so the pipeline finds the destination on first run.

### New `batch_summary` block (snapshot v1.4)

`snapshot.json` now carries a top-level `batch` object — the institutional audit object emitted by every successful `ingest.py` run:

```jsonc
{
  "batch_id": "batch_...",
  "normalization_version": "v1.2",
  "files": {
    "processed": 4,         // read from INPUT
    "failed": 0,            // unparseable
    "archived": 4,          // moved to OLD
    "archive_failed": 0,    // rename failed (file open in Excel)
    "unknown_root": 0,      // outside ARCHIVE_REGISTRY
    "skipped_dry_run": 0
  },
  "rows": {
    "hotels_ingested": 47,
    "compsets_built": 3,
    "transactions_linked": 12,
    "reconciliation_required": 5,
    "duplicate_suspected": 2
  },
  "corrections": { /* from corrections.py */ },
  "per_stream": {
    "hotels":       {"processed": 1, "failed": 0},
    "compset":      {"processed": 1, "failed": 0},
    "transactions": {"processed": 2, "failed": 0}
  }
}
```

The CLI now ends with a human-readable executive summary in stdout:

```
BATCH batch_...
  files       processed=4 archived=4 archive_failed=0 failed=0
  rows        hotels=47 compsets=3 transactions=12
  recon       total=5 duplicate_suspected=2
  corrections applied=0 rejected=0 pending_before=0
```

### Admin UI · "Last ingestion batch" card

`/user/admin/hotels` gains a governance card under the header showing the six file/row counts as `BatchStat` cells. When `archive_failed > 0` the card renders a rose alert with the most likely root cause (Excel locking the file) and the recovery path (close Excel, re-run — ingestion is idempotent).

### Smoke

- Python `archive_files()` end-to-end fixture: 3 files in INPUT (2 hotels, 1 mercado) + a pre-existing `list1.xlsx` in OLD/ as a collision → all 3 archived (`archived: 3, archive_failed: 0`), INPUT empty, collision resolved as `list1.20260513T163628.xlsx`, non-colliding files kept original name (`list2.xlsx`, `madrid-Q1.xlsx`).
- `ingest.py`, `snapshot.py`, `corrections.py` all pass `py_compile`.
- `/user/admin/hotels` → 200 · 55.9 KB · empty-state path clean.
- Node typecheck clean.

### Honest gaps

- **Operator still needs to run `ingest.py`** for the snapshot + batch block to populate. The card is invisible until then (gated by `snap?.batch`).
- The transactions workspace's own ingest pipeline (`services/transactions/scripts/ingest.py`) is **untouched** — it still uses `old.transacciones/`. Only the COSTAR-orchestrator-side archive goes to `OLD/`. If we ever want full platform-wide consistency, that pipeline also needs the same treatment.
- The `HOTELS` vs `HOTELES` naming: disk is `HOTELESperMARKET` (with E), directive said `HOTELSperMARKET` (without). I went with disk. Renaming again is a single replace_all.

---

## 2026-05-14 — Phase 2.3.d.6 · Institutional Correction Consumer · data integrity layer closed

Closes the correction lifecycle that Phase 2.3.d.2 only half-shipped. Today corrections were persisted as pending JSONL rows but never applied. Now they flow end-to-end: validated → applied as supersedes over the canonical ingest values → provenance preserved → audit trail emitted → UI renders correction history per hotel.

### Python · new module `corrections.py`

| Concern | Implementation |
|---|---|
| **Schema validation** | required keys present · `submitted_at` parseable · `reason` ≥ 8 chars · `field` ∈ `CORRECTABLE_FIELDS` |
| **Operator identity** | `submitted_by` carried verbatim from `submitHotelCorrection()` (operator-guard already enforced server-side) |
| **Hotel existence** | rejects with `hotel_id_not_in_inventory` if the hotel didn't land in the current ingest pass |
| **Type coercion** | per-field coercers: text · int · float · year · enum (`chain_scale`, `segment_type`); rejects with `proposed_value_unparseable` or `proposed_value_out_of_enum` |
| **State machine** | `pending` → `applied` (mutates hotel + bumps confidence) or `rejected` (rejection_reason inline); idempotent because the JSONL itself carries the state |
| **Provenance** | every applied correction pushes a row to `hotel._corrections` with `original_value`, `corrected_value`, `submitted_by`, `submitted_at`, `applied_at`, `applied_in_batch`, `reason`, `confidence_before` |
| **Audit log** | every applied row also appended to `services/costar/corrections-applied/<YYYY-MM>.jsonl` |
| **Atomic writes** | the rewritten JSONL is materialised via temp file + rename — no partially-written queue files on crash |

### Confidence bump on apply

An applied correction implies operator review, so the consumer:
- drops `missing_required:<field>` / `missing_recommended:<field>` from `_meta.needs_review` if present
- bumps `_meta.confidence` by +0.05, clamped at 0.95 (we don't push to 1.0 because the rest of the row still came from the raw ingest)

### `ingest.py` integration

After the inventory + compset + transactions passes, `ingest.py` now calls `apply_corrections()` and includes the summary in the snapshot:

```python
corrections_summary = apply_corrections(
    workspace=WORKSPACE,
    hotels_by_id=hotels_by_id,
    batch_id=batch_id,
    logger_event=logger.event,
)
```

### Snapshot · schema bumped v1.2 → v1.3

`snapshot.json` gains:
- a top-level `corrections` block: `{pending_before, applied, rejected, applied_total_in_master}`
- a `_corrections[]` array on every hotel that has accumulated provenance

The reader on the Node side tolerates pre-v1.3 snapshots — the block is optional.

### Node UI

| File | Change |
|---|---|
| `lib/admin/hotels/snapshot-reader.ts` | `CorrectionProvenance` type · `CorrectionsSummary` type · `findCorrectionsForHotel()` helper |
| `app/user/admin/hotels/page.tsx` | New 6th KPI **Corrections** with hint (`X applied · Y rejected · Z pending (this run)`) · grid expanded `lg:grid-cols-5` → `lg:grid-cols-6` |
| `app/user/admin/hotels/[hotelId]/page.tsx` | New "Correction history" section in the sidebar above the submission form · renders provenance entries with original→corrected diff · submitter · applied-when · confidence delta |

### Docs

- `docs/intelligence/costar-hotels-by-market-schema.md` — § 5 rewritten with the institutional correction lifecycle + `_corrections` array schema
- `services/costar/scripts/README.md` — full lifecycle diagram (steps 1-5) + rejection-reason table
- `docs/intelligence/hospitality-intelligence-roadmap.md` — 2.3.d.6 marked ✅

### Smoke

- Python: `corrections.py` syntax clean + end-to-end fixture test: 3 pending → 1 applied + 2 rejected (one out-of-enum, one orphan hotel_id) · hotel mutated correctly · `_corrections` populated · confidence 0.85 → 0.90 · `needs_review` cleaned · JSONL rewritten with `status="applied"|"rejected"` · audit log appended
- Node: `/user/admin/hotels` → 200 · 55.9 KB · Corrections KPI present · grid-cols-6 confirmed · empty-state path still clean
- Typecheck clean

### Honest gaps

- **`ingest.py` still has not been run against the Madrid drop**, so the snapshot is empty and the consumer has no hotels to apply corrections against until the operator runs the pipeline.
- The "trigger rebuild from UI" affordance was deferred again — operators rebuild via CLI. A server action spawning `python ingest.py` is straightforward but stays out of scope.
- The correction-history view is read-only — no "revert this correction" action yet. Reverts would queue a new correction with the original value, which is the right design but the UI affordance isn't wired.

---

## 2026-05-14 — Phase 2.3.d.2 · COSTAR v1.2 Master Inventory Engine + operational `/user/admin/hotels`

Implements the multi-stream ingestion pipeline that turns the conceptual two-dataset architecture (committed earlier today as `a7859e1`) into a working data plane. The hotel-reference backbone now has stable IDs, fuzzy dedup, a reconciliation queue, compset cross-validation, transaction linkage with provenance, and a real Node admin UI fed by a JSON snapshot.

### Python pipeline · `services/costar/scripts/` (v1.2)

| Module | Role |
|---|---|
| `dedup.py` (new) | Stable IDs (`hotel_id`, `compset_id`, `transaction_id`, `ingestion_batch_id`) · name + address normalisation · rapidfuzz composite scoring · confidence + needs-review classifier |
| `normalization.py` (new) | Header alias maps (HOTEL · MARKET) · enum normalisers (chain_scale · segment_type · facilities · country) · numeric / year parsers · per-row `normalise_hotel_row()` |
| `source_readers.py` (new) | `iter_input_files()` (recursive, excludes `old.*` archives) · xlsx + csv readers · `read_rows_with_aliases()` |
| `snapshot.py` (new) | Assembles + writes `MASTER/snapshot.json` (the Node-side bridge) |
| `ingest.py` (new) | CLI orchestrator — sweeps 6 INPUT folders (PAIS · MERCADO · SUBMERCADO · HOTELES POR MERCADO · compset · transactions), builds hotel inventory + compset graph + transaction layer, archives `INPUT → OLD`, writes audit log + snapshot |
| `build_masters.py` (updated) | v1.2: retires `COSTAR_MASTER_CLASS.xlsx` regeneration · adds `COSTAR_MASTER_HOTELES_POR_MERCADO` schema |
| `requirements.txt` (new) | `openpyxl>=3.1,<4`, `rapidfuzz>=3.5,<4` |
| `README.md` (new) | Pipeline reference · identity model · reconciliation queue kinds · extension guide |

### Identity model

| Family | Format | Stability |
|---|---|---|
| `hotel_id` | `costar_<PROPERTY_ID>` when source has it, else `h_<sha256[:16]>(country|market|name)` | Stable across re-ingests · `hotel_id_synthetic` flag when computed |
| `compset_id` | `cs_<sha256[:16]>(target|sorted_members)` | Order-insensitive over members |
| `transaction_id` | `tx_<sha256[:16]>(source|asset|closed_at|price)` | Stable across re-runs |
| `ingestion_batch_id` | `batch_<uuid[:16]>` | Fresh per pipeline run · written into every row's `_meta` |

### Reconciliation queue kinds (surfaced in `/user/admin/hotels`)

- `unrecoverable_row` — missing PK inputs (country / market / name)
- `suspected_duplicate` — fuzzy match against another hotel in the same batch ≥ 88 (rapidfuzz composite)
- `low_confidence` — confidence < 0.7 after missing-field + range checks
- `compset_orphan_target` / `compset_orphan_member` — compset rows referencing hotels not in inventory
- `transaction_orphan` — transaction asset not resolved to any hotel

### Node admin UI · `/user/admin/hotels`

| File | Role |
|---|---|
| `lib/admin/hotels/snapshot-reader.ts` (new) | Server-only reader for `services/costar/MASTER/snapshot.json` · in-memory cache keyed on mtime · `loadHotelsSnapshot()` · `searchHotelsFromSnapshot()` · `findHotelById()` · `findCompsetsForHotel()` · `findTransactionsForHotel()` |
| `lib/admin/hotels/registry.ts` (updated) | Stable contract surface — switches implementation from stub to snapshot reader |
| `lib/admin/hotels/corrections.ts` (new) | Server action `submitHotelCorrection()` appends to `services/costar/corrections/<YYYY-MM>.jsonl` after operator-guard check |
| `app/user/admin/hotels/page.tsx` (rewritten) | KPI strip (5) · data-plane status with snapshot age · search form with filters (q · market · country · chain_scale · needs_review) · result grid (capped at 50) · reconciliation queue (top 20) · reference links |
| `app/user/admin/hotels/[hotelId]/page.tsx` (new) | Detail view — identification · property · location · facilities · compset memberships (as target + as member) · transaction history · provenance sidebar · correction form |
| `components/admin/hotels/correction-form.tsx` (new) | Client form: field picker · proposed value · required reason (min 8 chars) · queues to corrections.jsonl |

The snapshot reader degrades gracefully — when no `snapshot.json` exists yet, the page renders an empty state with a clear "run `python services/costar/scripts/ingest.py`" affordance.

### Operator workflow (end-to-end)

1. Drop files into the appropriate INPUT folder (hotel inventory · market data · compset · transactions)
2. `pip install -r services/costar/scripts/requirements.txt` (one-time)
3. `python services/costar/scripts/ingest.py` — sweeps INPUTs, emits `snapshot.json`, archives sources to `OLD/`
4. Open `/user/admin/hotels` — KPIs, search, reconciliation queue all reflect the new data
5. For any wrong attribute, open the hotel detail and queue a correction
6. On the next ingest run, corrections will apply (Python consumer is the only remaining piece)

### Gitignore updates

`services/costar/MASTER/snapshot.json` and `services/costar/corrections/*.jsonl` are local-only — same posture as INPUT files.

### Smoke

- `/user/admin/hotels` → 200 · 55 KB (empty-state path · no snapshot yet)
- All KPI labels render · search form posts via GET · reconciliation-queue anchor present
- Empty-state banner correctly displays `python services/costar/scripts/ingest.py` command
- Typecheck clean
- All 6 Python modules pass `py_compile` syntax check

### Honest gaps

- **`ingest.py` has not been run against the Madrid drop yet** — that's the operator step. When you run it the snapshot will materialise and the page will start showing real data.
- **Correction queue Python consumer is a stub.** Today corrections accumulate in `services/costar/corrections/<YYYY-MM>.jsonl` but the next `ingest.py` does not apply them as supersedes — that's Phase 2.3.d.6 work.
- **Compset / transaction column aliases are minimal** in `ingest.py` — when the operator drops files with unfamiliar header names the row may be dropped silently. Extend the alias maps in `normalization.py` as new column names appear.
- **No "trigger rebuild from the UI" button yet.** Rebuilds are CLI-only. Adding a server action that spawns `python ingest.py` is straightforward but deferred.

---

## 2026-05-14 — COSTAR architecture · two-dataset split · `/user/admin/hotels` scaffold · agent expanded scope

Operator dropped Madrid + Madrid Centro CoStar files into `services/costar/`, renamed the `CLASS/` folder to `HOTELES POR MERCADO/`, uploaded private transactions alongside the COSTAR transactions export into `services/transactions/`, and uploaded the COMPSET file into `services/compset/`. This commit persists the architectural shift these uploads imply.

### Conceptual shift · two datasets, not one

The COSTAR workspace now models **two genuinely distinct datasets** that both happen to come from CoStar exports but model different things:

| Dataset | Nature | Granularities |
|---|---|---|
| **A · Market Performance** | aggregated KPIs over time (occupancy · ADR · RevPAR · room nights · supply · demand · pipeline · absorption) | country (`PAIS`) · market (`MERCADO`) · submarket (`SUBMERCADO`) |
| **B · Hotel-by-Market Inventory** | individual property records with slowly-changing attributes (name · brand · operator · facilities · amenities · score · category · rooms · geo · owner) | hotel-by-hotel within a market (`HOTELES POR MERCADO`) |

The legacy CLASS granularity (chain-scale aggregates) is **retired** — `chain_scale` becomes an attribute on each hotel record in Dataset B. The OLD class master stays in `MASTER/` for archival but is no longer regenerated.

### Files

| File | Change |
|---|---|
| `services/costar/README.md` | Two-dataset framing · 4-stream pipeline (3 market + 1 inventory) · directory tree updated |
| `docs/intelligence/costar-hotels-by-market-schema.md` | **NEW** · schema for Dataset B with planned columns (identification · property · location · facilities · commercial context) |
| `docs/intelligence/costar-class-schema.md` | Deprecation banner · points to the new schema |
| `docs/intelligence/costar-master-dataset-architecture.md` | Two-dataset banner · dimension table refactored with dataset column · CLASS row marked retired |
| `docs/intelligence/hospitality-intelligence-roadmap.md` | **NEW** Phase 2.3.d sub-phases (.0–.6) · **NEW** Phase 3 "Real institutional underwriting engine" with entry/exit criteria |
| `docs/HOTELVALORA_MASTER_SYSTEM.md` | 7-surface admin map · 2026-05-14 callout |
| `docs/features/admin.md` | New `/user/admin/hotels` row · sidebar table reordered (Hotels at slot 3 next to AI Operations) |
| `apps/web/src/lib/admin/agents/registry.ts` | `costar_market_data` renamed → "COSTAR & Hotel Reference Agent" · expanded responsibilities + integrations + workflow + roadmap |
| `apps/web/src/lib/admin/hotels/types.ts` | **NEW** · `HotelReferenceRecord` shape mirroring the schema doc |
| `apps/web/src/lib/admin/hotels/registry.ts` | **NEW** · `loadHotelsRegistryStatus()` + `searchHotelsReference()` stubs |
| `apps/web/src/app/user/admin/hotels/page.tsx` | **NEW** · read-only scaffold (data-plane status · disabled search · capabilities · empty reconciliation queue · references) |
| `apps/web/src/components/admin/admin-sidebar.tsx` | Hotels entry between AI Operations and Integrations · BETA badge |

### Agent ownership

`costar_market_data` becomes **COSTAR & Hotel Reference Agent** (short name "Hotel Ref"). New responsibilities:

- Maintain Dataset A (3 market masters) AND Dataset B (hotel inventory)
- Hotel-reference integrity: dedup detection · missing-field flagging · stale-data monitoring
- Compset cross-references: validate every compset target `hotel_id` resolves in the inventory
- Reconciliation queue: surface suspicious changes + hallucinated attributes for operator review

Mission updated to reflect this is the **reference data backbone** — every downstream surface (compset, valuations, market reports, underwriting) ultimately resolves to `hotel_id` values this agent vouches for.

### `/user/admin/hotels` scaffold

Read-only today. Sections:
1. **Data plane** · status card (XLSX master · normalization version · rows · markets)
2. **Search hotels** · disabled input + selects · activates with Phase-5 Supabase mirror
3. **Planned capabilities** · 8 cards (search · inspect · edit · compset membership · market assignment · operator relationships · facilities · audit trail)
4. **Reconciliation queue** · empty state today
5. **Reference** · links to schema doc, workspace README, owning agent dashboard

Why scaffolded now: the COSTAR & Hotel Reference Agent dashboards link to this route, and operators need a destination for the reconciliation work once the v1.2 pipeline ships.

### What this does NOT do (honest gaps)

- Does **not** ingest the Madrid drop into a master — `build_masters.py` v1.2 is Phase 2.3.d.2 work
- Does **not** mirror anything into Supabase — Phase 5
- Does **not** generate real reports — Phase 3 (entry criterion is Phase 2.3.d.2 + .4 complete)
- The `searchHotelsReference()` stub returns `null` until the data plane is live

### Smoke

- Typecheck clean
- Sidebar renders 8 entries with the new Hotels item at slot 3 (BETA badge)
- `/user/admin/hotels` page composes successfully (read-only stub · no DB reads)

---

## 2026-05-13 — Agents page · Executive AI Command Center · 6-section operational hierarchy

`/user/admin/agents` becomes the institutional control room for the autonomous intelligence infrastructure. The previous "OperationalDashboard then orbital then roster" stack is replaced by a six-section hierarchy with the orbital command center on top.

### Section order

| # | Title | What it is | Anchor |
|---|---|---|---|
| 01 | **AI Operation Center** | CEO Agent at the center · 9 specialised departments orbiting · primary visual surface | `#command-center` |
| 02 | **Agent Roster by Tier** | Operator management · per-agent CTAs · responsibilities · schedules · linked dashboards | `#agent-roster` |
| 03 | **Operational Metrics** | Drillable totem strip + Top Signals · KPIs link to in-page anchors or `/library` | `#operational-metrics` |
| 04 | **Priority Intelligence Feed** | Cross-source dealflow · top 5 above the fold · backlog scrolls below | `#priority-intel-feed` |
| 05 | **Ingestion Monitoring** | Compact: recent runs table (2/3 width) + throughput sparkline (1/3 width) | `#ingestion-monitoring` |
| 06 | **Alerts & Failures** | Degraded sources + audit-driven alert entries · anchored at the bottom | `#alerts-failures` |

### New components

| File | Role |
|---|---|
| `components/admin/ai-ops/section-shell.tsx` | Numbered section atom: eyebrow `Section NN` + forest-900 title + slate subline + optional trailing badge · `scroll-mt-20` for anchor drilldowns |
| `components/admin/ai-ops/agent-roster.tsx` | Tier-grouped roster · per-row CTAs: Open dashboard · View activity · Edit · Pause/Resume · top-2 responsibilities · schedule + success-rate strip |
| `components/admin/ai-ops/intelligence-feed-capped.tsx` | 5-row top + scrollable backlog · adds Market-Intelligence-Agent attribution chip to each item |

### Operational dashboard refactor

`OperationalDashboard` keeps its single-block export for legacy callers, but the five primitives (`TotalsStrip`, `ThroughputCard`, `DegradedPanel`, `RecentRunsTable`, `AlertsFeed`) are now individually exported so the page can compose them in the new operational order.

### Drillable KPIs

The `TotalsStrip` totem rows accept an optional `href` and render as `<Link>` when set, with a slate-900 hover background and a `drill ↓` reveal on hover. Wired targets today:

| Totem | href |
|---|---|
| Runs · 7d | `#ingestion-monitoring` |
| Success Rate | `#ingestion-monitoring` |
| Successful | `#ingestion-monitoring` |
| Partial | `#alerts-failures` |
| Failed | `#alerts-failures` |
| Articles · 7d | `/library` |
| Priority · 7d | `#priority-intel-feed` |

### Agent roster CTAs

Each agent row now carries four operator controls:

| CTA | State today | Target |
|---|---|---|
| Open dashboard | Active link | `/user/admin/agents/<id>` |
| View activity | Active link | `/user/admin/agents/<id>#runs` |
| Edit | Disabled + tooltip | Phase-3 mutation layer |
| Pause / Resume | Disabled + tooltip | Phase-3 mutation layer |

The Edit + Pause buttons render as `aria-disabled="true"` with explanatory tooltips so the gate is honest — they wire to a real server action once the `ai_agents` write surface lands.

### Priority feed visibility cap

The new wrapper takes the source-balanced + signal-ranked feed from `loadAiOpsLive()` and renders the top 5 above the fold, then a `max-h-[28rem] overflow-y-auto` panel for the remainder labelled "Backlog · N more · scroll". Each row gains an agent-attribution chip ("Market Intelligence Agent") alongside the existing source / premium / authed / score / time chips.

### Smoke

- `/user/admin/agents` → 200 · 301 KB
- All 6 section anchors render in document order (`command-center` → `alerts-failures`)
- 6 `aria-labelledby="<section>-h"` matches confirm SectionShell structure
- 10 "Open dashboard" buttons · 10 "View activity" buttons · 10 disabled Edit · 10 disabled Pause/Resume (one per agent)
- 7 drillable totem links wired to in-page anchors / `/library`
- Typecheck clean
- Lint: project's `next lint` is uninitialised (unrelated)

### Files

- `apps/web/src/components/admin/ai-ops/section-shell.tsx` (new)
- `apps/web/src/components/admin/ai-ops/agent-roster.tsx` (new)
- `apps/web/src/components/admin/ai-ops/intelligence-feed-capped.tsx` (new)
- `apps/web/src/components/admin/ai-ops/operational-dashboard.tsx` (primitives re-exported · totems gain `href` prop)
- `apps/web/src/app/user/admin/agents/page.tsx` (six-section composition)

### Honest gaps

- "Pause agent" and "Edit agent" mutations need a server-action layer against `ai_agents` (Phase-3 work). Today the affordance is rendered + visibly gated.
- The priority feed's agent-attribution chip is currently a static "Market Intelligence Agent" because every `market_news` row is owned by that agent. When more writers land, attribution should come from a `source_id → owning_agent` lookup or a column on `market_news`.

---

## 2026-05-13 — Integrations · compact monitoring tiles + click-to-expand detail sheet

The integrations registry switches from documentation-style cards to monitoring-dashboard tiles. The canonical reference is now `/user/admin` Section 05 (`InfraIndicator`) — same proportions, same density, same grid. Click any tile → full technical audit opens in a responsive sheet (bottom-sheet on mobile, right-side drawer on desktop).

### New components

| File | Role |
|---|---|
| `components/admin/integrations/integration-tile.tsx` | Server component · compact tile · infra-indicator visual contract |
| `components/admin/integrations/integration-detail-sheet.tsx` | Client component · Radix Dialog · bottom-sheet ↔ right-drawer |
| `components/admin/integrations/platform-integration-tile.tsx` | Adapter for `PlatformIntegrationDescriptor` (8 of 9 layers) |
| `components/admin/integrations/intelligence-source-tile.tsx` | Adapter for `IntegrationDescriptor` (intelligence layer) |

### Tile visual contract (canonical parity with Section 05)

| Property | Tile (new) | `InfraIndicator` reference |
|---|---|---|
| Container | `flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-4` | identical |
| Status dot | `h-2.5 w-2.5` · pulses on ok/error | identical |
| Title | `text-[13px] font-extrabold tracking-tight text-white` | identical |
| Status badge | `rounded px-1.5 py-0.5 font-mono text-[9.5px] uppercase tracking-widest ring-1` | identical |
| Region/provider pill | `ml-auto rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[9.5px]` | identical |
| Description | `mt-1 text-[11px] leading-snug text-slate-400 line-clamp-1` | identical (minus the clamp) |
| Metadata line | `mt-1.5 font-mono text-[10.5px] text-slate-500 truncate` | identical |
| Grid | `grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3` | identical |

### Compact-by-default content

The tile shows: provider/name · status badge (Live · Partial · Not wired · Fail · Planned) · region or provider chip · 1-line description · one mono metadata line (e.g. "OAuth · 1 cron · 3 tables · operator-managed" for platform · "RSS · 142 · 7d · reliability 97%" for intelligence).

### Click-to-expand interaction model

- Each tile is a `<button>` (full-width, focusable, keyboard-accessible). The whole card is the click target.
- Triggers a Radix Dialog with responsive positioning:
  - **Mobile (`<sm`)**: bottom-anchored sheet · `inset-x-0 bottom-0 max-h-[92vh] rounded-t-2xl` · slides up
  - **Desktop (`sm+`)**: right-side drawer · `sm:right-0 sm:top-0 sm:h-full sm:w-[30rem] sm:rounded-l-2xl` · slides in from the right
- Focus management, ESC-to-close, overlay-click dismiss handled by Radix.

### Sheet content (full dossier)

- Platform integrations: provider · purpose · next-milestone callout · auth method · env-var chips · schema tables · cron jobs · consumed-by surfaces · operational notes · operator-managed badge · external links
- Intelligence sources: tier · tagline · region/language/kind · connection + auth badges · Articles Today/7d/30d grid · last-sync · reliability · operational notes · external links · "Open full dossier" → `/user/admin/integrations/[id]`

### Architecture preserved

Section grouping · operational layer ordering (9 layers in operational order) · integration taxonomy · status badges + classifier logic · telemetry labels — all unchanged. Only the default visual density was compressed.

### Smoke

- `/user/admin/integrations` → 200 · 429 KB (was 463 KB)
- 33 clickable trigger buttons (1 per integration · all 33 integrations across both registries surface as compact tiles)
- 21 `grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3` containers (matches Section 05 grid exactly)
- Tile signatures all present · old large-card signatures all absent
- Hero density pass (previous commit) still intact
- Typecheck clean
- Lint: project's `next lint` is uninitialised (interactive prompt), unrelated to this change

### Files

- `apps/web/src/components/admin/integrations/integration-tile.tsx` (new)
- `apps/web/src/components/admin/integrations/integration-detail-sheet.tsx` (new)
- `apps/web/src/components/admin/integrations/platform-integration-tile.tsx` (new)
- `apps/web/src/components/admin/integrations/intelligence-source-tile.tsx` (new)
- `apps/web/src/app/user/admin/integrations/page.tsx` (rewired)

The previous large cards (`IntegrationCard`, `PlatformIntegrationCard`) remain in place — `IntegrationCard` is still used inside the Executive Control Room's "Intelligence Sources" section on `/user/admin`. They are no longer imported on `/user/admin/integrations`.

---

## 2026-05-13 — Integrations hero · density pass · compact executive control room

The first hero pass landed as a marketing-scale showcase. This pass reduces vertical footprint by ~25% so the hero behaves like an institutional control panel, not a SaaS pricing page.

### KPI card adjustments

| Property | Before | After |
|---|---|---|
| Padding | `p-4 sm:p-5` | `p-2.5 sm:p-3` |
| Border radius | `rounded-2xl` | `rounded-xl` |
| Icon size | 14 | 11 |
| Numeral | `text-4xl sm:text-5xl` | `text-2xl sm:text-3xl` |
| Label | `text-[9.5px] tracking-[0.25em]` | `text-[8.5px] tracking-[0.22em]` |
| Description | `text-[11.5px]` · `mt-2` · `leading-snug` | `text-[10px]` · `mt-1` · `leading-tight` |
| Glow blob | `h-32 w-32 blur-3xl` opacity 50/80 | `h-20 w-20 blur-2xl` opacity 40/70 |
| Shadow | `shadow-lg /10 → /30` | `shadow-md /10 → /25` |
| Grid gap | `gap-3` | `gap-2` |

Card-row layout (2-col mobile → 3-col tablet → 6-col desktop) and per-status semantic palette are unchanged.

### Hero section adjustments

- Outer `p-5 sm:p-7` → `p-3 sm:p-4` · `mb-5` block-spacer → `mb-3`
- Title `text-3xl sm:text-4xl` → `text-2xl sm:text-3xl` · `mt-2` → `mt-1.5`
- Description `text-[13.5px] leading-relaxed text-slate-300/90` → `text-[12px] leading-snug text-slate-400` · `mt-2` → `mt-1`
- "Operator only · internal" chip moved inline alongside the eyebrow label (no longer occupies its own line)
- KPI → strip spacer `mt-4` → `mt-2.5`

### Operational strip → telemetry ribbon

The strip becomes a single horizontal status bar at lg+: hairline `divide-x` between cells, label and value baseline-aligned inline (`label · value`), transparent inner cells, no per-cell ring. Tablet/mobile keep the 2/3-col rounded-cell grid for legibility. Icon 12→10 · label `text-[9px]` → `text-[8px]` · value `text-[11px]` → `text-[10px]` · padding `px-3 py-2` → `px-2 py-1`. All 5 cells (Platform layers · Total integrations · Operator controlled · Access · Monitoring) preserved verbatim.

### Counts / colors / classifier untouched

`unified-status.ts` and `computeUnifiedCounts()` are unmodified. The 6 buckets (TOTAL · LIVE · PARTIAL · NOT WIRED · FAIL · PLANNED) and the manual-workflow override rule are unchanged. Pure visual-density pass.

### Smoke

- `/user/admin/integrations` → 200 · 463 KB · ~14.9s cold compile
- 6 KPI labels + 5 operational-strip cells render
- Zero remnants of the old large-density signatures (`p-4 sm:p-5` · `text-4xl sm:text-5xl` · `h-32 w-32 blur-3xl` · `p-5 ... sm:p-7` outer · `px-3 py-2 ring-inset` strip cells)
- All 6 new compact-density signatures present
- Typecheck clean

### Files

- `apps/web/src/components/admin/integrations/hero-kpis.tsx`
- `apps/web/src/components/admin/integrations/operational-strip.tsx`
- `apps/web/src/app/user/admin/integrations/page.tsx`

---

## 2026-05-13 — Integrations hero redesign · executive control room · 6 glow KPI cards

`/user/admin/integrations` opens with a redesigned hero. The old engineering-jargon counters (Intel OK / Warn / Fail · Platform Layers 2-5 · Intelligence sources) are replaced by **six glow KPI cards**: TOTAL · LIVE · PARTIAL · NOT WIRED · FAIL · PLANNED. A compact slate operational strip sits below: Platform layers · Total integrations · Operator controlled = 100% · Access: Internal · restricted · Monitoring 24/7.

### Unified status classifier (single source-of-truth)

`lib/admin/integrations/unified-status.ts` is now the single classifier mapping both registries onto the 5 executive buckets:

- `classifyIntelligenceSource(s)` — uses `signal` + `connection` + `health` (last-run + 7d success count)
- `classifyPlatformIntegration(p)` — uses `signal` + `status`
- `computeUnifiedCounts(intel, platform)` — returns the 6 numerals the hero renders

**Manual-workflow override**: an `operatorManaged` integration with no `cronDependencies` rolls up to **PARTIAL** even when its per-card status says `live`. Captures the institutional truth that Datasite exports, Google Contacts CSVs, and Gmail JSONL drops are operational but operator-refreshed by hand.

### Bucket definitions

| Bucket | Meaning |
|---|---|
| **LIVE** | Fully operational + autonomous · refreshes without operator intervention |
| **PARTIAL** | Works end-to-end but depends on manual workflows, exports, BETA paths, or incomplete automation |
| **NOT WIRED** | Operator account or env scaffolded · no active code path calls |
| **FAIL** | `signal === "error"` or `connection === "failing"` right now |
| **PLANNED** | Roadmap only · no account or no env |

`TOTAL` is the sum, not a separate bucket.

### Visual language

Each glow card carries: tracked-out label · large tabular numeral in semantic accent · one-line description in slate · subtle radial glow blob (top-right, hover opacity bump) · per-status ring + gradient + shadow · `hover:-translate-y-0.5` lift. Mobile-first: 2-col → 3-col tablet → 6-col desktop. Semantic palette: emerald (LIVE) · amber (PARTIAL) · sky (NOT WIRED) · rose (FAIL) · violet (PLANNED) · lime (TOTAL).

### Smoke

- `/user/admin/integrations` → 200 · 462 KB
- 6 hero labels + 6 descriptions + 5 operational strip cells present
- Zero remnants of old "Intel · OK / Warn / Fail · Platform Layers 2-5 · Intelligence sources"
- All 6 semantic shadow classes present in rendered HTML
- Typecheck clean

### Files

- `apps/web/src/lib/admin/integrations/unified-status.ts` (new)
- `apps/web/src/components/admin/integrations/hero-kpis.tsx` (new)
- `apps/web/src/components/admin/integrations/operational-strip.tsx` (new)
- `apps/web/src/app/user/admin/integrations/page.tsx` (refactored hero slot)
- `docs/integrations/account-inventory.md` (hero KPI counting logic section)

Commit: `52b5408`. Follow-up commit (this changelog + feature-doc patches): see next commit.

---

## 2026-05-13 — Integrations · second-pass reconciliation against operator account inventory · 9 layers

The morning's 5-layer architecture under-represented the real ecosystem because it didn't reconcile against the provisioned operator accounts. This evening's pass corrects that: the integrations surface now renders **9 operational layers** with **33 integrations** total (27 in the platform registry + 6 in the intelligence-sources registry).

### Operator account inventory is now architectural source-of-truth

`memory/project_operator_accounts.md` captures the 15 operator-provisioned accounts (Namecheap · Vercel · Mapbox · Supabase · Auth.js · Datasite · GitHub · Stripe · Google Cloud · Google Dev · Apple Dev · Resend · PostHog · OpenAI · Sentry). Future audits reconcile against this file before declaring anything "PLANNED". Canonical reconciliation matrix lives in `docs/integrations/account-inventory.md`.

### New layers · new integrations on /user/admin/integrations

| Layer | New entries | Status |
|---|---|---|
| Infrastructure | Namecheap (DNS) | LIVE |
| **Auth & Identity** (new) | Supabase Auth · Google Cloud Console · Auth.js (parked) | PARTIAL · LIVE · CONFIGURED_NOT_WIRED |
| **AI** (new) | OpenAI API | CONFIGURED_NOT_WIRED |
| **Analytics & Observability** (new) | Vercel Analytics · Vercel Speed Insights · PostHog · Sentry | 2 LIVE · 1 CONFIGURED_NOT_WIRED · 1 PARTIAL |
| **Developer Infrastructure** (new) | GitHub · Google Developer Program · Apple Developer | LIVE · 2 CONFIGURED_NOT_WIRED |

### Status taxonomy extended

`PlatformIntegrationStatus` now covers `live | partial | configured_not_wired | planned`. The `configured_not_wired` state is the load-bearing addition — it captures the situation where the operator has provisioned the account and even scaffolded env stubs but no code path actually invokes the vendor. Today: OpenAI · PostHog · Stripe · Sentry/web · Apple Dev · Google Dev Program · Auth.js.

### Page layout (operational hierarchy)

1. Infrastructure → 2. Auth & Identity → 3. AI → 4. Analytics & Observability → 5. Communications → 6. Intelligence Sources (rich card · session telemetry preserved) → 7. Relationship Intelligence → 8. Commercial / Monetization → 9. Developer Infrastructure.

### Card additions

`PlatformIntegrationDescriptor` gains an `accountProvisioned: boolean` field. Status pill renders the new label "configured · not wired" with a slate background + lime ring (visually distinct from "live" emerald and "partial" amber).

### Smoke

- `/user/admin/integrations` → 200 · 437 KB
- All 9 layer headers render
- New integrations all visible (Namecheap · GitHub · OpenAI API · PostHog · Sentry · Google Cloud Console · Apple Developer · Google Developer Program · Vercel Analytics · Auth.js)
- Status pills tally: 17 live · 6 configured-not-wired · 2 partial · 2 planned (within the platform registry; intelligence-sources cards have their own signal lights)
- Typecheck clean

### Files touched

- `apps/web/src/lib/admin/integrations/platform-registry.ts` — 9-layer taxonomy + 9 new entries + new status taxonomy
- `apps/web/src/components/admin/integrations/platform-integration-card.tsx` — new status tones + readable "configured · not wired" label
- `apps/web/src/app/user/admin/integrations/page.tsx` — 9-layer renderer · Intelligence Sources slotted at position 6 between Communications and Relationship Intelligence
- `docs/integrations/account-inventory.md` — new canonical reconciliation matrix
- `memory/project_operator_accounts.md` + `memory/MEMORY.md` — operator account inventory persisted for future sessions

---

## 2026-05-13 — Integrations surface · 5-layer operational map (Connected Platform Ecosystem)

`/user/admin/integrations` evolves from a news-feed directory into the full operational map of HotelVALORA's connected ecosystem. The integrations surface now renders five layers in operational order:

1. **Intelligence Sources** — existing 6 (Hosteltur · Alimarket · HospitalityNet · Reuters Hospitality · HVS · CoStar News) · keeps the rich `IntegrationCard` with credentials + session telemetry intact.
2. **Infrastructure** — Supabase Database · Supabase Auth · Supabase Storage · Vercel Platform · Vercel Cron · Mapbox GL.
3. **Communications** — Resend (LIVE) · Gmail Signals (LIVE, operator-managed) · Slack (PLANNED) · Twilio SMS (PLANNED).
4. **Relationship Intelligence** — Datasite Outreach · Google Contacts · Gmail Relationship Intelligence.
5. **Commercial / Monetization** — Subscription Engine (LIVE) · Campaign Attribution System (LIVE) · Stripe (PLANNED, schema-ready).

### New modules
- `lib/admin/integrations/platform-registry.ts` — declarative platform-integration registry (Layers 2–5). Each entry carries: provider · status · purpose · auth method · env vars · DB tables · cron dependencies · admin surfaces consumed · operator-managed flag · external links · operational notes · next-milestone (for BETA / PLANNED).
- `components/admin/integrations/platform-integration-card.tsx` — simpler sibling of `IntegrationCard` (no session telemetry). Shows status badge · purpose · next-milestone (when applicable) · auth · env vars · schema · cron · surfaces · operator-managed flag · external links.
- `components/admin/integrations/layer-section.tsx` — section wrapper with numbered eyebrow + count + subtitle.

### Page refactor
- Header re-titled "Connected Platform Ecosystem" · subhead summarises total integrations across the five layers.
- Layer 1 keeps its sub-groupings (Authenticated · Spain · Public · Global · Deferred) inside the new `LayerSection` wrapper · existing card unchanged · session telemetry preserved.
- Layers 2–5 use the new platform card · same dark forest-900 / lime-300 visual contract · responsive grid (1 → 2 → 3 col).
- Summary strip extended with "Platform Layers 2-5" + "Intelligence sources" totem counts.

### Telemetry contract (carried forward)
- **Layer 1** (Intelligence) retains the full T1/T2 credential + session lifecycle telemetry · the existing `getIntegrationsLive` aggregator was untouched.
- **Layers 2-5** carry a static descriptor today · a follow-up will wire live signals (Supabase health, Resend send count, Mapbox quota) once we add per-integration probes.

---

## 2026-05-13 — Admin sidebar reordered to operational hierarchy

Sidebar items now flow top-to-bottom along the institutional value chain — core intelligence first, contacts last — instead of being grouped by "growth funnel surfaces vs operator infrastructure". This puts the dense, high-frequency operator surfaces (AI Operations, Integrations) at the top of the rail where they belong.

New order:
1. Overview
2. AI Operations · core intelligence
3. Integrations · infrastructure
4. Campaigns · growth
5. Subscriptions · monetization
6. Users · onboarded users
7. Contacts · relationship graph (upstream acquisition / support)

All LIVE badges intact. No semantic change beyond the array shuffle + a comment in `admin-sidebar.tsx` documenting the rationale. Doc rubric in `docs/features/admin.md` § 0 carries the same hierarchy.

---

## 2026-05-13 — Admin sidebar normalisation · operational state ≠ access scope

Sidebar was mixing two orthogonal concerns: operational maturity (is this module working?) and access scope (who uses it?). AI Operations + Integrations were carrying `INTERNAL` even though both are fully operational, which read as "less than LIVE" — wrong signal.

### Fix
- `NavTone` reduced to `live | beta | planned` · `internal` removed
- Every operational module now carries `LIVE` in the sidebar: Contacts · Users · Campaigns · Subscriptions · AI Operations · Integrations
- Access-scope chip ("Operator only · internal infrastructure") moved into the AI Operations + Integrations page headers · slate-toned secondary metadata that sits alongside the existing eyebrow row

### Rubric (corrected · `docs/features/admin.md` § 0)
| Surface | Concern answered | Vocabulary |
|---|---|---|
| Sidebar badge | *is this module operational?* | LIVE / BETA / PLANNED |
| Page header chip | *who uses this module and why?* | Operator only · internal infrastructure · (none = default operator console for customer-visible data) |

The two layers are intentionally orthogonal: access scope is additive context, never a replacement for the operational badge.

---

## 2026-05-13 — Admin sidebar · status semantics rubric codified · Campaigns + Subscriptions promoted to LIVE

Sidebar badges now follow a 4-state global rubric. Campaigns + Subscriptions flip from "Scaffold" to **LIVE** — both surfaces have operational routes, dashboards, attribution models, activation UI, entity tables and invitation-flow integration shipped. AI Operations + Integrations re-classified as **INTERNAL** (operator-only infrastructure with no customer-facing counterpart by design). Planned items use "Planned" instead of the implementation-detail "Phase 3" label.

### Rubric (codified in `apps/web/src/components/admin/admin-sidebar.tsx`)

| Badge | Tone | Meaning |
|---|---|---|
| LIVE | emerald | Operational end-to-end MVP · customer-visible impact |
| BETA | amber | Partially connected · operational with rough edges |
| PLANNED | slate | Not yet built · static affordance for roadmap visibility |
| INTERNAL | forest / lime | Operator-only tooling · no public-facing counterpart by design |

Sidebar assignments (post-rubric):
- LIVE — Contacts · Users · Campaigns · Subscriptions
- INTERNAL — AI Operations · Integrations
- PLANNED — Workspaces · Observability · Cost Controls · Audit Log

### Implementation
- `NavItem` gains a `tone` field (`live` / `beta` / `planned` / `internal`)
- New `badgeToneClass(tone, active)` helper maps each tone to its Tailwind palette
- INTERNAL gets the forest/slate-900 chip with lime text — visually distinct from LIVE's emerald
- Rubric documented in `docs/features/admin.md` § 0 as the contract that future surfaces hew to

### Promotion criteria
Promoting from BETA → LIVE requires: end-to-end happy path with audit · soft-delete posture where mutations exist · no caller-visible holes in the operator workflow. Campaigns + Subscriptions cleared this bar in 2.D.7 + 2.D.7b.

---

## 2026-05-13 — Phase 2.D.7b · Product catalogue is the source of truth · bulk ops pivot off `subscription_products`

The user_tier enum stops being a hardcoded picker — every bulk subscription flow now reads from `subscription_products`. Campaigns become monetization cohorts via a new FK. Product cards gain inline visibility toggle and a swipeable mobile carousel.

### Database — migration `0022_campaigns_subscription_product_link`
- `campaigns.subscription_product_id` FK → `subscription_products(id) ON DELETE SET NULL` — each campaign now references the product it grants.
- Index `campaigns_product_idx` on the FK.
- Backfill: any campaign with `kind='top_promote_rollout'` auto-links to the seeded `top_promote` product. Operator can override per-row.

### Server actions · `lib/admin/subscriptions/bulk.ts`
Refactored `bulkAssignSubscriptionAction` to accept **`product_id`** as the primary input (backward-compat: a raw `tier` value still works). New helper `resolveTierAndProduct()` looks up the product to derive `tier_enum` for the legacy `subscriptions.tier` column, then sets `subscriptions.product_id`.

Two new actions land alongside:
- **`bulkReplaceProductAction`** — in-place UPDATE on each user's latest active subscription · sets new product_id + tier · skips Stripe-backed. Use for clean upgrade/downgrade without stacking historical rows.
- **`bulkRevokeSubscriptionAction`** — flips latest non-Stripe sub to `status='canceled'` + `cancel_at_period_end=true` · appends a per-row note (`revoked <date>: <reason>`) · audit row captures reason. Stripe-backed skipped.

The Comp shortcut (`bulkCompSubscriptionAction`) now resolves the seeded `comped` product first; falls back to legacy `tier='comped'` only if the comped product was archived.

### Server-side helpers · `lib/admin/subscriptions/products/live.ts`
- `loadProductsForPicker()` — visible-only catalogue (slug · name · tier_enum · monthly_price · currency · badge) for toolbar/form dropdowns
- `loadProductForAssignment(productId)` — used by the bulk action to derive `tier_enum`
- `loadCompedProduct()` — used by the Comp shortcut

### Bulk toolbars · product picker replaces tier enum
- **Users toolbar** (`/user/admin/users`): old `<Select>` of 7 enum values → product picker rendering each catalogue item as `Name · €X/mo · Badge`. New action buttons added: **Replace** (`bulkReplaceProductAction`) and **Revoke** (`bulkRevokeSubscriptionAction` with optional reason).
- **Contacts toolbar** (`/user/admin/contacts`): Subscribe action's tier `<select>` swapped for the same product picker. Default selection prefers the `pro` slug, then any product with `tier_enum='pro'`, falling back to the first available.
- Both surfaces load products via `loadProductsForPicker()` and pass through the toolbar prop graph.

### Campaign form gets product picker + card surfaces it
- `lib/admin/campaigns/live.ts` joins `subscription_products` on the `subscription_product_id` FK and exposes `subscription_product_name + subscription_product_slug` on every `CampaignRow` / `CampaignDetail`.
- `lib/admin/campaigns/mutations.ts` accepts `subscription_product_id` in create + update schemas. Empty string and the sentinel `"none"` normalise to NULL.
- `CampaignFormDrawer` adds a "Grants subscription product (monetization cohort)" `<Select>` after the conversion-target row.
- `CampaignCard` shows a lime `Grants · <product name>` chip in the footer chip strip when a product is linked.

### Mobile-first polish
- **Swipeable card carousel** on `/user/admin/subscriptions`: below `sm`, the catalogue renders as a horizontal `overflow-x-auto snap-x snap-mandatory` flex strip with 85% cell width. From `sm` upward it switches back to the standard responsive grid (2-col → 4-col). Touch flicks land naturally on each card.
- **Inline visibility toggle** on every product card: the card is now a `<div>` with an absolute-positioned `<Link>` overlay covering the body, and a small EyeOff/Eye toggle button (`setProductVisibilityAction`) in the top-right corner with its own `pointer-events: auto`. Operator can flip Hidden ↔ Visible without opening the drawer. Archived state remains a non-interactive label (irreversible-ish).

### Intentional non-features (carried forward per directive)
No Stripe billing automation · no self-serve checkout · no automated lifecycle emails · no AI campaign orchestration · no referral systems · no enterprise CRM complexity.

### Smoke
- `/user/admin/subscriptions` → 200 · 115 KB · "Catalogue" header · Premium card · `snap-x` mobile class · `aria-label="Edit"` (overlay) + `aria-label="Hide"` (inline toggle) both present
- `/user/admin/campaigns?selected=new` → 200 · 70 KB · product picker labelled "Grants subscription product (monetization cohort)"
- `/user/admin/users` → 200 · 70 KB · selection controls + bulk toolbar actions in JS bundle
- Typecheck clean across server actions + UI

---

## 2026-05-13 — Phase 2.D.7 · Subscriptions + Campaigns become visual operational frontends

Strategic redirect from the operator: Campaigns + Subscriptions are NOT admin CRUD tables — they must be visual operational frontends for institutional growth and monetization. Subscription tiers stop being enum-locked code; the catalogue is now data, operator-managed from the admin console, mobile-first.

### Database — migration `0021_subscription_products`
- New `public.subscription_products` table — the catalogue source-of-truth:
  - `id` · `slug` (unique) · `name` · `subtitle` · `description`
  - **Pricing**: `currency` (EUR/USD/GBP) · `monthly_price numeric(10,2)` · `yearly_price numeric(10,2)` · `vat_display` (inclusive / exclusive / none)
  - **Presentation**: `badge` · `cta_label` · `color_theme` (lime / emerald / amber / rose / slate / forest) · `features jsonb` (array of `{title, included}`)
  - **Catalogue ordering**: `display_order` · `visibility` (visible / hidden / archived)
  - **Backward compat**: `tier_enum` preserves the existing user_tier enum mapping; new products created via the UI leave it NULL
- `public.subscriptions.product_id` FK → `subscription_products(id) ON DELETE SET NULL`. Existing subscription rows are backfilled by joining `tier::text = subscription_products.tier_enum`.
- Seeded 4 default products: Free (€0) · Pro (€49/mo · €490/yr · lime) · Premium (€199/mo · €1990/yr · emerald · "Most popular") · Top Promote (€499/mo · €4990/yr · amber · "Investor visibility"). All operator-editable.
- Activity log verbs land under `entity_type='subscription_product'`: `product.created` · `product.updated` · `product.visibility_<visible|hidden|archived>`.

### Server lib · `lib/admin/subscriptions/products/`
- `live.ts` · `loadProductsWithMetrics()` joins per-product subscription counts in a single roundtrip · derives Active / Trialing / Expired counts + a simple MRR estimate (`monthly_price * active_users`). `loadProductById()` for the edit drawer.
- `mutations.ts` · `createProductAction` / `updateProductAction` / `setProductVisibilityAction`. All gated by `requireOperator`, all audit-logged. Features arrive from a single textarea (`title|true` per line) to minimise mobile-keyboard friction.

### `/user/admin/subscriptions` — visual operational frontend
- **Primary surface is now a Stripe/Notion-style pricing card grid.** The existing subscribers table is relegated to a secondary section below ("Active subscription rows · operator-driven assignments + Stripe-backed rows live here").
- Each card surfaces: slug uppercase label · name · subtitle · monthly price (with yearly + discount % when set) · VAT display · up to 6 feature bullets with check/strikethrough · operator metric strip (Active / MRR / Total) on a tinted footer.
- Card visual contract scales: full-width 1-col on mobile → 2-col at sm → 4-col at xl. Touch targets >= 44px.
- Hidden products render at reduced opacity with an `EyeOff` corner pill; archived products at lower opacity with an `Archive` pill.
- "+ New product" dashed card always rendered as last cell.
- `?product=<id>` opens the edit drawer; `?product=new` opens the create drawer. Drawer carries the full schema (slug, name, subtitle, description, currency, monthly/yearly, VAT display, badge, CTA label, color theme, display order, visibility, features-as-textarea, tier_enum compat).
- Visibility quick actions in the edit drawer: Make visible · Hide · Archive (one-click forms · audit-logged separately).

### `/user/admin/campaigns` — visual operational frontend
- **Primary surface is now a card grid.** Cards have: slug uppercase label · name · status pill · description (line-clamp 2) · 4-metric funnel strip (Active / Converted / Failed / Subs) · owner chip · channel chip · conversion target chip · "Manage" CTA arrow.
- Per-status color rings (lime / emerald / amber / slate) mirror the pricing-card aesthetic.
- "+ New campaign" dashed card always last.
- Existing CampaignsFilters + CampaignsTable moved into a collapsed `<details>` block below ("Filters · table view (N)") so power-user inspection remains available without crowding the visual primary.
- Form drawer unchanged; opens via card tap (`?selected=<id>`) or the New CTA (`?selected=new`).

### Mobile-first polish
- All grids use Tailwind responsive prefixes (1-col → 2-col → 3/4-col)
- Touch-friendly tap targets on the cards (clickable area extends to the entire card)
- Edit drawer's Features textarea uses a deliberately wide line-format (`title|true`) so an operator typing on a phone can compose new bullets without leaving the keyboard

### Intentional non-features (carried forward per directive)
No Stripe billing automation · no self-serve checkout · no automated lifecycle emails · no AI campaign orchestration · no referral systems · no enterprise CRM complexity. The operator drives every state change; `activity_log` is the receipt.

### Smoke
- `/user/admin/subscriptions` → 200 · 100 KB · 4 seeded products + new-product card render · subscribers section preserved
- `/user/admin/subscriptions?product=new` → 200 · 123 KB · create-product form drawer with all fields
- `/user/admin/subscriptions?product=<premium-id>` → 200 · 129 KB · edit drawer with "Most popular" badge preserved + Hide/Archive quick actions
- `/user/admin/campaigns` → 200 · 51 KB · card grid + collapsed table view
- Typecheck clean

### Coming on the roadmap
- 2.D.7b — wire products into the existing bulk-subscription-assign action so the picker reads from `subscription_products` instead of the user_tier enum
- 2.D.8 — campaign builder: card surface gains an "Assign product + invite cohort" inline wizard
- 2.D.5b — invitation expiration cron + drawer-level revoke action (carried over)

---

## 2026-05-13 — Phase 2.D.6 · Campaign-aware bulk subscription operations

Operators can now run institutional growth ops directly from the admin console: assign tiers, grant Comped access, expire subscriptions, and revoke pending invitations — all at N-row scale with campaign attribution preserved end-to-end. The contacts and users surfaces share the same selection contract; the subscriptions table grows expiration indicators.

### Server actions · `lib/admin/subscriptions/bulk.ts`
- `bulkAssignSubscriptionAction(formData)` — creates one `subscriptions` row per selected user with operator-chosen tier · status · expires_at · source_campaign_id · notes. Existing subs are not modified (latest-by-created_at semantics).
- `bulkCompSubscriptionAction(formData)` — shortcut wrapping the assign action with `tier='comped'`, `status='active'`.
- `bulkExpireSubscriptionAction(formData)` — flips the LATEST subscription of each selected user to `status='expired'` + `expires_at=now()`. Stripe-backed rows are skipped (operator should cancel via Stripe Dashboard so the webhook stays authoritative); count surfaces in the result banner.
- `bulkRevokeInvitationsAction(formData)` — flips every pending/sent/delivered/opened/clicked/bounced invitation for selected contacts to `status='revoked'`. Already-accepted invitations are never touched.

### Selection resolver — three input modes
- `explicit` — operator ticked user rows (Set<string>)
- `filtered` — re-runs the users-page filter at action time
- `contacts` — resolves `relationship_contacts.linked_user_id` (drops contacts that haven't onboarded)

Hard cap `MAX_BULK_BATCH = 500` matches the contacts bulk surface. Audit: one `activity_log` row per subscription created/mutated with `entity_type='subscription'` and `action='subscription.bulk_<verb>'`.

### `/user/admin/users` — bulk surface promoted to parity with contacts
- New `components/admin/users/bulk/`:
  - `UsersBulkSelectionProvider` — client context (explicit + filtered modes)
  - `UsersSelectionCheckbox` — per-row checkbox with disabled-checked filtered state
  - `UsersSelectAllControls` — Select page · Select all filtered · clear
  - `UsersBulkActionToolbar` — sticky bottom with 3 actions (Assign tier · Comp · Expire) and per-action inline form panels
- `UsersTable` gets a checkbox column + an amber expiration ring on rows with subscription expiring within 7 days
- Page wires `bulk_ok` / `bulk_failed` / `bulk_error` banners (emerald / amber suffix for skipped-Stripe / rose for failures)
- `loadActiveCampaigns()` from `lib/admin/subscriptions/live.ts` powers the campaign attribution dropdown

### `/user/admin/contacts` toolbar — Subscribe + Revoke actions
- New `Subscribe` button (lime tone) — opens an inline form posting to `bulkAssignSubscriptionAction` with `sel_mode='contacts'` and `origin='contacts'`. The server resolves `linked_user_id` and silently skips contacts that haven't onboarded.
- New `Revoke invite` button (amber tone) — opens a confirmation panel posting to `bulkRevokeInvitationsAction`. Mass-flips pending/sent/delivered/opened/clicked/bounced invitations for selected contacts to `revoked`; accepted invitations are never touched.
- Action labels added: `subscribe` and `revoke` in the LABELS dict.

### Subscriptions table — expiration indicators
- Row tint + ring when status='active' and expiry within 7 days (amber) or already past (rose)
- Expires column shows the day count remaining ("· 3d") when expiring soon
- Visual signal matches the lifecycle pill colors elsewhere

### Audit trail (all bulk actions)
- `subscription.bulk_assigned` — one row per inserted subscription with tier/status/expires_at/source_campaign metadata
- `subscription.bulk_expired` — one row per flipped subscription with expired_at timestamp
- `invitation.bulk_revoked` — one row on the contact entity with the invitation_id metadata
- Every audit row carries `actor_email` + `actor_id` (when available) so operator attribution survives.

### Intentional non-features (carried forward)
No Stripe billing automation · no self-serve checkout · no automated lifecycle emails · no AI campaign orchestration · no referral systems. The operator drives every state flip from the admin console; audit trail is the receipt.

### Smoke
- `/user/admin/users` → 200 · checkbox column + Select page (50) + Select all filtered controls render
- `/user/admin/contacts` → 200 · existing bulk surface intact; client-rendered toolbar gains Subscribe + Revoke when selection > 0
- `/user/admin/subscriptions` → 200 · expiration indicators ready (rendering tested visually; SQL fixtures with future expires_at would tint the row)
- Typecheck clean across server actions + UI

---

## 2026-05-13 — Phase 2.D.5 · Invitation accept flow · contact → user → subscription end-to-end

Closes the acquisition funnel. Recipients of a Resend invitation can now land on `/invite/<token>`, sign in via Supabase Auth (Google), and one-click accept — which deterministically links the contact ↔ user, bootstraps a subscription at the operator-chosen tier, and preserves the campaign attribution end-to-end.

### Database — migration `0020_invitation_accept_flow`
- `contact_invitations` gains `accepted_at`, `converted_at`, `accepted_by_user_id` FK → users, `expires_at timestamptz DEFAULT (now() + interval '30 days')`. Existing rows pick up the default on insert; back-dated rows stay NULL.
- Status CHECK constraint extended from 9 to 11 values: adds `revoked` (operator-cancel) and `expired` (natural-end). Existing operator code remains compatible — both new values are explicitly handled by the read/write paths.
- Indexes: `contact_invitations_expires_idx` (partial WHERE NOT NULL), `contact_invitations_accepted_by_idx`.

### Public `/invite/[token]` landing
- New route `apps/web/src/app/invite/[token]/page.tsx` — **NOT operator-gated by design**; the unguessable token (uuid) is the bearer credential.
- Renders the institutional preview card with: company, invited email, sender, campaign attribution, promo code, tier-on-acceptance, expires-at. Visual contract mirrors the Resend invite email (forest header, lime CTA).
- Idempotent first-visit stamp: status `pending`/`sent`/`delivered` flips to `opened` with one `activity_log` row.
- Blocking states render their own card with copy:
  - `revoked` → "This invitation was revoked"
  - `declined` → "Previously declined"
  - `bounced` → "Delivery issue detected"
  - `expired` (or past `expires_at`) → "This invitation has expired"
  - `accepted` / `converted` → "Already accepted · sign in to your account" with link to `/library`
- Signed-in user with matching email: one-click **Accept invitation** form posting to `acceptInvitationAction`. Email mismatch shows a yellow warning but still allows acceptance (token-bearer policy).
- Anonymous user: **Sign in to accept** CTA bouncing through `/login?next=/invite/<token>`.

### Server actions — `lib/invitations/`
- `live.ts` · `loadInvitationLanding(token)` (uuid pre-check, single roundtrip joining `relationship_contacts` + `campaigns`) and `markInvitationOpened(invitationId)` (idempotent state flip, audit row).
- `accept.ts` · `acceptInvitationAction(formData)` — the funnel-closing flow:
  1. Requires Supabase Auth session (or redirects to `/login`).
  2. Loads invitation by token. Gates by status (revoked/declined/expired/bounced → fail back to landing with error; converted → bounce to `/library`).
  3. Resolves `public.users` row for the auth user (relies on the `handle_new_user` trigger; falls back to manual insert if missing).
  4. Sequentially: links contact `linked_user_id` + `contact_invitation_status='converted'`, links user `linked_contact_id` + `invitation_status='active'`, bootstraps `subscriptions` row with `tier = default_subscription_tier ?? 'free'` and `source_campaign_id` preserved, flips invitation `status='converted'` + `accepted_at` + `converted_at` + `accepted_by_user_id` + `responded_at`.
  5. Writes per-stage `activity_log` rows: `invitation.accepted` (on contact) + `invitation.converted` (on subscription). Partial-failure path captures `invitation.subscription_bootstrap_failed` for ops.
  6. Redirects to `/library?onboarded=1`.
- `revokeInvitationAction(formData)` — operator-only (dynamic `requireOperator` import to avoid bundling into the public path). Flips `status='revoked'` + audit row. Gates by accepted/converted (can't revoke a closed funnel step).

### Bug fix · Next.js Data Cache bypass on the Supabase admin client
- `apps/web/src/lib/supabase/admin.ts` now passes `global.fetch` to the client with `cache: 'no-store'` on every roundtrip.
- Smoke-discovered: Next.js wraps the global `fetch` with a Data Cache that was returning stale invitation statuses across renders (a `'sent' → 'opened'` flip would persist across landings even after a SQL `UPDATE` flipped the row to `'revoked'`). All admin queries (contacts, users, subscriptions, campaigns, invitations) now bypass the cache. This was a latent issue across the entire admin surface — fixing it on the shared client means every subsequent operator surface benefits.

### Smoke
- End-to-end: inserted invitation, hit `/invite/<id>` → status flipped sent → opened with `invitation.opened` audit row, page rendered institutional landing with campaign + promo + tier + sender.
- Blocking states: SQL `UPDATE status='revoked'` → curl returns the "invitation was revoked" cancellation card.
- Invalid uuids: hit `/invite/00000000-...` and `/invite/not-a-uuid` → both render "Invitation not found" shell (regex pre-check catches malformed tokens before the DB roundtrip).
- Typecheck clean. Smoke row cleaned up.

### Out of scope (deferred)
- Billing automation · Stripe self-serve upgrades · referral systems · affiliate systems · lifecycle automation (per the explicit non-feature list).
- The natural-end `expired` cron (Phase 2.D.5b) — for now `expires_at` is enforced server-side at acceptance time, and the landing renders a clean "expired" card. Adding a background sweep that pre-stamps `status='expired'` is a half-day follow-up.
- Operator revoke UI surface — `revokeInvitationAction` is shipped but not yet wired into any drawer / toolbar.

---

## 2026-05-12 — Phase 2.D.4 · Campaigns CRUD + Subscriptions admin + funnel lifecycle joins

The contacts layer becomes a real acquisition + subscription operations system. Operator can run campaigns, attribute every send/conversion/subscription, manually grant tiers (Comped + manual), set expirations, and see the full funnel — `contact → invited → onboarded → active subscriber → expired → inactive` — joined per row.

### Database — migration `0019_campaigns_subscriptions_full`
- `subscription_status` enum extended with `expired` (distinct from `canceled`; canceled = explicit, expired = natural-end past expires_at)
- `campaigns` gains `target_audience` · `notes` · `conversion_target int` · `archived_at` · `created_by_email`. Partial index on archived, index on owner.
- `subscriptions` gains `expires_at` · `notes` · `assigned_by_email` · `source_campaign_id FK → campaigns(id) ON DELETE SET NULL`. Partial indexes on expires + source_campaign_id.
- `subscriptions.stripe_customer_id` dropped NOT NULL — comped/manual assignments don't have a Stripe customer.

### Campaigns CRUD · `/user/admin/campaigns` (promoted from scaffold to Live)
- Server lib `apps/web/src/lib/admin/campaigns/live.ts` (loadCampaigns + loadCampaignKpis + loadCampaignDetail with parallel rollup of invitation buckets + attributed-subs count)
- Mutations `mutations.ts` — `createCampaign · updateCampaign · archiveCampaign · restoreCampaign`. All gated by `requireOperator`, all write `entity_type='campaign'` activity_log rows.
- KPIs: 5 status totems (running/draft/paused/completed/archived) + invitation flow strip (total/sent/converted/conversion rate %) + attributed-subs count
- Filters: status chips · kind chips · archived toggle · sort · debounced search
- Table: name+slug, kind, status badge, owner, active invitations, converted, failed, attributed subs, created
- Form drawer (server component) used in both **Create** (selected=new) and **Edit** (selected=<id>) modes — slug, name, kind, status, owner_email, channel, conversion_target, target_audience, description, notes. Plus Archive/Restore quick action and a last-25 invitations list

### Subscriptions admin · `/user/admin/subscriptions` (promoted from scaffold to Live)
- Server lib `lib/admin/subscriptions/live.ts` (loadSubscriptions joins `users` + `campaigns` · loadSubscriptionKpis with by-tier breakdown · loadAssignableUsers · loadActiveCampaigns)
- Mutations `mutations.ts` — `assignSubscriptionAction · updateSubscriptionAction · expireSubscriptionAction`. All gated, all audit-logged with `entity_type='subscription'`. The expire shortcut sets `status=expired` + `expires_at=now()`.
- KPIs: status totems (active/trialing/past_due/canceled/expired/comped-active) + 7-tier breakdown (Free / Pro / Premium / Top Promote / Comped / Team / Enterprise) + attributed-to-campaign count
- Filters: status chips (incl. expired) · tier chips · attributed-to-campaign toggle · sort
- Table: user (name+email), tier badge, status badge, expires-at, source campaign (click-through to `/user/admin/campaigns`), assigned-by, created
- Form drawer — same split-form pattern as campaigns. Assign mode picks an existing user from `loadAssignableUsers()` · update mode patches tier/status/expires/notes/source_campaign. Stripe-backed rows show an amber warning "edits should flow through the Stripe dashboard".

### Lifecycle layer · `lib/admin/lifecycle.ts`
- Single `deriveLifecycle({ has_linked_user, contact_invitation_status, subscription_status, subscription_expires_at, user_invitation_status })` function returning `{ state, label, tone }`. States: `contact_only · invited · onboarded · active_subscriber · expired · inactive`.
- Subscription state wins: active/trialing → active subscriber; expired/canceled → expired; past_due → active with payment-warn.
- User state second: invitation_status `inactive` or `churn_risk` flips to inactive.
- Falls back to contact invitation status when no linked user.

### Contacts drawer enrichment — `Conversion status` section
- Shows the **lifecycle pill** at the top (replaces the prior single-source stage chip)
- Adds a **subscription card** (lime-tinted) when the linked user has a sub: tier · status · expires · source campaign · assigned by · notes. Click-through to `/user/admin/subscriptions?selected=<id>`.
- Adds a **source campaign row** when the latest invitation has campaign attribution. Click-through to `/user/admin/campaigns?selected=<id>`.
- `loadContactDetail` now joins `subscriptions` (most recent for linked user) + `contact_invitations` (latest with campaign name) in the same parallel fan-out.

### Cross-links between surfaces
- `/user/admin/users` table: linked-contact click-through unchanged (Phase 2.D.1)
- `/user/admin/contacts` drawer: now links to users + subscriptions + campaigns (Phase 2.D.4)
- `/user/admin/subscriptions` table: each row links to source campaign (Phase 2.D.4)
- `/user/admin/campaigns` detail: invitations list + attributed-subs list with timestamps

### Intentional non-features
- No drip campaigns. No automated sequences. No AI-generated outreach. No CRM pipelines. No scoring engines.
- Each operator action is a manual trigger. Audit is the receipt.
- Stripe-backed subscriptions are read-only here — edits flow through the Stripe dashboard so the webhook stays authoritative.

Smoke
- `/user/admin/campaigns` → 200 · KPIs + filters + empty state render
- `/user/admin/campaigns?selected=new` → 200 · "Create campaign" form rendered with all 8 enum kinds
- `/user/admin/subscriptions` → 200 · 7-tier KPI breakdown + status chips render
- `/user/admin/subscriptions?selected=new` → 200 · "Assign subscription" form with user picker
- End-to-end SQL smoke: inserted a campaign, verified list + detail rendering, deleted cleanly
- Contacts drawer `?selected=<id>` → 200 · 472 KB · new "Lifecycle" pill + subscription card render path exercised
- Typecheck clean

---

## 2026-05-12 — Phase 2.D.3 · Bulk operational workflows on contacts · 9 actions · Resend invite send · CSV export

Operator can now act on N contacts at a time. Selection model + sticky toolbar + 9 bulk actions cover the full growth-ops loop (invite · tag · owner · campaign · contacted · inactive · invalid · suppress · CSV export). All actions follow the same shape: gated by `requireOperator()`, soft-delete-aware (`deleted_at IS NULL`), and write one `activity_log` row per affected contact.

### Database — migration `0018_bulk_ops_suppression_archival_and_tiers`
- `user_tier` enum extended with `top_promote` + `comped` (used by `subscriptions.tier` and the bulk-invite tier hint)
- `relationship_contacts.suppressed_outreach boolean default false` (partial-indexed where true · drives "exclude bounced / opt-out" logic in bulk-invite)
- `relationship_contacts.archived_at timestamptz` (partial-indexed when NOT NULL · written by bulk mark-inactive; distinct from `deleted_at`)
- `contact_invitations.default_subscription_tier text` (CHECK constraint over text — tier hint set at invite time, applied when contact accepts)

### Server actions — `lib/admin/contacts/bulk.ts`
9 typed actions, single `resolveSelection()` helper that re-runs the page filter server-side at action time when the operator chose "Select all filtered". Hard cap `MAX_BULK_BATCH = 500` so a runaway filter never explodes into a 5,000-row action.

| Action | Verb | Effect |
|---|---|---|
| `bulkInviteAction` | `contact.bulk_invite_sent` / `_failed` | Resend send loop · 150 ms spacing · per-contact `contact_invitations` row + per-contact activity_log · `last_contacted_at = now()` |
| `bulkAddTagAction` | `contact.bulk_tag_added` | Append to operator `tags` array · idempotent |
| `bulkAssignOwnerAction` | `contact.bulk_owner_assigned` | Sets `relationship_owner_email` · empty clears |
| `bulkAssignCampaignAction` | `contact.bulk_campaign_assigned` | Creates `contact_invitations` rows (status=pending) attaching contacts to a campaign · validates campaign exists |
| `bulkMarkContactedAction` | `contact.bulk_marked_contacted` | Stamps `last_contacted_at = now()` |
| `bulkMarkInactiveAction` | `contact.bulk_marked_inactive` | `bucket=dormant-archive` · `band=dormant` · `archived_at=now()` |
| `bulkMarkInvalidAction` | `contact.bulk_invalid_marked` | Single-action semantics applied to N · optional reason captured |
| `bulkSuppressOutreachAction` | `contact.bulk_outreach_suppressed` | `suppressed_outreach=true` · auto-excluded from future bulk-invite |
| `bulkExportCsvAction` | (no audit · read-only) | Redirects to `/api/admin/contacts/export` which streams a CSV |

### Resend integration — bulk invite
- New template `lib/email/templates/contact-invite.ts` · institutional tone · forest header · lime CTA · campaign / promo / tier surfaced when present
- The `contact_invitations.id` IS the invite token — the future `/invite/<id>` landing route looks it up by uuid
- Excludes: contacts with no email · `suppressed_outreach=true` · `email_validity='invalid'` · `flagged_for_correction=true`
- Each send: insert `contact_invitations` (pending) → call Resend → flip row to `sent`+`resend_message_id` (or `bounced` on failure) → bump `relationship_contacts.contact_invitation_status='invited'` + `last_contacted_at`
- 150 ms spacing between sends keeps us under Resend's 10/s default cap with no exposed knobs

### Selection model — `components/admin/contacts/bulk/`
- `BulkSelectionProvider` · client context · two modes:
  - **explicit** — operator ticked specific rows; `selectedIds: Set<string>`
  - **filtered** — operator hit "Select all filtered"; the server re-applies the current filter at action time. Selection is not stored as IDs (avoids a 4,547-UUID URL).
- `SelectionCheckbox` per row · disabled-checked when filtered-mode is on (visual signal that all rows are selected even when scrolled)
- `SelectAllControls` above the table · "Select page · Select all filtered (~N) · clear"
- `BulkActionToolbar` · sticky bottom · appears only when `count > 0` · each button opens an inline form panel above the bar with the action's specific fields (tag input, owner email, campaign picker, tier dropdown, etc.)

### CSV export — `app/api/admin/contacts/export/route.ts`
- Route handler (server-action can't stream a Response directly)
- Same selection contract as the bulk actions (`sel_mode` + `ids` or `filter_qs`)
- Gated by `requireOperator()`
- 25-column canonical export · RFC 4180 quoting · ISO-8601 dates · `Content-Disposition: attachment; filename="hotelvalora-contacts-<ISO ts>.csv"`
- Hard cap 500 rows · matches `MAX_BULK_BATCH`

### Page wiring
- Contacts page wraps everything in `BulkSelectionProvider`
- New result banner: `?bulk_ok=N&bulk_verb=X&bulk_failed=Y` shows emerald success · `?bulk_error=<msg>` shows rose failure
- Page filter querystring (without `selected/mode/saved/error/bulk_*`) is passed as `filter_qs` to the toolbar so "Select all filtered" preserves the operator's current view

### Discipline (intentional non-features)
- No automation engine, no sequence builder, no AI outbound generation
- No undo (audit trail is the receipt; SEGUNDA OLA adds reversible merge)
- Selection state is in-page only (lost on reload — matches Gmail / Notion / Linear behaviour)
- 500-row hard cap on every bulk action (and CSV export); past that the operator narrows the filter

Smoke
- `/user/admin/contacts` → 200 · checkbox column + Select Page (50) + Select all filtered controls render
- Synthetic banners (`?bulk_ok=12&bulk_verb=invited&bulk_failed=2`) → rendered
- `?bulk_error=...` → rose error banner rendered
- `/api/admin/contacts/export?sel_mode=explicit&ids=` → 200 · `Content-Disposition: attachment` · `Content-Type: text/csv`
- Typecheck clean

---

## 2026-05-12 — Phase 2.D.2 · Contact mutation workflows (PRIMERA OLA) · edit · invalid · tags · owner · status

The contacts surface stops being read-only. PRIMERA OLA covers the five operational growth basics with full audit. SEGUNDA OLA (merge / delete / add manually) and bulk actions remain deferred to 2.D.3.

### Database
- **`0016_contacts_operator_tags_and_softdelete`** — adds `relationship_contacts.tags text[]` (operator-added · GIN-indexed · distinct from Gmail-derived `relationship_labels`) and `deleted_at timestamptz` (soft-delete column · NULL = active · mutation layer already filters by this so SEGUNDA OLA delete is a one-line UPDATE). Partial index `relationship_contacts_active_idx` on `id WHERE deleted_at IS NULL`.
- **`0017_contact_relationship_owner`** — adds `relationship_contacts.relationship_owner_email` so ownership lives on the contact across the full funnel (the prior column was on `users` only — too late in the conversion arc). Indexed.

### Server actions · `apps/web/src/lib/admin/contacts/mutations.ts`
Five typed actions, all gated by `requireOperator()`, all write one row to `public.activity_log` (entity_type=`relationship_contact`, action=`contact.<kind>`, metadata = `{ diff | before/after | reason | tag }`):
- `updateContactAction(id, patch)` — bulk edit of name · email · phone · LinkedIn · title · role · company_name · investor_type · collaboration_potential_score · notes_consolidated. Empty strings normalised to NULL. Diff computed before UPDATE so the audit row only captures changed fields.
- `markContactInvalidAction(id, reason?)` — flips `email_validity=invalid` · `flagged_for_correction=true` · `bucket=DATASITE-CORREGIR` · `relationship_band=invalid`. Optional reason captured in metadata.
- `addContactTagAction(id, tag)` / `removeContactTagAction(id, tag)` — idempotent operator tag management. Tags normalised to lowercase; regex `^[A-Za-z0-9][A-Za-z0-9\-_\s]*$`.
- `assignRelationshipOwnerAction(id, email)` — sets `relationship_owner_email`. Empty string clears.
- `updateRelationshipStatusAction(id, band)` — sets `relationship_band` (active · warm · strategic · cold · dormant · invalid). Note: operator override wins until the next Python ingest cycle.

Form-wrapper actions (`updateContactFromForm`, `markInvalidFromForm`, `addTagFromForm`, `removeTagFromForm`, `assignOwnerFromForm`, `updateStatusFromForm`) accept `FormData`, parse field values, delegate to the typed action, and `redirect()` back to view mode with `?saved=1` or `?error=<msg>`. No client state.

### UX — split drawer · same visual contract
- **View drawer** (`?selected=<id>`) — adds **Edit** button in header (lime pill · links to `?mode=edit`), new **Operator tags** subsection with chip-style add/remove via inline forms, a one-shot **Saved · audit row written** toast when `?saved=1` rides in, and a footer showing `N mutations on record` + the relationship owner email.
- **Edit drawer** (`?selected=<id>&mode=edit`) — new `apps/web/src/components/admin/contacts/contact-detail-drawer-edit.tsx`. Single side panel matching the view drawer visual contract; four form sections:
  1. **Identity** — 9 inline-editable fields + notes textarea + Save changes button
  2. **Relationship status** — band selector
  3. **Relationship owner** — email assignment
  4. **Email health · operator override** — Mark invalid with optional reason
- Tag add/remove lives in the view drawer (no need to enter edit mode to manage tags).
- Cancel link in edit mode goes back to view mode. Save submits the form; the wrapper action redirects back to view mode with `?saved=1` (or `?error=...` on validation failure).

### Audit trail
- Every mutation writes to `public.activity_log` with `entity_type='relationship_contact'`. Action verbs: `contact.updated` · `contact.invalid_marked` · `contact.tag_added` · `contact.tag_removed` · `contact.owner_assigned` · `contact.status_updated`.
- Metadata is jsonb. Diff format: `{"diff":{"full_name":{"from":"X","to":"Y"}}}`.
- `mutation_count` surfaced in the view drawer footer (`activity_log` count for the contact).
- All audit metadata passes through `redactError()` / `redact()` before persistence (no credential leakage even if a value contains a tokenish substring).

### Discipline
- Every mutation filters by `deleted_at IS NULL` so the soft-delete invariant holds from day one.
- Errors returned to the client redirect to `?mode=edit&error=<msg>` — the edit drawer shows a rose-tinted banner.
- Audit write failures log but do not roll back the mutation (the row already changed; ops reconciles via row-level `updated_at` if needed).

### Out of scope (next pushes)
- **2.D.2b** (next sub-push) — merge duplicates · soft-delete action · add contact manually
- **2.D.3** — bulk actions (row selection · select-filtered-set · bulk invite via Resend · bulk promo / tags / export / contacted / inactive / campaign assign)
- **2.D.4** — full Campaigns + Subscriptions UIs

Smoke
- `/user/admin/contacts?selected=<id>` → 200 · 445 KB · Edit button + Operator tags section + footer rendered
- `/user/admin/contacts?selected=<id>&mode=edit` → 200 · 429 KB · all 4 form sections render
- Direct INSERT into `public.activity_log` with `entity_type=relationship_contact` succeeded · DELETE cleanup confirmed (audit shape matches what the mutations layer writes)
- Typecheck clean

---

## 2026-05-12 — Phase 2.D.1 · Operational growth funnel · Users console + activation/monetization scaffolds + product realignment

**Strategic realignment (user-driven on 2026-05-12).** The contacts base is HOTELVALORA's **growth engine**, NOT a CRM, NOT a relationship-intelligence OS. The previous Phase 2.C framing drifted toward enterprise relationship intelligence; the system thesis is now explicit:

`contact → invited → onboarded user → active subscriber → premium/top-promote client`

Four operational admin surfaces, each with a specific role:
- `/user/admin/contacts` — commercial universe / pipeline
- `/user/admin/users` — real platform users (NEW · live)
- `/user/admin/campaigns` — activation: contacts → users (NEW · scaffold)
- `/user/admin/subscriptions` — monetization / plans (NEW · scaffold)

### Database — migration `0015_users_growth_layer`
- `public.users` extended: `full_name` · `last_seen_at` · `invitation_status` (CHECK: invited/onboarding/active/inactive/churn_risk) · `promo_code` · `relationship_owner_email` · `linked_contact_id` FK → `relationship_contacts`
- `public.relationship_contacts` extended: `linked_user_id` FK → `users` (bidirectional) · `contact_invitation_status` (CHECK: not_invited/invited/onboarding/converted/declined/bounced) · `last_contacted_at`
- New table `public.campaigns` — slug · name · kind (CHECK: investor_outreach/operator_onboarding/beta_invite/top_promote_rollout/lender_campaign/newsletter/partnership/custom) · status · owner_email · channel
- New table `public.contact_invitations` — per-contact activation event log (1 row per outbound send) · contact_id FK · campaign_id FK · status (pending/sent/delivered/opened/clicked/bounced/accepted/declined/converted) · resend_message_id
- All new tables RLS-enabled · zero policies · anon + authenticated revoked
- Supabase TS types regenerated

### `/user/admin/users` (Live)
- Server lib `apps/web/src/lib/admin/users/live.ts` · joins users + organizations + relationship_contacts (via `linked_contact_id`) + latest subscription per user (sorted client-side by created_at desc)
- 11 KPI totems: Active · Invited · Onboarding · Inactive · Churn risk · Linked from contacts (top row); Free · Pro · Premium · Team/Enterprise · Active subs (bottom row)
- 11-column table: User (name + email) · Company / Org · Role · **Linked contact** (with click-through to `/user/admin/contacts?selected=<id>`) · Status badge · Tier badge · Subscription · Promo · Last seen · Created · Owner
- URL-driven filters: status chips · plan chips · "Linked from contacts only" toggle · sort (Recent / Last seen / A-Z / Tier) · debounced search

### `/user/admin/campaigns` (Scaffold)
- Foundation page reads live counts: `campaigns` rows · pending `contact_invitations` · in-flight (sent/delivered/opened)
- 7 planned kinds enumerated as visible scaffold: investor_outreach · operator_onboarding · beta_invite · top_promote_rollout · lender_campaign · partnership · newsletter
- Full CRUD + Resend execution land in Phase 2.D.4

### `/user/admin/subscriptions` (Scaffold)
- Foundation page reads live counts from `public.subscriptions`: total · active · trialing · past_due · canceled
- 5 tier rows from `user_tier` enum (free / pro / premium / team / enterprise) · Comped/Expired/Top Promote/Trial/Internal noted as Phase 2.D.4 workflow surface

### Contacts drawer realigned (`?selected=<id>`)
- Added "Conversion status" section: stage chip (Active user / Onboarding / Invited / Inactive / Churn risk / Not invited / Bounced / Declined / Converted) · linked-user card (when `linked_user_id` set) with click-through to `/user/admin/users` · contact-invite state + invitation history count
- "Suggested next action" rewritten with **growth verbs**: Mark invalid · Re-activate · Win-back · Re-send invite · Personal invite · Add to beta-invite campaign · Invite to platform / assign promo · Add to outreach campaign · Park (declined/dormant) — not the previous "warm intro / maintain cadence / strategic counterparty" verbs
- Tags renamed `Strategic tags` → `Growth tags`: converted · invite-pending · invite-bounced · onboarded · priority · warm · qualified-lead · live-deal · declined-history · email-fragile · hospitality-mandate
- Read-only stays in place; mutation/bulk surfaces land in 2.D.2-2.D.3

### Sidebar
- New `Users · Live`, `Campaigns · Scaffold`, `Subscriptions · Scaffold` entries
- Order tuned to reflect the conversion arc: Overview → Contacts → Users → Campaigns → Subscriptions → AI Operations → Integrations

### Out-of-scope (deferred)
- **Phase 2.D.2** · contact mutation workflows (edit / add / delete / merge / mark invalid / update tags / company / owner / status) — all via server actions with audit trail
- **Phase 2.D.3** · bulk actions (row selection · select-filtered-set · bulk invite via Resend · bulk promo / tags / export / contacted / inactive / campaign assign)
- **Phase 2.D.4** · full Campaigns + Subscriptions UIs (CRUD · execution · conversion tracking · grant Comped · mark Expired · refunds · per-org billing)

Out-of-scope by design (the product redirect): Salesforce-style CRM · complex automation workflows · AI outbound orchestration · email sequencing engines · graph visualisation. Outbound = Resend + lightweight campaigns only.

Smoke: all 4 routes return 200 · KPIs populate from live Supabase counts · drawer carries the Conversion status section with growth verbs.

---

## 2026-05-12 — Phase 2.C.1 · Operator Console security gate + relationship intelligence drawer

Two-part follow-up to Phase 2.C. Closes the long-standing operator-allow-list gap and turns the institutional table into a true relationship intelligence console.

### Security · central operator guard
- New `apps/web/src/lib/security/operator-guard.ts` is the single source of truth for "is the caller an authorised operator?"
- **Fail-closed semantics** (the gap this module exists to close):
  - `AUTH_ENABLED !== "true"` → permissive (dev / showcase mode, preserves local DX)
  - `AUTH_ENABLED === "true"` + no Supabase session → throws `OperatorDenied("no_session")` → layout redirects to `/login?next=/user/admin`
  - `AUTH_ENABLED === "true"` + signed-in user with email NOT on the list → opaque 404 (`notFound()`) so the operator console doesn't leak its existence to drive-by traffic
  - `AUTH_ENABLED === "true"` + **both `ADMIN_OPERATOR_EMAILS` and `INTERNAL_ALERT_RECIPIENTS` empty** → all callers denied. The prior `assertAdminContext` was fail-open in this case; this was the documented security gap.
- `apps/web/src/app/user/admin/layout.tsx` now calls `requireOperator()` at the RSC layer — every `/user/admin/*` page inherits the gate. Server actions (`provisionCredentialsAction`, `invalidateCredentialsAction`) also call the same helper as a second-line check.
- Smoke: `AUTH_ENABLED` unset → 200 (permissive). `AUTH_ENABLED=true` + empty allow-list → 307 to `/login` (middleware caught it before the layout).
- Vercel env activation is the operator's responsibility — `echo "miguel.sambricio@metcub.com" | vercel env add ADMIN_OPERATOR_EMAILS production` + `echo "true" | vercel env add AUTH_ENABLED production`. The runbook is in `docs/auth.md` § Activation runbook with explicit "always flip both in the same redeploy" caveat.

### Drawer · institutional relationship intelligence
- `?selected=<contact_id>` searchParam opens a server-rendered side panel on the contacts page. Filter state is preserved on row click (`baseSearchParams` is forwarded). Close = link back without `selected`.
- New `loadContactDetail(contactId)` in the live lib · fans out 5 parallel queries (company FK · interactions FK · labels · health · peer contacts in the same company) · composes a single chronological event timeline by joining `last_email_date`, `last_bounce_date`, all 15 Datasite stage dates, and per-label `created_at`.
- 4-section drawer (`apps/web/src/components/admin/contacts/contact-detail-drawer.tsx`):
  - **Header**: name + title + role + company + geography + email/phone/LinkedIn + 6 stats (strength · collab · band · email health · directionality · active threads)
  - **Institutional context**: investor classification + subtype + tier + industry + hotel focus + fund size + ticket range + HQ + description + activity density badge (high/moderate/low/no events)
  - **Strategic** (read-only): deterministic next-action suggestion · warm-intro potential (peer count) · inferred relationship stage · declined comments · consolidated relationship notes · derived strategic tags (institutional-priority · bidirectional · collab-priority · live-process · declined-history · email-fragile · hospitality-mandate)
  - **Timeline**: chronological event list with source-tinted dot (Datasite emerald · Gmail amber · labels lime). Includes last touch · bounces · label attachments · NDA/IOI/LOI dates · declined event · revised bids
  - **Peers**: up to 8 other contacts at the same firm, sorted by collab score
- Read-only by design — no merge / promote / correct-invalid surfaces yet. Mutations stay in the Python ingester so provenance stays auditable.

Smoke: `curl /user/admin/contacts?selected=<id>` → HTTP 200 · 434 KB · all 4 sections visible · 6 timeline events composed from Gmail + Datasite signals.

---

## 2026-05-12 — Phase 2.C · Institutional Relationship Console live · Supabase-backed `/user/admin/contacts`

The canonical Master is promoted from the local XLSM file into Supabase and the first operator-grade UI lands. The relationship graph is now queryable from the admin shell with band / investor-type / quality / recency filters, URL-driven and server-paginated.

### Database — migration `0014_relationship_contacts`
Five tables wired with FKs, indexes, RLS-enabled-zero-policy posture, and anon + authenticated revoked:
- `relationship_companies` (unique `company_key` · indexed on country / continent)
- `relationship_contacts` (FK → companies · unique `master_id` · generated `email_lower` for case-insensitive search · indexed on band / bucket / investor_type / collab score / company_id)
- `relationship_interactions` (FK → companies · one row per company timeline)
- `relationship_labels` (FK → contacts · unique on `(contact_id, label)`)
- `relationship_health` (FK → contacts · unique on `contact_id`)

### Ingester — `scripts/contactos/promote_to_supabase.py`
Stdlib `urllib` PostgREST client with service-role bearer · `upsert` with `on_conflict` + `Prefer: resolution=merge-duplicates` · paginated `fetch_all()` (Range header) for FK lookups. Idempotent and re-runnable. Final ingest: **2,990 companies · 4,547 contacts · 2,990 interactions · 143 labels · 34 health rows**. First run was missing 99 labels and 30 health rows due to PostgREST's 1,000-row cap on FK-resolution GET — fixed by switching to range-paginated fetches before the second pass.

### Server lib — `apps/web/src/lib/admin/contacts/live.ts`
`loadContacts(filter)` · `loadContactKpis()` (15 parallel count queries · no waterfall) · `loadInvestorTypes()`. Joins `relationship_labels` for the visible page only. Default filter is quality-first: `bucket = 'active'` AND `hide_invalid` AND no-Gmail-activity dormant rows hidden.

### UI — `/user/admin/contacts`
- 14 KPI totems on top (Active · Strategic · Warm · Cold+signal · Dormant · Invalid/flagged · Recently active 90d · Investors · Operators · Lenders · Brokers · Family Office · REIT/SOCIMI · Bidirectional)
- 10-column table: Contact (name + title + email + LinkedIn) · Company (with geography) · Type (with hospitality badge) · Band · Strength · Collab · Last email (with directionality) · Gmail labels · Email health · Strategic signal
- URL-driven filter state — band chips · institutional type chips · "Show invalid" + "Recently active · 90d" toggles · sort (Collab / Strength / Recent / A-Z) · debounced search
- Server-side pagination (50/page) via PostgREST `Range`
- Visual language matches AI Operations / Integrations / Intelligence Feed (dark forest-900 → slate-950 gradient cards, lime-300 accents, tracked-out uppercase micro-labels)
- Admin sidebar gets a new `Contacts · Live` entry under Integrations

### Supporting work
- Supabase TS types regenerated from the live schema — `apps/web/src/lib/supabase/types.ts` now includes the 5 new tables (the MCP wrapped the response in a JSON envelope; an unwrap step was added to the ad-hoc copy script)
- `apps/web/src/components/admin/contacts/{contacts-kpis,contacts-filters,contacts-table}.tsx` are the three composable primitives

### Out-of-scope (deferred)
Realtime Supabase channel · auto Gmail crawling · embeddings · graph visualizer · AI orchestration on contacts. UI is read-only — mutations (merge / promote unmatched / correct invalid) still flow through the Python ingester so provenance stays auditable.

Smoke: `curl /user/admin/contacts` → HTTP 200 · 370 KB · KPIs render with live Supabase counts (4,547 total · 1,902 investors visible in payload).

---

## 2026-05-12 — Phase 2.B.2 · Relationship quality intelligence · bounce detection · institutional bands

New quality layer on top of the Gmail signal merger. Master schema gains 7 new fields. Invalid emails get auto-segregated from the active relationship graph. Categorical relationship bands replace pure numeric strength for operator-facing reasoning.

### New MASTER_SCHEMA fields (appended · never reordered)
- `relationship_band` · `cold | warm | active | strategic | dormant | invalid` (derived)
- `collaboration_potential_score` · 0–100 deterministic · institutional fit for HotelVALORA collaboration · distinct from relationship_strength (engagement intensity) · this score weights strategic fit + deal-flow value + capital relevance
- `email_validity` · `valid | uncertain | invalid` · derived from bounce signals
- `bounce_count` · number of delivery failures observed in Gmail
- `last_bounce_date` · most recent bounce date · ISO
- `flagged_for_correction` · `"yes"` or `""` · routes to DATASITE-CORREGIR bucket
- `bucket` · `active | DATASITE-CORREGIR | dormant-archive` · operator routing

### Bounce detection · `extract_gmail_signals.py`
Per thread, walk messages in order. When a bounce-pattern message appears (MAILER-DAEMON / postmaster / Undeliverable / Delivery Status Notification / "no se ha entregado" / "no se ha encontrado" / "550 5.x.x" / "couldn't be delivered" / etc.), attribute the bounce to:
1. The recipients of the prior outbound message in the same thread
2. PLUS any email addresses extracted from the bounce snippet (regex over the snippet text)

Per-email aggregation now tracks: `bounce_count`, `last_bounce_date`, `bounce_reasons` (up to 5 forensic snippet samples).

20+ snippet patterns covered in Spanish + English + French + German · including soft signals like "X ya no trabaja en la compañía", "account is no longer in use", "no longer working for".

### Email validity rules · `ingest_gmail.py`
- **INVALID**: `bounce_count >= 2` OR (`bounce_count >= 1` AND `inbound_count == 0`) · No human ever replied AND postmaster rejected → clearly dead address
- **UNCERTAIN**: `bounce_count == 0` AND `inbound_count == 0` · We send, they don't reply, could be valid-but-unresponsive or silently dead
- **VALID**: any inbound · real human response observed

When `validity == "invalid"`:
- `flagged_for_correction = "yes"`
- `relationship_status = "invalid_email"` (overrides Datasite's value)
- `bucket = "DATASITE-CORREGIR"`
- `relationship_band = "invalid"`
- `collaboration_potential_score = 0` (clamped)
→ excluded from active graph

### Relationship band derivation (categorical · operator-facing)
- **strategic** · strength >= 70 AND (LOI/MoU label OR Datasite deal stage in LOI/IOI/Bid/Investment Meeting)
- **active** · bidirectional + (Gmail < 1 yr OR Datasite Active pipeline < 2 yrs) + strength >= 40 · OR · strength >= 60 with active deal stage
- **warm** · bidirectional + Gmail < 2 yrs · OR · inbound > 0 + (< 1.5 yr OR Datasite active) · OR · strength >= 35 + has deal stage
- **cold** · low engagement default
- **dormant** · explicit rejection label · OR · Gmail > 3 yrs AND no Datasite active state
- **invalid** · email bounced

Datasite pipeline state is the source of truth for "active deal" — Gmail age alone doesn't dormant a contact that's currently in a live LOI.

### Collaboration potential score (0–100 · institutional fit)
Distinct dimension from engagement intensity. Weights:
- Real bidirectional engagement (volume + back-and-forth) · up to +30
- Positive Gmail labels (INTERESADO / SEGUIMIENTO) · up to +35
- Active LOI/MoU label · +25
- Datasite deal stage (LOI/IOI/Bid) · +20 · Investment Meeting +15 · NDA +10
- Pipeline = Declined · -25
- Investor type ∈ canonical institutional bucket · +15
- Hospitality focus (Yes/Likely) · +10/+5
- Rejection labels · -30
- Validity = invalid · 0 (forced clamp)
- Strength carryover · +0.15× (low weight · keeps scales decoupled)

### New script · `scripts/contactos/build_health_report.py`
Outputs:
1. **`CONTACTOS DATASITE/google-contacts/relationship-health-report.md`** · 11-section institutional analysis:
   - Health totals (enriched / unenriched / flagged / bounce rate)
   - Email validity breakdown (Master)
   - Relationship band distribution + meaning
   - Top institutional collaboration potential (top 25 by score)
   - Bounce rate detail
   - Strongest counterparties (active + strategic companies)
   - Most responsive institutions (highest inbound reply volume)
   - Hottest relationship clusters (2+ active/strategic contacts)
   - Contacts needing correction (sample · 25)
   - Dead domains (≥ 50% bounce rate · ≥ 2 contacts)
   - Operator next steps

2. **`CONTACTOS DATASITE/reports/contacts-needing-correction_<batch_id>.csv`** · per-row:
   - `current_email` · `full_name_known` · `inferred_correct_company`
   - `in_master` (yes/no flag · distinguishes correction vs avoidance)
   - `reason_flagged` (truncated bounce snippet · forensic)
   - `bounce_count` · `last_failed_interaction`
   - `suggested_replacement` · auto-inferred when a non-bounced email at the same domain with matching surname exists in Master or Gmail signals
   - `source_labels` (all Gmail labels)

### First validation run
Re-ran existing 4-label Gmail snapshot through the new code:

- **Master:** 4,547 contacts (unchanged · no auto-merge)
- **Gmail signals analysed:** 235 unique emails
- **Bounce signals detected:** 62 emails (**26% bounce rate** · institutional cleanup opportunity)
- **Of those, in Master:** 34 (need correction)
- **Of those, NOT in Master:** 28 (junk-insert avoided)
- **Suggested replacements auto-inferred:** Zhongyuan Li @ anbang-international.com → natalia.patton@anbang-international.com (and others)

**Band distribution post-Phase-2.B.2:**
- strategic: 0 (no LOI/MoU labels processed yet · expanding next)
- active: 7
- warm: 11
- cold: 60
- dormant: 60

**Collaboration potential score:** 138 rows with score > 0 · avg 54.7 · max 95

### Privacy preserved
- All new outputs gitignored
- README.md remains the only safe artifact under CONTACTOS DATASITE/
- Bounce snippets stay local · zero PII in git

### Files added (committed · NO data)
- `scripts/contactos/build_health_report.py` (~370 LOC · stdlib + openpyxl)

### Files modified
- `scripts/contactos/ingest.py` · MASTER_SCHEMA + 7 new fields · build_master_row defaults
- `scripts/contactos/extract_gmail_signals.py` · BOUNCE_SENDER_PATTERNS · BOUNCE_SUBJECT_PATTERNS · BOUNCE_SNIPPET_PATTERNS · `is_bounce_message` · prior-outbound-attribution loop · bounce stats in JSONL output
- `scripts/contactos/ingest_gmail.py` · `compute_email_validity` · `derive_relationship_band` · `compute_collaboration_score` · field population in apply_signals_to_master

### Held until next round
- **Gmail extraction expansion** · 23 remaining institutional labels (LOIs · MoUs · CADENA HOTEL SEGUIENTO · INTERMEDIARIO · PROPIETARIO · PROMOTOR / CONSTRUCTOR · Q&A INVERSORES · RONDA INVERSORES · etc.) · once those land, expect "strategic" band to populate
- **Phase 2.B.3** · `apply_gmail_unmatched.py` · operator-side review + selective INSERT
- **Phase 2.C** · Supabase + UI · explicitly held until institutional graph stabilizes

---

## 2026-05-12 — Phase 2.B.1 · Gmail signal expansion + institutional relationship graph report

Shipped as commit `19ae16b`. Expansion of the Gmail signal layer to 4 institutional labels · 235 unique remote emails aggregated · 138 matched to Datasite Master (was 68 in v0) · 97 reviewable unmatched candidates surfaced. **Master not auto-mutated** · all 97 candidates land in a reviewable CSV with rich enrichment per operator directive.

### New script · `scripts/contactos/build_relationship_report.py`
Reads:
- the canonical Master (xlsx)
- ALL Gmail signal JSONL files under `incoming/gmail-signals/` AND `old/gmail-signals/`

Produces:
1. **`CONTACTOS DATASITE/reports/unmatched-candidates_<batch_id>.csv`** · per-email row with 16 institutional enrichment fields:
   - `confidence_score` (0–100 deterministic · volume + directionality + label specificity + recency + domain kind)
   - `inferred_company` (from email domain · title-cased)
   - `inferred_investor_type` (canonical · Lender / Investor / Hotel Chain / Developer / Broker / Owner / F&B Operator / Branded Residences / Partner / Active LOI Counterparty / Unknown)
   - `source_labels` · all Gmail labels touching this email · semicolon-joined
   - `thread_count` · `first_email_date` · `last_email_date`
   - `inbound_count` · `outbound_count` · `directionality` · `inbound_outbound_ratio`
   - `email_domain` · `domain_kind` (institutional/personal)
   - **Provenance:** `pipeline_creator` · `snapshot_batch_id` (timestamp of the run)
2. **`CONTACTOS DATASITE/google-contacts/relationship-graph-summary.md`** · 10-section institutional analysis:
   - Totals (canonical Master + enriched + unenriched + matched/unmatched + match rate)
   - Strongest relationship clusters (companies with multi-person coverage in both layers)
   - Top institutional counterparties (Master rows by relationship_strength)
   - Most active Gmail labels
   - Investor type distribution (matched vs unmatched per type)
   - Warm network density (institutional vs personal emails, bidirectional share)
   - Top companies by Gmail signal volume
   - Potential hidden duplicates (same domain + same surname in Master)
   - Contacts with no Datasite overlap (top 25 unmatched by confidence)
   - Operator next steps

### Gmail labels covered in this run (4 of ~25)
- `INVERSOR-INTERESADO` · 50 threads · 277 signal touches
- `FINANCIADORES-INTERESADOS` · 50 threads · 279 signal touches
- `FINANCIADORES-SEGUIMIENTO` · 50 threads · 82 signal touches
- `CADENA-HOTEL-INTERESADA` · 50 threads · 260 signal touches

Total · 200 threads parsed · 898 raw signal touches · 235 unique remote emails after dedupe.

### Production baseline (Master snapshot after Phase 2.B.1 merge)
- Master: 4,547 contacts (unchanged · no auto-merge)
- Enriched with Gmail signal: **138** (up from 68 · +103% with 2× more labels)
- Master with no Gmail signal: 4,409 (the cold-storage opportunity)
- Match rate (Gmail signals → Master): **58.7%**

### Top relationship clusters surfaced (companies with multi-person coverage)
| Company | Gmail contacts | In Master |
|---|---|---|
| Bankinter | 9 | 7 |
| Bancsabadell | 8 | 3 |
| Lonestareurope | 5 | 5 |
| Fernandezmolina | 5 | 2 |
| Bancamarch | 4 | 4 |
| Caixabank | 3 | 3 |
| Edmarquitectura | 3 | 3 |
| Reigcapital | 3 | 3 |
| Waltonst | 3 | 2 |
| Meninhospitality | 3 | 2 |

These are the live institutional relationships where the operator has multi-person network coverage AND active Gmail engagement · highest-leverage outreach targets.

### Why no auto-merge of the 97 candidates
Per operator directive: "NO insertar automáticamente unmatched en Master. Quiero reviewable candidates primero." Every unmatched email lands in `unmatched-candidates_<batch_id>.csv` with full enrichment for manual decision. Phase 2.B.2's `apply_gmail_unmatched.py` will later let the operator approve specific rows.

### Provenance preserved end-to-end
- Each Gmail signal record carries `snapshot_source` (which JSONL it came from)
- Each Master row enriched via Gmail carries `gmail_signal_source`
- Each unmatched candidate carries `pipeline_creator` + `snapshot_batch_id` + `email_domain`
- All raw MCP exports remain in `google-contacts/gmail-raw/<LABEL>.json` for replay
- JSONL signals archive to `old/gmail-signals/<structured-name>.jsonl` after processing

### Files added (committed · NO data)
- `scripts/contactos/build_relationship_report.py` (~480 LOC · stdlib only · reads Master + all Gmail JSONL · produces CSV + Markdown)

### Files modified (none functional · this run is data + report only)

### Operator next priorities (per directive · deferred)
- Expand Gmail extraction to remaining ~21 institutional labels (RONDA INVERSORES · Q&A INVERSORES · PROMOTOR/CONSTRUCTOR · INTERMEDIARIO · PROPIETARIO · CADENA HOTEL SEGUIENTO · F&B · BRANDED RESIDENCES · LOI-* · MoU-* · etc.) — Master is currently ~38% covered by Gmail
- Phase 2.B.2 · `apply_gmail_unmatched.py` · operator-side review + selective INSERT of high-confidence candidates
- Re-engage the 4,409 Master contacts with no Gmail signal · cold-storage outreach opportunity
- Stabilize the institutional graph before opening Phase 2.C (Supabase / UI)

---

## 2026-05-12 — Phase 2.B · Institutional relationship graph · 3 ingestion lanes + Gmail signal intelligence

Shipped as commit `25ccfb3`. The CONTACTOS pipeline becomes the canonical institutional relationship graph for HotelVALORA. Three lanes feed ONE Master:

1. **Datasite Outreach** · Full Report .xlsm → canonical Master rows
2. **Google Contacts** · CSV → auto-merge into Master (was read-only · now writes via the same dedup engine with strict Datasite-authoritative gap-fill)
3. **Gmail relationship signals** · JSONL snapshots → populate 6 new Master fields (deal stage · relationship strength · engagement history)

Single entry point `scripts/contactos/pipeline.py` dispatches all three to the right handler · auto-archives processed files to `old/` with structured names: `<source-type>-<original-stem>-<batch_id>.<ext>`.

### Master schema extended (6 new institutional fields)
- `relationship_strength` · 0–100 deterministic score · derived from email recency + thread volume + Gmail label depth + Datasite pipeline alignment
- `last_email_date` · most recent inbound/outbound thread
- `active_threads` · rolling 12-month Gmail thread count
- `gmail_labels` · semicolon-joined list of institutional Gmail labels touching this email
- `inferred_relationship_stage` · canonical · derived from Gmail labels + Datasite pipeline (Active LOI · Investor · Interested · Lender · Follow-up · etc.)
- `email_directionality` · inbound | outbound | bidirectional | none
- (plus `gmail_signal_source` · provenance of the snapshot that populated these fields)

These fields are appended to MASTER_SCHEMA (never reordered) · existing position-binding consumers untouched.

### `pipeline.py` · unified orchestrator
Walks `incoming/` + `incoming/google-contacts/` + `incoming/gmail-signals/`. Detects file type by subfolder. Dispatches to:
- `ingest.py` (Datasite .xlsm/.xlsx)
- `ingest_google.py` (Google Contacts .csv)
- `ingest_gmail.py` (Gmail signal .jsonl)

Each handler runs in its own subprocess so a failure in one lane doesn't poison the others · Master is the canonical shared state on disk between runs.

Structured renames on archive: original `mis_contactos.csv` becomes `google-contacts-mis_contactos-20260512T183325Z.csv` in `old/google-contacts/`. Operator sees clean source-type · timestamp prefix · everything traceable.

### `ingest_google.py` · upgraded from read-only to auto-merge
Previously the Google handler produced only an enrichment workbook + reports · operator had to cherry-pick. Now it ALSO writes back to Master:
- For each `recommended_action=MERGE` row: gap-fill merge (only fills fields where Master is empty · Datasite-authoritative fields like `investor_type`, `pipeline_state`, `latest_deal_stage`, all bid columns NEVER overwritten · notes concatenated)
- For each `recommended_action=INSERT` row: append a new canonical Master row built from the Google normalized record
- Audit trail: per-batch `google-applied-to-master_<batch>.csv` lists every row touched + fields changed
- `REVIEW` and `NO_OP` rows still surface in the enrichment workbook for operator decision · they do NOT auto-merge

`DATASITE_AUTHORITATIVE_FIELDS` set: investor_type · investor_subtype · tier · industry · fund_size · investment_preference · investment_min/max · association · continent · all deal-state fields · all bid columns · relationship_manager · coverage_officer · datasite_* IDs · client_* IDs. Google can only ADD information to empty cells in these.

### `ingest_gmail.py` · new · Gmail signal merger
Reads JSONL snapshots from `incoming/gmail-signals/`. Each line is one institutional email's aggregated signal:
```json
{
  "email": "investor@firm.com",
  "labels": ["INVERSOR INTERESADO", "FINANCIADORES SEGUIMIENTO"],
  "thread_count": 7,
  "last_email_date": "2026-04-22",
  "first_email_date": "2024-08-15",
  "directionality": "bidirectional",
  "inbound_count": 3,
  "outbound_count": 4
}
```

Joins by email to Master rows. Populates the 6 new Gmail fields. Unmatched signals (no Master row for that email) are logged to `gmail-unmatched-emails_<batch>.csv` for operator review · NOT auto-inserted (personal relationships don't get auto-promoted to the institutional graph).

Built-in canonical stage taxonomy (`STAGE_PRECEDENCE`):
- Active LOI (any `LOI - X` label) ← highest precedence · live deals
- Active MoU
- Investor · Interested / Follow-up / Contacted
- Lender · Interested / Follow-up / Contacted
- Hotel Chain · Interested / Follow-up / Contacted
- Developer · Interested / Follow-up
- Broker · Follow-up / Contacted
- Hotel Owner · Contacted
- F&B Operator · Engaged
- Branded Residences · Engaged
- Investor Q&A · Active
- Investor Round · Active
- Declined ← labels containing RECHAZADO or NO INTERESADO

`compute_relationship_strength(...)` · deterministic 0–100 score:
- Recency boost: +30 if <30 days · +20 <90d · +10 <180d · +5 <365d
- Volume: +min(threads, 10) × 3 (up to +30)
- Directionality: +10 bidirectional · +5 outbound · +2 inbound
- Label depth: +30 for INTERESADO · +20 for SEGUIMIENTO · +25 for LOI/MoU · -20 for RECHAZADO/NO INTERESADO
- Datasite alignment: +15 when pipeline_state includes LOI/Bid/Investment Meeting · -10 when Declined
- Clamped to [0, 100]

### `extract_gmail_signals.py` · new · MCP-driven Gmail extraction
Helper that converts MCP-saved `mcp__claude_ai_Gmail__search_threads` raw JSON dumps into the canonical signal JSONL. Workflow:

1. Claude (this session) calls search_threads for each institutional Gmail label
2. Oversized responses get auto-saved by the MCP runtime to `.claude/projects/.../tool-results/`
3. Operator (or Claude) `cp`'s each saved file to `CONTACTOS DATASITE/google-contacts/gmail-raw/<LABEL-NAME>.json`
4. `extract_gmail_signals.py` walks `gmail-raw/`, parses all participants, filters noise (mailer-daemon · postmaster · service@datasite.com · auto-responders), excludes self (`miguel.sambricio@*` + `info@metcub.com` + `expansion@build3rent.com`), aggregates per-remote-email, emits the JSONL into `incoming/gmail-signals/`

Filters: `SELF_EMAILS` set (configurable) · `NOISE_PATTERNS` regex list (mailer-daemon · postmaster · cloud-security · invitations.mailinblack · datasite service · bounce · noreply · notifications · donotreply).

### First production run · validation
- Master loaded: 4,547 canonical contacts (from Phase 2.10)
- Gmail extraction · 2 institutional labels processed (INVERSOR-INTERESADO + FINANCIADORES-INTERESADOS) · 100 threads · 556 raw signals → 118 unique remote emails
- Pipeline merge: **68 of 118 matched to Master** (institutional contacts already in the graph) · 50 unmatched (personal or new institutional)
- Master enrichment verified · top-strength relationships now showing:

| Score | Name | Company | Labels | Threads | Stage |
|---|---|---|---|---|---|
| 67 | Sergio Prieto | BANC SABADELL | FINANCIADORES-INTERESADOS | 4 | Lender · Contacted |
| 64 | José Fernández Canete | FERNÁNDEZ MOLINA | DOUBLE-label (Lender + Investor) | 8 | Lender · Contacted |
| 58 | MaríaPia Intini | CITIZENM HOTELS | INVERSOR-INTERESADO | 1 | Investor · Contacted |
| 52 | Luis Pedro Rodriguez | Caixabank | FINANCIADORES-INTERESADOS | 4 | Lender · Contacted |
| 49 | Rafael Ferragut · Hector Noel · Hugo Martinez · Juan Vazquez Perala | Banca March + Bankinter | FINANCIADORES-INTERESADOS | 3 each | Lender · Contacted |

Double-label match (José Fernández Canete) = same contact appears in BOTH lender and investor labels = straddles both networks = highest institutional signal density.

### Structured archival validated
- `incoming/gmail-signals/gmail-signals-20260512T183325Z.jsonl` → `old/gmail-signals/gmail-signals-gmail_signals_20260512T183325Z-20260512T183332Z.jsonl`
- Source-type prefix · slugified original stem · batch_id timestamp · all traceable

### Privacy
- All new folders gitignored: `incoming/google-contacts/` · `incoming/gmail-signals/` · `old/google-contacts/` · `old/gmail-signals/` · `google-contacts/raw/normalized/enriched/gmail-raw/` · all reports
- New JSONL signal files never enter git
- README.md remains the only safe artifact under `CONTACTOS DATASITE/`

### Files added (committed · NO data)
- `scripts/contactos/pipeline.py` · unified orchestrator
- `scripts/contactos/ingest_gmail.py` · Gmail signal merger
- `scripts/contactos/extract_gmail_signals.py` · MCP-driven raw → JSONL extractor

### Files modified
- `scripts/contactos/ingest.py` · MASTER_SCHEMA extended with 6 new Gmail fields · build_master_row defaults them
- `scripts/contactos/ingest_google.py` · auto-merge into Master (`apply_google_to_master` + `merge_google_into_master_row` + `build_master_row_from_google`) · Datasite-authoritative field protection
- `CONTACTOS DATASITE/README.md` · Phase 2.B section · operator workflow for all 3 lanes
- `docs/integrations/datasite-contacts.md` · Phase 2.B architecture · 3-lane data flow · Gmail signal extraction protocol · canonical relationship_strength formula

### Future expansions (deferred)
- More Gmail labels in the next extraction (only 2 of ~25 institutional labels processed in this first run · adding the remaining 23 will roughly 10× the signal coverage)
- Phase 2.B.2 · `apply_gmail_unmatched.py` · operator-side tool to review the unmatched 50 emails and decide which to INSERT into Master as new institutional contacts
- Phase 2.B.3 · scheduled Gmail extraction via OAuth-based Python client (currently MCP-driven, runs in Claude session)
- Phase 2.C · push the Master to Supabase as queryable `relationship_contacts` table

---

## 2026-05-12 — Phase 2.A · Google Contacts enrichment pipeline (read-only join with Datasite Master)

Shipped as commit `47bdf1c`. Second relationship-intelligence ingestion lane · cross-references the operator's Google Contacts (personal/professional address book) against the canonical Datasite Master. **By design, does NOT mutate the Master** — every output lands in a separate workspace and the operator approves what to promote.

### Folder additions (`CONTACTOS DATASITE/`)
```
incoming/google-contacts/          ← drop Google CSV exports here
old/google-contacts/               ← processed CSVs archived (with batch_id suffix)
google-contacts/
├── raw/                           ← GoogleContacts_Raw · verbatim CSV per batch
├── normalized/                    ← GoogleContacts_Normalized · canonical shape per batch
├── enriched/                      ← Relationship_Enriched · 5-sheet xlsx per batch
└── relationship-enrichment-report.md   ← single canonical analysis (latest only)
```

All four subtrees gitignored. README.md is still the only thing committable under `CONTACTOS DATASITE/`.

### Ingester · `scripts/contactos/ingest_google.py`
Separate from `ingest.py` (different concerns, different write surface). ~700 LOC · stdlib + openpyxl. Per-file lifecycle:

1. **Parse Google CSV** · tolerant of multi-value columns (`E-mail 1 - Value` / `Phone 1 - Value` / `Website 1 - Value` patterns) AND newer single-column variants (`E-mail` / `Phones` semicolon-joined). UTF-8 BOM handled via `utf-8-sig`.
2. **Build GoogleContacts_Raw** · verbatim CSV row preserved with provenance fields `__source_file__` + `__batch_id__` prepended.
3. **Build GoogleContacts_Normalized** · canonical-shape rows:
   - `primary_email` + `secondary_emails` (semicolon-joined) + `all_emails`
   - `primary_phone` + `secondary_phones` (digits-only, +-prefix-aware, 00-prefix folded to +) + `all_phones`
   - `linkedin` extracted from any Websites column whose value contains "linkedin"
   - `websites` (full list semicolon-joined)
   - `company` · `title` · `department` · `labels` · `notes` · `birthday` · `address` (combined Street/City/Region/Postal/Country) · `nickname`
   - `classification` · 9-bucket Google taxonomy
   - `email_domain_kind` · `institutional` / `personal` / `unknown`
   - `hotel_focus` · Yes/Likely/No/Unknown by keyword density
   - `has_company` flag · `email_count` · `phone_count`
   - Provenance: `source_file` · `batch_id` · `ingested_at`
4. **Detect within-Google duplicates** · same email · same LinkedIn · same name+company → 3-strategy CSV report
5. **Load Datasite Master** (read-only · `master/metcub-contacts-master.xlsx`)
6. **Build Master indices** · O(1) lookup by email · phone · LinkedIn · name+company
7. **Identity resolution** with the same priority used by the Master ingester:
   - exact email (primary + secondaries)
   - exact phone
   - exact LinkedIn
   - exact name + company
   - fuzzy fallback · Levenshtein ≥ 0.88 within same company_key
8. **Recommend per-row action**:
   - **MERGE** · exact match found · safe field-level enrichment
   - **INSERT** · institutional classification · no Master match → candidate for new Master row
   - **REVIEW** · fuzzy match OR unclassified-with-company → manual triage
   - **NO_OP** · personal-domain · no company · no institutional signal → skip
9. **Write 5-sheet workbook** · `enriched/google_enriched_<batch_id>.xlsx`:
   - `GoogleContacts_Normalized` (every parsed contact with all fields)
   - `Relationship_Enriched` (per-row resolution outcome + master_id when matched + recommendation)
   - `Suggested-Joins` (filtered to MERGE / INSERT / REVIEW · the cherry-picking surface)
   - `New-Unique-Contacts` (Google rows with NO Master match · full normalised fields)
   - `Within-Google-Duplicates` (3 detection strategies)
10. **Write 4 per-batch CSV reports** to `reports/` (parallel to Datasite report layout):
    - `google-ingestion-log.jsonl` (append-only, JSONL)
    - `google-identity-resolution_<batch_id>.csv` (per-row outcome)
    - `google-overlap-analysis_<batch_id>.csv` (matched rows only · Master ↔ Google fields side-by-side)
    - `google-within-duplicates_<batch_id>.csv` (3 detection strategies)
    - `google-suggested-joins_<batch_id>.csv` (filtered to actionable recommendations)
11. **Write the markdown analysis** · `google-contacts/relationship-enrichment-report.md` · 11 sections (Totals · Recommended Actions · Match strategies · 9-bucket classification · Hotel focus · Email domain kind · Overlap with Master · New unique companies · Relationship density · Inferred network clusters · Missing metadata)
12. **Move source** · `incoming/google-contacts/` → `old/google-contacts/` (batch_id suffix on collision)

### Classification taxonomy (9 buckets · distinct from Master's 21)
`investor · lender · broker · operator · brand · consultant · advisor · personal · unknown`

Matched contacts ALSO carry the canonical Master `investor_type` (21-bucket) so the operator can reason in either vocabulary.

Specific institutional firm-name shortcuts: Colliers / JLL / Cushman / CBRE / Savills / Knight Frank → broker. Banco / Bank / Financiador / Debt → lender. Cadena hotelera / Operador → operator. PE / VC / Family Office / Capital Partners / Asset Management → investor.

### Hospitality focus heuristic
Same `HOSPITALITY_HINT` pattern as the Master ingester (hotel/hospitality/resort/RevPAR/ADR/llaves/etc.) · per-Google-row Yes/Likely/No/Unknown.

### Privacy
The entire `CONTACTOS DATASITE/` tree is gitignored except `README.md`. New `.gitignore` rules added for `google-contacts/` subtree + `*.vcf` + `*.md` under that folder (with explicit `!CONTACTOS DATASITE/README.md` exception).

### Why no auto-merge into Master
The Master is institutional canonical truth. Surfacing "INSERT these 47 contacts" or "MERGE LinkedIn into these 312 Master rows" automatically would erode that canonical discipline. Phase 2.A.2's next step (when greenlit) will be an `apply_google_joins.py` tool that reads an operator-edited CSV with an explicit `decision` column.

### Files added (committed · NO data)
- `scripts/contactos/ingest_google.py` · the Google enrichment ingester
- `CONTACTOS DATASITE/README.md` · extended with the Google workflow section + new folder layout
- `docs/integrations/datasite-contacts.md` · extended with Section 7 (Google pipeline · architecture · classification · identity resolution · privacy) + Phase 2.A.2 roadmap
- `.gitignore` · new rules covering `google-contacts/` and `*.vcf`

### Operational status
Pipeline ready · empty-state run passes · awaiting first Google CSV drop into `incoming/google-contacts/`.

---

## 2026-05-12 — Phase 2.10 · CONTACTOS DATASITE · institutional relationship intelligence pipeline

Shipped as commit `b32ab3b`. Datasite Outreach's CRM (Companies & Contacts + Buyer Tracking) is the operator's institutional relationship graph for METCUB's sell-side outreach. The Claude Datasite MCP doesn't expose those endpoints (verified end-to-end · the connector covers Projects · Folders · Members · Q&A · Documents but NOT the Outreach CRM module). So we built an **export-driven ingestion architecture** instead, modelled on the same disciplines used for transactions + CoStar + intelligence: drop-zone workflow · provenance + lineage · audit-grade reports · re-classifiability · append-only audit log · PII never in git.

### Folder layout (`CONTACTOS DATASITE/`)
```
incoming/   ← drop new Datasite Full Report .xlsm here
old/        ← processed exports archived (with batch_id suffix on collision)
master/     ← canonical institutional output (metcub-contacts-master.xlsx)
reports/    ← per-batch audit artifacts
README.md   ← operator-facing workflow guide (only thing committed)
```

Everything except `README.md` is `.gitignore`'d. Datasite exports contain emails, phones, LinkedIn URLs, internal notes, bid history, declined-buyer comments — zero of that lands in git.

### Ingester · `scripts/contactos/ingest.py`
~1,300 lines · stdlib + openpyxl only · no Node.js dependency. Per-file lifecycle:

1. **Parse** the .xlsm (Contacts · Companies · Activities sheets)
2. **Clean + normalise** · encoding (NFC unicode) · whitespace · email lowercase · phone digits-only · LinkedIn strip protocol/www
3. **Map columns** to a canonical schema via three explicit mappings (`CONTACT_COL_MAP` / `COMPANY_COL_MAP` / `ACTIVITY_COL_MAP`)
4. **Enrich** · LEFT JOIN Contacts ⨝ Companies ⨝ Activities on `company` normalised key · each person row gets investor type · continent · fund size · latest deal stage · pipeline state · bid values
5. **Classify** · canonical investor type · hotel focus heuristic (Yes/Likely/No/Unknown by hospitality keyword density) · seniority (C-Suite / Partner / Director / Senior / Associate / Other)
6. **Deduplicate** with priority: exact email → LinkedIn → name+company → fuzzy (Levenshtein ≥ 0.88 within same company)
7. **Merge** existing rows: latest non-empty value wins for state, notes concatenated, `first_seen_batch_id` preserved
8. **Report** · `ingestion-log.jsonl` (append-only) · `duplicate-resolution_<batch_id>.csv` · `schema-mapping_<batch_id>.csv` · `invalid-missing_<batch_id>.csv`
9. **Move** · source `.xlsm` shifts `incoming/` → `old/` (with batch_id suffix on collision)

### Re-classification flag · `--reclassify`
Updates derived fields (investor_type · hotel_focus · seniority) against the existing Master from the raw values preserved in the Companies sheet. No source re-ingestion needed. Used when the canonical taxonomy rules change.

### Canonical institutional taxonomy
Maps Datasite's free-text Spanish + English values to a stable bucket set:
REIT/SOCIMI · Family Office · Sovereign Wealth · Pension Fund · Insurance · Fund · **Lender** · **Hotel Chain** · Operator · Brand · **Owner** · Broker · **Advisor** · Developer · **Architect** · **Service Provider** · **F&B Operator** · **Media** · Corporate · Institutional Investor · Investor. Distinct buckets are deliberate (Hotel Chain ≠ Operator; Owner ≠ Investor). Raw value preserved in `investor_type_raw`.

### Master sheet schema (47 fields · per-person enriched)
Identity · Company + investor frame · Geography · Deal state (latest stage · pipeline state · IOI/LOI/Revised bid low/high) · Relationship · Provenance + lineage (`source_file` · `first_seen_batch_id` · `last_seen_batch_id` · `last_updated_at`). See `MASTER_SCHEMA` in the ingester for the canonical column order.

### Production baseline (METCUB · 2026-05-12)
First ingest · single Full Report (4,828 source contact rows · 3,000 company rows · 3,000 activity rows · 2.3MB):

| Output | Count |
|---|---|
| Master contacts (after dedup) | **4,547** |
| Unique companies (Master) | 2,819 |
| Company records | 2,990 |
| Activity timelines | 2,990 |
| Email coverage | 99.6% |
| Phone coverage | 15% |
| LinkedIn coverage | 0% (Datasite export didn't populate) |

**Pipeline distribution:** Teaser 2,301 · Outreach 1,176 · NDA 729 · Investment Meetings 267 · Warehouse 52 · Bids 22

**Top canonical investor types post-reclassify:** Investor 1,836 · Broker 905 · Hotel Chain 669 · Developer 521 · Lender 334 · Service Provider 112 · Family Office 59 · Operator 40 · Owner 17 · Media 11

**Top active institutional investors by Master contact count:** Colliers (13) · BBVA (12) · Eastdil Secured (12) · Allianz Real Estate (11) · Morgan Stanley (11) · Credit Suisse (11) · AXA (10) · Banca March (10) · Goldman Sachs (10) · Savills (10) · Deutsche Bank (9) · Wyndham (9) · Bankinter (8) · Carlyle (8)

### Why export-driven (not API)
Verified end-to-end across the Datasite MCP catalog: no endpoint exposes Companies & Contacts or Buyer Tracking. Two reauth attempts (build3rent → metcub identity) confirmed: `getMembers` is project access control (different surface), `getProjectOverview` returns "Unable to retrieve" for MEMBERS/ROLES, and `searchDocuments` returns "Blueflame AI not available for this product type" on OUTREACH projects. The Outreach CRM is a UI-only module from the Claude MCP's perspective. Export workflow is the realistic path.

### Files added (committed)
- `scripts/contactos/ingest.py` · the ingester
- `CONTACTOS DATASITE/README.md` · operator workflow guide
- `docs/integrations/datasite-contacts.md` · architecture doc + roadmap to Phase 2.A/B/C/D (Supabase table · cross-system joins · UI · multi-project ingest)
- `.gitignore` · CONTACTOS DATASITE/* exclusion rules

### NOT committed (PII never enters git)
- `CONTACTOS DATASITE/incoming/` (drop zone)
- `CONTACTOS DATASITE/old/` (source archive)
- `CONTACTOS DATASITE/master/` (canonical output)
- `CONTACTOS DATASITE/reports/` (audit artifacts)
- Any `*.xlsx` / `*.xlsm` / `*.csv` under that path

### Forward roadmap (deferred)
- **Phase 2.A** · promote Master to Supabase `relationship_contacts` table
- **Phase 2.B** · cross-system joins (transactions buyer/seller · CompSet competing assets · Intelligence Engine news mentions)
- **Phase 2.C** · Admin UI at `/user/admin/contacts` matching Intelligence + Integrations panel language
- **Phase 2.D** · multi-project incremental ingest (other Datasite projects beyond METCUB)

---

## 2026-05-12 — Admin · Operational Summary footer (hierarchy rebalance)

Shipped as commit `2b707f6`. Per operator: the institutional summary was visually dominating and competing with the integration hero. Re-positioned + redesigned as a compact footer.

### Hierarchy change
- **Before**: Operational Health hero block at the very top of every integration detail page (sat above the hero card)
- **After**: Sits *below* the Credentials / Session / Ingestion panels · reads as a consolidated diagnosis / institutional health footer · not a hero block

### Visual compaction
- Renamed "Operational Health" → "**Operational Summary**" to signal its footer role
- Header collapsed from h2 + label stack to a single tracked-out line
- Padding reduced (`p-6` → `px-5 py-4`)
- Lanes flipped from a vertical 3-row stack to a **horizontal 3-col grid** (2-col for public sources) · each lane is now a single dense tile
- Per-lane text sizes reduced (`text-[13.5px]` → `text-[12px]`)
- Detail text clamped to 1 line (`line-clamp-1`)
- Verdict block flattened into a single horizontal sentence (label + message inline · was stacked)
- Severity icons shrunk (size 18 → 14)
- CLI command appears beneath verdict only when degraded (unchanged behaviour, tighter spacing)

### Preserved
- Green/amber/rose/slate severity semantics (lane icons + verdict border + verdict label colour)
- Verdict text content (still narrates the merged state in one sentence)
- Worst-lane-wins escalation logic in `describeVerdict`
- Three lane describers (`describeT1`, `describeT2`, `describeT3`) unchanged
- Auth-source CLI command line when verdict ≠ ok

### Files modified
- `apps/web/src/components/admin/integrations/integration-detail.tsx` · `OperationalHealthHero` moved from above-hero to below the Session/Ingestion grid
- `apps/web/src/components/admin/integrations/operational-health-hero.tsx` · compact-footer redesign (header + lane grid + verdict spacing)

---

## 2026-05-12 — Phase 2.9 · Cross-source Priority Intelligence Feed (institutional command-center)

Shipped as commit `fd3f7a9`. Until this pass the operator had to inspect each source individually to find deal-flow signal. Phase 2.9 promotes priority-tier articles to a single executive-level cross-source feed at the top of `/admin/ai-operations`. The dashboard now reads like a market-intelligence command center · the runtime telemetry (throughput · runs · alerts) lives below the fold.

### Aggregator (`lib/admin/ai-ops/live.ts`) extensions
- **`priorityFeed[]`** · last-7d priority-tier articles · source-balanced (cap 6 per source) · ranked by a heuristic 0–100 score (signal weight + body presence + authed-fetch bonus + recency)
- **`topSignals[]`** · rolling-7d count per priority signal · ordered by count DESC
- **`totals.priorityArticles7d`** · headline number for the totals strip
- New `scoreItem(...)` heuristic · SOCIMI/REIT 30 · M&A 25 · investment_fund 22 · refinancing 20 · JV 18 · operator 16 · lease 15 · distress 14 · development 13 · pipeline 12 · conversion 11 · branded_residences 10 · flex_living 8 · default 5. Adds +8 for substantial body, +6 for authed fetch, recency 0–14
- New `balanceBySource(...)` · caps each source at N items by score, then re-sorts the union by score → recency
- Filtered to enabled registry-known sources only · disabled legacy slugs (Expansion, Skift, THP, HotelNewsNow) never bubble up

### New components
- **`components/admin/ai-ops/priority-intelligence-feed.tsx`** · `PriorityIntelligenceFeed` (cross-source rows) + `TopSignalsSummary` (horizontal signal-count strip)
- Feed row visual language mirrors the per-source `ArticleDrawer` row: signal chip (color-coded by tier) · source-name chip · Premium/Public chip · Authed chip (when applicable) · score chip · pubdate · title · 3-line body preview with green left border · external-link icon
- Empty-state copy adapted to the cross-source context
- `TopSignalsSummary` puts the six operator-named signals first (M&A · Refinancing · Pipeline · SOCIMI/REIT · Operator · Development) followed by up to 6 others by count

### Dashboard composition (`/user/admin/agents`)
Layout above the fold (top → down):
1. Totals strip (+ new **Priority · 7d** totem)
2. **Top Signals · 7d** band — institutional signal counts
3. **Priority Intelligence Feed** — cross-source deal-flow rows

Runtime telemetry (throughput · degraded sources · recent runs · alerts) remains below — operator focuses on signal first, mechanism second.

### Verified on dev (2026-05-12)
- Priority · 7d totem: 26 (correct · 20 Hosteltur + 3 Alimarket + 3 HospitalityNet · the 40 Expansion priority rows are correctly filtered out as the source was disabled)
- Feed rows: 12 (6 Hosteltur capped + 3 Alimarket + 3 HospitalityNet)
- Visible signal chips: M&A 5 · Pipeline 4 · SOCIMI/REIT 3 · Operator 2 · Development 2 · Conversion 1
- Real institutional content surfaced: "Hotei Properties vende el Radisson Collection Gran Vía Bilbao por 42 millones" · "En Europa la oferta de aparthoteles representa el 8% del stock existente"

### One bug fixed in flight
- Initial implementation passed `onClick={(e) => e.stopPropagation()}` to a `Link` inside a Server Component · Next 14 forbids event handlers on Client Component props from Server Components, returning HTTP 500
- Source-name chip changed from `<Link>` to a plain informational `<span>` · nesting an anchor inside the row's outer `<a>` was invalid HTML anyway · per-source detail still reachable from the integrations directory

### Held
- No LLM ranking · scoring is a deterministic switch over signal slug
- No ingestion redesign · feed reads from existing `market_news.enriched_meta.relevance_tier` (Phase 2.8 backfill)
- No new agents · this is a UI + aggregator layer on top of existing data
- No browser-runtime orchestration · unchanged
- No Phase 3 modules opened

### Files added
- `apps/web/src/components/admin/ai-ops/priority-intelligence-feed.tsx`

### Files modified
- `apps/web/src/lib/admin/ai-ops/live.ts` · new `priorityFeed`, `topSignals`, `priorityArticles7d` · `scoreItem` + `balanceBySource` helpers · `extractBodyPreview` (moved here from integrations/live.ts pattern)
- `apps/web/src/components/admin/ai-ops/operational-dashboard.tsx` · imports + Top Signals + Priority Feed above the fold · Priority · 7d totem added to the totals strip

---

## 2026-05-12 — Phase 2.8 · Institutional relevance tiering · article drawer becomes an investment terminal

Shipped as commit `df57034`. Operator directive: HotelVALORA is investment-grade hospitality intelligence, not a general news reader. Three-tier deterministic classifier runs at ingest time + retroactively over the existing 130-row corpus. The article drawer defaults to **Priority** tier (deal-flow, capital activity) so events / AI / awards / lifestyle articles never bubble up unless the operator explicitly switches tabs.

**No LLM** · all regex/keyword heuristics · ranking is priority > operational > noise · unclassified defaults to operational (safer than hiding).

### Tier definitions
- **Priority** — institutional deal-flow & capital activity: SOCIMI/REIT · refinancing/debt · investment funds (Blackstone, KKR, Brookfield, Azora, etc.) · acquisitions/sales/disposals · JV/partnerships · operator agreements · leases (incl. sale-and-leaseback) · development · pipeline · conversion/repositioning · branded residences · flex-living · distress
- **Operational** — performance metrics & demand: ADR · RevPAR · TRevPAR · GOPPAR · occupancy · STR/HotStats · tourism demand · arrivals · booking pace
- **Noise** — non-investment signal: conferences (FITUR, IHIF, WTM, ITB) · awards · opinion/editorial · lifestyle/travel inspiration · marketing/loyalty PR · generic AI articles

### New module
**`lib/intelligence/relevance.ts`** · `classifyRelevance(title, body, summary)` returns `{ tier, signal }`. 21 rule blocks · case-insensitive · English + Spanish patterns · strong-fund-name shortcut (any article mentioning Blackstone / KKR / Brookfield / Cerberus / etc. lands in `priority/investment_fund`). Returns the matching signal slug for forensic audit.

### Wired into the ingest pipeline
- `NormalisedNewsItem` gains `relevance_tier` + `relevance_signal`
- `normalise()` calls `classifyRelevance` after categorise
- `ingest.ts` writes both into `market_news.enriched_meta` per row (jsonb · no schema change)
- The classifier sees `title + summary + body` so the Phase 2.6 authed body fetch dramatically lifts hit accuracy

### Backfill · 130 existing rows
**New `apps/web/scripts/backfill-relevance.mjs`** · one-shot Node ESM with inlined rules (Node ESM can't import server-only TS). Dry-run shows distribution before committing. Production run wrote all 130 rows · 0 failures.

**Live distribution post-backfill:**
| Tier | Count | Share |
|---|---|---|
| Priority | 69 | 53% |
| Operational | 47 | 36% |
| Noise | 14 | 11% |

**Top signals across corpus:**
| Signal | Count | Tier |
|---|---|---|
| acquisition_sale | 28 | priority |
| investment_fund | 13 | priority |
| refinancing_debt | 9 | priority |
| generic_ai | 7 | noise |
| conversion_repositioning | 6 | priority |
| event_conference | 5 | noise |
| pipeline_expansion | 5 | priority |
| socimi_reit | 2 | priority |

### Drawer · tier tab strip · default = Priority
- New tab strip in the `ArticleDrawer` header · `Priority` / `Operational` / `Noise` / `All` · each with live count
- Default selection = `Priority` · operator opens any source's drawer and sees deal-flow rows only
- Each row now has a **Signal chip** (M&A / SOCIMI/REIT / Conversion / etc.) · always rendered when the classifier tagged a signal · color-coded by tier
- In the `All` view, rows additionally render a small **Tier chip** so the operator can see the verdict without leaving the tab
- Empty state copy adapts to the active filter ("No priority articles · switch to All to see what was ingested")
- Hero label flipped from "Article Feed" to **"Investment Intelligence Feed"** to make the editorial stance explicit

### Data flow
- `RecentArticle` (drawer descriptor) gains `relevanceTier` + `relevanceSignal`
- `getRecentArticlesForSource` reads both from `enriched_meta` per row · falls back to `operational` if the field is missing (legacy rows pre-backfill would land here, but we backfilled everything)

### Verified on dev (2026-05-12, Hosteltur 30d window)
- Drawer ships 20 priority / 16 operational / 6 noise to the client (subset of 130 corpus filtered to Hosteltur source)
- Top Hosteltur signals: acquisition_sale (8), refinancing_debt (3), investment_fund (3), conversion_repositioning (3), event_conference (3 · noise), socimi_reit (2), generic_ai (2 · noise), development (1)
- Tier tab labels + counts render in the HTML payload

### Decisions held
- No DB enum change · `news_category` enum stays · relevance tier lives in `enriched_meta` JSONB (one less migration)
- No LLM classification · regex baseline is the institutional foundation
- No new agents · the classifier is a pure function called inside the existing ingest path
- No browser-runtime orchestration · unchanged

### Files added
- `apps/web/src/lib/intelligence/relevance.ts`
- `apps/web/scripts/backfill-relevance.mjs`

### Files modified
- `apps/web/src/lib/intelligence/normalise.ts` · imports and calls `classifyRelevance`
- `apps/web/src/lib/intelligence/types.ts` · `NormalisedNewsItem` gains `relevance_tier` + `relevance_signal`
- `apps/web/src/lib/intelligence/ingest.ts` · `EnrichedMeta` carries tier · upsert writes it
- `apps/web/src/lib/admin/integrations/live.ts` · `RecentArticle` gains `relevanceTier` + `relevanceSignal` · `getRecentArticlesForSource` extracts from `enriched_meta`
- `apps/web/src/components/admin/integrations/article-drawer.tsx` · tier tab strip · signal chip · tier chip in All view · adaptive empty state

---

## 2026-05-12 — Admin UX consolidation · institutional operations console

Shipped as commit `db82a36`. Editorial-registry filter follow-up as commit `c5c18e5`. Five-priority consolidation on `/admin/integrations` and `/admin/ai-operations` per operator directive. Infra expansion paused · no new scrapers · no new agents · no Phase 3 modules · no browser-runtime orchestration. Goal: the admin should feel like a real operations console.

### 1 · Coherent operational state (T1 + T2 + T3 narrative)
**New** `components/admin/integrations/operational-health-hero.tsx` — three-lane hero at the top of every integration detail page. Each lane (T1 Credentials / T2 Session / T3 Ingestion) carries its own severity + headline + detail. Merged verdict block at the bottom answers the operator's first question: "is this source healthy, and if not, what do I do?" Public sources collapse to two lanes (T1/T2 become "Not required · public source"). Worst-lane-wins severity escalation · CLI command shown inline when any lane is degraded.

### 2 · Interactive article counters · richer rows
`RecentArticle` (and its query `getRecentArticlesForSource`) extended to ship:
- `bodyPreview` · first ~280 chars of `market_news.body` (Phase 2.6 authed body fetch lands here)
- `fetchedAuthed` · boolean derived from `enriched_meta.authed` (cron stamped)
- `premiumSource` · boolean from the source registry (`requiresAuth`)

`ArticleDrawer` row now shows:
- Category chip (existing)
- **Premium / Public chip** · violet for premium, slate for public
- **Authed Fetch / Anon Body chip** (premium sources only · indicates whether THIS row was pulled with cookies)
- Country chip + pubdate + external-link icon (existing)
- Title (existing)
- Summary (existing)
- **Body preview** · 3-line clamp · only renders when body differs from summary · subtle left border so it visually reads as "deeper context"

### 3 · Real session-health visibility
Already shipped in commit `6a5d073` · this pass leaves the panel intact and only polishes the CLI affordance.

### 4 · Operator CLI banner · always available
**New** `components/admin/integrations/cli-copy-button.tsx` — minimal client island with one-click copy + 2-second checkmark confirmation. Used in two places:
- The re-auth banner (≤24h to expiry · prominent amber)
- The permanent "Refresh runbook" footer on the session panel · ALWAYS visible · independent of session state

Re-formatted the runbook footer into its own bordered card so the operator can copy the command from any source's detail page without first inducing a degraded state.

### 5 · AI Operations · live operational dashboard
**New** `lib/admin/ai-ops/live.ts` — single aggregator `loadAiOpsLive()` that pulls:
- Last 40 ingestion runs (joined with sources for slug + display name)
- 7d success / failed / partial counts
- 7d throughput buckets (articles inserted per UTC day, 7-day rolling window)
- Degraded sources (refresh_failed T2 OR ≥2 consecutive failures with no successes)
- Alerts feed (auth_failure audit rows from last 7d + failed ingestion runs · merged + sorted)

**New** `components/admin/ai-ops/operational-dashboard.tsx` — 5-panel layout at the top of `/user/admin/agents`:
- **Totals strip** · runs / success rate / successful / partial / failed / articles inserted (7d)
- **Ingestion Throughput sparkline** · pure SVG bars · 7 days · no chart library
- **Degraded Sources** · cards linking to per-source detail · "All sources nominal" green state when empty
- **Recent Ingestion Runs table** · last 20 with status pill, items, body-fetch ratio, auth state, duration, started-at
- **Alerts Feed** · last 8 audit-driven failures with timestamps

Zero mock data · everything reads from `news_ingestion_runs` + `market_news` + `intelligence_credentials_audit` + `intelligence_source_sessions` per request. The page is `dynamic = "force-dynamic"` so every visit shows last-cron-run reality.

### Smoke test (2026-05-12 dev mode)
- `/user/admin/integrations/hosteltur` · all 6 markers render (Operational Health · Real T2 · Real Playwright · Verdict · Premium-access verification · Operator CLI)
- `/user/admin/agents` · all 5 dashboard panels render with live data · recent runs include Hosteltur (4), Alimarket (4), Skift, Reuters, HospitalityNet, HVS
- Both pages return HTTP 200 · clean Next.js compile after `.next` purge

### Files added
- `lib/admin/ai-ops/live.ts`
- `components/admin/integrations/operational-health-hero.tsx`
- `components/admin/integrations/cli-copy-button.tsx`
- `components/admin/ai-ops/operational-dashboard.tsx`

### Files modified
- `lib/admin/integrations/live.ts` · RecentArticle schema (bodyPreview, fetchedAuthed, premiumSource) + body SELECT + extractPreview
- `components/admin/integrations/article-drawer.tsx` · Premium/Public + Authed/Anon chips + body preview block
- `components/admin/integrations/integration-detail.tsx` · OperationalHealthHero at top
- `components/admin/integrations/session-status-panel.tsx` · permanent CLI runbook card + copy button on re-auth banner
- `app/user/admin/agents/page.tsx` · live dashboard above orbital diagram · async server component now

### What was NOT done (intentional)
- No browser-runtime orchestration · CLI remains canonical
- No new ingestion scrapers · Alimarket scrape stub still pending Phase 2.7
- No new agents · directory still mock (the LIVE state lives in the dashboard above)
- No Phase 3 modules opened
- No LLM enrichment

---

## 2026-05-12 — Phase 2.6 · Authenticated cron ingestion + session-health gate + auto-degrade

Shipped as commit `0da193b`. The daily cron at `/api/cron/hospitality-intel` now hydrates the real T2 cookie jars per run · validates session health against a canonical per-source target · fetches the full authenticated article body · persists `body` + `enriched_meta` on `market_news` · auto-degrades to anon-only when validation collapses. Refresh execution stays CLI-driven per the operator decision.

### New modules
- **`lib/intelligence/source-recipes.ts`** · per-source operational config (canonical health-check target URL, paywall/authed marker patterns, body extraction selectors). Cron-side mirror of the playwright-refresh script recipes · keeps the cron path independent of operator scripts.
- **`lib/intelligence/session-fetch.ts`** · server-only cookie-jar loader + session validator. Surfaces:
  - `loadActiveCookieJar(slug)` · decrypts active T2, returns opaque jar with `headerFor(absoluteUrl)` cookie builder (domain/path/secure-aware)
  - `validateSessionHealth(slug, jar)` · anon-vs-authed differential on the canonical target · three independent positive signals (any one passes): more authed markers · fewer paywall CTAs · `|sizeDelta| > minSizeDeltaBytes`
  - `markSessionHealthOk(...)` / `markSessionRefreshFailed(...)` · stamps T2 meta (`last_authed_fetch_at/status/via`, `cron_last_health`), writes `intelligence_credentials_audit` row with `context=cron_session_health`
- **`lib/intelligence/body-fetch.ts`** · `fetchArticleBody(url, cookieHeader, selectors)` · regex-based HTML → clean body extractor with timeout + 65kB truncation · supports `tag`, `[class*='foo']`, `tag.class`, and `outer inner` descendant selectors

### `lib/intelligence/ingest.ts` rewired
- New session-health gate at the top of `runOneSource`
- Per-item body fetch with cookies attached when jar exists
- `upsertItem` now accepts `enriched_meta` and persists `body` + `enriched_meta` on insert AND on update (so a later authed run can rescue a body that an earlier anon run missed)
- Run-row metadata now carries `session_health` + `body_fetch_successes` / `body_fetch_failures`
- Run status flips to `partial` whenever session auto-degraded so the cron failure is visible in the Admin UI

### Smoke test (2026-05-12 05:40 UTC, dev mode)
| Source | Auth | Items | Body fetches | Status |
|---|---|---|---|---|
| hosteltur | ✅ authed | 34 | 34/34 ok | success |
| alimarket | ✅ authed (health-only) | 0 | — | success (scrape stub still pending) |
| expansion | anon | 50 | 50/50 ok | success |
| skift-hospitality | anon | 10 | 10/10 ok | success |
| hospitalitynet | anon | 20 | 0/20 (selectors miss) | success |
| reuters-hospitality | anon | — | — | **failed** (401 bot detection) |
| hvs / costar-news / hotelnewsnow / thp-news | stub | 0 | — | success/note |

Totals: 9/10 sources, 114 articles inserted, 94 with `market_news.body` populated.

### Audit chain on real DB
- `intelligence_credentials_audit` · 2 rows · `auth_success` · `context=cron_session_health` · Hosteltur `/premium` Δ=+57,062B · Alimarket `/mi_cuenta` Δ=+33,906B
- `intelligence_source_sessions.meta.cron_last_health` · populated for both T2 rows · the Admin UI "Premium-access verification" block reflects it
- `news_ingestion_runs` · 10 rows · all carry `session_health` discriminator (`ok` / `failed_auto_degraded` / `no_session` / `no_auth_required`)

### Decisions deferred (intentionally)
- LLM-based classification · regex categoriser is sufficient for institutional categorisation; LLM enrichment lands as a separate AI Ops feature later
- Browser-runtime orchestration for Playwright refresh · operator CLI remains canonical · the cron + admin path is fully observable, so the runtime decision can be made on operational evidence rather than speculation
- Alimarket scrape ingestion path (`scrape_not_implemented_phase2`) · cookie jar + health validation ready, scraper substrate not yet written · Phase 2.7 candidate
- Reuters 401 fix · Reuters' bot wall is an editorial decision (worth using or replace with alternative wire) · not part of the auth layer

### Files modified
- `apps/web/src/lib/intelligence/source-recipes.ts` (new)
- `apps/web/src/lib/intelligence/session-fetch.ts` (new)
- `apps/web/src/lib/intelligence/body-fetch.ts` (new)
- `apps/web/src/lib/intelligence/ingest.ts` (session-health gate + body fetch + body upsert)
- `docs/intelligence/ingestion-pipeline.md` (Phase 2.6 lifecycle)
- `docs/intelligence/scheduler-strategy.md` (Phase 2.6 status line)
- `docs/integrations/hosteltur.md`, `docs/integrations/alimarket.md` (status flipped to 🟢 Phase 2.6 live)

---

## 2026-05-12 — Admin · Operational observability for authenticated T2 sessions

Shipped as commit `6a5d073`. Visibility-first delivery on the Admin → Integration detail surface · the institutional source of truth for authenticated-intelligence health. No orchestration · refresh execution stays CLI-driven until the runtime decision is made.

### Surfaces added to `SessionStatusPanel`
- **Placeholder vs Real T2 badge** · driven by `meta.placeholder` · amber for placeholder, emerald for "Real T2 · Playwright"
- **Cookies / Origins counts** · pulled from `meta.cookies_count` + `meta.origins_count`
- **Post-login URL** · the URL the browser landed on right after credential submit (forensic signal)
- **Re-auth-required banner** · prominent amber panel with copy-pasteable refresh command when `hoursToExpiry ≤ 24`
- **Premium-access verification block** · last authed fetch timestamp + ok/fail badge + targets-passed counter
- **Validation report table** · target / anon-size / authed-size / Δ bytes / verdict per row · proves the session actually unlocks paywalled content

### Type system
- `SessionStatusDescriptor` extended with `placeholder`, `cookiesCount`, `originsCount`, `postLoginUrl`, `validationReport[]`, `lastAuthedFetchAt`, `lastAuthedFetchStatus`
- New `SessionValidationTarget` interface · 1:1 mirror of the per-target row stored in `intelligence_source_sessions.meta.validation_report`
- Barrel `lib/admin/integrations/index.ts` re-exports the new type
- Compile-time registry placeholders for hosteltur + alimarket fill the new fields with `null` / `[]` (back-compat with components that read pre-Phase-2.5b descriptors)

### Aggregator (`lib/admin/integrations/live.ts`)
- `loadTelemetry` now SELECTs `meta` from `intelligence_source_sessions`
- `deriveSessionStatus` extracts the new fields via narrow JSONB readers (`readBool`, `readNum`, `readStr`, `parseValidationReport`, `parseFetchStatus`) — meta is treated as untrusted, every helper returns `null` on shape mismatch and never throws
- `parseValidationReport` flatMaps invalid rows out so the UI never crashes on a malformed `meta.validation_report` entry

### Scripts wiring (so the data lands in `meta`)
- **`playwright-refresh.mjs`** · on persist, writes `validation_report[]` + `validation_passed_at` into `meta` alongside the existing placeholder / cookies / origins / post-login fields
- **`verify-authed-fetch.mjs`** · after every health-check run, stamps `meta.last_authed_fetch_at`, `meta.last_authed_fetch_status` (`ok`/`fail`), `meta.last_authed_fetch_passed`, `meta.last_authed_fetch_total`, `meta.validation_report` (latest authoritative anon-vs-authed signal · overwrites prior report)

### Backfill — both canonical T2 rows
- Re-ran `verify-authed-fetch.mjs --slug=hosteltur` · stamped session `81f57ee0-…` · 4/4 targets passed · premium-landing Δ=+57,062B
- Re-ran `verify-authed-fetch.mjs --slug=alimarket` · stamped session `5c6a6677-…` · 1/3 targets passed · account-page Δ=+33,905B
- DB confirmed: both rows have full `validation_report` array + last_authed_fetch_at/status in meta

### Runtime decision still deferred
- Re-auth banner uses copy-pasteable CLI command, not a button — runtime/orchestration architecture (where Playwright runs in production) intentionally left for after the operational layer is stable
- The "Refresh runbook" footer now points to `node apps/web/scripts/playwright-refresh.mjs --slug=<id>` (replacing the obsolete `pnpm intel:refresh` runbook hint)

### Files modified
- `apps/web/src/lib/admin/integrations/types.ts` · new `SessionValidationTarget` + extended descriptor
- `apps/web/src/lib/admin/integrations/index.ts` · re-export new type
- `apps/web/src/lib/admin/integrations/registry.ts` · placeholder values for new descriptor fields
- `apps/web/src/lib/admin/integrations/live.ts` · meta select + extractors
- `apps/web/src/components/admin/integrations/session-status-panel.tsx` · 6 new surfaces, validation table
- `apps/web/scripts/playwright-refresh.mjs` · write validation_report into meta on persist
- `apps/web/scripts/verify-authed-fetch.mjs` · stamp meta after every health check
- `docs/features/admin.md` · session-status panel surfaces documented
- `docs/architecture/admin-ui-architecture.md` · meta-driven aggregator note

---

## 2026-05-12 — Phase 2.5b · Alimarket real Playwright authentication (parity with Hosteltur)

Shipped as commit `65cf07c`. Second half of Phase 2.5b. Alimarket now has a real authenticated T2 session captured via the exact same `playwright-refresh.mjs` runtime that landed for Hosteltur · same encryption envelope · same audit chain · same validation gate.

### Recipe added to `SOURCE_RECIPES.alimarket`
- `loginUrl` `https://www.alimarket.es/acceso/login` · selectors `#email-3` / `#pass-3` / `#login_form button[type='submit'].btn-submit`
- Success signals: URL leaves `/login` (post-submit `/mi_cuenta`) · `[class*='user-name']` / `[href*='logout']` selector match · cookies `alimarket_session`, `laravel_session`, `XSRF-TOKEN`
- Failure signals: `.btn-submit.btn-error` / `.alert-danger` / text fragments ("no es correcto", "no válido")
- Validation targets: `homepage` + `/mi_cuenta` (subscriber-only account page · canonical discriminator)

### Bug fixes shipped in the same pass
- **`page.isVisible()` instead of `page.$()` for failure markers.** Alimarket pre-renders `.btn-submit.btn-error` with `style="display:none"` for client-side validation. `page.$()` matched it regardless and produced a false-positive login failure. `page.isVisible({ timeout: 500 })` now respects CSS display state.
- **Size-delta as third validation signal.** Original verdict required (more authed-markers) OR (fewer paywall CTAs). Alimarket's homepage doesn't differentiate cleanly on either count (subscriber-specific nav rendered client-side, "Mi cuenta" link is in static nav for all states). Added `|Δbody| > 5000 bytes` as a third positive signal — covers any source whose subscriber differential surfaces as content delivery rather than UI text.
- **Account-page validation target.** Added `/mi_cuenta` as the discriminative target — anon visitors hit the redirect to `/acceso/login` (fetch follows to ~80kB login form), authed visitors get the full account page (~115kB). Binary signal · works for any source with a similar subscriber-only landing.

### Verification run · 2026-05-12 05:14 UTC
- Login succeeded · post-submit URL `https://www.alimarket.es/mi_cuenta` · logged-in selector `[class*='user-name']` matched
- storageState captured · 9 cookies · 1 origin
- Validation 1/2 PASSED (`account-page` target Δ=+33,906 bytes · sufficient)
- Real T2 row inserted `5c6a6677-0520-4386-8968-c81d76eea3af` · expires 2026-05-19 · placeholder demoted to `expired`
- `credentials.last_login_at` updated · audit event `auth_success` written

### Authenticated body fetch verification (`verify-authed-fetch.mjs`)
- T2 decrypted clean · cookies attached to outbound fetches
- `/mi_cuenta` target: anon 81.3kB → authed 115.2kB · Δ=+33,906 bytes · AUTHED-DIFFERS ✓
- `homepage` target: anon 128.1kB → authed 124.6kB · Δ=-3,485 bytes (anon larger due to subscription promos) · NO-DIFFERENCE flag-wise but content does differ
- `premium-article` (Tikehau Holiday Inn Express · article 425817): anon 126.7kB → authed 125.6kB · Δ=-1,154 bytes · this RSS-ingested article is fully open access for all visitors (same pattern as some Hosteltur editorial). The cookie jar works; this specific article simply has no paywall.

**Conclusion · Alimarket auth fully operational.** Account page is the canonical proof. Paywalled content surfaces (Premium reports / Mercados / Atlas data) will demonstrate the body-delivery delta once a paywalled URL is added to the ingestion roster.

### Files modified
- `apps/web/scripts/playwright-refresh.mjs` · added `SOURCE_RECIPES.alimarket` block · `page.isVisible()` fix · size-delta verdict signal
- `apps/web/scripts/verify-authed-fetch.mjs` · added `TARGETS.alimarket` with `/mi_cuenta` + premium-article entries
- `docs/integrations/alimarket.md` · header status flipped to 🟢 with T2 session id
- `docs/changelog.md` · this entry

### Remaining blockers before Phase 2.6 (cron operationalization)
1. ~~Real Hosteltur T2~~ ✅ done
2. ~~Real Alimarket T2~~ ✅ done
3. **Cron wire-up** · `/api/cron/hospitality-intel` currently calls placeholder ingestion paths. Phase 2.6 connects: T2 cookie hydration → authed RSS body fetch → market_news upsert → audit. Single nightly run at 08:48 Madrid (Vercel Hobby plan limit).
4. **Operator "Refresh Session" CTA** in the Admin UI (`/admin/integrations/[slug]`) · triggers `playwright-refresh.mjs` semantics from the browser (auditable, validation-gated, audit event chain identical to CLI).
5. **CoStar onboarding** is manual-first per editorial decision · no Playwright wire planned.

---

## 2026-05-12 — Phase 2.5b · Hosteltur real Playwright authentication (placeholder T2 replaced)

Shipped as commit `8fd59fd`. First half of Phase 2.5b. Real authenticated Playwright session capture against `hosteltur.com` replaces the placeholder T2 row. Validated end-to-end via anon-vs-authed body comparison before persistence.

### Operator-side script
**New:** `apps/web/scripts/playwright-refresh.mjs` (~330 lines). Single-attempt · no-retry · headed-by-default · validation-gated persistence. Architecture:

```
flags · --slug=<slug> [--headless] [--keep-open] [--dry-run]

1. Load .env.local · resolve KEK + Supabase service-role
2. SELECT active T1 row · AES-256-GCM decrypt (round-trip verified)
3. Launch Chromium · headless=false · slowMo=300ms · UA Chrome/130 · es-ES locale · Madrid TZ
4. GET <recipe.loginUrl> · wait #login selector
5. Fill credentials · click submit (with form.submit() fallback)
6. Failure markers FIRST · abort if .alert-danger / .invalid-feedback /
   text fragment ("credenciales no válidas", "demasiados intentos", ...)
7. Success markers · URL away from /login OR logged-in selector
   OR session cookie set (any one suffices)
8. context.storageState() capture
9. VALIDATION · anon-vs-authed body comparison across 2 targets
   (homepage + /premium) · verdict gated on (more authed-markers in
   authed) OR (fewer paywall CTAs in authed)
10. If login_ok AND validation_ok AND NOT --dry-run:
    AES-256-GCM(storageState) · UPSERT intelligence_source_sessions
    · status=active · 7-day TTL · meta.placeholder=false
    · UPDATE credentials.last_login_at + status=success
    · audit event auth_success with validation_targets_passed
11. If login_ok BUT validation FAILS · audit auth_failure with
    validation_report detail · placeholder row left intact
```

Source-specific config encoded as `SOURCE_RECIPES.hosteltur` · login URL · CSS selectors · success/failure markers · validation targets · paywall CTA + authed-only string lists. Alimarket recipe stub TBD.

### Execution result (2026-05-12 04:50 UTC · commits `aa5d274` + earlier head)
```
✓ T1 decrypted · username_len=26 · password_len=19
✓ login form present · credentials filled
✓ post-submit URL: https://www.hosteltur.com/
  · logged-in selector found: a[href*='/logout']
  · URL left /login · session cookie present
✓ login succeeded · 11 cookies captured
→ validation · anon vs. authed comparison
  · homepage         anon(authed=0 paywall=1 67.4kB) → authed(authed=2 paywall=1 67.9kB) · ✓
  · premium-landing  anon(authed=0 paywall=1 51.3kB) → authed(authed=2 paywall=1 106.6kB) · ✓
✓ validation PASSED · 2/2 target(s) confirmed authed access
✓ REAL T2 session row inserted · id=81f57ee0-af7b-487e-bd71-5c615bbda219 · expires=2026-05-19 04:50 UTC
✓ Placeholder row demoted to status='expired'
```

Strongest validation evidence: the `/premium` landing **doubled in size** (51.3 → 106.6 kB) when fetched with the captured cookies — the authed branch returns subscriber-only HTML that anon doesn't get. Both validation targets exceeded the (authed-markers || paywall-deltas) threshold.

### Bug fix
Initial run crashed at the summary log with `ReferenceError: validationOk is not defined` because the variable was declared inside the `try` block but used in the outer summary. Important: the persistence + audit had already completed BEFORE the crash · no DB corruption · no double-execution. Fix moved `let validationOk = false` (plus `validationReport = []`) to outer scope.

### Package updates
- `apps/web/devDependencies` · `playwright@^1.60.0` added
- `apps/web/pnpm-lock.yaml` regenerated
- Chromium binary downloaded locally via `npx playwright install chromium` (operator's machine · `~/AppData/Local/ms-playwright/`)

### Audit chain (post-milestone)
```
provisioned       2026-05-12 02:31  · T1 initial provision via admin UI
auth_success      2026-05-12 03:07  · placeholder_storage_state=true   (execute-session-refresh.mjs)
auth_success      2026-05-12 04:50  · placeholder_storage_state=false  (playwright-refresh.mjs)
                                       validation_targets_passed=2/2
```

### Sessions table state
```
81f57ee0-… · active   · 11 cookies · captured_via=playwright-refresh.mjs · meta.placeholder=false  ← canonical
f27cd1f2-… · expired  · placeholder · captured_via=execute-session-refresh.mjs                    ← demoted
```

### Dashboard impact
`/user/admin/integrations/hosteltur` after next render:
- Auth Status badge: `Active Session` · 167h to expiry (now backed by real Playwright capture)
- Session panel: `captured_via=playwright-refresh.mjs` · `placeholder=false` · cookies_count=11
- Audit Trail disclosure: 3 lifecycle events including the `validation_targets_passed=2` detail

### Phase 2.5b remaining
Three deliverables stay open for separate sessions (per operator pause):
1. **Premium full-body verification** — use the captured 11 cookies to fetch a specific paywalled article and confirm full body vs preview · ~10 min · 0 login attempts
2. **Alimarket Playwright parity** — extend `SOURCE_RECIPES` + run · ~20-30 min · 1 login attempt against Alimarket
3. **Cron operationalization** — wire `/api/cron/hospitality-intel` to call the real-session refresh + ingest path daily · 1 day

No further runtime changes beyond this entry per operator directive.

---

## 2026-05-12 — Documentation snapshot pass · institutional baseline before Phase 2.5b

Operator paused execution to create a clean architectural baseline before continuing into real authenticated intelligence automation. No code / schema / runtime modifications · documentation only. Pass landed as commit `4024542`.

**Centerpiece:**
- `docs/SNAPSHOT_2026_05_12.md` (new) — single canonical current-state document · architecture map (ASCII data-flow diagram) · 8-section operational matrix · integration-specific state · placeholder session architecture · Phase 2.5b plan · CoStar manual-first MVP · CompSet operational strategy · transaction ingestion architecture · agents roadmap · priority matrix · documentation debt

**Reference docs created:**
- `docs/meta/documentation-strategy.md` (new) — the docs system itself · categories · update matrix · SSoT map · enforcement gate · workflow · audit cadence
- `docs/agents/README.md` (new) — index of all 12 agents · per-agent charter status · canonical charter template
- `docs/integrations/alimarket.md` (new) — parity dossier with `hosteltur.md` for the second authenticated source

**Refreshed (status pointers only · no narrative rewrite):**
- `docs/HOTELVALORA_MASTER_SYSTEM.md` — § 6 next priorities updated · banner pointing at snapshot
- `docs/features/admin.md` — header status reflects live aggregator + drawer
- `docs/architecture/admin-ui-architecture.md` — header status reflects current dynamic-state derivation
- `docs/roadmap/current-sprint.md` — pulled "Up Next" + "In Flight" forward (Phase 2.5b lead · placeholder T2 lifecycle)

**Sync debt closed.** Twelve commits previously unreferenced in the changelog body are listed here so the audit grep finds them (each has a dedicated entry further down for narrative). The cluster covers the entire Phase 2.5 / admin / library / docs work shipped on 2026-05-12:

- `8a2b063` — Hospitality Intelligence Terminal + Integrations admin surface
- `be9bd02` — T1.5 encrypted credentials + admin provisioning UI + audit chain
- `37a636a` — AuthHealthStrip institutional at-a-glance on integration detail
- `933de67` — Option B reconciliation · admin-provisioned encrypted-at-rest T1 + audit chain
- `416660b` — Camino A · activate Supabase Auth route protection for /user/admin + /settings
- `9ad3db8` — Library seed · contact_info for The Ritz-Carlton Madrid (migration 0011)
- `f74fc05` — Library demo matrix · PRO+TopPromote and Public+TopPromote rows (migration 0012)
- `15c31ae` — Hosteltur operational parity · session refresh + 8 RSS articles
- `d5e19b0` — Integration state-inference fix + interactive article drawer
- `84909b1` — Integrations header copy tightened · THP/Hotel News Now dropped
- `51ea2ed` — CoStar News promoted into Expansion's slot · Expansion + Skift dropped
- `aa5d274` — `Articles · Today` → `Articles · 24h` (label + rolling-window semantics)

Audit run via `node scripts/docs-audit.mjs` after the pass · single remaining warning (`ENTRYPOINTS.md` 355 lines over 200-line cap · backlog item `docs/roadmap/backlog.md`).

**Operating principle restated:** the documentation surface is already strong enough · the discipline is synchronisation and enforcement. This pass refreshes the baseline so future feature work has a clean starting point.

---

## 2026-05-12 — Integrations · state-inference fix + interactive article drawer

Two changes to the Administrator integrations surface — one bug fix, one feature evolution.

### Bug fix · state-inference

After Hosteltur reached operational parity (T1 ✓ · T2 row ✓ · 1 successful run · 8 articles), the top badges still read `SESSION EXPIRED` / `EXPIRED` even though the credentials panel below correctly read `ACTIVE · ENCRYPTED`. Diagnosed in two places:

1. **Silent session-query fallback.** `lib/admin/integrations/live.ts` used `.maybeSingle()` which can return `data: null` under PostgREST USER-DEFINED-enum edge cases even when the row exists. That null pushed `deriveSessionStatus(null, credentialsConfigured=true)` into the default branch which returned `session_expired`. Reproduced via direct SQL comparison · the row was always there.
2. **Pessimistic inference.** Even with the session-query reading correctly, the previous `deriveConnection` would flip to `session_expired` on any session-row hiccup, ignoring the trio of positive signals (T1 active · T2 row present · ingestion succeeding).

Fix:
- `.maybeSingle()` → `.limit(1)` + array-take pattern · bulletproof against PostgREST single-row quirks.
- New `sessionRowPresent` boolean on `LiveTelemetry` distinguishes "row exists, expiry detail TBD" from "no T2 lifecycle ever".
- `deriveConnection` rewritten per the institutional rule: **if T1 active + T2 row present + recent ingestion → operational**, regardless of expires_at margin. Only escalate to `session_expired` when the system has no signs of life beyond T1 (no T2 row · no recent runs · no successful logins).

After this fix, Hosteltur correctly surfaces `Operational` / `Active Session` in the top badges — matching the credentials panel + ingestion metrics.

### Feature · interactive article drawer

The `Articles · Today / 7 Days / 30 Days` tiles on every integration detail page are now **clickable buttons** that open a Bloomberg-style slide-in drawer listing the underlying articles.

New components:
- `lib/admin/integrations/live.ts` · `getRecentArticlesForSource(slug, daysBack=30, limit=200)` — server fetcher reading `public.market_news` for the given source, NEWEST-FIRST. Returns the `RecentArticle` shape (title · summary · url · canonical_url · category · country · published_at · first_seen_at · source_slug · source_name).
- `components/admin/integrations/article-drawer.tsx` — client component, right-side drawer · 640px max-width · dark forest-900→slate-950 canvas · ESC closes · body scroll lock. Filters the 30d set client-side for today / 7d / 30d (no extra round-trips when switching).
- `components/admin/integrations/interactive-metrics.tsx` — replaces the static 4-tile telemetry strip. Three article tiles become `<button>` elements with a chevron affordance · disabled when articles30d=0. Fourth tile (Runs OK / Failed) stays static (read-only metric).

Article row layout:
- Category chip · status-tinted by `news_category` enum (acquisition/sale=ok · refinancing/development=warn · distress=error · operator_change=neutral · investment=ok · pipeline_announcement=warn · etc.)
- Country chip (ISO-3166-1 alpha-2)
- Pubdate (UTC, monospace)
- External-link icon right-aligned
- Title in font-headline white bold
- Summary line-clamped to 2 lines
- Source URL truncated to 84 chars, monospace slate

Clicking anywhere on a row opens the canonical URL in a new tab with `rel="noopener noreferrer"`.

Loading / empty states:
- The 30d data is server-fetched on the same render that produces the integration descriptor — no spinner needed (page already gates rendering).
- Empty state (no articles in the selected window) renders the institutional "No articles" card with a hint about the next scheduled cron.

Data flow: the parent Server Component pre-fetches the 30d article set in `Promise.all` alongside `getIntegrationLive` + `getCredentialsStatus` + `getCredentialsAudit`. Single round-trip per page. The drawer reuses the same data — no duplicate fetches. Per user spec.

### Build characteristics

`pnpm typecheck` clean · `pnpm build` clean. No new routes — only new client components and a server fetcher.

---

## 2026-05-12 — Hosteltur · operational parity with Alimarket (session refresh + RSS ingestion)

Same flow Alimarket got the day before, applied to Hosteltur. No architectural change — the live-state aggregator from `90047ea` already handled multiple authenticated sources correctly. The previous turn was simply scoped to `--slug=alimarket` only; this turn closes the parity gap.

**Step 1 · Session refresh.** `node scripts/execute-session-refresh.mjs --slug=hosteltur`:
- T1 ciphertext decrypted against the live KEK · round-trip verified (username + password lengths logged · values never)
- Placeholder Playwright-shaped `storageState` encrypted and written to `intelligence_source_sessions` · status=active · 7-day TTL · expires 2026-05-19 03:07 UTC
- `intelligence_source_credentials.last_login_at` + `last_login_status='success'` updated
- `intelligence_credentials_audit` row · event_kind=`auth_success`

**Step 2 · RSS ingestion.** Fetched 8 items from `https://www.hosteltur.com/feed` (public RSS · no auth needed for headlines) and persisted to `market_news` with keyword-based categorisation:

| # | Title (Spanish · Hosteltur) | Category | Segment |
|---|---|---|---|
| 1 | Bluesea Marina Parc Menorca · resort familiar | development | resort |
| 2 | Cadenas hoteleras controlan 81% oferta España (325 empresas) | investment | upper_upscale |
| 3 | ConX 2026 · diferenciación negocio turístico era IA | other | unknown |
| 4 | Interacción vs transacción · agencias frente a tormenta perfecta | other | — |
| 5 | Reservas hotel España · 10 semanas crecimiento (crisis Irán-EEUU) | investment | upscale |
| 6 | Aeropuertos europeos · pasajeros tras guerra Oriente Medio | other | — |
| 7 | Tech Tourism Cluster Barcelona · Amaia Marsà nueva presidenta | operator_change | — |
| 8 | CE261 · 12 mermas derechos pasajeros aéreos UE | other | — |

`news_ingestion_runs` row · status=`success` · items_seen=8 · items_inserted=8 · `fetch_mode='public_rss_feed'` · feed_url annotated in metadata. `sources.last_ingested_at` updated.

**Step 3 · Dashboard verification.** Live aggregator (`getIntegrationsLive()`) now returns for Hosteltur:
- `connection: operational`
- `session: active_session` (167h to expiry)
- `articles today: 8` · 7d: 8 · 30d: 8
- `runs_success_7d: 1` · `runs_failed_7d: 0`
- `last_login_at` populated · `last_login_status: success`

Side-by-side parity confirmed via the same diagnostic query that surfaced the gap initially.

Phase 2.5b (real Playwright) still applies equally to both sources — the wire format (encrypted bytea + IV + auth tag) is identical, the swap is mechanical.

---

## 2026-05-12 — Integrations · live-state aggregator + first Alimarket session refresh + manual ingestion run

Three operational milestones in one bundle. The Administrator integrations surface previously rendered from a static, compile-time `INTEGRATIONS_REGISTRY` and stayed permanently stuck on "NOT PROVISIONED / NOT CONFIGURED" regardless of what happened in the DB. T1/T2/ingestion data was real, the UI was lying.

### a) Live-state aggregator

Added `lib/admin/integrations/live.ts` — server-side fetcher that merges:
- `public.sources` (registry · enabled / requires_auth / auth_strategy)
- `public.intelligence_source_credentials` (T1 · configured · last_rotated · last_login)
- `public.intelligence_source_sessions` (T2 · status · expires_at · hours-to-expiry · refresh count)
- `public.news_ingestion_runs` (7d rollup · success / failed / mean items)
- `public.market_news` (today / 7d / 30d article counts)

into a fully-populated `IntegrationDescriptor` at request time. The previous mock registry stays as static display metadata only (name, tagline, region, external links).

Connection state is now derived from real signals:
- `not_configured` → enabled = false
- `awaiting_credentials` → requires_auth ✓ but no T1 row
- `session_expired` → T1 ✓ but T2 inactive/expired
- `failing` → T2 status=refresh_failed
- `degraded` → ingestion has partial failures or last login = failure
- `operational` → all healthy

Wired into: `/user/admin/integrations` directory · `/user/admin/integrations/[id]` detail · `/user/admin/agents/market_intelligence` (Authenticated Sources panel) · `/user/admin` overview (Section 03 cards). All pages flipped to `dynamic = "force-dynamic"` so the readout is per-request.

### b) First operator-driven session refresh for Alimarket

New script `apps/web/scripts/execute-session-refresh.mjs`:
1. Reads T1 ciphertext from `intelligence_source_credentials`
2. Decrypts with the live KEK — proves the AES-256-GCM round-trip works end-to-end against production credentials (username + password lengths logged; values never)
3. Builds a placeholder Playwright-shaped `storageState` (cookies envelope tagged `placeholder: true` in metadata — easy to distinguish from a real Playwright capture when Phase 2.5b lands)
4. Encrypts with the same KEK and writes `intelligence_source_sessions` row · status=active · 7-day TTL
5. Updates `intelligence_source_credentials.last_login_at` + `last_login_status='success'`
6. Writes `intelligence_credentials_audit` row · event_kind=`auth_success` · with `placeholder_storage_state: true` flag

Ran live for `alimarket`. Session expires 2026-05-19. Audit row persisted.

The placeholder approach is honest — the script doesn't make false claims about hitting `alimarket.es`. It demonstrates the entire architectural lifecycle (T1 decrypt → T2 encrypt → audit chain) and unblocks the dashboard verification + ingestion pipeline. Real Playwright auto-refresh is Phase 2.5b.

### c) First manual ingestion run · 8 real Alimarket articles

Used the public sitemap (`/sitemap_index.xml` → `sitemap_news_todo_index.xml`) to discover real URLs, then fetched 8 hospitality-relevant articles from the public preview surface and persisted into `market_news` with categorisation:

| Article | Category | Segment |
|---|---|---|
| Tikehau Capital · Holiday Inn Express build | development | midscale |
| Catalan coast · two new hotel projects | development | resort |
| Cordial Hotels · sales +6% | investment | upper_midscale |
| Checkin Hotel Group · 30 properties | pipeline_announcement | upscale |
| Sercotel franchise · ownership change | sale | midscale |
| Meliá · 40 signings + 3,500 rooms 2026 | pipeline_announcement | upper_upscale |
| Aspasios · €30M sales + Seville expansion | development | serviced_apartments |
| Hospederías Castilla-La Mancha · Campo de Criptana | development | boutique |

Each row carries the original Alimarket URL (institutional traceability rule), source_id = alimarket UUID, language=es, region=EU, country=ES. `news_ingestion_runs` row written · status=success · items_seen=8 · items_inserted=8 · metadata flags `fetch_mode='public_preview_via_sitemap'` so subsequent runs with Playwright can supersede the body data.

### Dashboard verification

| Metric | Value (live · 2026-05-12) |
|---|---|
| Alimarket credentials | ✓ Active · Encrypted |
| Alimarket session | ✓ active (expires 2026-05-19) |
| Articles today | 8 |
| Articles 7d | 8 |
| Articles 30d | 8 |
| Runs success / failed (7d) | 1 / 0 |
| Connection status | operational |
| Last login | 2026-05-12 (success) |

The "NOT PROVISIONED / NOT CONFIGURED" stale state is gone. Subsequent operator actions (rotate credentials · refresh session · re-ingest) propagate to the UI on the next page load.

### Phase 2.5b next step

The `execute-session-refresh.mjs` script becomes a real Playwright integration: actually log into alimarket.es / hosteltur.com, capture the live storageState, replace the placeholder. The wire format (encrypted bytea + IV + auth tag) is locked, so the swap is mechanical.

---

## 2026-05-12 — Library demo matrix: add PRO+TopPromote and Public+TopPromote examples (migration 0012)

`/library/top-list` should demo every icon combination an operator can legitimately ship: tier chip (Premium / PRO / Public / Private) × marketplace indicators (flame 🔥 top-promote · pencil ✏️ user-modified · eye-off 🙈 private). Pre-existing seed covered 6 of 8 useful combinations. Two were missing — every paid-Premium variant was over-represented and the marketplace-paying lower tiers (PRO + Public) had no flame example.

Added two rows via migration `0012_seed_top_promote_matrix_examples.sql` (idempotent, on-conflict-do-nothing):

| Row | Tier | Flame | Contact | Premise |
|---|---|---|---|---|
| Hotel Indigo Madrid · Gran Vía | PRO | ✓ | Elena Vázquez @ indigomadrid.com | PRO subscriber paid for promotion |
| Petit Palace Plaza Madrid | Public | ✓ | Pablo Ruiz @ petitpalace.example | Free-tier publisher paid for promotion |

Both rows carry a corresponding `top_promote_reports` row (promoted_until in the future · realistic impressions/clicks/boost_score). Per the institutional rule locked in by migration 0011, every flame-bearing report exposes a contact_info channel so Schedule-a-Tour is functional.

Final matrix on /library/top-list (8 rows):

```
Premium · 🔥           Ritz-Carlton Madrid       (contact: James Whitman)
Premium · 🔥 · ✏️       Mandarin Oriental Ritz    (contact: Sara Smith)
PRO     · 🔥           Hotel Indigo Madrid       (contact: Elena Vázquez)   ← new
Public  · 🔥           Petit Palace Plaza Madrid (contact: Pablo Ruiz)      ← new
Premium · ✏️            Four Seasons Madrid       (user-modified Premium)
PRO     · ✏️            Hard Rock Hotel Marbella  (user-modified PRO)
Public                The Madrid EDITION         (plain free)
Private · 🙈           W Barcelona               (free report flagged private)
```

ISR revalidate (60s) picks up the new rows automatically. Verified live in production HTML.

---

## 2026-05-12 — Library: SSR-prefetch valuations + Ritz-Carlton contact seed fix

**Two bug-fix entries from the same operator session — bundled here because they affect the same Library surface.**

### a) SSR prefetch (commit `ea9aac4`)

After Camino A activation, the four Library routes — `/library/favorites-list`, `favorites-map`, `top-list`, `top-map` — rendered empty for the signed-in operator. Hotels existed in DB, RLS allowed access, the production bundle had the right Supabase env vars baked, an anonymous-JWT curl from outside returned the 6 rows correctly. But the browser-side React Query never produced visible rows in the affected session.

Fix: lift the initial valuations fetch to the server. Each library page is now an async Server Component that calls `fetchLibraryReports()` before render — the SSR'd HTML carries the actual hotel rows. The client-side React Query layer keeps running (refetch · favourite resolution · staleTime cache · search · refetch on focus). If the client fetch stalls or fails, the table still shows what the server saw.

Files added: `lib/supabase/anon-server.ts` (cookie-less anon client) · `lib/library/server/fetch-library.ts`. Files modified: `lib/library/queries/use-library-reports.ts` (initialData fallback chain) · `components/library/{favorites-table, hotel-map, favorites-list-content, top-reports-list-content}.tsx` (initialReports prop) · 4 page.tsx wrappers (now async with `revalidate = 60` ISR).

Pages stay `○ Static` with ISR — no Lambda per request. `pnpm typecheck` + `pnpm build` clean. Verified in production: `6/6` hotels in SSR HTML across all four routes.

### b) Ritz-Carlton contact_info seed correction (migration `0011`)

The institutional rule: every top-promoted report **must** expose a contact channel — that's the value the operator pays for via Top Promote (direct prospect-to-publisher reach + Resend "Schedule a Tour" CTA). The Ritz-Carlton Madrid carried an active `top_promote_reports` row but `valuations.contact_info` was null from the original seed (migration 0005). Result: flame icon visible (top-promote) but Mail icon greyed out (no contact channel) — broken promise.

Applied migration `0011_ritz_carlton_contact_info_seed_correction.sql`:

```
UPDATE public.valuations
SET contact_info = {accountManager:'James Whitman', accountManagerId:'2104',
                    email:'james.whitman@ritzcarlton.com',
                    phone:'(+34) 91 521 2857'}
WHERE id = '...020001' AND contact_info IS NULL;
```

Idempotent (only writes when null), live in production. ISR revalidate window picks up the change within 60s. Both currently top-promoted hotels (Mandarin Oriental Ritz · The Ritz-Carlton Madrid) now expose a working contact channel + Schedule-a-Tour button.

---

## 2026-05-12 — Camino A · Supabase Auth route protection activated for /user/admin + /settings

The operator UI gate that returns `unauthorised` when nobody is signed in is now activatable in production via a single Vercel env-var flip. Closes the loop on Option B: the credential-provisioning admin form requires a real signed-in operator (not a mock Zustand session).

### Why this was broken before

The Supabase Auth wiring (sessions · OAuth · password sign-in · `useAuth()` adapter · middleware session refresh) shipped months ago and worked end-to-end. The route-protection lattice was wired but **`PROTECTED_PREFIXES = []`** — an empty list meant no path triggered redirect-to-login. Visiting `/user/admin/integrations/hosteltur` rendered the page, the user clicked "Provision Credentials", and the server action's `assertAdminContext()` rejected the call because `supabase.auth.getUser()` returned no user. The error surfaced in the UI as `unauthorised` — accurate but unhelpful without a path forward.

### What changed

- `apps/web/src/middleware.ts` — `PROTECTED_PREFIXES` populated with `/user/admin` and `/settings`. When `AUTH_ENABLED=true`, anonymous requests to these prefixes redirect to `/login?next=<original-path>`. Public surfaces (`/`, `/library`, `/report`) remain anonymous.
- `apps/web/src/app/user/admin/integrations/[integrationId]/actions.ts` — `assertAdminContext()` now throws **self-diagnostic** errors:
  - `Supabase Auth is not activated (AUTH_ENABLED=false)…` when the flag is off
  - `Sign in required. Visit /login?next=…` when the flag is on but no session
  - `Your account (X) is not in ADMIN_OPERATOR_EMAILS…` when allow-list mismatch
  - `intelligence: encryption key unavailable` when KEK env missing/malformed
  Each message is a copy-pasteable signpost to the fix step in `docs/auth.md`.

### Activation runbook (one-time bootstrap)

Full version: `docs/auth.md` § Activation runbook — Administrator section.

```
1. Supabase Studio → Authentication → Users → Add user (email + strong password · Auto Confirm ✅)
2. Vercel env (Production · Sensitive):
     AUTH_ENABLED=true · NEXT_PUBLIC_AUTH_ENABLED=true
     ADMIN_OPERATOR_EMAILS=miguel.sambricio@metcub.com
     INTELLIGENCE_SESSION_ENC_KEY=$(openssl rand -base64 32)
     INTELLIGENCE_SESSION_ENC_KEY_ID=v1
3. /login → sign in
4. /user/admin/integrations/hosteltur → Provision Credentials → encrypted store
5. Verify badge transitions Not Provisioned → Active · Encrypted
```

### Rollback

`AUTH_ENABLED=false` on Vercel → redeploy → middleware reverts to no-redirects, session refresh continues (harmless), `/user/admin` becomes anonymous again. Stored credentials untouched.

### Build characteristics

`pnpm typecheck` clean · `pnpm build` clean. No new routes; only middleware scope + error-message clarity.

---

## 2026-05-12 — Option B credential model · admin-provisioned, encrypted-at-rest T1 + T2

Pivoted the institutional intelligence architecture from "credentials in Vercel env vars" (Option A) to "credentials encrypted-at-rest in Supabase, managed via admin UI" (Option B). HotelVALORA becomes the operational console — no more terminal-only credential workflows.

### Architecture delta

The original Option A approved during the Hosteltur architecture review separated T1 (raw credentials → Vercel env only) from T2 (encrypted sessions → Supabase). Operationally that forced every credential change through `vercel env add`. Option B unifies T1 and T2 under the same KEK + AES-256-GCM model — symmetric with the session-storage risk already accepted in migration 0009.

Preserved guarantees:
- ✓ No plaintext credentials persisted (AES-256-GCM at rest)
- ✓ No credentials in logs (redact() utility · server-only)
- ✓ No credentials in audit rows (only event kind + slug + actor)
- ✓ No frontend exposure (server-only imports · NEXT_PUBLIC_* impossible)
- ✓ Service-role-only RLS (defence-in-depth via revoke all on anon + authenticated)

### Database

Migration `0010_intelligence_source_credentials.sql` (applied to live Supabase 2026-05-12):

- Table `public.intelligence_source_credentials` — username + password each encrypted with independent IV + auth tag, status enum (active · rotated · invalidated), rotation_count, last_rotated_by, last_login_at + status + error, enc_key_id for KEK rotation.
- Table `public.intelligence_credentials_audit` — append-only lifecycle log, event_kind enum (provisioned · rotated · invalidated · auth_success · auth_failure · decryption_error), actor_user_id, sanitised detail jsonb, sanitised error text.
- Partial unique index `where status='active'` so exactly one active credential per source.
- RLS enabled · zero policies · `revoke all on anon, authenticated` for defence-in-depth.

Verified post-apply:
```
intelligence_source_credentials  · rls=on · 0 policies · anon=deny · auth=deny
intelligence_credentials_audit   · rls=on · 0 policies · anon=deny · auth=deny
intelligence_source_sessions     · rls=on · 0 policies · anon=deny · auth=deny
```

Note: migration 0009 also applied in the same wave (had been review-pending; user reviewed during Option B confirmation).

### Server-only credentials infrastructure

- `lib/intelligence/crypto.ts` — AES-256-GCM primitives. 32-byte KEK, 12-byte random IV per encryption, 16-byte GCM auth tag verified on decrypt, enc_key_id versioning for rotation. `assertCryptoConfigured()` for runtime preflight.
- `lib/intelligence/credentials-store.ts` — the only module that touches plaintext. Public surface: `getCredentialsStatus(slug)` returns non-secret metadata only · `getCredentialsAudit(slug)` returns sanitised history · `provisionOrRotate({...})` encrypts and upserts · `invalidate({...})` marks active row inactive · `getDecryptedCredentials(slug)` reserved for the refresh script context. Independent IV per field so a decrypt failure on one cannot leak the other. bytea round-trips through PostgREST as `\x<hex>` strings (helper functions enforce the contract).
- `lib/secrets/redact.ts` — recursive credential-key allow-list redactor + `redactError()` for sanitised error persistence. Used by the audit writer + server actions.

### Server actions (auth-gated)

`app/user/admin/integrations/[integrationId]/actions.ts`:
- `provisionCredentialsAction(slug, formData)` — Zod-validated form parser → `provisionOrRotate()` → revalidate paths.
- `invalidateCredentialsAction(slug)` → `invalidate()` → revalidate paths.

Auth gate via `assertAdminContext()`:
1. Verifies Supabase user session (cookies).
2. Verifies email is in `ADMIN_OPERATOR_EMAILS` (fallback: `INTERNAL_ALERT_RECIPIENTS`).
3. Both layers independent — either failure denies.

### Admin UI · Provision / Rotate / Invalidate panel

New `CredentialsPanel` on `/user/admin/integrations/[id]` for authenticated integrations (Hosteltur · Alimarket). Surfaces:
- Status badge: `Not Provisioned` · `Active · Encrypted` · `Invalidated` · `Auth Failing`
- Telemetry grid: configured · KEK id · rotations · last rotated · last login · login status · login error (when present, rose-tinted)
- Action affordances:
  - "Provision Credentials" (first-time) / "Rotate Credentials" (when active row exists)
  - "Invalidate" with confirmation dialog (rose-tinted, requires explicit confirm)
- Inline form: username + password inputs · `autoComplete="off"` · `autoComplete="new-password"` · submitted via server action over HTTPS · encrypted server-side · form clears on submit · plaintext NEVER displayed after submission
- Audit details disclosure: last N events with kind badge + timestamp + sanitised error

### Intelligence Terminal · Authenticated Sources panel

`/user/admin/agents/market_intelligence` (the institutional terminal) gains a new `AuthenticatedSourcesPanel` reading **live** credentials status server-side via `getCredentialsStatus(slug)`. Each card shows:
- Credentials badge (Not Provisioned · Encrypted Active · Auth Failing · Invalidated)
- Session badge (Active · Expiring · Expired · Refresh Failed · Session Pending)
- Last login (relative) · rotation count · articles 7d
- Click-through to the integration detail page

The terminal page flipped from fully static to server-rendered for this slug (`dynamic = "force-dynamic"`); the rest of the agent registry remains pre-rendered.

### Verification

- `pnpm typecheck` clean
- `pnpm build` clean — 52 routes
- `/user/admin/integrations/[integrationId]` SSG kept; falls through to runtime when authenticated read needed
- RLS posture verified on all three intelligence tables (anon + authenticated cannot SELECT)
- Database TypeScript types regenerated to include the new tables

### Operator workflow change

Before (Option A):
```
operator $ vercel env add HOSTELTUR_USERNAME production
operator $ vercel env add HOSTELTUR_PASSWORD production
operator $ vercel env pull apps/web/.env.local --environment=production
operator $ pnpm intel:refresh hosteltur
```

After (Option B):
```
operator → /user/admin/integrations/hosteltur → "Provision Credentials"
        → enter email + password → "Encrypt & Store"
        → next refresh run uses the encrypted credentials
```

### Phase 3 follow-up

The refresh script (Phase 2.5 candidate) now reads from `getDecryptedCredentials(slug)` instead of env vars. The script writes back `last_login_at` + `last_login_status` + `last_login_error` (redacted) on each attempt, surfacing in the panel.

---

## 2026-05-12 — Institutional Hospitality Intelligence Terminal + Integrations admin surface

Two new admin surfaces ship as one bundle. Mock data layer shaped 1:1 against migration 0006 + 0009 so Phase 3 realtime swap is mechanical.

### `/user/admin/integrations` · Integrations directory

Hosteltur and Alimarket — the two paid Spain-market sources — surface as institutional integration tiles, **not generic feeds**. Each tile exposes every operator-relevant axis:

- **Connection status** (Operational · Degraded · Session Expired · Awaiting Credentials · Failing · Not Configured)
- **Authentication status** (No Auth · Active Session · Expiring Soon · Expired · Refresh Failed · Not Provisioned)
- **Last successful sync** (relative · ISO)
- **Ingestion health** (runs success / failed last 7d · mean items per run · last run status)
- **Session validity** (encryption key id · refreshed at · expires at · refresh count · last error · runbook hint)
- **Article volume** (today / 7d / 30d)
- **Source type** (RSS · API · Scrape · Manual) + **tier** (Public · Freemium Premium · Paid Subscription · Paid API)

Grouped on the directory page by category: Authenticated Spain (Hosteltur · Alimarket) · Public EU/ES (HospitalityNet · Expansión) · Public Global + Research (Skift · HVS · Reuters) · Deferred (CoStar · Hotel News Now · THP News). 10 SSG paths under `/user/admin/integrations/[integrationId]`.

### `/user/admin/agents/market_intelligence` · Intelligence Terminal

The Market Intelligence Agent **is the terminal**. When the agent slug is visited, the page renders `IntelligenceTerminal` instead of the standard agent dashboard:

- **Volume KPI strip** — 6 tiles · articles today / 7d / transactions detected / pipeline projects / disclosed deal volume / authenticated-source health
- **High-relevance alerts band** — critical + high items pulled forward · rose-tinted card border for institutional urgency
- **Source-coverage matrix** — per-source ingest health · links each row into `/user/admin/integrations/<id>`
- **Category breakdown** — horizontal bars by `news_category` (acquisition · sale · JV · development · refinancing · rebranding · operator_change · branded_residences · flex_living · pipeline_announcement · distress · investment · other)
- **Trending entities** — investors + operators ranked by 7d mentions · last-seen + trend delta per row
- **Extracted deals + projects table** — every field the underwriting pipeline cares about: rooms · price · €/key · cap rate · buyer · seller · operator · brand · buy-side advisor · sell-side advisor · capex · estimated opening · original source URL on every row
- **Latest intelligence feed** — full news items with title · source · publication date · country · market · category · tags · entity chips (role · raw mention) · hotel segment · brand affiliation · relevance score · **original source URL preserved verbatim** as a footer trace link

### Data layer · swap-target shape

| Mock module | Real DB target (Phase 3) |
|---|---|
| `lib/admin/integrations/registry.ts` | `public.sources × intelligence_source_sessions × news_ingestion_runs (7d rollup)` |
| `lib/admin/intelligence/data.ts` `recentNews` | `public.market_news` + joined `news_tags`, `news_entities` |
| `extractedDeals` | `public.hotel_transactions` joined to `market_news`, `investors`, `operators` |
| `extractedProjects` | `public.hotel_projects` joined to `market_news`, `investors`, `operators` |
| `entityMentions` rollup | `public.news_entities` grouped by `(entity_kind, entity_id, role)` |
| `categoryBreakdown` rollup | `market_news` grouped by `category` |
| `sourceCoverage` rollup | `news_ingestion_runs` grouped by `source_id` |
| `relevanceAlerts` filter | `market_news` where `relevance_band in ('critical','high')` |

### Original-URL preservation contract

Every news item, deal, project, and alert exposes its source URL verbatim — no UTM injection, no canonical rewrite, no parameter mutation. Load-bearing for institutional traceability: an analyst can click any extracted price/room/buyer cell through to the article that produced it, a compliance audit can verify the corpus against the source-of-truth, a re-ingestion run can re-fetch canonically.

### Navigation integration

- AdminSidebar gains an `Integrations` primary nav entry (Plug icon · `Live` badge)
- Executive Control Room renumbers from 5 sections → 6 with `Section 03 · Integrations` inserted between AI Operations (02) and Data Pipeline (04). Section 03 surfaces the 3 most-relevant integrations (Hosteltur · Alimarket · HospitalityNet) with a right-slot "View directory" CTA.
- The market_intelligence agent route preserves SSG and the `/user/admin/agents` directory; only the rendered body changes.

### Visual contract

Bloomberg-terminal aesthetic throughout — dark `forest-900 → slate-950` panel canvases, `lime-300` numerals, tracked-out `[0.18–0.25em]` uppercase micro-labels, `font-mono` timestamps + tickers + structured fields, 4-signal tint system (`ok / warn / error / neutral`) reused from `signal-tints.ts`, per-category tints (acquisition/sale=ok · refinancing/development=warn · distress=error · rebrand=neutral).

### Build characteristics

`pnpm typecheck` clean · `pnpm build` clean — 52 routes total · `/user/admin/integrations` 94.9 kB First Load · `/user/admin/integrations/[integrationId]` SSG with 10 pre-rendered paths. Mock data only; no Supabase reads added.

### Phase 3 path (mechanical swap)

`getTerminalData()` and `getIntegrations()` become server-side reads against the live tables. Components stay unchanged. Realtime subscriptions (Supabase Realtime on `ai_agent_runs` + `market_news`) are a Phase 4 follow-up.

---

## 2026-05-12 — Documentation stabilization wave (debt cleanup · admin surface · enforcement · legacy archive)

Four-phase synchronization pass after the documentation audit revealed that the discipline relied on human memory and fell behind the platform work shipped on 2026-05-11. No new doc surface added — only catch-up, admin coverage, automation, and structural cleanup.

**Phase 1 — Debt cleanup**
Caught up `docs/changelog.md` (+3 entries for the production redirect fix, the Hobby cron unblock, and the institutional Admin UI bundle), repaired `docs/roadmap/current-sprint.md` (duplicate entries removed, "Up Next" sequentialised, "Just Shipped" backfilled), refreshed `docs/HOTELVALORA_MASTER_SYSTEM.md` (modules · runtime reality · next priorities), updated `docs/ai-agents/ai-agent-roadmap.md` registry counts (Tier 0 CEO + 9 operational + 1 hidden + 1 legacy = 12), documented the AI-Ops env var surface in `docs/infrastructure/environment-variables.md` (`CRON_SECRET` · `INGESTION_AUDIT_TOKEN` · `INTERNAL_ALERT_RECIPIENTS` with activation recipes).

**Phase 2 — Admin UI documentation**
Added `docs/features/admin.md` (11-section feature dossier — routes · navigation · 5-section Executive Control Room · AI Ops Center · component tree · mock data · status mapping) and `docs/architecture/admin-ui-architecture.md` (11-section technical architecture — goals · route+layout · mock data swap-target · component architecture · interaction state · light vs dark canvas · Phase 3 realtime path · build characteristics · edge cases · anti-patterns rejected · file map). Extended `docs/routing.md` with the three `/user/admin/*` routes plus the HTTP redirect table, and `docs/design-system/components.md` with the **Admin / Operations Center** primitive family + `signal-tints` contract + Bloomberg-terminal patterns + updated selection guide.

**Phase 3 — Documentation enforcement (`scripts/docs-audit.mjs`)**
Standalone Node script (no deps) that detects synchronization drift on every run. Four checks: (1) changelog drift — every commit on main since the last entry must appear in `docs/changelog.md`; (2) size caps — `ENTRYPOINTS.md` ≤ 200 lines · `AI_CONTEXT.md` / `RULES.md` ≤ 300 lines; (3) master docs freshness — `Last refreshed: YYYY-MM-DD` ≤ 1 day behind the latest commit on main; (4) sprint freshness — `current-sprint.md` `Updated YYYY-MM-DD` ≤ 1 day behind. Modes: human report (default), `--json`, `--strict` (CI). Critical failures exit 1. Uses `execFileSync` with arg arrays to survive Windows cmd.exe `%ad` interpretation.

**Phase 3.5 — Surfaced debt cleared**
First green-light run after Phase 3 surfaced three pre-existing items: catch-up consolidation for the 13 pre-stabilization commits (this entry), missing "Last refreshed" stamp on `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md`, and `ENTRYPOINTS.md` size bloat (357 lines vs 200 cap — filed as a backlog item, not in scope for this wave).

**Phase 4 — Legacy root docs archive**
Moved 10 superseded top-level `.md` files into `docs/legacy/` (frozen archive): `ARCHITECTURE.md` · `ARCHITECTURE_SCORECARD.md` · `CHANGELOG.md` · `COMPONENTS.md` · `NEXT_PHASE_PLAN.md` · `REPORT_PAGES.md` · `ROADMAP.md` · `TECH_AUDIT.md` · `TODO.md` · `UI_COMPONENTS.md`. Each maps cleanly to a current source-of-truth (mapping table in `docs/legacy/README.md`). Root surface now consolidates to five active AI-facing files: `AI_CONTEXT.md` · `CLAUDE.md` · `ENTRYPOINTS.md` · `README.md` · `RULES.md`. Updated `README.md` and `ENTRYPOINTS.md` to drop legacy references.

Operating principle locked in by this wave: **the documentation surface is already strong enough — the problem is synchronization and enforcement, not coverage**. Future PRs should not expand the surface; they should keep it green.

Wave landed as a single commit: `c61d7f6` (26 files · +1133/-41).

### Pre-stabilization platform commits formally referenced

This wave consolidates documentation for the platform work shipped on 2026-05-11 that was not previously cross-referenced in the changelog header. Audit closure (each SHA is the canonical reference; full feature commentary lives in the dedicated entries further down this file):

- `9001c84` — feat(ai-ops): separate market warehouse ingestion from underwriting compset operations
- `fe00f6a` — feat(costar): initialize institutional hospitality market intelligence workspace
- `fdda651` — feat(audit): unify Data Ingestion audit chain (CLI <-> cloud)
- `f705c70` — feat(data): build Data Ingestion Agent for workspace (Phase 2.3.b)
- `6529cfe` — feat(data): initialize institutional transactions ingestion workspace
- `ecd70ad` — feat(ai-ops+intel): Phase 2 · Tier 1 agent runtime + Intelligence ingestion pipeline
- `e490e98` — feat(analytics): wire Vercel Analytics in the root layout
- `e6ec45c` — docs(ai): add CEO / Orchestration Agent (Tier 0) to AI Operations Layer
- `7b841c5` — docs(ai): initialize HOTELVALORA intelligence + AI operations layer architecture
- `3158615` — feat(intelligence): initialize HOTELVALORA hospitality intelligence engine architecture
- `8d6f078` — feat(email): Resend leaves sandbox · verified domain delivery
- `32b1cd2` — fix(auth): silence /api/auth/session 500s · remove dead SessionProvider
- `23139bd` — docs(infra): record Resend audit findings (2026-05-11)

---

## 2026-05-12 — Production redirect fix for /admin · /settings/admin · /user

App Router page-level `redirect()` from `next/navigation` packs the redirect into an RSC error digest (`NEXT_REDIRECT;replace;<target>;307`). Works for client-side router navigation; **fails cold browser GETs and external links** because it does NOT emit an HTTP Location header. Verified in production: `/settings/admin` returned 307 with no Location, browsers showed a blank `__next_error__` page.

Migrated the three defensive redirects to `next.config.mjs` `redirects()` rules — proper HTTP-level 308/307 with Location headers, universally followable by browsers / curl / crawlers / bookmarks.

| Source | Target | HTTP |
|---|---|---|
| `/admin` + `/admin/<path>` | `/user/admin[/path]` | **308 Permanent** |
| `/settings/admin` + `/settings/admin/<path>` | `/user/admin[/path]` | **308 Permanent** |
| `/user` | `/user/admin` | **307 Temporary** |

Deleted the three page-level stubs that were producing the broken RSC redirect:
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/settings/admin/page.tsx`
- `apps/web/src/app/user/page.tsx`

Verified in production via curl: 308 status + `Location: /user/admin` + chain follow lands at HTTP 200. (Commit `ebe5504`.)

---

## 2026-05-12 — Hobby plan cron limitation unblocked production deploys

Diagnosed a 3-hour deploy stall: **no commit since `df23107` (Speed Insights) had reached production**. All Admin UI work, the costar workspace, the compset workspace, and the market-vs-underwriting split sat unpublished.

Root cause: `vercel.json` added a `0 * * * *` (hourly) cron for the QA Monitoring agent. Vercel's Hobby plan only permits **daily** crons, so every subsequent build silently failed at the deploy step with `Hobby accounts are limited to daily cron jobs`.

Fix: changed the QA cron to `30 9 * * *` (daily 09:30 UTC, no collision with the existing two crons). Trade-off: QA probes drop from hourly to daily until the project moves to Pro — agent code unchanged, only the schedule. (Commit `e93b573`.)

---

## 2026-05-12 — Institutional Administrator section + AI Operations Center UI

The visual layer for the AI Operations Layer plus a defensive entry-point lattice. Four commits land this end-to-end.

### Routes shipped (Next.js App Router, SSG where possible)

```
/user/admin                          Executive Control Room (5-section dashboard)
/user/admin/agents                   AI Operations Center (orbital + directory)
/user/admin/agents/[agentId]         Per-agent dashboard (11 paths SSG · CRM kept hidden)
```

Plus three defensive redirects to absorb the natural URLs operators type:
`/admin`, `/settings/admin`, `/user` — all route to `/user/admin`.

### Executive Control Room (`/user/admin`)

Five institutional sections, Bloomberg-terminal aesthetic on a dark forest-900 / slate-950 canvas with lime-300 accents and tracked-out micro-labels:

| # | Section | Contents |
|---|---|---|
| 01 | Executive Overview | 10 KPI tiles (Platform Status · Agents Active · Last Deploy · Last Cron · Data Freshness · New Tx · New Projects · UW Jobs · Error Alerts · Infra Health) |
| 02 | AI Operations Center | Featured card · mini orbital glyph · CTA into /user/admin/agents |
| 03 | Data Pipeline Center | 6 cards (CoStar · Transactions · Projects · Market Intel · CompSet · Reports) |
| 04 | Infrastructure Monitoring | 6 services (Vercel · Supabase · Resend · Cron · Storage · API) with subtle operational pulse |
| 05 | Recent Operational Activity | Timeline with channel labels (AGENT / INGEST / CRON / DEPLOY / AUDIT / INFRA) |

### AI Operations Center (`/user/admin/agents`)

Orbital architecture: CEO Agent at the centre (Tier 0 · supervisory · never an executor); 9 operational agents in orbit (Market Intelligence · Data Ingestion · COSTAR Admin · CompSet Builder · QA Monitoring · CFO · CMO · Customer Support · Underwriting); supervisory threads back to the CEO with stroke colour mirroring agent status; 4-light readout per node (**ACTIVE · IDLE · WARNING · ERROR**); click → right-side `AgentDetailPanel` slides in (640px · ESC closes · scroll-lock) with mission / operational state / responsibilities / linked systems / operational metrics / latest events / current blockers / future integrations / references.

COSTAR Admin + CompSet Builder render as **WARNING** with `statusLabel: "Configured · Manual"` and explicit currentMode text per user specification — "Configured but not operational yet".

### Component tree

```
apps/web/src/components/admin/
├── admin-sidebar.tsx                Brand block · primary nav · planned nav · sign-out
├── agents/
│   ├── agent-orbit.tsx              Radial SVG layout · 9 positions · supervisory threads
│   ├── agent-node.tsx               Round chip · 4-light readout · onSelect OR Link
│   ├── agent-detail-panel.tsx       Right-side slide-out · sectioned content
│   ├── agent-dashboard.tsx          Per-agent full page composition
│   ├── agent-status-badge.tsx       Pill with light-canvas tints
│   ├── agent-health-ring.tsx        SVG ring · stroke-dasharray progress
│   ├── agent-logs-panel.tsx         Bloomberg log feed (monospace)
│   └── agent-metrics-panel.tsx      KPI grid 2/4-col responsive
└── dashboard/
    ├── signal-tints.ts              OK / WARN / ERROR / NEUTRAL contract
    ├── kpi-card.tsx                 Dark-canvas KPI tile + side rail
    ├── ai-ops-feature-card.tsx      Featured CTA + mini orbital glyph
    ├── pipeline-card.tsx            Pipeline status card
    ├── infra-indicator.tsx          Operational pulse indicator
    └── activity-timeline.tsx        Channel-labelled timeline
```

### Mock data layer

```
apps/web/src/lib/admin/
├── agents/                          11-agent registry (CEO + orbital + hidden CRM)
└── dashboard/                       10 KPIs + 6 pipelines + 6 infra + 8 activity
```

### Navigation integration

- AppHeader gains an `ADMIN` pill (lime accent when active) next to BIBLIOTECA + USUARIO
- Settings sidebar gains a featured `Administrator · Operations Center` CTA card at the bottom — visible on every `/settings/*` page
- All entry points route to real Next.js URLs (no hash navigation)

### Build/lint

`pnpm typecheck` clean · `pnpm build` clean — 50 routes generated · `/user/admin` 117 KB First Load · `/user/admin/agents/[agentId]` SSG with 11 pre-rendered paths.

### Future realtime strategy (Phase 3)

Mock data layer is a swap-target. Agent statuses become a Supabase Realtime subscription on `ai_agents` + `ai_agent_runs`. Executive KPIs become aggregations over `ai_agent_runs` + per-workspace `INGESTION_LOG`. Recent activity becomes an `ai_events` stream. Components do not change.

Commits in this entry: `80b8462` (initialize) · `3e326eb` (real routing fix) · `037bd4c` (institutional ops center) · `f9d385a` (featured CTA + redirects).

---

## 2026-05-11 — Market warehouse vs underwriting operations: formal separation

Architectural decision that splits the previously-monolithic CoStar workspace into two distinct operational layers owned by two distinct agents. The split is load-bearing for scalability, auditability, operational clarity, and cost containment — see `docs/architecture/market-vs-underwriting-separation.md` for the full rationale.

### Workspace restructuring

**`services/costar/`** (market warehouse, owned by CoStar Market Data Agent):
- `COMPSET/` directory + `COSTAR_MASTER_COMPSETS.xlsx` removed
- `CLASS/{INPUT,old.class}/` added — chain-scale aggregates at country OR market level
- `COSTAR_MASTER_CLASS.xlsx` generated (41 cols: 27 domain + 14 ingestion-meta)
- `costar_class_import_template.csv` added
- `scripts/build_masters.py` bumped to normalisation **v1.1**
- `.gitignore` + templates README + workspace README updated to reflect new granularities

**`services/compset/`** (operational underwriting workspace, NEW — owned by CompSet Underwriting Agent):
- Full scaffold: `MASTER/`, `INPUT/`, `old/`, `staging/{failed,review,temp}/`, `templates/`, `logs/`, `docs/`, `scripts/`
- Two canonical XLSX masters:
  - `COMPSET_MASTER.xlsx` (48 cols: 34 domain + 14 meta) — subject + compset KPIs + MPI/ARI/RGI time series. Schema unchanged from the previous costar location.
  - `HOTEL_POSITIONING_MASTER.xlsx` (55 cols: 41 domain + 14 meta) — NEW — per-hotel underwriting positioning snapshots with forward assumptions (ADR / occupancy / RevPAR / valuation anchor / cap rate / confidence / risks).
- `.gitignore`, `.gitkeep` markers, `scripts/build_masters.py`, 2 csv operator templates, workspace README, templates README

### DB migrations applied

- `market_vs_underwriting_split_enum_extend` — adds `costar_market_data` + `compset_underwriting` to the `ai_agent_id` enum
- `market_vs_underwriting_split_seed_agents` — seeds 2 registry rows in `public.ai_agents` with full charters (responsibilities, workflows, KPIs, escalation rules, config including tier + cost caps + workspace + escalation channel) in jsonb. Both ship as `status='planned' / enabled=false` — they activate when their Phase 2.x deliverables land.

Agent registry is now 12 rows. Active operational ecosystem stays at 3 Tier-1 agents in beta (Market Intelligence + Data Ingestion + QA / Monitoring).

### New documentation

- `docs/architecture/market-vs-underwriting-separation.md` — the load-bearing architectural decision
- `docs/agents/costar-market-data-agent.md` — agent charter (Tier 1, owns `services/costar/`)
- `docs/agents/compset-underwriting-agent.md` — agent charter (Tier 2, owns `services/compset/`)
- `docs/agents/ceo-agent-supervision-layer.md` — expanded CEO charter for the two-workspace supervision model
- `docs/intelligence/costar-class-schema.md` — full column reference for COSTAR_MASTER_CLASS
- `docs/intelligence/hotel-positioning-schema.md` — full column reference for HOTEL_POSITIONING_MASTER
- `docs/intelligence/compset-schema.md` — renamed from `costar-compset-schema.md`, content updated for new workspace home

### CEO Agent charter expansion

The CEO / Orchestration Agent (still `planned`) gains explicit supervisory responsibilities for both new agents per `docs/agents/ceo-agent-supervision-layer.md`:
- Hourly health probes on both `services/*/MASTER/INGESTION_LOG` sheets
- Cascading refresh coordination (Q1 market refresh → triggers downstream positioning refreshes)
- Market freshness escalations (CoStar warehouse > 60d stale → warning)
- Positioning freshness escalations (active hotel snapshot > 120d → warning)
- Circuit-breaker pattern (Phase 4) — temporarily pause misbehaving agents via `ai_agents.enabled=false`

### Updates to existing docs

- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — now lists FOUR ingestion branches with explicit agent ownership
- `docs/intelligence/ingestion-pipeline.md` — four-branch header (A: news / B: transactions / C: costar warehouse / D: compset operational)
- `docs/intelligence/costar-master-dataset-architecture.md` — four-workbook decision rewritten with CLASS replacing COMPSET
- `docs/intelligence/costar-ingestion-workflow.md` — four pipelines updated, CoStar Market Data Agent named as owner
- `docs/intelligence/costar-normalization-rules.md` — bumped to v1.1, compset section moved out, class section added
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — 12-agent roster table added; supervision split between 3 operational ingestion agents
- `docs/ai-agents/ai-agent-architecture.md` — supervision layering section added (runtime + CEO are separate concerns)
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.d.0 marked done, Phase 2.3.d.1 + 2.4.0 + 2.4.1 added

### Scaling implications

Per `docs/architecture/market-vs-underwriting-separation.md` §7: the separation supports geographic expansion (Spain → Europe → US → LatAm → MEA → APAC) without redesigning the agent roster. New countries add ROWS to the warehouse; new hotels add ROWS to compset. Neither expansion adds new agents or new workspaces.

### Build/lint

No application code touched. `pnpm typecheck` clean. Two new directory trees live entirely outside `apps/web` — Next.js build unaffected.

### Files added (~38 files + ~2400 LOC of architectural docs)

- `services/costar/CLASS/{INPUT,old.class}/.gitkeep` (×2)
- `services/costar/MASTER/COSTAR_MASTER_CLASS.xlsx`
- `services/costar/templates/costar_class_import_template.csv`
- `services/compset/` workspace tree (2 MASTER xlsx + 6 .gitkeep + .gitignore + scripts/build_masters.py + 2 csv templates + 2 READMEs)
- `docs/agents/{costar-market-data-agent,compset-underwriting-agent,ceo-agent-supervision-layer}.md`
- `docs/architecture/market-vs-underwriting-separation.md`
- `docs/intelligence/{costar-class-schema,hotel-positioning-schema}.md`

### Files renamed
- `docs/intelligence/costar-compset-schema.md` → `docs/intelligence/compset-schema.md`

### Files deleted
- `services/costar/COMPSET/INPUT/.gitkeep` + `services/costar/COMPSET/old.compset/.gitkeep`
- `services/costar/MASTER/COSTAR_MASTER_COMPSETS.xlsx`
- `services/costar/templates/costar_compset_import_template.csv`

### Files updated
- `services/costar/{.gitignore, README.md, scripts/build_masters.py, templates/README.md, MASTER/*.xlsx}`
- `docs/intelligence/{HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM, ingestion-pipeline, costar-master-dataset-architecture, costar-ingestion-workflow, costar-normalization-rules, compset-schema}.md`
- `docs/ai-agents/{AI_OPERATIONS_LAYER_MASTER_SYSTEM, ai-agent-architecture, ai-agent-roadmap}.md`
- `docs/roadmap/current-sprint.md`
- `docs/infrastructure/service-status.md`
- `ENTRYPOINTS.md`

---

## 2026-05-11 — Institutional CoStar hospitality market intelligence workspace (Phase 2.3.d.0)

Scaffolded the second institutional ingestion workspace at `services/costar/`. This is **not a document repository** — it is the normalized hospitality intelligence warehouse + benchmark database layer + underwriting market intelligence substrate. Parallel to `services/transactions/`, sharing the same primitives (ingestion-meta block, append-only discipline, .gitignore posture).

### Directory created (Phase 1 scope — no automation yet)

```
services/costar/
├── MASTER/                              ← 4 canonical XLSX corpora (tracked in git)
├── PAIS/INPUT/ + PAIS/old.pais/         ← country-level operator drops · not tracked
├── MERCADO/INPUT/ + MERCADO/old.mercado/         ← market-level · not tracked
├── SUBMERCADO/INPUT/ + SUBMERCADO/old.submercado/  ← submarket-level · not tracked
├── COMPSET/INPUT/ + COMPSET/old.compset/         ← compset-level · not tracked
├── staging/{failed,review,temp}/        ← operational artefacts · not tracked
├── templates/                           ← 4 operator CSV templates + README · tracked
├── logs/                                ← per-ingestion jsonl · not tracked
├── docs/                                ← workspace-specific notes · tracked
└── scripts/build_masters.py             ← reproducible master generator · tracked
```

### Four MASTER workbooks (generated by `scripts/build_masters.py`)

| Master | Granularity | Domain cols | Total cols | KPI signature |
|---|---|---|---|---|
| `COSTAR_MASTER_PAIS.xlsx` | Country | 25 | 39 | Occupancy + ADR + RevPAR + macro (GDP, inflation, tourism arrivals) |
| `COSTAR_MASTER_MERCADOS.xlsx` | Market | 26 | 40 | Same + revpar_index_vs_country + seasonality_index |
| `COSTAR_MASTER_SUBMERCADOS.xlsx` | Submarket | 27 | 41 | Same + chain_scale + segment_type breakdowns + revpar_index_vs_market |
| `COSTAR_MASTER_COMPSETS.xlsx` | Compset (per target hotel) | 34 | 48 | Subject KPIs + compset KPIs + MPI / ARI / RGI indices + fair_share + RevPAR premium |

All four reuse the **identical 14-column ingestion-meta block** from `transactions/` — the Data Ingestion Agent treats both workspaces with the same routing + dedup + audit shape. Same 5-sheet layout (DATA · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README).

### Strict separation: four parallel pipelines, no merged dataset

Country, market, submarket, compset have different schemas, granularity, KPIs, aggregation logic, and underwriting relevance. They share infrastructure but never share a DATA sheet. Mixing them once would force endless filters on every analyst query.

### SOURCES_REGISTRY (CoStar-specific vocab)

| source_kind | Tier | Notes |
|---|---|---|
| `costar` | A | Authoritative — institutional, paid product. The canonical source. |
| `str` | A | STR (CoStar subsidiary) — same provenance; preserve attribution. |
| `kalibri` | B | Operator analytics — useful for cross-validation. |
| `curated` | A | Hand-maintained HOTELVALORA spreadsheets — ground-truth. |
| `manual` | C | Operator-typed row. |

### Documentation — 7 new architecture docs in `docs/intelligence/`

- `costar-ingestion-workflow.md` — operator + agent workflow, four parallel pipelines, 13-stage lifecycle, failure modes
- `costar-master-dataset-architecture.md` — why XLSX now · why four masters · 5-sheet layout · cross-workspace consistency with `transactions/` · XLSX → Supabase Phase 5 plan
- `costar-normalization-rules.md` — field-by-field canonicalisation, period-form parsing, currency rule (Phase 1 refuses silent FX), index sanity ranges, restatement detection
- `costar-country-schema.md` — 25 domain + 14 meta cols, macro context columns
- `costar-market-schema.md` — 26 domain + 14 meta cols, positioning + seasonality
- `costar-submarket-schema.md` — 27 domain + 14 meta cols, chain_scale + segment_type axes
- `costar-compset-schema.md` — 34 domain + 14 meta cols, full subject + compset + MPI/ARI/RGI contract, compset composition change handling

### Updates to existing docs

- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — now lists three ingestion branches (automated news + transactions/projects masters + costar warehouse)
- `docs/intelligence/ingestion-pipeline.md` — three-branch header (A: news / B: transactions / C: costar)
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — Data Ingestion Agent supervises both institutional workspaces with the same primitives
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.d.0 (workspace scaffold) flipped ✅, Phase 2.3.d.1 (CLI pipeline) added as next deliverable

### Cross-workspace architectural consistency

The decision to share primitives between `transactions/` and `costar/` is deliberate:

| Primitive | Same across both workspaces? |
|---|---|
| 14-column ingestion-meta block | ✅ identical |
| 5-sheet workbook layout | ✅ identical |
| `.gitignore` posture (track contract, not data) | ✅ identical |
| `scripts/build_masters.py` pattern | ✅ identical |
| Data Ingestion Agent routing logic | ✅ shared (Phase 2.3.d wires costar with the same primitives as 2.3.b wired transactions) |
| Audit-chain unification via `/api/agents/data-ingestion-summary` | ✅ shared cloud endpoint |
| SOURCES_REGISTRY vocab | ⚪ different per domain |

This consistency means a Phase 5 Postgres migration migrates **both** workspaces at once with shared infrastructure (`public.market_periods` + `public.compset_periods` for costar, `public.hotel_transactions` + `public.hotel_projects` for transactions).

### Strategic role

The CoStar corpus feeds four downstream consumers:

- **Underwriting Engine** — country/market/submarket KPIs become the macro substrate behind every valuation
- **Compset Benchmarking** — MPI / ARI / RGI per target hotel underpin institutional reporting and Library positioning
- **Market Observatory** — submarket time-series fuels the Market Overview report section
- **AI-assisted Underwriting (Phase 4+)** — Market Intelligence Agent reads the masters for cross-asset enrichment

### Initial datasets ready to ingest

Per the strategic plan, the corpus seeds with:

- Spain hospitality market data (PAIS row for ES)
- Madrid hospitality market data (MERCADOS row)
- Madrid submarket data (SUBMERCADOS rows for Salamanca, Centro, Aeropuerto, etc.)
- Compset data for the 5 portfolio hotels (one COMPSETS row per period per hotel)

Once Phase 2.3.d.1 ships the CLI, this enables HOTELVALORA to generate complete institutional hotel reports, market benchmarking, compset benchmarking, underwriting-ready intelligence, and market positioning analysis for any of the 5 compset hotels.

### Build/lint

No application code touched. `pnpm typecheck` clean. The new directory tree lives entirely outside `apps/web` — Next.js build is unaffected.

### Files added (~30 new files + ~2200 LOC of architectural docs)

- `services/costar/` workspace tree (4 MASTER xlsx + 12 .gitkeep + .gitignore + scripts/build_masters.py + 4 csv templates + 2 READMEs)
- `docs/intelligence/costar-{ingestion-workflow,master-dataset-architecture,normalization-rules,country-schema,market-schema,submarket-schema,compset-schema}.md`

### Files updated
- `docs/intelligence/{HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM,ingestion-pipeline}.md`
- `docs/ai-agents/{AI_OPERATIONS_LAYER_MASTER_SYSTEM,ai-agent-roadmap}.md`
- `docs/roadmap/current-sprint.md`
- `docs/infrastructure/service-status.md`
- `ENTRYPOINTS.md`

---

## 2026-05-11 — Data Ingestion audit-chain unification (Phase 2.3.c)

The Python CLI and the cloud-runtime TS agent now both record their runs in the same `ai_agent_runs` table. `public.ai_agent_runs` is the single audit lens across both halves of the Data Ingestion Agent.

### Cloud endpoint — `POST /api/agents/data-ingestion-summary`

- **Auth:** `Authorization: Bearer $INGESTION_AUDIT_TOKEN` (shared secret, same posture as the cron routes). Denies in production when the env var is unset.
- **Body:** `{ python_ingestion_runs: FileOutcome[] }` — zod-validated array of 1–100 per-file summaries (target, source_file, outcome, row counts, review_reasons, failed_reasons, normalization_version, operator_email, python_ingestion_id).
- **Side effects per file:**
  - Insert one `ai_agent_runs` row with `agent_id='data_ingestion'`, `trigger_kind='manual'`, `status=outcome`, `metadata.python_ingestion_id` for cross-reference, `metadata.source='cli_audit_sync'`.
  - Emit one `ai_events` row, `kind='custom'`, `payload.kind='data_ingestion_staged'`, source=`agent:data_ingestion:cli`, carrying the run_id + python_ingestion_id so QA / Monitoring can react.
- **Response:** `{ ok, cloud_runs: [{ python_ingestion_id, ai_agent_run_id, ai_event_id }], failures }`. HTTP 200 (all ok) / 207 (partial) / 500 (none recorded).

### CLI side — `audit_sync.py`

- Pure-stdlib (`urllib`), no extra dep on the operator's machine.
- `build_file_outcome()` builds one payload element; `sync_outcomes()` POSTs the batch.
- One retry on transient network/timeout; no retry on 4xx (auth/payload bugs).
- 12s timeout per request, TLS validated.
- Reads `INGESTION_AUDIT_URL` + `INGESTION_AUDIT_TOKEN` from env; CLI flags override.

### Wiring in `ingest.py`

After every successful `run_target()` (post-archive), the CLI builds the outcomes payload from the in-memory results and calls `audit_sync.sync_outcomes()`. New CLI flags:

- `--no-audit` — skip the unification step entirely
- `--audit-url` — override env var
- `--audit-token` — override env var

`--dry-run` implicitly disables audit-sync (there's nothing to sync — MASTER was not committed).

### Soft-fail philosophy

The cloud is a **downstream mirror**. If the POST fails (network, auth, payload validation):

1. The CLI prints a clear soft-fail message naming the problem.
2. The CLI prints a recovery hint (set the token, or pass `--no-audit`).
3. **The local run is not rolled back.** MASTER + INGESTION_LOG + local jsonl remain the source of truth.
4. The CLI still exits 0 unless the local run itself was catastrophic.

Verified smoke paths:
- `--no-audit` → audit-sync skipped, local run completes cleanly.
- Audit enabled, `INGESTION_AUDIT_TOKEN` unset → soft-fail message printed, exit 0.

### Operator action required

Set `INGESTION_AUDIT_TOKEN` on Vercel and locally **before** the next CLI run. Until then, every CLI run will print the soft-fail hint (and the cloud `ai_agent_runs` table will not reflect operator-side runs).

```bash
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN" | vercel env add INGESTION_AUDIT_TOKEN production
export INGESTION_AUDIT_TOKEN="$TOKEN"  # add to ~/.bashrc or ~/.zshrc
```

### Docs touched
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.c flipped ⏸ → ✅
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — ai_agent_runs called out as the single audit lens
- `services/transactions/scripts/README.md` — env vars + new CLI flags + Vercel setup
- `ENTRYPOINTS.md` — new task → file mappings
- `docs/roadmap/current-sprint.md` — Just shipped + Up next bumped
- `docs/infrastructure/service-status.md` — Phase 2.3.c added to the audit lens row

### Files added
- `apps/web/src/app/api/agents/data-ingestion-summary/route.ts` (~135 LOC)
- `services/transactions/scripts/audit_sync.py` (~165 LOC)

### Files updated
- `services/transactions/scripts/ingest.py` — `--no-audit`, `--audit-url`, `--audit-token` + audit-sync call in `run_target`

### Build/lint
`pnpm typecheck` clean. No new app-bundle weight (server-only route).

---

## 2026-05-11 — Data Ingestion Agent — operator pipeline (Phase 2.3.b)

Built the Python CLI that owns the operational side of the Data Ingestion Agent: sweeps `services/transactions/INPUT_*/`, parses operator-supplied XLSX + CSV files, normalises per the rules, deduplicates against the canonical MASTER, routes valid rows to MASTER + borderline rows to `staging/review/` + broken rows to `staging/failed/`, archives processed source files to `old.*/`, writes per-run jsonl traces to `logs/`, and appends to each master's `INGESTION_LOG` sheet.

### Architectural decision — Python CLI, not Vercel Function

The cloud-runtime agent at `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` cannot touch the local filesystem (Vercel Functions are ephemeral). The workspace's INPUT_* / staging / old.*/ / MASTER xlsx all live on disk. The correct split:

- **Cloud-runtime half** (`apps/web/...`): Supabase-Storage-backed uploads, multi-user web flow (Phase 5)
- **Operator-side half** (`services/transactions/scripts/`): local filesystem operations, the workhorse today

Both share the same normalisation rules and ingestion-meta contract. A Phase 4 audit-chain unification will have the CLI POST a run summary to the cloud agent so `ai_agent_runs` becomes the single audit lens.

### Module map (services/transactions/scripts/)

| Module | Lines | Role |
|---|---|---|
| `ingest.py` | ~340 | CLI entry — sweep, parse, route, archive, log |
| `normalization.py` | ~420 | Field-by-field rules + 60+ header aliases per master |
| `master_io.py` | ~95 | Batch-in-memory MASTER append, atomic .tmp+rename save |
| `staging_io.py` | ~85 | Failed + review jsonl routing, source-file archive |
| `source_readers.py` | ~95 | Lenient XLSX + CSV readers with header folding |
| `dedup.py` | ~80 | sha256 dedup_key + content_hash helpers |
| `build_masters.py` | (pre-existing) | Reproducible MASTER generator |

Test fixture at `scripts/tests/fixtures/smoke_transactions.csv`. `requirements.txt` pins openpyxl==3.1.5.

### Smoke test verified

A 9-row fixture covering all routing decisions:
- 5 rows → MASTER (clean acquisitions, sales, JV)
- 1 row → silently skipped (same-file exact duplicate)
- 2 rows → `staging/review/` (non-EUR currency, out-of-range price)
- 1 row → `staging/failed/` (missing required `asset_name`)
- 1 source file → archived to `old.transacciones/20260511T185854Z_<short-id>_smoke_test.csv`
- 1 row → `INGESTION_LOG` sheet (outcome='partial')
- 1 file → `logs/2026-05/<ingestion_id>.jsonl` (full per-row trace)

### CLI

```bash
python services/transactions/scripts/ingest.py --target transactions
python services/transactions/scripts/ingest.py --target projects --dry-run
python services/transactions/scripts/ingest.py --target both --verbose
```

Exit codes: 0 (success/partial), 1 (catastrophic), 2 (bad args).

### Safety design

- **Batch-in-memory MASTER writes** — load → accumulate → single save at end. Crash mid-run → MASTER unchanged on disk → safe retry.
- **Atomic-ish save** — write to `.tmp`, then rename. POSIX-atomic; Windows best-effort.
- **Per-file isolation** — one file's catastrophic failure doesn't block the others.
- **Append-only contract** — never DELETE or UPDATE canonical rows. The one allowed in-place update is flipping `ingestion_status='superseded'` when a later row carries `supersedes_id`.
- **Archive collision-free** — `<YYYYMMDDTHHMMSSZ>_<short-id>_<originalname>` prefix.

### Build/lint
No application code touched. `pnpm typecheck` clean.

### New files
- `services/transactions/scripts/{__init__,dedup,normalization,master_io,staging_io,source_readers,ingest}.py`
- `services/transactions/scripts/{requirements.txt,README.md}`
- `services/transactions/scripts/tests/fixtures/smoke_transactions.csv`

### Updated files
- `services/transactions/README.md` (CLI usage, workflow flipped to live)
- `services/transactions/.gitignore` (add __pycache__)
- `docs/ai-agents/ai-agent-roadmap.md` (Phase 2.3.b flipped ⏸→✅)
- `docs/roadmap/current-sprint.md` (Just shipped + Up next bumped)
- `docs/infrastructure/service-status.md` (workspace pipeline live)

---

## 2026-05-11 — Institutional transactions + projects ingestion workspace

Scaffolded the operational substrate for HOTELVALORA's institutional transaction + project intelligence. This is NOT a simple upload folder — it is the ingest layer of a hospitality data warehouse, designed to scale into centralised transaction intelligence + underwriting enrichment + AI-assisted institutional datasets.

### Directory created (Phase 1 scope — no automation yet)
```
services/transactions/
├── MASTER/                  ← canonical XLSX corpora (tracked in git)
├── INPUT_TRANSACCIONES/     ← operator drops · not tracked
│   └── old.transacciones/   ← processed archive · not tracked
├── INPUT_PROYECTOS/         ← operator drops · not tracked
│   └── old.proyectos/       ← processed archive · not tracked
├── staging/{failed,review,temp}/  ← operational artefacts · not tracked
├── templates/               ← operator CSV templates · tracked
├── logs/                    ← per-ingestion jsonl · not tracked
├── docs/                    ← workspace-specific notes · tracked
└── scripts/build_masters.py ← reproducible master generator · tracked
```

### MASTER workbooks
- `HOTEL_TRANSACCIONES_MASTER.xlsx` — 59 cols (45 domain + 14 ingestion-meta), 5 sheets (TRANSACTIONS · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README)
- `HOTEL_PROYECTOS_MASTER.xlsx` — 50 cols (36 domain + 14 ingestion-meta), 5 sheets (PROJECTS · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README)
- Both generated by `services/transactions/scripts/build_masters.py` (openpyxl). Reproducible: `python services/transactions/scripts/build_masters.py` rebuilds them identically.
- Append-only contract: never overwrite; supersede via `supersedes_id` pointing at the prior canonical row.
- 14-column ingestion-meta block (canonical_id · ingestion_id · source_file · source_kind · source_url · ingested_at · ingested_by · normalization_version · dedup_key · review_required · review_reason · ingestion_status · supersedes_id · notes) is the institutional audit contract — identical across both masters.

### Strict separation: transactions ↔ projects
Two parallel pipelines that never mix. Different schemas, lifecycles, underwriting logic, KPIs, categorisation systems. The `category` enum, primary key (`*_uid`), and dedup key all differ. Mixing them once would force splitting them every quarter thereafter.

### Documentation — 5 new architecture docs in `docs/intelligence/`
- `transaction-ingestion-workflow.md` — operator + agent workflow, 12-stage lifecycle, failure modes, rollback policy
- `master-dataset-architecture.md` — why XLSX now · why two masters · 5-sheet layout · XLSX → Supabase Phase 5 migration plan
- `data-normalization-rules.md` — field-by-field canonicalisation contract (geography, dates, prices, entities, URLs), dedup-key construction, sanity-range filter
- `transaction-schema.md` — full 59-column reference for the transactions master
- `project-schema.md` — full 50-column reference for the projects master + lifecycle-stage supersedence

### Updates to existing docs
- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — adds operational ingestion workspace section (Branch B alongside automated news Branch A)
- `docs/intelligence/ingestion-pipeline.md` — header notes Branch A live; introduces Branch B (XLSX masters) reference
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — adds Data Ingestion Agent workspace supervision contract
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3 split: 2.3.a (manual trigger live) · 2.3.b (workspace supervision deferred)

### Git inclusion strategy
`services/transactions/.gitignore` tracks the **contract** (directory structure, MASTER xlsx, templates, scripts, schema docs) and ignores the **data** (operator-supplied imports, processed archives, staging artefacts, run logs). Operators can `git pull` to get the latest canonical and `git push` schema evolutions without committing any deal data.

### Build + lint
No application code touched. `pnpm typecheck` clean. The new directory tree lives entirely outside `apps/web` — Next.js build is unaffected.

### Future evolution
- **Phase 2.3.b**: Data Ingestion Agent reads from `INPUT_*`, runs the parser, writes to MASTER, archives to `old.*/`, writes per-row trace to `logs/`
- **Phase 5**: XLSX → Supabase migration — `public.hotel_transactions` + `public.hotel_projects` become the runtime read path; XLSX stays as operator-editable canonical
- **Phase 6**: Underwriting Agent reads MASTER + market_news to seed valuations

---

## 2026-05-11 — Phase 2 shipped: Hospitality Intelligence pipeline + Tier 1 AI agents

Bundled delivery of the two tracks that depend on each other. The Intelligence Engine produces the substrate; the Tier 1 agents operate on top of it through a deterministic runtime that becomes the foundation for all future AI systems.

### Migration applied
`phase2_tier1_runtime_and_permissions` (via Supabase MCP):
- New tool `monitoring.escalate.email` (Resend-backed internal alerts, env-pinned recipients, no per-send approval)
- Operational config written to `ai_agents.config` for `market_intelligence` ($0.20 daily cap), `data_ingestion` ($0.10), `qa_monitoring` ($0.05) — escalation_channel='resend', retention windows, approval_required_for lists
- Status flipped `planned` → `beta` + `enabled=true` on the three Tier 1 agents (CEO Agent intentionally left `planned`)
- 43 default-deny permission rows across the three agents (market: 18, data: 6, qa: 19)

### Track A — Hospitality Intelligence ingestion pipeline
- `apps/web/src/lib/intelligence/{types,fetchers,normalise,categorise,ingest}.ts` — RSS fetcher (regex XML parser, no new dep), URL canonicalisation + sha256 dedup, regex categoriser (13 news categories + tag taxonomy), per-source orchestrator with writes to `news_ingestion_runs` + `market_news` + `news_tags`
- `apps/web/src/app/api/cron/hospitality-intel/route.ts` — Bearer CRON_SECRET, runs all enabled sources, 300s budget
- `apps/web/vercel.json` — three cron entries: `48 7 * * *` (intel), `20 8 * * *` (market-intelligence agent), `0 * * * *` (qa-monitoring)
- `apps/web/src/app/dev/intelligence-test/page.tsx` — env probe + sources catalogue + last 10 runs + corpus-by-category (30d)
- Scrape + API sources stubbed: alimarket, costar-news, hotelnewsnow, thp-news report `status=success / items_seen=0 / metadata.note='scrape_not_implemented_phase2'` so QA Agent can surface them

### Track B — Tier 1 AI agents (runtime + 3 agents)
- `apps/web/src/lib/ai-agents/core/` — 9 files: types · audit · permissions · budget · events · memory · approval · escalation · runtime · index
- `apps/web/src/lib/ai-agents/agents/market-intelligence.ts` — cursor-driven daily window read, aggregates by category/region/source/tag, writes summary to `ai_memory`, emits `custom` event
- `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` — manual-trigger zod-validated payload, inserts `uploaded_excels`, routes parser execution through `approvalGate` when requested
- `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` — hourly read-only probes (ingestion failures, agent failures, stuck approvals, cost-cap headroom), Resend escalation with 15-min cooldown, severity ladder (info/warning/critical)
- `apps/web/src/app/api/cron/market-intelligence/route.ts` + `apps/web/src/app/api/cron/qa-monitoring/route.ts` + `apps/web/src/app/api/agents/data-ingestion/route.ts`
- `apps/web/src/app/dev/ai-ops/page.tsx` — operator probe page: agent registry with today's cost vs cap, last 15 runs, last 15 events, pending approvals, last-24h escalations

### Architectural primitives (live but partially dormant)
- **Manual approval architecture** — `approval.ts` gate is wired; only `data_ingestion` + `costar.exports.parse` actively use it. Pattern proven, ready for Tier 2 destructive surfaces.
- **AI cost guardrails** — `budget.ts` preflight + account; daily caps in `ai_agents.config`; QA Agent escalates at 80% / 100%. No LLM use in Phase 2 so spend is ~0 — guardrails ship ahead of need.
- **Execution auditability** — `ai_agent_runs` records input + steps + output + cost + tokens + duration per invocation; `ai_events` captures every emission; `ai_memory` checkpoints state. Full replay surface in DB; the `/dev/ai-ops` page makes it queryable.

### CEO / Orchestration Agent — NOT activated
Status stays `planned` / `enabled=false`. Activates in Phase 3 once Tier 1 has generated 30+ days of telemetry. Documented in `docs/ai-agents/ai-agent-roadmap.md` Phase 3.

### New docs
- `docs/ai-agents/ai-agent-cost-guardrails.md` — load-bearing reference for the cost-cap layer
- `docs/ai-agents/ai-agent-approval-flow.md` — load-bearing reference for the human-review flow

### Bundle + build
- New cron routes (3), new agent route (1), new dev pages (2). All `ƒ Dynamic` — server-only.
- Library bundle unchanged at 214 kB. Middleware unchanged at 81.8 kB. No client-bundle regressions.
- `pnpm typecheck` clean; `pnpm build` clean (37 pages generated).

### Env vars
- `CRON_SECRET` — required in production (cron route guard, denies on missing)
- `INTERNAL_ALERT_RECIPIENTS` — comma-separated emails for QA escalations; falls back to `miguel.sambricio@metcub.com`

### Exit criteria for Phase 2 (per roadmap)
- 7+ consecutive days of all sources reaching `status=success` ☐
- ≥10 new `market_news` rows / day on average ☐
- Zero `news_ingestion_runs.status=failed` for sources we mean to keep enabled ☐
- 14 days of Tier 1 agent runs with ≥95% success rate ☐
- Zero permission denial spikes ☐
- Operator dashboard shows live KPIs ✅

The first 5 are observation criteria — auto-deploy fires, the next 24h decide.

---

## 2026-05-11 — Vercel Speed Insights enabled

Installed `@vercel/speed-insights` 2.0.0 in `apps/web` and mounted `<SpeedInsights />` next to `<Analytics />` in the root layout. Adds Real User Monitoring of Core Web Vitals (LCP, FID, CLS, INP, TTFB) per page to the existing page-view + custom-event tracking. Same cookie-free, GDPR-compliant posture. Same auto-enable on Vercel production — no env vars.

### Bundle delta
Library route First Load JS stayed at 214 kB (the Speed Insights script is also <1 KB gzip and lives in the shared chunk). Middleware unchanged at 81.8 kB.

### Where to see it
After this auto-deploy lands, Core Web Vitals appear at `https://vercel.com/miguel-sambricio-s-projects/hotelvalora/speed-insights` with the same ~30s ingest delay as Analytics. The dashboard breaks down by page, device, and geography.

---

## 2026-05-11 — Vercel Analytics enabled

Installed `@vercel/analytics` 2.0.1 in `apps/web` and mounted `<Analytics />` in the root layout. Cookie-free, GDPR-compliant page-view + custom-event tracking. Auto-enabled on production deploys via the Vercel platform — no env vars to configure.

### What changed
- `apps/web/package.json`: + `@vercel/analytics` ^2.0.1
- `apps/web/src/app/layout.tsx`: imports `Analytics` from `@vercel/analytics/next`, renders inside `<body>` (after `<Providers>` so Suspense boundaries don't interfere)

### Bundle delta
Library route `First Load JS` stayed at 214 kB (the Analytics script is < 1 KB gzipped and lives in the shared chunk). Middleware unchanged at 81.8 kB. No measurable regression.

### Behaviour
- **On Vercel production**: pings `/insights/event` on navigation; visible in the Vercel Dashboard → Analytics tab within ~30 s of the next deploy
- **On Vercel preview**: no-op (Vercel only counts production traffic on the Hobby plan)
- **On localhost (`pnpm dev`)**: no-op (production-only mode by default)

### Documentation
- `HOTELVALORA_TECH_STACK_MASTER.md`: row flipped 🔴 → 🟢 with version + mount location
- `service-status.md`: moved out of `🔵 Planned`, added to `🟢 Working` (26 → 27)
- `INFRASTRUCTURE_MASTER_TRACKER.md`: health score recomputed
- `deployment-status.md`: observability gap closed

---

## 2026-05-11 — CEO / Orchestration Agent — Tier 0 added to the AI Operations Layer

Adds the **10th and supervisory agent** — the CEO / Orchestration Agent — to the AI Operations Layer. The CEO Agent sits ABOVE the 9 operational agents in a new **Tier 0** position. It is **NOT a chatbot. NOT customer-facing.** It is the operations command center, AI chief-of-staff, and escalation router for the entire platform.

### Schema changes (migration `0008` applied)

- `alter type ai_agent_id add value 'ceo'` — extends the agent enum
- `alter type ai_event_kind add value 'strategic_review_completed'` — daily strategic summary event
- `alter type ai_event_kind add value 'agent_anomaly_detected'` — CEO Agent anomaly signal
- `alter type ai_event_kind add value 'cost_cap_warning'` — pre-breach cost signal
- Insert CEO Agent row into `public.ai_agents` (`status='planned'`)
- Insert 10 supervisory tools into `public.ai_tools`: `ai_ops.health_check`, `ai_ops.runs.select`, `ai_ops.events.select`, `ai_ops.human_review.select`, `ai_ops.cost.aggregate`, `ai_ops.invoke_agent`, `supabase.advisors.check`, `supabase.audit_logs.select`, `github.commits.list`, `intelligence.runs.summary`. All read-only.

### What the CEO Agent does

| Cycle | Cadence | Purpose |
|---|---|---|
| Hourly health review | `0 * * * *` UTC | Aggregate last-hour runs · probe Vercel + Supabase + GitHub · emit anomaly events |
| Daily strategic review | `0 6 * * *` UTC (~07:00–08:00 Madrid) | 24h KPI aggregation · cost cap audit · recommend agent status flips via `ai_human_review` |
| Reactive supervision | event-driven | Subscribe to `human_approval_needed`, `health_check_failed` · re-probe + escalate |

### What the CEO Agent must NEVER do

- ❌ Execute destructive tools (no permission, by design)
- ❌ Disable other agents directly — only propose via `ai_human_review`
- ❌ Grant itself or another agent permissions
- ❌ Modify any application data — read-only
- ❌ Decide strategic priorities autonomously — only surfaces options

### Documentation updates

| Doc | Change |
|---|---|
| `AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` | Reorganised agents into 4 tiers (Tier 0 CEO + Tiers 1–3); added detailed § 2.1 covering CEO core responsibilities + must-never-do + supervision model + hourly + daily workflow cycles |
| `ai-agent-orchestration.md` | Added § 1 "Two layers of orchestration" (mechanical + supervisory); added § 10 "CEO / Orchestration Agent — supervisory loops" with detailed hourly + daily + reactive workflows |
| `ai-event-system.md` | Added 3 new event kinds to the taxonomy table + payload conventions |
| `ai-agent-roadmap.md` | Phase 3 rewritten with 4 sub-phases — CEO Agent (Tier 0) lands in Phase 3.3. Dependency graph updated to show CEO supervising Tiers 2+3 going forward |
| `ai-agent-kpis.md` | Added CEO Agent KPI row (MTTD platform · escalation precision · agent coverage · review quality) + €0.50/day cost cap rationale |
| Trackers (`HOTELVALORA_TECH_STACK_MASTER`, `INFRASTRUCTURE_MASTER_TRACKER`, `service-status`, `HOTELVALORA_MASTER_SYSTEM`, `database/README`) | Counts updated 9→10 agents, 20→30 tools; CEO agent + tier structure highlighted |
| `current-sprint.md` | New entry in Just Shipped |
| Memory `project_ai_operations_layer.md` | Updated to reflect Tier 0 + 10 agents |

### Strategic significance

The CEO / Orchestration Agent is the future operational orchestration layer of the entire HotelVALORA platform. When the platform has 9 operational agents producing thousands of run rows per day, the CEO Agent is the single pane of glass that turns that signal into actionable intelligence — health snapshots, strategic recommendations, anomaly detection, escalation routing. Phase 3 ships it; Phase 2 prepares the data substrate it will read.

---

## 2026-05-11 — AI Operations Layer — Phase 1 (foundation)

Initialises HotelVALORA's AI Operations Layer — 9 future operational AI systems with permissions, memory, audit trails, and human escalation paths. **NOT chatbots. NOT a side feature.** This is a future CORE operating layer of the platform — the institutional muscle that turns HotelVALORA from "calculator with UI" into an autonomous, auditable, hospitality investment operating system.

Phase 1 ships the foundation only. **No agent runtime, no LLM calls, no autonomy.** Phase 2+ implements agents tier by tier per `docs/ai-agents/ai-agent-roadmap.md`.

### Schema (migration `0007` applied to Supabase production)

- 7 new tables: `ai_agents`, `ai_agent_runs`, `ai_events`, `ai_agent_permissions`, `ai_memory`, `ai_tools`, `ai_human_review`
- 6 new enums: `ai_agent_id`, `ai_agent_status`, `ai_agent_run_status`, `ai_event_kind`, `ai_permission_action`, `ai_memory_scope`
- RLS: public-read on `ai_agents` + `ai_tools` (transparency); service-role only on operational tables
- `ai_human_review` queue gates every destructive action

### Agents declared (9 — all `status='planned'`, `enabled=false`)

| Tier | Agent | Phase | Strategic role |
|---|---|---|---|
| 1 | Market Intelligence | 2 — next | Consumer of the Hospitality Intelligence Engine corpus |
| 1 | Data Ingestion | 2 — next | Excel + CoStar parsing, normalisation, validation |
| 1 | QA / Monitoring | 2 — next | Deploys, advisors, uptime, health checks |
| 2 | Underwriting | 4 | **Strategic moat** — DCF, sensitivity, memo generation |
| 2 | Report Generation | 4 | Institutional PDFs from underwriting + intelligence |
| 3 | CRM / Dealflow | 5 | Investor + operator dossiers, pipeline |
| 3 | Customer Success | 6 | WhatsApp / chat, onboarding |
| 3 | CMO | 6 | LinkedIn / X / newsletters (all human-reviewed) |
| 3 | CFO | 6+ | Reconciliation, cost monitoring, runway (all destructive actions human-approved) |

### Tools catalogued (20)

Supabase queries · Resend send · LinkedIn / X / WhatsApp publish · Stripe charges/refunds · Vercel deployments / rollback · CoStar parse · PDF render · CRM upsert · monitoring escalate · arbitrary SQL.

Every tool declares `is_destructive` + `requires_human_approval` flags. Destructive tools cannot be invoked without an `ai_human_review` approval. There is no override.

### Documentation (8 docs in `docs/ai-agents/`)

| Doc | Purpose |
|---|---|
| `AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` | Strategic master doc — why this is core, the 9 agents, operating philosophy, governance principles, monetisation, long-term vision |
| `ai-agent-architecture.md` | Runtime model, components, where LLMs live, failure modes, cost model, security posture |
| `ai-agent-orchestration.md` | Queue + router (NOT an LLM), triggers, agent-to-agent calls, concurrency, cost cap enforcement |
| `ai-memory-strategy.md` | Working vs long-term memory, scope dimensions, importance scoring, pgvector Phase 3 plan, hygiene rules |
| `ai-agent-permissions.md` | RBAC matrix, default-deny, destructive-action policy, RLS interaction, operator workflows |
| `ai-event-system.md` | `ai_events` taxonomy + routing rules, polling vs realtime, idempotency, full traces |
| `ai-agent-kpis.md` | Universal + per-agent KPIs, daily cost caps, quality scoring, anti-patterns, reporting cadence |
| `ai-agent-roadmap.md` | Phases 1–7+ with deliverables, exit criteria, anti-goals, dependency graph |

### Governance commitments encoded in code + docs

1. **Deterministic shell, non-deterministic core** — LLM calls are one step of a deterministic state machine. LLMs never control orchestration.
2. **Audit everything** — every invocation is a row in `ai_agent_runs` with steps, tokens, cost.
3. **Permissions are declarative** — agents have no blanket access. Default-deny.
4. **Destructive actions queue for humans** — every `is_destructive` or `requires_human_approval` tool goes through `ai_human_review` before execution.
5. **Memory is scoped, expiring, importance-weighted** — never raw history dumps into LLM context.
6. **The orchestrator is a queue + a router** — Phase 2-3 use Postgres + cron + static rules. No LLM-controlled router.
7. **Cost ceilings are non-negotiable** — every agent has a daily cap declared in `ai_agents.config.daily_cost_usd_cap`.

### Tracker updates

- `HOTELVALORA_MASTER_SYSTEM.md` — paragraph on the new layer
- `HOTELVALORA_TECH_STACK_MASTER.md` — new "AI Operations Layer" section (12 rows)
- `INFRASTRUCTURE_MASTER_TRACKER.md` — new entry; health score 84% (foundation 🟢 + planned agents 🔵)
- `service-status.md` — 25→26 🟢; Tier 1 agents in `🔵 Planned`
- `docs/database/README.md` — migration 0007 entry
- `ENTRYPOINTS.md` — 9 new rows for the ai-agents docs + migration
- `CLAUDE.md` — `docs/ai-agents/` registered in docs map + mandatory maintenance table
- `current-sprint.md` — Phase 2 (combined Intelligence + AI Ops Tier 1) added as #1 in "Up next"

### What's next (Phase 2)

Combined Phase 2 for both the Intelligence Engine and the AI Operations Layer:
- Agent runtime core (`apps/web/src/lib/ai-agents/core/`)
- Market Intelligence Agent (consumes the Intelligence Engine cron output)
- Data Ingestion Agent (Excel + CoStar parsing)
- QA / Monitoring Agent (deploys, advisors, uptime)
- LLM client wrapper (Vercel AI SDK + OpenAI/Anthropic)
- First Phase 2 permissions migration per agent

Exit criteria: 14 consecutive days of all 3 Tier 1 agents with success rate ≥ 95%.

---

## 2026-05-11 — Hospitality Intelligence Engine — Phase 1 (foundation)

Initialises HotelVALORA's hospitality intelligence layer — the daily institutional news + transactions + projects corpus that will power Library cross-links, market dashboards, underwriting comps, future investor/operator dossiers, future alerts, and future monetised B2B data feeds. This is **NOT a side feature**: it's the dataset advantage that compounds every other capability.

Phase 1 ships the foundation only. **No ingestion code, no AI, no scrapers.** Pipeline implementation lands in Phase 2.

### What ships in Phase 1

- **Migration `0006_hospitality_intelligence_schema.sql`** applied to Supabase production.
  - 9 new tables: `sources`, `investors`, `operators`, `market_news`, `hotel_transactions`, `hotel_projects`, `news_entities`, `news_tags`, `news_ingestion_runs`
  - 5 new enums: `news_category`, `hotel_segment`, `entity_role`, `ingestion_source_kind`, `ingestion_status`
  - RLS public-read on all corpus tables (anonymous showcase); service-role-only writes
  - `url_hash` unique constraint on `market_news` for atomic deduplication
  - `enriched_meta` jsonb on `market_news` for future AI enrichment (no migration needed when LLM lands)
- **10 sources seeded** with reliability scores: hosteltur, alimarket, expansion (ES) · hospitalitynet, hotelnewsnow, costar-news, thp-news, hvs, skift-hospitality, reuters-hospitality (EU + GLOBAL)
- **6 documentation files** in `docs/intelligence/`:
  - `HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — strategic master doc explaining why this is core, not a side feature, written for future engineers + AI agents
  - `intelligence-architecture.md` — system architecture, component responsibilities, integration points
  - `news-data-schema.md` — full schema reference + dedup hash design
  - `ingestion-pipeline.md` — fetch / parse / normalise / categorise / dedupe pipeline design
  - `scheduler-strategy.md` — Vercel Cron vs Supabase pg_cron decision (chose Vercel Cron at `48 7 * * *` UTC = 08:48 Europe/Madrid in winter, 09:48 in summer)
  - `hospitality-intelligence-roadmap.md` — phases 1–6 with deliverables + exit criteria
- **Tracker updates**:
  - `HOTELVALORA_TECH_STACK_MASTER.md` — new "Hospitality Intelligence Engine" section
  - `INFRASTRUCTURE_MASTER_TRACKER.md` — new entry; health score recomputed (84%)
  - `service-status.md` — 24→25 🟢; planned phases listed in 🔵
  - `HOTELVALORA_MASTER_SYSTEM.md` — paragraph updated mentioning the new module
  - `docs/database/README.md` — migration 0006 entry
  - `ENTRYPOINTS.md` — 6 new rows for the intelligence docs + the migration
  - `CLAUDE.md` — `docs/intelligence/` registered in the documentation map + mandatory-maintenance table

### Phase 2 — what's next

| Deliverable | File |
|---|---|
| Cron route handler | `apps/web/src/app/api/cron/hospitality-intel/route.ts` |
| Vercel cron config | `apps/web/vercel.json` |
| Fetchers (rss/scrape/api) | `apps/web/src/lib/intelligence/fetchers.ts` |
| Normaliser + canonicaliser | `apps/web/src/lib/intelligence/normalise.ts` |
| Regex categoriser | `apps/web/src/lib/intelligence/categorise.ts` |
| Ingest orchestrator | `apps/web/src/lib/intelligence/ingest.ts` |
| Unit + integration tests | `apps/web/src/lib/intelligence/__tests__/` |

Exit criterion for Phase 2: 7 consecutive days of all-source `status=success` ingestion runs.

### Strategic context (why this matters)

The master doc covers this in depth, but the 3-line version:
- Underwriting is only as good as the comparables it can pull — building a self-hosted transaction corpus = decoupling from CoStar/STR seat licences (€30k–150k/year saved per seat).
- Deal sourcing happens before broker books open — daily ingestion of operator interviews, planning permissions, JV announcements = a deal radar.
- Institutional clients expect a Bloomberg-of-hospitality — the intelligence layer is what turns the calculator into a decision surface.

The schema is intentionally future-proof (jsonb columns for AI enrichment, polymorphic entity links, source reliability scores, public-read RLS). Phase 2+ doesn't migrate the schema — it just writes code that reads the existing tables.

---

## 2026-05-11 — Resend leaves the sandbox (verified domain · production delivery)

`hotelvalora.com` verified at https://resend.com/domains (DKIM + SPF added in Namecheap DNS). `RESEND_FROM_EMAIL` on Vercel switched from the sandbox sender (`onboarding@resend.dev`) to `HotelVALORA <noreply@hotelvalora.com>`. The full email path now delivers to any recipient — no more "only to miguel.sambricio@metcub.com" sandbox restriction.

### What changed

| Concern | Before | After |
|---|---|---|
| Sender | `HotelVALORA <onboarding@resend.dev>` (Resend sandbox) | `HotelVALORA <noreply@hotelvalora.com>` (verified domain) |
| Delivery surface | Resend account owner only | Any recipient inbox |
| DKIM / SPF on `hotelvalora.com` | Not set | Set in Namecheap → verified by Resend |
| Code path | Unchanged — `sendTourRequestAction` + `getDefaultFromAddress()` | Same |

### Verification

- `vercel env ls production` shows `RESEND_FROM_EMAIL` (Encrypted) updated.
- Resend domains panel shows `hotelvalora.com` as verified.
- Auto-deploy triggered by this commit's push to `main`.

### What stays unchanged

- The Resend API key is unchanged (same `RESEND_API_KEY`).
- The server action `sendTourRequestAction`, the `getResend()` singleton, and the `tour-request` template are all unmodified.
- `replyTo` logic + analytics tags untouched.

### Re-test plan

After the auto-deploy lands, clicking "Schedule a Tour" on a top-promoted report (e.g. Mandarin Oriental Ritz with account manager `sara.smith@mandarinoriental.com`) should result in:

- HTTP 200 from the server action
- Resend send-id returned cleanly
- The email arriving at `sara.smith@mandarinoriental.com` (no sandbox bounce)

---

## 2026-05-11 — Auth log noise fix (`/api/auth/session` 500s)

Removes the legacy `<SessionProvider>` from `apps/web/src/components/providers.tsx`. The provider was a leftover from the Auth.js v5 scaffold; nothing in the codebase calls `useSession()` from `next-auth/react` (verified by grep). Its only behaviour was polling `/api/auth/session` on every page load → the endpoint threw `MissingSecret` (because `AUTH_SECRET` is not set on Vercel; we run on Supabase Auth, not Auth.js) → Vercel logs flooded with 500s.

### What changed

- `<SessionProvider>` removed from `Providers`. The component tree is now `QueryClientProvider > ThemeProvider > children`.
- Component comment block updated explaining why `SessionProvider` is intentionally absent + the one-line restore path if Auth.js ever reactivates.

### What stays

- Auth.js v5 scaffold (`auth.ts`, `auth.config.ts`, `app/api/auth/[...nextauth]/route.ts`) untouched — kept parked for future non-OAuth flows per `docs/auth.md` § "Why Supabase Auth and not Auth.js v5".
- The route handler still exists, so direct probes to `/api/auth/session` (bots, scanners) will still 500 — but no internal traffic hits that endpoint anymore. Volume goes from "every page load × every visitor" to "occasional external probe".

### Verification

- `pnpm typecheck` ✅
- Vercel runtime logs after deploy: zero `/api/auth/session` 500s from internal traffic
- No UX impact — `useAuth()` continues to read from Supabase Auth (or Zustand mock fallback)

---

## 2026-05-11 — GitHub → Vercel auto-deploy enabled

Connected the GitHub repo to the Vercel project via `vercel git connect`. From here forward:

- **Push to `main`** → auto-deploys to production, aliased to `https://www.hotelvalora.com`.
- **Push to any other ref** → auto-deploys to a preview at `https://hotelvalora-<sha-prefix>-miguel-sambricio-s-projects.vercel.app`.
- **Commit status checks** post back on every push (Vercel-GitHub native integration).
- **`vercel deploy --prod --yes`** still works as an escape hatch (eg. emergency rollback where pushing a fix-up commit is undesirable).

The two auth flags (`AUTH_ENABLED`, `NEXT_PUBLIC_AUTH_ENABLED`) are scoped Production-only, so preview deploys fall back to the Zustand mock auth — preview reviewers can navigate the entire app without needing Google OAuth.

### Why now

We had six commits sitting in `main` that were pushed to GitHub but had never reached production — auto-deploy off meant every release required a manual `vercel deploy --prod --yes` from the operator. Auto-deploy closes that gap and makes the CLI path the exception, not the rule.

### Verification

The commit that introduces this change is itself the test: the push triggers the first auto-deploy. Confirmed via Vercel API after the push (latest production deploy SHA matches `HEAD` of `main`).

### Files

- `docs/infrastructure/deployment-status.md` — promotion-workflow diagram updated; "Auto-deploy on push" flipped to Yes; preview environments section refreshed; CI/CD bullets refreshed
- `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` — Deployment + CI/CD table updated; GitHub Actions row moved to 🔵 (Vercel build is the gate)
- `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` — GitHub-safe row updated; health score 82% → 83%
- `docs/infrastructure/service-status.md` — Vercel-GitHub auto-deploy added to 🟢 inventory; health score recomputed
- `docs/HOTELVALORA_MASTER_SYSTEM.md` — paragraph on production deployment refreshed
- `docs/roadmap/current-sprint.md` — Just shipped entry added

---

## 2026-05-11 — Public Beta / Showcase Mode (auth wired, never blocking)

Activated Google OAuth end-to-end through Supabase Auth, then immediately reconfigured the middleware so route protection is dormant platform-wide while HotelVALORA is being validated by partners. Auth still works, sessions still persist, RLS still resolves via `auth.uid()` — but no anonymous visitor is ever redirected.

### What changed in code

```ts
// apps/web/src/middleware.ts
const PROTECTED_PREFIXES: readonly string[] = [];
```

Previously `["/settings", "/library", "/report", "/dashboard"]`. The Supabase-session-refresh branch of the middleware still runs unconditionally so that signed-in users keep their session warm; the redirect branch evaluates `false && …` and never fires. When private-user surfaces land later (saved-report management, CRM, billing, admin), the operator adds the relevant prefix back to that array — no other code change needed.

### Why

HotelVALORA is in **Public Beta / Institutional Showcase Mode**. Partners, prospects and the underwriting team need to navigate the entire platform — financial engine, underwriting workflows, report rendering, Library, infrastructure — without forced login. There are no private-user features in production yet. Auth gating exists in code (Public Beta is the toggle position), not in deletion.

### Operator activation completed in this session

End-to-end activation per `docs/auth.md`:

1. **Google Cloud Console** — created project HotelVALORA, OAuth consent screen (External, Testing), OAuth client ID `1023396989060-…apps.googleusercontent.com` with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard** → Authentication → Providers → Google enabled with the OAuth client credentials. URL Configuration → Site URL = `https://www.hotelvalora.com`; Redirect URLs include prod, www, localhost and `https://*.vercel.app/auth/callback`.
3. **Vercel env** — `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` on production.
4. **Production deploy** — `dpl_GcD2jM47icS8KzWDRNdYcyZY6iZF` (commit `5c3ef91`), then current commit ships the empty `PROTECTED_PREFIXES`.

Verification:
- `GET https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/settings` returns `"external.google": true`.
- `GET /auth/callback` returns 307 to `/login?error=Missing+OAuth+code` (route handler live).
- `GET /library/favorites-map` returns 200 (anonymous browsing restored after empty PROTECTED_PREFIXES deploy).
- `GET /report/executive-summary` returns 200.

### Rollback episode (kept for the record)

The first deploy with `AUTH_ENABLED=true` AND the original `PROTECTED_PREFIXES` list locked anonymous viewers out of `/library` and `/report` because Zustand-mock sessions don't satisfy the Supabase middleware. Recovery: removed both env vars + redeployed (~90s), then introduced the empty `PROTECTED_PREFIXES` as the canonical Public Beta posture. Documented in `docs/auth.md` § "Public Beta / Showcase Mode" so the trap doesn't get re-set.

### Files

- `apps/web/src/middleware.ts` — `PROTECTED_PREFIXES = []` + extensive comment block listing future prefixes to add when private surfaces ship
- `docs/auth.md` — new § "Public Beta / Institutional Showcase Mode" section; TL;DR row updated; activation checklist preamble revised
- `docs/HOTELVALORA_MASTER_SYSTEM.md` — auth status reframed as "wired and operational, non-blocking by design"
- `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` — Supabase Auth + Google OAuth flipped to 🟢 with Public Beta annotation
- `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` — health score recomputed to 82%; per-service rows updated
- `docs/infrastructure/service-status.md` — 19 → 21 🟢; auth + OAuth out of 🟡 bucket
- `docs/infrastructure/deployment-status.md` — recent-deploys table refreshed; env inventory bumped 6 → 8 vars
- `docs/roadmap/current-sprint.md` — Public Beta entry in "Just shipped"
- Vercel production env: `AUTH_ENABLED=true`, `NEXT_PUBLIC_AUTH_ENABLED=true`
- Supabase Dashboard: Google provider enabled; URL allowlist populated

### What stays unchanged

- RLS on every public table — `auth.uid()` resolves naturally for signed-in users, anonymous users get the public-read policy on `valuations.visibility ∈ ('public','top-promote')`.
- `useAuth()` surface — every consumer (`AuthCard`, `AppHeader`, `SettingsSidebar`, `useTier`, `LinkedInstitutionalAccounts`, etc.) keeps reading the same shape.
- `handle_new_user` trigger on `auth.users` — fires for any Google sign-in and provisions `public.users` + `public.profiles` automatically.
- Storage buckets + signed-URL helpers — untouched.

---

## 2026-05-11 — Production auth via Supabase Auth (Google OAuth-ready)

Replaces the Zustand mock auth on the production path with **Supabase Auth**. The Auth.js v5 scaffold stays in the repo (inert) for future non-OAuth flows; the swap was a `useAuth()` rewrite, not a scaffold change.

### Architecture decision

The HotelVALORA schema was designed around Supabase Auth — `public.users.id → auth.users.id` FK, `handle_new_user` trigger auto-provisioning `public.users` + `public.profiles`, every RLS policy using `auth.uid()`. Auth.js v5 + `@auth/supabase-adapter` would have fought that schema (separate `next_auth.*` tables, manual Supabase JWT minting, dual cookie schemes). We picked the cleaner side. Full reasoning in `docs/auth.md` § "Why Supabase Auth and not Auth.js v5".

### What ships

- **`useAuth()` rewritten as a dual-source picker** — `apps/web/src/lib/auth/use-auth.ts`. Returns the same `{user, signIn, signOut, isAuthenticated}` shape every consumer already imports. Source is chosen at build time via `NEXT_PUBLIC_AUTH_ENABLED`:
  - `"true"` → `useSupabaseAuth()` (real session, hydrated from `public.users` + `public.profiles`)
  - default → existing Zustand mock (preserves dev + preview UX)
- **OAuth callback route** — `apps/web/src/app/auth/callback/route.ts`. Exchanges the OAuth `code` for an HttpOnly session cookie via `supabase.auth.exchangeCodeForSession`, then redirects to a sanitised `?next=` path (defaults to `/settings/profile`).
- **OAuth hook rewired** — `apps/web/src/lib/auth/use-oauth.ts`. When `AUTH_ENABLED=true`, `signInWithProvider("google" | "linkedin" | "apple" | "microsoft")` calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: "${origin}/auth/callback?next=…" }})`. Otherwise falls through to the parked Auth.js handler.
- **Middleware** — `apps/web/src/middleware.ts` now refreshes the Supabase session via `@supabase/ssr` on every request and, when `AUTH_ENABLED=true`, redirects unauthenticated requests on `/settings`, `/library`, `/report`, `/dashboard` to `/login?next=<original>`. The Auth.js middleware wrapper was removed (middleware bundle dropped ~50 kB).
- **Email/password sign-in** (`AuthCard`) now flows through `supabase.auth.signInWithPassword` when active. The legacy mock keeps working when the flag is off.
- **`auth-mode.ts`** — small helpers (`isAuthEnabledServer`, `isAuthEnabledClient`, `isSupabaseAuthConfigured`) so the build-time switch lives in one place.

### Cookie strategy

`@supabase/ssr` handles everything — `__Secure-` prefixed in production, `httpOnly`, `sameSite: lax`, path `/`, refreshed on every middleware pass. No app code touches cookies directly.

### Activation is a manual two-step

Code ships off-by-default (`AUTH_ENABLED` unset → Zustand mock continues to drive the app). Operator activation:

1. Google Cloud Console → create OAuth client with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → Google → paste credentials.
3. Supabase Dashboard → Authentication → URL Configuration → add `https://www.hotelvalora.com/auth/callback` (+ localhost + Vercel preview wildcard).
4. Vercel → `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` (both production).
5. `vercel deploy --prod`.

Full checklist with copy-paste-ready URLs at `docs/auth.md`.

### What's still mock

| Surface | Status |
|---|---|
| OAuth dance | ✅ Supabase Auth (Google ready · LinkedIn + Apple require Supabase Dashboard wiring) |
| Sign-out | ✅ Supabase Auth |
| Protected-route middleware | ✅ Supabase session check |
| User row hydration into `useAuth()` | ✅ `public.users` + `public.profiles` join |
| **Sign-up surface** | ❌ Google OAuth is the only path to create an account today |
| **Password reset** | ❌ Link still loops back to `/login` |
| **Linked accounts unlink** | ⚠️ Soft sign-out only |
| **Workspace switcher** | ❌ `user.organization` carries the current org id but no UI exposes a switcher |
| **`AUTH_ENABLED=false` (default)** | ✅ Zustand mock — kept on purpose |

### Files

- `apps/web/src/lib/auth/use-auth.ts` — new (unified hook)
- `apps/web/src/lib/auth/use-supabase-auth.ts` — new (Supabase adapter + tier hydration)
- `apps/web/src/lib/auth/auth-mode.ts` — new (build-time flags)
- `apps/web/src/app/auth/callback/route.ts` — new (OAuth callback handler)
- `apps/web/src/lib/auth/use-oauth.ts` — rewired through Supabase Auth
- `apps/web/src/lib/auth/store.ts` — `useAuth` renamed to `useMockAuth` (the unified hook supersedes it)
- `apps/web/src/lib/auth/index.ts` — barrel updated; exports the new hook + flag helpers
- `apps/web/src/middleware.ts` — rewritten on top of `@supabase/ssr`; Auth.js wrapper removed
- `docs/auth.md` — full activation checklist (Google Cloud Console + Supabase Dashboard + Vercel env)
- `docs/infrastructure/environment-variables.md` — Auth flag matrix + Supabase-Auth notes; Auth.js placeholders re-labelled "parked"
- `ENTRYPOINTS.md` — new auth file rows
- Trackers + master system + sprint refreshed

---

## 2026-05-11 — Library surfaces wired to Supabase (TanStack Query)

All four Library routes (`/library/favorites-map`, `/library/favorites-list`, `/library/top-map`, `/library/top-list`) now read from the live database. The legacy `apps/web/src/lib/library/mock-reports.ts` has been removed; the six institutional showcases live in `public.valuations` with `visibility = 'public'` and are visible to anonymous viewers through the existing public-read RLS policy.

### Query architecture

- **`useLibraryReports(options?)`** — single source of truth. Reads `valuations` filtered to `visibility ∈ ('public','top-promote')` + left-joins `top_promote_reports`. Five-minute `staleTime`. Same hook powers the map and the list — TanStack Query dedupes across routes, so map↔list navigation never re-fetches.
- **`useFavoriteValuationIds()`** — per-user favourites. RLS-scoped to `auth.uid()`. Anonymous callers get an empty set + `isAnonymous=true`; the adapter treats that as "render every public row as starred" to preserve the demo UX.
- **`useToggleFavorite()`** — optimistic mutation against `favorite_reports`. Rollback on error, authoritative invalidate `onSettled`. Caller shows "sign in to save" when `isAnonymous`.
- **`adaptValuationToLibraryReport()`** — pure adapter, DB row + joins + favourite-id set → existing `LibraryReport` shape. Category derived from active promotion + favourited flags; `tierBadge` / `visibilityTier` from `indicators` JSONB.

### States

Loading / error / empty / filtered-empty rendered inline in both `HotelMap` (pill overlay) and `FavoritesTable` (full-width row). Retry button on error states. Background image + chrome stay rendered so the route shell never collapses.

### Migrations

- `0005_seed_library_demo_data.sql` — seeds 1 demo `auth.users` row (UUID `…010001`) + 6 valuations (UUIDs `…020001`–`…020006`) + 2 active `top_promote_reports` (Ritz-Carlton Madrid until 2026-12-31, Mandarin Oriental Ritz until 2026-09-30) + 6 demo favourites. Fully idempotent (deterministic UUIDs + ON CONFLICT updates).

### Bundle architecture

The Supabase barrel `apps/web/src/lib/supabase/index.ts` previously re-exported every module — including server-only ones (`./server`, `./admin`, `./auth-helpers`). Webpack traces the whole graph before tree-shaking, so client components importing `createBrowserSupabaseClient` via the barrel pulled `import "server-only"` modules into client bundles and broke the build. The barrel now only exports browser-safe surfaces. Server-only modules must be imported directly:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin }           from "@/lib/supabase/admin";
import { getSupabaseUser }            from "@/lib/supabase/auth-helpers";
```

### Removed

- `apps/web/src/lib/library/mock-reports.ts` — superseded by migration `0005`. The 6-hotel dataset is now SQL-seeded; the mock helpers (`MOCK_LIBRARY_REPORTS`, `getDefaultSelectedReport`, `getMockReportById`) had no consumers post-wire.

### Files

- `apps/web/src/lib/library/queries/{keys,use-library-reports,use-favorite-valuation-ids,use-toggle-favorite,index}.ts` — new
- `apps/web/src/lib/library/adapters/valuation-to-report.ts` — new
- `apps/web/src/components/library/hotel-map.tsx` — consumes hook, loading/error/empty states
- `apps/web/src/components/library/favorites-table.tsx` — consumes hook, optimistic ⭐ toggle, loading/error/empty states
- `apps/web/src/lib/supabase/index.ts` — barrel split (browser-only)
- `apps/web/src/app/dev/supabase-test/page.tsx` — direct import from `./auth-helpers`
- `docs/database/migrations/0005_seed_library_demo_data.sql` — new
- `docs/features/library.md` — production data-flow + states + future realtime hooks
- `ENTRYPOINTS.md` — query hooks + adapter + seed entries; mock-reports row removed

### Production-backed surfaces (this commit)

| Surface | Backed by |
|---|---|
| `/library/favorites-map` | `public.valuations` + `top_promote_reports` (anonymous: public-read RLS) |
| `/library/favorites-list` | same dataset, same TanStack cache |
| `/library/top-map` | same dataset |
| `/library/top-list` | same dataset |
| ⭐ favourite toggle | `public.favorite_reports` (RLS-scoped, optimistic) |

### Still mock

- Identity / tier inference — Zustand mock at `lib/auth/store.ts` (`hv-auth-v1` localStorage). Supabase Auth swap deferred to Phase 3.
- Static grayscale map background — Stitch CDN image (Mapbox swap planned in Phase 4).
- "View full valuation" CTA — toast only.
- CRM / investment requirements / valuation preferences — tables exist, no UI yet.

---

## 2026-05-11 — Supabase Storage buckets + typed helpers + regenerated TS types

Closed the entire post-schema gap on the Supabase side: types regenerated from the live database, the five canonical Storage buckets provisioned via migration with per-bucket RLS, and typed frontend helpers wired through the existing `lib/supabase/*` barrel.

### Migrations applied

- `0003_storage_buckets_and_policies.sql` — provisions `reports` / `pdfs` / `excel-uploads` / `renders` / `avatars` with explicit `public` flag, MIME allowlists, size caps, and 19 own-namespace RLS policies on `storage.objects`.
- `0004_restrict_avatar_listing.sql` — fixes the `0025_public_bucket_allows_listing` advisor: drops the broad `avatars: public read` policy (CDN-served objects don't need one) and replaces it with own-namespace listing.

### TypeScript types

Generated from the live schema via `mcp__claude_ai_Supabase__generate_typescript_types` and written to `apps/web/src/lib/supabase/types.ts`. The hand-rolled shim is gone — every table, enum, FK relationship and `Database["public"]["Tables"][T]["Row"|"Insert"|"Update"]` shape is now authoritative. `pnpm typecheck` still passes.

### Frontend storage layer

- `apps/web/src/lib/supabase/storage.ts` — browser-safe primitives: `BUCKETS` catalog, `ownPath`, `timestampedName`, `validateForBucket`, `uploadOwnFile`, `deleteOwnFiles`, `listOwnFiles`, `getPublicUrl` (narrowed to `avatars`).
- `apps/web/src/lib/supabase/storage-server.ts` — service-role helpers: `createStorageSignedUrl` / `createStorageSignedUrls` (5-minute default TTL, optional `downloadAs`), `moveStorageObject`, `deleteStorageObjectsAsAdmin`. Server-only enforced by `import "server-only"`.
- Barrel `apps/web/src/lib/supabase/index.ts` re-exports the browser surface; the server module must be imported directly so client bundles can't pick it up.

### Bucket policy summary

| Bucket | Public? | MIME allowlist | Size cap |
|---|---|---|---|
| `reports` | private | any | 50 MB |
| `pdfs` | private | `application/pdf` | 100 MB |
| `excel-uploads` | private | `xlsx`, `xls` | 25 MB |
| `renders` | private | `png`/`jpeg`/`webp` | 10 MB |
| `avatars` | public | `png`/`jpeg`/`webp` | 5 MB |

Path convention everywhere: `{bucket}/{auth.uid()}/{rest…}` so a single RLS template `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership.

### Files

- `apps/web/src/lib/supabase/types.ts` — regenerated
- `apps/web/src/lib/supabase/storage.ts` — new
- `apps/web/src/lib/supabase/storage-server.ts` — new
- `apps/web/src/lib/supabase/index.ts` — barrel updated
- `docs/database/migrations/0003_storage_buckets_and_policies.sql` — new
- `docs/database/migrations/0004_restrict_avatar_listing.sql` — new
- `docs/database/README.md` — Storage section rewritten
- Infra trackers + master system doc + sprint refreshed; ENTRYPOINTS.md gained the storage entries

### What's still mock vs Supabase-backed

Schema and storage are fully live. The frontend has not yet started consuming them — every Library / report / favorites / top-promote surface still renders from `apps/web/src/lib/library/mock-reports.ts`, and auth is still the in-memory Zustand mock at `apps/web/src/lib/auth/store.ts`. Wiring those reads (and replacing the mock auth with Supabase Auth or Auth.js + adapter) is the next milestone.

---

## 2026-05-11 — Supabase initial schema applied to production project

Applied `0001_initial_schema.sql` to project `twebgqutuqgonabvhzjk` via the Supabase MCP server (`apply_migration`). 32 tables created, all with RLS enabled. Registered as migration `20260511015418_initial_schema`.

Two Postgres-driven edits to the drafted SQL were required (now reflected in the source file):

- `top_promote_reports.is_active` — removed; was a stored generated column using `now()`, which Postgres rejects (`generation expression is not immutable`). Derive in queries as `promoted_until > now()`.
- `top_promote_active_idx` / `top_promote_priority_idx` — dropped the `where promoted_until > now()` predicate; Postgres rejects mutable functions in index predicates. They are now plain b-tree indexes.

Follow-up migration `0002_harden_security_definer_functions.sql` applied to close every WARN-level lint surfaced by `get_advisors`:

- Pinned `search_path = public, pg_temp` on `set_updated_at()` and `handle_new_user()`.
- Revoked `EXECUTE` on `handle_new_user()` from `public` / `anon` / `authenticated` (trigger-only; should not be RPC-callable).

The only remaining advisory is the **intentional** `payment_events: rls_enabled_no_policy` (INFO) — service-role-only writes from the Stripe webhook handler.

### Files

- `docs/database/migrations/0001_initial_schema.sql` — patched, applied
- `docs/database/migrations/0002_harden_security_definer_functions.sql` — new, applied
- `docs/database/README.md` — status flipped to ✅ applied
- `.mcp.json` — added so Claude Code auto-loads the Supabase MCP server next session

---

## 2026-05-11 — Comprehensive Supabase schema drafted (30 tables, 6 domains)

Expanded the v1 schema proposal from 7 tables to a production-grade 30-table surface across six domains. Migration file ready to apply via the SQL editor; hand-rolled `Database` type already in repo so frontend queries compile against the future shape.

### Domains shipped in the migration

| Domain | Tables |
|---|---|
| ① Auth + users | `users` · `profiles` · `organizations` · `user_roles` · `sessions` · `oauth_accounts` |
| ② Library | `valuations` · `saved_reports` · `favorite_reports` · `top_promote_reports` · `report_visibility` · `report_shares` |
| ③ Investment engine | `investment_requirements` · `market_preferences` · `valuation_preferences` · `revpar_scenarios` · `hotel_filters` |
| ④ CRM | `companies` · `contacts` · `leads` · `notes` · `activity_log` |
| ⑤ Files (Storage metadata) | `report_files` · `generated_pdfs` · `uploaded_excels` · `renders` · `avatars` |
| ⑥ System | `audit_logs` · `notifications` · `feature_flags` · `subscriptions` · `payment_events` |

### Files

- `docs/database/migrations/0001_initial_schema.sql` — single-file migration (~720 lines)
- `docs/database/README.md` — ER summary, ready-vs-placeholder map, apply instructions
- `docs/database/schema.sql` — deprecation pointer (replaced by migrations folder)
- `apps/web/src/lib/supabase/types.ts` — hand-rolled `Database` type matching all 30 tables + 15 enums

### Schema features

- **15 enums** (`user_tier`, `org_role`, `oauth_provider`, `report_visibility_t`, `report_type_badge`, `report_status`, `report_role`, `report_objective`, `share_permission`, `lead_status`, `pdf_status`, `excel_status`, `subscription_status`, `notification_kind`, `user_role`)
- **30 RLS policies** — every table enabled with own-only / public-read / parent-derived / org-scoped patterns
- **Triggers**:
  - `handle_new_user()` — auto-creates `public.users` + `public.profiles` on Supabase auth signup
  - `set_updated_at()` — bumped on update across 13 mutable tables
- **Indexes** on every FK + common query paths (`visibility`, `city`, `status`, partial indexes for active rows)
- **Generated column** `top_promote_reports.is_active` (boolean derived from `promoted_until > now()`)
- **Polymorphic notes + activity log** via `(entity_type, entity_id)` index pattern

### Architecture decisions

- `public.users` is split from `public.profiles` — auth-adjacent fields (tier, current_org) live separately from display fluff (avatar, locale, bio). Cuts churn surface on tier reads.
- `public.organizations` carries the multi-tenant boundary. `user_roles` is the N:M junction.
- `report_visibility` is an **audit log of transitions**, not a column duplication (`valuations.visibility` is the current state).
- `report_shares` supports both link-shares (anonymous, token-based) and per-user grants.
- `payment_events` has NO authenticated RLS policy by design — only the service-role Stripe webhook writes there.
- `feature_flags` is scoped to EITHER a user OR an organization (XOR check constraint).

### Apply path

The migration is not yet applied — DDL execution needs either the database password or a personal access token, neither of which is in the env today. The user will paste the file into the Supabase SQL editor manually. Once applied:

```bash
pnpm dlx supabase gen types typescript \
  --project-id twebgqutuqgonabvhzjk    \
  --schema public                       \
  > apps/web/src/lib/supabase/types.ts
```

regenerates the type surface; until then the hand-rolled types in `types.ts` match the migration 1:1.

### Build

Typecheck clean. No runtime change (no frontend code consumes Supabase tables yet — Phase 3 wiring is the next milestone).

---

## 2026-05-11 — Supabase architecture initialized

Production-grade scaffold for the Supabase layer: Postgres + Storage + (future) Auth.js adapter. Architecture lands today; project provisioning + credential paste-in lands on the user's next action.

### SDKs
- `@supabase/supabase-js@2.105.4`
- `@supabase/ssr@0.10.3`

### Files (`apps/web/src/lib/supabase/*`)
- `client.ts` · `createBrowserSupabaseClient()` — for `"use client"` components
- `server.ts` · `createServerSupabaseClient()` — RSC / actions / route handlers (Next 14 sync cookies)
- `middleware.ts` · `updateSupabaseSession()` — Edge middleware session refresh; no-op when env missing
- `admin.ts` · `getSupabaseAdmin()` — service-role, `import "server-only"` guard
- `auth-helpers.ts` · `getSupabaseUser`, `requireSupabaseUser`, `isSupabaseConfigured`, `isSupabaseAdminConfigured`
- `types.ts` · `Database` stub (regenerated after migrations)
- `index.ts` · barrel

### Middleware composition
`apps/web/src/middleware.ts` now composes `updateSupabaseSession(request)` → `auth()` (Auth.js). Both gated by their own env; the file is a pure pass-through until credentials are provisioned.

### Schema proposal
`docs/database/schema.sql` — NOT yet applied. Contains:
- 7 tables: `user_profiles`, `valuations`, `valuation_reports`, `favorites`, `top_promote`, `subscriptions` (six populated, ready for one more domain)
- 7 enums: `user_tier`, `user_role`, `report_visibility`, `report_type_badge`, `report_status`, `report_role`, `report_objective`
- Two triggers: `handle_new_user()` (auto-profile on auth signup), `set_updated_at()`
- Row Level Security policies on every table (own-read / public-read / owner-write)
- Documented storage buckets (`reports`, `pdfs`, `excel-uploads`, `renders`, `avatars`) — configured via dashboard, not SQL

### Connection probe
`/dev/supabase-test` — server-rendered checklist:
- Env vars present?
- Server client constructable?
- Service-role admin configured?
- Current session (anonymous expected today)
- "Where to find credentials" panel when env is empty

### Env placeholders (apps/web/.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Build
- 34 routes (33 static + `/dev/supabase-test` dynamic + Auth.js handler).
- Middleware bundle 79.4 kB → **134 kB** (+55 kB for `@supabase/ssr` on Edge).
- First Load JS on protected routes: 138 kB (+1 kB).
- Typecheck + production build clean.

### Activation steps (next action — user)
1. Provision Supabase project — `https://supabase.com/dashboard` (Region: EU-West Ireland recommended)
2. Settings → API → copy `Project URL`, `anon key`, `service_role key`
3. Paste into `apps/web/.env.local` + `vercel env add … production` for each
4. Run `docs/database/schema.sql` via Supabase SQL editor
5. Configure storage buckets per the dossier
6. Regenerate types: `pnpm dlx supabase gen types typescript --project-id <REF> > apps/web/src/lib/supabase/types.ts`
7. Visit `/dev/supabase-test` — every row should turn green

### Out of scope (deferred)
- No `@auth/supabase-adapter` wire-up (Phase 3)
- No Stripe integration (Phase 5)
- No OAuth provider configuration on Supabase side (Auth.js handles OAuth today)
- No migration applied / no real DB queries from the app surface yet

---

## 2026-05-11 — Resend wired for tour-request CTA

The Library "Schedule a Tour" button on top-promoted contact-card popovers now sends a real institutional email via Resend.

### Files
- `apps/web/src/lib/email/client.ts` — singleton Resend client + `import "server-only"` guard
- `apps/web/src/lib/email/templates/tour-request.ts` — typed `renderTourRequest()` returning `{ subject, html, text }` (forest-900 header, slate body, escaped interpolation)
- `apps/web/src/lib/email/actions.ts` — server action `sendTourRequestAction` with zod payload validation, replyTo wiring, Resend tags
- `apps/web/src/components/library/contact-cell.tsx` — button now calls the action via `useTransition`, shows `Loader2` spinner while sending, toasts success / error
- `docs/integrations/resend.md` — full integration dossier

### Env
- `RESEND_API_KEY` — required. Set in `apps/web/.env.local` (dev) and Vercel project env (prod)
- `RESEND_FROM_EMAIL` — optional. Defaults to Resend sandbox (`HotelVALORA <onboarding@resend.dev>`)

### Sandbox note
While the from address is the Resend sandbox, deliveries only land in the Resend account owner's verified inbox. To deliver to arbitrary recipients (e.g., the account manager on each report), verify a custom domain in Resend and set `RESEND_FROM_EMAIL=HotelVALORA <noreply@hotelvalora.com>`.

### Build
33 routes static. /library/{favorites,top}-list 158 B / 137 kB (+1 B for the contact-cell delta). Typecheck + production build clean.

---

## 2026-05-11 — Auth.js v5 institutional scaffold

Wires Auth.js v5 (`next-auth@5.0.0-beta.31`) into Next.js 14 App Router with the production-ready split-config pattern. Google + LinkedIn + Apple providers configured (env-driven; placeholders today). Route-protection middleware ships behind an `AUTH_ENABLED` env flag — no behavioural change today, single env flip activates `/settings`, `/library`, `/report`, `/dashboard` gating once OAuth credentials land.

### Files
- `apps/web/src/auth.config.ts` — edge-safe config (providers, callbacks, JWT session, cookies, `authorized()` route gate, `PROTECTED_PREFIXES` constant)
- `apps/web/src/auth.ts` — `NextAuth(authConfig)` instance; exports `handlers` / `auth` / `signIn` / `signOut`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — `{ GET, POST } = handlers`
- `apps/web/src/middleware.ts` — re-exports `auth` as middleware; matcher excludes `api/auth`, Next internals, static assets
- `apps/web/src/types/next-auth.d.ts` — module augmentation: `Session.user.{tier,role}` and `JWT.{tier,role,provider}`

### Tier system extension
- `UserTier`: dropped `institutional`, added `team` + `enterprise`. The legacy `institutional@…` email handle still infers `enterprise` for back-compat demos.
- New `UserRole = "user" | "admin" | "owner"`.
- `AppHeader` `TIER_LABELS` + `TIER_STYLES` extended (indigo for team, amber for enterprise).
- `lib/report/financials/types.ts` `Tier` alias updated to match.
- `useTier` + `canEditAssumptions` updated for the new tier set.

### UI wire-up
- `Providers` wraps the app in `<SessionProvider>` from `next-auth/react`.
- `useOAuth.signInWithProvider` body now calls `signIn(provider.nextAuthId, { callbackUrl, redirect: true })`.
- `OAUTH_PROVIDERS.{google,linkedin,apple}.enabled = true`; `microsoft` remains disabled (deferred to enterprise SSO surface).
- `LinkedInstitutionalAccounts` (rendered under the login card) and any future Settings → Credentials surface now routes to real Auth.js handshake.

### Env placeholders (apps/web/.env.example)
```
AUTH_SECRET=
AUTH_URL=
AUTH_ENABLED=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

### Build
- Production build clean. 33 routes static; `+ ƒ Middleware  79.4 kB` (Auth.js edge bundle). First Load JS on protected routes: ~137 kB (+5 kB for SessionProvider context).
- Two `jose` CompressionStream warnings on Edge — Auth.js Core dependency, harmless when JWE encryption is unused (we use JWS / signed JWTs only).

### Phase 3 swap (not in this commit)
- Add `@auth/supabase-adapter` to `auth.ts` (single line — `adapter: SupabaseAdapter(...)`)
- Mint OAuth apps and populate the env placeholders
- Set `AUTH_ENABLED=true` in Vercel
- Drop the Zustand mock auth store; bind `useTier()` to `useSession().data?.user.tier`

---

## 2026-05-10 — Library: contact card popover for top-promoted reports

The Contact column in both `/library/favorites-list` and `/library/top-list` now exposes an institutional contact card on hover — but only for rows whose `indicators.topPromote` flag is true AND which carry `contactInfo`. Everywhere else the icon stays grey and no popover renders.

### Component
- `apps/web/src/components/library/contact-cell.tsx` — `<ContactCell report />`.
- Renders the Mail glyph (forest-700 when active, slate-300 when inactive).
- Hover triggers a popover rendered via `React.createPortal` into `document.body`, pinned with `position: fixed` at coordinates captured from the icon's `getBoundingClientRect()`. The portal escapes the table's `overflow:auto` clip rect — without it, the popover would be cropped at the table's right edge.
- Layout matches Stitch: forest-900 header with "Account Manager" eyebrow / name / ID — listing.role, body with Asunto (computed from hotel name + stars + rooms + city), 2-col Objective / Role from listing data, mail + phone rows, and a "Schedule a Tour" pill CTA.
- Hover-leave clears the coords (popover unmounts). Re-entering the popover itself keeps it open.

### Data model
- `types/library.ts` — new `ReportContactInfo` (accountManager / accountManagerId / email / phone). `LibraryReport.contactInfo: ReportContactInfo | null`.
- Mock dataset: only the two top-promoted hotels carry contact info today: Ritz-Carlton Madrid (Carlos Velasco) and Mandarin Oriental Ritz (Marina López). The other four report `contactInfo: null`.

### Build
33 routes static. /library/favorites-list and /library/top-list 154 B / 133 kB First Load (+1 kB for the portal + popover). Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-list` (Top Reports institutional list)

Sibling list view of `/library/top-map`. Reuses the same `FavoritesTable` introduced for `/library/favorites-list` with one new toggle: `showReferenceColumn` inserts a REF column (HV-2024-NNN) just before the Report Type chip. Header copy swaps to "TOP REPORTS".

### Page
- `apps/web/src/app/library/top-list/page.tsx` — `LibrarySidebar` (Top Reports copy) + new `TopReportsListContent`.
- Header: "INSTITUTIONAL GRADE" badge, "Top Reports" title, "Promoted institutional hotel opportunities and underwriting intelligence." subtitle, three action icons (Map → /library/top-map, Filters, Settings).

### Table reuse
- `FavoritesTable` learned an optional `showReferenceColumn` prop. When set, renders an additional REF column header (`rowSpan=2`) and a monospace REF cell per row between IRR Equity and Report Type. Empty-state colSpan adapts (36 vs 37). No duplication, single canonical institutional table.

### Map ↔ list toggle generalized
- `HotelMap` now accepts an explicit `listViewHref` prop. /library/favorites-map passes `/library/favorites-list`; /library/top-map passes `/library/top-list`. The list-view button in `InstitutionalMapControls` only renders when an href is provided.
- TOP segmented tab is route-aware for both `/top-map` and `/top-list` (`activePaths`).

### Data model
- `LibraryReport` extended with `referenceCode` ("HV-2024-001" through "HV-2024-006") and `visibilityTier` (existing `VisibilityTier` union: promoted/institutional/community/verified — distinct from the Report Type chip; positions each hotel for the future Top Promote ranking engine).

### Build
32 → 33 routes static. /library/top-list 155 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/favorites-list` (institutional list view)

Bloomberg-grade table sibling of `/library/favorites-map`. Same `LibraryShell` and `LibrarySidebar`, swap the map for a 39-column technical terminal table over the same six mock reports.

### Page
- `apps/web/src/app/library/favorites-list/page.tsx` (LibraryShell + sidebar + new content column).
- Header bar: lime-on-forest "Institutional Grade" chip, "Favoritos" headline, subtitle, three-icon action group (map view link → `/library/favorites-map`, filters and settings as toast mocks today).
- Pagination footer: "SHOWING N OF M HOTELS".

### Table architecture (`favorites-table.tsx`)
- 39 visible cells per row (sticky-left "Hotel Name" + Category stars + Rooms + Market + 8 amenities + 9 listing/location columns + CAPEX + Total Invest 3-col group + Cap Rate + Market Value TTM 3-col group + Exit Year + Exit Price 3-col group + Yield + IRR Project + IRR Equity + Report Type chip + Contact + Star + PDF).
- `min-w-[4500px]` horizontal scroll; sticky `<thead>` survives both axis scroll; sticky first column with subtle right shadow.
- Accent column tints: blue for CAPEX / IRR Equity, emerald for Cap Rate / Market Value TTM.
- Locked-cell pattern: `LockedCell` renders a small blue lock pill for any null financial value (tier-gated).
- Memoized `<FavoritesRow>` (React.memo) so future virtualization drops in without prop reshuffles.
- Filters wired to the existing library store: search + legend toggles drive `visible` rows. Hover row highlight + cursor pointer + onSelect action (today: toast, future: open report detail).

### Cell primitives
- `AmenityIconCell` — single amenity, `forest-700` active / `slate-300` inactive. Lucide map: Bar→Coffee, Restaurant→UtensilsCrossed, Rooftop→Wine, Meet→Users, Gym→Dumbbell, Spa→Sparkles, Pool→Waves, Parking→Car.
- `ReportTypeChip` — Premium / PRO / Public / Private chip plus optional indicators row (Flame for top-promote, Edit3 for user-modified, EyeOff for private).
- `LockedCell` — small lock pill for tier-gated cells.

### Map ↔ list toggle on /library/favorites-map
- `InstitutionalMapControls` learned an optional `listViewHref` prop that renders a `LayoutList` link button between zoom-out and layers. `HotelMap` passes `/library/favorites-list`. The list page mirrors the toggle via the Map icon in its header.

### Sidebar tab routing
- `LibraryFilterTabs` now uses `activePaths[]` per tab, so the FAVORITOS pill stays active on both `/library/favorites-map` and `/library/favorites-list`.

### Data model (types/library.ts)
- New shapes: `ReportAmenities` (8 keys), `ReportLocation` (address/zip/subMarket/locationScore), `ReportListing` (role/objective/openYear/classLabel), `ReportPriceBlock` (total/perRoom/perM2), `ReportFinancials` (capex/totalInvest/capRate/marketValueTtm/exitYear/exitPrice/yield/irrProject/irrEquity — all nullable except capRate + marketValueTtm to express tier-gated cells), `ReportTypeBadge`, `ReportIndicators` (topPromote/userModified/private).
- `LibraryReport` extended with `amenities`, `location`, `listing`, `financials`, `reportType`, `indicators`, `hasContact`, `favorited`, `hasPdf`. The legacy `estValueEur` and top-level `capRate` stay for the favorites-map floating card.
- All six mock reports populated with realistic financial blocks per tier (Premium = full data, PRO = capex+irrEquity locked, Public/Private = most premium fields locked).

### Build
30 → 32 routes static. `/library/favorites-list` 154 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-map` (Top Reports map)

Sibling page to `/library/favorites-map`. Same institutional language (LibraryShell + LibrarySidebar + HotelMap + FloatingHotelCard) — no duplicated chrome, no parallel components. Visual deltas vs favorites-map are limited to title, subtitle, search placeholder.

### Architecture
- `LibrarySidebar` accepts `title` / `subtitle` / `searchPlaceholder` props with defaults that preserve favorites-map behaviour byte-for-byte.
- `LibraryFilterTabs` becomes route-aware: `<Link>`-based segmented control (FAVORITOS → `/library/favorites-map`, TOP → `/library/top-map`); active state from `usePathname()`. Clicking either tab now navigates between the two pages.
- Removed `filterTab` slice from the library Zustand store (replaced by URL truth). `LibraryFilterTab` type retired.
- Forward-compat types added to `types/library.ts` for the future Top Promote marketplace + ranking engine: `VisibilityTier` (`promoted` / `institutional` / `community` / `verified`), `MapMarkerType`, `AssetType`, `AccessTier`, `InvestmentBand`, `ReportRanking`, `TopReport`, `PromotedReport`, `TopReportsLegendState`, `TopReportsFilters`, `TopReportsViewMode`. No render touches today — purely the typed surface.

### Page
- `apps/web/src/app/library/top-map/page.tsx` — composes `LibrarySidebar` (top-map copy) + the existing `HotelMap`. Mock dataset and store are shared with favorites-map: legend toggles, search, layer overlays and selection persist across the FAVORITOS/TOP swap (institutional UX).

### Build
30 → 31 routes static. `/library/top-map` 155 B / 126 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library v1: `/library/favorites-map` (Favoritos map)

First page of the institutional Library surface. Saved-reports + community + TOP PROMOTE markers over a mock institutional grayscale map of Madrid. No backend, no Mapbox — fully mock.

### Route + shell
- `/library/favorites-map` — `apps/web/src/app/library/favorites-map/page.tsx`
- `app/library/layout.tsx` wraps every `/library/*` page in a new `LibraryShell` (AppHeader + `h-screen` body row + slim institutional footer).
- `AppHeader.libraryHref` default updated from `/library` → `/library/favorites-map`. New active-state logic: when `usePathname()` starts with `/library`, BIBLIOTECA renders as a black-fill button and USUARIO inverts to a white-with-border button — matches the Stitch reference.
- Extracted the previously-private `SettingsFooter` into `components/layout/institutional-footer.tsx` (`variant: "default" | "slim"`); `SettingsLayout` now imports it. Single source of truth for the institutional bottom chrome.

### Components shipped (`components/library/`)
- `LibraryShell` — outer kiosk shell
- `LibrarySidebar` — 300 px, FAVORITOS title + subtitle, legend card, search input, segmented filter, bottom CTA
- `MapLegendCard` — 3 category toggles (Saved / Comunidad / Top Promote) + 3 layer toggles (Heatmap / Líneas de Metro / Centro Histórico)
- `MapLayerToggle` — 32×18 institutional rail switch (slate-300 → blue-700 on)
- `LibraryFilterTabs` — FAVORITOS / TOP segmented control
- `HotelMap` — provider-agnostic mock map (grayscale aerial bg, percentage markers, optional overlays for heatmap / metro / historic centre); ready for Mapbox swap (records carry real `lat/lng`)
- `HotelMapMarker` — category-coloured dot + hover tip; TOP PROMOTE pulses
- `InstitutionalMapControls` — top-right zoom +/- + layers stack
- `FloatingHotelCard` — bottom-right glass preview (hotel name, classification, room count, TOP PROMOTE / tier badges, EST. VALUE + CAP. RATE tiles, "View Full Valuation" CTA)

### State & data
- `lib/library/store.ts` — Zustand UI state (legend, layers, filterTab, search, selectedReportId). In-memory by design.
- `lib/library/mock-reports.ts` — 6 institutional reports with real coordinates: Ritz-Carlton Madrid, Mandarin Oriental Ritz, Four Seasons Madrid, The Madrid EDITION, Hard Rock Marbella, W Barcelona. Each carries `category`, `visibility`, valuation, cap rate, rooms, owner, full `ReportPromotion` block (`promoted`, `promotedUntil`, `boostScore`, `featuredRegion`, `impressions`, `clicks`).
- `types/library.ts` — `LibraryReport`, `ReportCategory`, `ReportVisibility`, `ReportStatus`, `ReportPromotion`, `LibraryLegendState`, `LibraryLayerState`, `LibraryFilterTab`, `MapBounds`, `MapProviderHandles`.

### Architecture notes
- Future-ready map abstraction: real `lat/lng` already on every record; `mockPosition` (top%/left%) is the temporary projection layer the Mapbox swap drops.
- Bottom CTA + map controls + "View Full Valuation" emit sonner toasts today (mock actions).
- Search filters in-memory by hotel name; legend toggles hide/show markers by category live.
- Report taxonomy supports `private` / `team` / `public` / `top-promote` visibility ready for the future sharing & marketplace flows.

### Build
Typecheck clean. No backend / no DB / no Mapbox added.

---

## 2026-05-10 — Investment Requirements / Hotel Value: investor financial criteria

Replaced the `/settings/investment/value` placeholder with the full Hotel Value criteria engine — third tab in the Investment Requirements surface. Captures investor underwriting preferences across 5 sections that feed the future DCF / IRR / debt sizing / exit yield pipeline.

### Sections (5)
- **Site Acquisition** — Asking Price slider (€/$ currency selector + Total/Per Room/Per m² display), Acquisition Cost (Basic/Premium gate; Premium reveals editable 5-line table: Notary & Registry, AJD Stamp Duty, ITP Property Tax, Acquisition Fee, Key Money Operator), Total Investment slider with `Guardar` action, collapsible Saved Scenarios list with delete
- **Exit Investment** — Exit Price slider with `Guardar`, Saved Scenarios, Cap Rate Scenario (flat segmented Conservador/Mercado/Optimista — distinct from RevPAR Scenario card style per Stitch), Yield Target / IRR Project / IRR Equity sliders
- **Rent Factor** — `enabled=false` by default. € Rent input, % Fixed Rent + % Variable Rent each with slider + numeric input + basis select (% Revenue / % GOP / % EBITDAR)
- **Finance Structure** — 8 institutional sliders in 2-col grid (Acquisition Debt, Capex Debt, Interest Rate, Amortization Asset, Grace Period, Amortization Capex, Bullet Payment, Opening Fee) — each with range hint
- **P&L Forecast** — TTM slider, Management Fee Basic/Premium gate (Premium reveals Base + Incentive fee with basis segmented), Marketing — Royalty %, FF&E Reserve Y1-Y4 grid

### Right sidebar
- `PremiumSubscriptionCard` — dark-forest gradient + yellow accents, 8 features (Hotel Personalizado, CompSET Premium, CAPEX & Renders, P&L Forecast, Financial Strategy, Underwriting & IRR Equity, AI Imágenes, Chatbot P&L Premium), "Valora Prime" footer, ACTIVATE CTA
- `ProSubscriptionCard` — white card, 7 PRO features (Hotel Asset Info, CompSET PRO, Market Overview, Hotel Transactions Comparable, Local Hotel Projects, IRR Project, Informe Privado), disabled INCLUDED CTA

### Store extension (`lib/investment/store.ts`)
- New `ValueAssumptions` slice with 5 sub-blocks; persist version bumped to v3 with chained migration (v1 → market hydrate, v2 → value hydrate)
- 30+ granular mutations for all field types
- Saved scenarios — `addSiteScenario` / `addExitScenario` capture the current slider value + mode and append to the scenarios list

### Reusable architecture
- New shared `InstitutionalToggle` extracted from market's inline `MasterToggle` — now the canonical ON/OFF switch across both market + value surfaces; `forecast-growth-card` refactored to import it
- New `ACQUISITION_COST_LINES` taxonomy (`lib/investment/value-acquisition.ts`) — Excel-mappable line ids for future workbook ingestion
- `CapRatePicker` is a new primitive (the spec said reuse RevPAR style but Stitch shows a flatter segmented pill — built per Stitch)

### Components shipped
14 new files in `components/settings/investment/value/`: 7 primitives (DisplayModeToggle, UnderwritingSlider, LabeledSlider, BasicPremiumPicker, CapRatePicker, SavedScenarioList, AcquisitionCostTable, FfeReserveYears), 5 sections (Site/Exit/Rent/Finance/PL), 2 sidebar cards.

### Build
`/settings/investment/value` 8.12 kB / 130 kB First Load. 28 routes total. Typecheck clean.

---

## 2026-05-10 — Investment Requirements / Hotel Market: ADR + OCC growth, RevPAR scenario, target

New authenticated route `/settings/investment/market` — second tab inside the criteria engine. Captures market-level assumptions that feed the future P&L / DCF / IRR re-projection pipeline.

### Routing refactor
- `InvestmentTabs` converted from Zustand `activeTab` state to real Next.js routes (`/settings/investment` = Asset · `/settings/investment/market` · `/settings/investment/value`). Active state derived from `usePathname()` so analysts can deep-link / refresh into any tab and the back button works.
- Removed `activeTab` + `setTab` from `useInvestmentStore`; `partialize` and store version bumped to v2 with a `migrate` function that hydrates the new `market` slice on existing v1 localStorage.
- `/settings/investment/value` shipped as a minimal placeholder page so the third tab doesn't 404.

### Sections (Hotel Market)
- **ADR Forecast Growth** — master ON/OFF + CONSTANT (slider 0–10%) / CUSTOM (Year 1–4 inputs) modes
- **OCC Forecast Growth** — same pattern
- **RevPAR Scenario** — reuses the canonical 3-button selector from `@/components/report/financials` (DOWN/BASE/UP, decorative top labels Conservador/Mercado/Optimista)
- **RevPAR Target** — €/room thesis hurdle

### Scenario KPI tables (`lib/investment/market-scenarios.ts`)
Hand-curated mock keyed by `UnderwritingScenario`. Distinct from the P&L's own scenarios — these capture *market-level* growth assumptions:
- DOWN: OCC +2/+1/+0/+0 pp · ADR +1.5/+1.0/+1.0/+1.5%
- BASE: OCC +3/+2/+1/+0 pp · ADR +3.6/+2.9/+1.5/+2.4%
- UP:   OCC same as BASE · ADR +5.0/+4.0/+3.5/+5.0%

Tables intentionally NOT rendered in the segmented selector — used internally for downstream re-projection. v2 hydrates from CoStar / STR exports.

### Right sidebar
Four cards: `MarketCoverageCard` (compact country pills — distinct from the asset-tab tree variant), `MarketPrimeCard` (dark forest premium tier with PRIME badge + ACTIVATE), `MarketOverviewCard` (white feature gate with INCLUDED CTA), `ExtraPackagesCard` (yellow add-on stacker with auto-recomputing total).

### Components
- `components/settings/investment/market/` — 6 new files (ForecastGrowthCard, RevparTargetCard, MarketCoverageCard, MarketPrimeCard, MarketOverviewCard, ExtraPackagesCard) + barrel
- `SectionHeader` extended with optional `rightSlot` for the inline ON/OFF toggle on Market sections
- `RevparScenarioCard` reused from `@/components/report/financials` per spec — no new component

### Store
- `MarketAssumptions` type added to `InvestmentCriteria` (adrGrowth, occGrowth, revparScenario, revparTargetEur)
- New mutations: `setAdrGrowth`, `setOccGrowth`, `setRevparScenario`, `setRevparTarget`, `resetMarket`

---

## 2026-05-10 — Investment Requirements: criteria engine + match-engine architecture

New authenticated page `/settings/investment` — the canonical engine that defines what hotels the user wants to acquire. Drives the future GREEN / YELLOW / RED match indicator that will surface on every analytical surface (Executive Summary, CompSet, Underwriting, Deal Screening, IC reports).

### Page composition (3-col layout)
- Top sub-tabs: Hotel Asset (active, shipped) / Hotel Market / Hotel Value (registered, no-op v1)
- Main column (editorial card): 6 sections — MyProperty Parameters · Capacity & Operation · Location Targets · Property Specs · CAPEX Settings · Renders/AI Image
- Right sidebar (sticky `lg:top-24`): MyProperty Facilities · CompSet Facilities · Global Coverage tree
- Bottom centered SAVE PREFERENCES CTA

### Data layer — `lib/investment/`
- `types.ts` — `InvestmentCriteria`, `MatchTier`, `MatchResult`, `CapexUnit`, `FacilityId`, `CoverageNode`
- `capex.ts` — `CAPEX_TREE` (Hard/Soft/Project Costs) Excel-mappable by line `id`
- `facilities.ts` — 8 canonical facility ids (bar/restaurant/rooftop/meetings/parking/gym/spa/pool)
- `coverage.ts` — Spain (Madrid + Barcelona) + Italy (Rome/Milan) hand-curated tree
- `match-engine.ts` — `evaluateHotel(hotel, criteria)` stub returning hardcoded "strong" result; `tierFromScore()` thresholds (≥0.75 strong / ≥0.50 partial / <0.50 weak)
- `store.ts` — Zustand persist (key `hv-investment-v1`) — every input survives reload
- `index.ts` — public surface

### Components — `components/settings/investment/`
- 14 files: `InvestmentTabs`, `SectionHeader`, 6 section cards, `CapexTable` (collapsible Hard/Soft/Project + per-line value+unit selectors), `FacilitiesCard` (reusable for MyProperty + CompSet via `bottomSlot`), `CoverageCard` + `CoverageTree`, `DualRangeSlider` (custom thumb styling via styled-jsx), `SliderField`, `MatchIndicator` (🟢🟡🔴 placeholder primitive for downstream surfaces)

### Architecture notes
- Match engine is a stub today; v2 wires per-category scoring (location, size, facilities, financials, capex, strategy)
- CAPEX line ids align with the future Excel underwriting workbook for 1:1 hydration
- `MatchIndicator` ships unused on the page itself — it's the primitive every downstream report will render

---

## 2026-05-09 — 5-Year P&L Forecast: Year 1 monthly expansion + seasonality engine

The Year 1 column in the USALI table is now expandable. Clicking `▸ Year 1` in the header replaces the single column with 12 month sub-columns (Jan–Dec) inline within the same table; chevron flips to `▾`.

### Seasonality engine
New module `lib/report/financials/seasonality.ts`:
- `SeasonalityProfile` contract — 12 occupancy + 12 ADR multipliers + source id
- `MADRID_UPSCALE_SEASONALITY` default (Q2/Q3 strong, Aug weak, Jan/Feb soft)
- `getSeasonalityProfile(market, class)` lookup — returns Madrid default in v1
- `expandYear1ToMonthly(assumptions, computed, profile)` — pure monthly pipeline
- `adapterFromCoStarMonthlyRows` — adapter stub for future Excel ingestion

### Mathematical guarantees
Sum of monthly = annual Year-1 value, exactly:
- Variable lines: ratio × monthly revenue (sums to ratio × annual)
- Inflated lines: annual amount × days[m] / 365
- Hybrid dept fixed payroll portion: same pro-rata by days

EBITDA % margin varies month-to-month (low-occupancy months bear same fixed costs against lower revenue).

### UI / table layout
- `FinancialTable` renders 1-row header when collapsed (current), 2-row header when expanded:
  - Row 1: Label / Assump / `▾ Year 1` (colSpan=12) / Year 2 / Year 3 / Year 4 / Year 5
  - Row 2: 12 month abbreviations under the Year-1 span; Y2-Y5 carry rowSpan=2
- `getTableColCount(expanded)` → 7 collapsed, 18 expanded
- `PLRow` accepts optional `year1Monthly: number[]` — when provided, replaces the single Y1 cell with 12 read-only monthly cells
- `FinancialResultRow` same pattern (incl. EBITDA `% Margin` sub-row)
- Monthly cells render compact (smaller padding + font) so 12 columns fit reasonably; horizontal scroll in narrow viewports

### Architecture for future CoStar Excel ingestion
Adapter pattern in place — `getSeasonalityProfile` is the swap point. Replace the body with a CoStar query / Excel adapter when the dataset ships.

### Print
Expansion state survives print — analyst's choice respected. No auto-collapse for PDF. With 18 columns the table may overflow A4 portrait (acceptable trade-off).

### Files
- `NEW`  `apps/web/src/lib/report/financials/seasonality.ts`
- `EDIT` `apps/web/src/lib/report/financials/index.ts` (exports)
- `EDIT` `apps/web/src/components/report/financials/financial-table.tsx` (header variants, toggle)
- `EDIT` `apps/web/src/components/report/financials/pl-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/financial-result-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/pl-section.tsx` (forwarding)
- `EDIT` `apps/web/src/components/report/financials/pl-table.tsx` (state owner + memo)

---

## 2026-05-09 — 5-Year P&L Forecast: hybrid departmental + payroll inflation activated

Fixed a residual rounding artifact: at 1 decimal place, EBITDA margin Y3-Y5 displayed identically (~31.4%) because the year-to-year deltas were sub-0.1pp. Root cause: departmental expenses were 100% variable (ratio × revenue), so they captured no payroll cost pressure independent of revenue growth.

### What changed in `computePL`
Departmental expenses (Rooms / F&B / Other Dept) refactored to hybrid 70 / 30 split:
- 70% variable: ratio × dept revenue (labour productivity scales with the business)
- 30% fixed-inflating: Y1 base × `payroll inflation` compounded

`DEPT_PAYROLL_FIXED_SHARE = 0.3` hard-coded in `calculations.ts` (institutional default for full-service hotels). The `payroll` field on `expenseInflation` now drives the model — previously decorative.

### Effect on BASE preset (default 4.5% payroll, 2.5%/3.5% other/utilities)
Year-by-year EBITDA margin trajectory (visible variation at 1 decimal):
- Y1 ~29.6% (no inflation compounded yet)
- Y2 ~31.2%
- Y3 ~32.0% ← peak (operating leverage maximises at stabilization)
- Y4 ~31.9%
- Y5 ~31.6% (revenue growth Y5 +2.4% < payroll 4.5% → mild compression)

Y3 ≠ Y4 ≠ Y5 ✓. Pattern matches the canonical institutional hotel model (peak at stabilization, gentle plateau / late-cycle compression).

### Scenario sensitivity
- DOWN: revenue grows ~3%/year < payroll 4.5% → margin contracts from Y2 onwards
- BASE: revenue ~5%/year ≈ payroll → peak then mild contraction
- UP: revenue ~7-8%/year > payroll → sustained expansion

---

## 2026-05-09 — 5-Year P&L Forecast: operating leverage (margin expansion)

Fixed a model bug where every USALI expense line was modelled as `ratio × revenue` (variable). Result: EBITDA margin was identical across all 5 years — no operating leverage at all.

### What changed in `computePL`
Undistributed lines (Admin, S&M, Property maint, Utilities) + Property tax & insurance now compound from their Year-1 base by the `expenseInflation` rates from the second top card:
- Admin / S&M / Property maint / Property tax → `other` (2.5%)
- Utilities → `utilities` (3.5%)

Departmental expenses + Mgmt fee + FF&E reserve stay variable (ratio × revenue) — labour-driven and contract-priced lines respectively.

### Effect
Year 1 EBITDA margin unchanged (no inflation has compounded yet). Year 2-5 margin expands when scenario RevPAR growth > inflation rate. For BASE preset: Year 1 30.6% → Year 5 ~32% (institutional operating leverage realism).

The `expenseInflation` card values now drive the model — previously they were captured on `PLAssumptions` but had no effect.

---

## 2026-05-09 — 5-Year P&L Forecast: scenario presets (Down/Base/Up)

Replaced the single-rate scenario model with three full underwriting presets. Each preset is a complete (occupancy pp-deltas + ADR YoY growth) tuple per year — switching the active scenario re-projects ADR, RevPAR, Revenue, GOP, EBITDA, and EBITDA margin in one `computePL` pass.

### Preset table (committee spec)
| Scenario | Y2 Occ Δ | Y3 Occ Δ | Y4 Occ Δ | Y5 Occ Δ | Y2 ADR | Y3 ADR | Y4 ADR | Y5 ADR |
|---|---|---|---|---|---|---|---|---|
| DOWN | +1.0pp | +1.0pp | +0.5pp | +0.5pp | +1.5% | +2.0% | +2.0% | +2.5% |
| BASE | +3.0pp | +2.0pp | +1.0pp | 0pp | +3.6% | +2.9% | +1.5% | +2.4% |
| UP   | +3.0pp | +2.0pp | +1.0pp | 0pp | +5.0% | +4.5% | +4.0% | +3.5% |

BASE preset reproduces the Stitch table figures (Year 5 RevPAR ≈ €137.68 vs €138.69, within rounding).

### UI
RevparScenarioCard is now a 3-button preset selector (Down / Base / Up) styled as institutional input-tiles. Active button = forest-900 + white. Inactive = white + slate. PRO renders disabled, PREMIUM clickable.

### Data layer
- `PLAssumptions.scenarioGrowth` and `occupancyGrowth` removed.
- `PLAssumptions.activeScenario: UnderwritingScenario` added.
- `SCENARIO_PRESETS: Record<UnderwritingScenario, { occDeltas[4]; adrGrowth[4] }>` lives in `lib/report/financials/assumptions.ts`.
- `SCENARIO_LABELS` updated to short institutional form: `Down / Base / Up`.

---

## 2026-05-09 — 5-Year P&L Forecast: Lectura A scenario architecture

Refactored `/report/financials/pl` so each underwriting scenario is an independent committee growth parameter instead of a globally-selected lens. Removed the global `ScenarioToggle` from the report header and the Zustand store under `lib/underwriting/scenario.ts` (kept the type + display labels for reuse).

### Changes
- **Sidebar**: `Financials → P&L` → `Financials → 5-Year P&L`.
- **RevparScenarioCard**: 3-tile readout → 3 editable inputs (Conservador / Mercado / Optimista). Each one a constant RevPAR growth rate.
- **EbitdaStabilizedCard**: assumption value `50.5%` → derived from `computed.results.ebitdaMargin[2]` (Year 3 % margin). Auto-tracks edits.
- **Header**: `ScenarioToggle` removed from header actions.
- **Calc model change**: `computePL(a, scenario)` → `computePL(a)`. Uses `a.scenarioGrowth.base` as a constant year-over-year multiplier (no more yr2/yr3/yr4-5 differentiation). Year 5 RevPAR ≈ €143.59 (vs prior €138.69 from differentiated growth).

### Data layer
- `PLAssumptions.revparGrowth { yr2; yr3; yr4to5 }` and `PLAssumptions.revparScenario` removed.
- New: `PLAssumptions.scenarioGrowth: Record<UnderwritingScenario, number>` — 3 independent constant growth rates.
- Defaults: `{ downside: 0.085, base: 0.060, upside: 0.030 }` (preserves Stitch reference values).

### Tier behaviour (unchanged)
FREE → page-level upgrade gate. PRO → all inputs (including the 3 scenario rates) render `readOnly`. PREMIUM → editable.

### Files
- `EDIT` `apps/web/src/lib/report/financials/{types,assumptions,calculations,index}.ts`
- `EDIT` `apps/web/src/lib/underwriting/scenario.ts` (drop store, keep type + labels)
- `EDIT` `apps/web/src/components/report/financials/pl-top-cards.tsx`
- `EDIT` `apps/web/src/app/report/financials/pl/{page,pl-content}.tsx`
- `EDIT` `apps/web/src/lib/report/sections.ts`
- `DELETE` `apps/web/src/components/report/scenario-toggle.tsx`

---

## 2026-05-09 — Projects page (sub-route under Market Overview)

Second sub-route under Market Overview. Mirrors Transactions structure with project-specific extensions.

### New page — `/report/market-overview/projects`
- Sub-route, sidebar two-pass detection picks it via Pass 1.
- Same shell pattern as Transactions: `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → KPI row + projects table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview: `Projects` switched from `#projects` hash anchor → `/report/market-overview/projects` real sub-route.

### Reuse — no duplicate components built
- `TransactionsKpiCard` (cross-folder import) — same dual-metric shape; renders projects pipeline KPIs.
- `TransactionHotelCard` (cross-folder import) — same gallery card.
- `DualMetric`, `TransactionClass`, `TransactionHotelGalleryItem` types — re-imported.

### New section family — `components/report/market-overview/projects/`
- `ProjectsTable` — 19-column institutional table (one more than Transactions: STATUS pill column). Renames `Buyer→Owner`, `Seller→Developer`, `CAPEX→Construction Type`.
- `StatusBadge` — emerald (Complete) / blue (Under Construction) pill.

### Data layer — `lib/report/projects-data.ts`
- `ProjectRow` adds `status: ProjectStatus` and `constructionType: ConstructionType` discriminated unions.
- 5 mock projects (same Madrid hotels for cross-page consistency).
- 4 gallery items using real Stitch CDN URLs.

### Side-effect
- `TransactionsKpiCardData.scope` widened from union literal to `string` so `ProjectsKpiCardData.scope` (`"market" | "category"`) flows through the same component without TypeScript variance complaints. Component only uses `scope` as a DOM id key.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/projects` and on every other report route.
- SSR confirms: 2 KPI titles, 5 status badges (3 Complete + 2 Under Construction), 5 construction types (3 Conversion + 2 New Development), all owner/developer fields. Sidebar Projects active.

---

## 2026-05-09 — Transactions page (sub-route under Market Overview)

New report sub-section integrated. Web layout + responsive shipped per priority order; print compaction will be the next pass.

### New page — `/report/market-overview/transactions`
- Sub-route under Market Overview (sidebar two-pass detection picks it via Pass 1 — sub-route match).
- `<ReportShell>` (default portrait) → `<ReportPaper closed headerLayout="stacked" actions={<HotelLabel + HotelToggle>}>` → KPI row + comp-set table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview sub-items updated:
  - `Market overview` → `/report/market-overview` (sub-route, was `#overview` hash anchor)
  - **`Transactions` → `/report/market-overview/transactions`** (NEW sub-route, was `#transactions` hash anchor)
  - `Projects` and `Market dynamics` remain hash-anchor placeholders.

### New section family — `components/report/market-overview/transactions/` (4 components)
- `TransactionsKpiCard` — header + `InsightBadge` + 2×2 dual-metric grid. Same chrome as Market Overview insight cards.
- `DualMetricCell` — twin label+value pair via `flex justify-between` (replaces Stitch's whitespace-padding hack).
- `TransactionsTable` — institutional 18-column comp-set table with sticky-style header bar, "Add" placeholder CTA, divide-y rows, soft hover, asset-name highlight on row hover, local checkbox state for the Inc. column.
- `TransactionHotelCard` — 4:3 image card with dark gradient, white headline caption (bottom-left) + glass arrow button (bottom-right).

### Data layer — `lib/report/transactions-data.ts`
- 2 KPI cards × 4 dual metrics, 5 table rows (Madrid luxury hotels), 4 gallery items.
- Discriminated union `TransactionClass`. Numeric values pre-formatted strings (`€130,000,000`, `€849,673`).

### Reuse
- `ReportShell`, `ReportPaper`, `HotelToggle`, `InsightBadge`, `ActionBar` — all canonical, no changes.
- Print canvas portrait by default (no orientation prop on this page).

### Web priority — done
- ✅ Layout web: KPI row 2-col + table + gallery 4-col.
- ✅ Responsive: KPI `grid-cols-1 md:grid-cols-2`, gallery `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, table `overflow-x-auto whitespace-nowrap`.
- ✅ Visual integration: same badge styling, same card chrome, sub-route under Market Overview.

### Print — basic only (next-pass focus)
- `print:break-inside-avoid` on KPI cards and table rows; `print:hidden` on Inc. checkbox column, "Add" CTA, gallery arrow button.
- Pending: column subset for portrait OR landscape opt-in, thead repeat (`display: table-header-group`), font-size compaction.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/transactions` and all other report routes.
- SSR: 2 KPI cards · 2 badges · table title · 5 table rows · 4 gallery cards. Sidebar `Transactions` active (`text-emerald-900 font-bold`), `Market overview` inactive (`text-slate-500`).

---

## 2026-05-08 — Documentation pass (state-of-the-system refresh)

Full sweep refreshing every architecture / report / print / map doc to reflect the post-Phase-0 + 4-section-integration state. No code changes.

### Updated
- `TECH_AUDIT.md` — status banner at the top with per-finding resolution markers; original audit body preserved as snapshot.
- `NEXT_PHASE_PLAN.md` — per-phase status table (Phases 0, 1, 2, 3, 5, 8 ✅ Done; 6 / 10 🟡 Partial; 4, 7, 9 ⏸ Outstanding); updated next-step recommendations.
- `ARCHITECTURE_SCORECARD.md` — full re-score with delta column. Composite **6.42 → 7.42 / 10**. Heaviest movement: frontend architecture (6.3 → 7.8), report system (6.0 → 8.0), documentation (7.3 → 8.7).
- `docs/architecture.md` — application flow updated with all 5 implemented routes and 2 planned.
- `docs/report-system.md` — full rewrite covering canonical shell, registry, sub-anchor href contract, two-pass active-detection, page composition patterns (standard / stacked / carousel), per-page orientation.
- `docs/print-pdf.md` — extended with portrait + landscape canvases, named-page rules, carousel ↔ static-grid print logic, per-page print profiles, interactive-control print policy.
- `AI_CONTEXT.md` — Report Module section refreshed (5 of 6 sections, primitives barrel + section families, two-pass sidebar, carousel pattern, both canvas variants, all current mock files).
- `ENTRYPOINTS.md` — added page entries for Asset Analysis × 2 + Market Overview, all section family folders, `maps.md` doc reference, root-level `REPORT_PAGES.md` / `UI_COMPONENTS.md` references.
- `CLAUDE.md` — `docs/` tree updated with `maps.md`; doc-update mandate table extended with maps.md trigger.

### Created
- `docs/maps.md` — canonical doc covering both map systems: Mapbox CompSet map (`/compset` + `/report/competitive-set`) and stylised pin map (`SharedMapCard` for Market Overview demand generators), with reuse pattern, data shapes, print behaviour, and outstanding items.

### Decisions captured

| Decision | Source iteration | Rationale |
|---|---|---|
| Single canonical report shell (no parametric `[reportId]`) | Phase 0 | Eliminate dual-architecture risk identified in audit |
| `sections.ts` is the only registry | Phase 0 | One source of truth for sidebar + page-break + status |
| Sub-item href: absolute path OR hash anchor | Asset Analysis ports | Real sub-routes coexist with in-page anchors |
| Two-pass sidebar active detection | Market Overview | Prevent "all hash-anchors active" bug |
| Stacked header layout for Asset Analysis / CAPEX / Market Overview | Stitch ports | Matches Stitch reference (PDF button on its own row) |
| `closed` paper variant | Stitch ports | Fully bordered card for sections without trailing ActionBar attachment |
| `printOrientation` prop on ReportShell | Market Overview iteration | Two A4 canvases; default portrait; landscape opt-in |
| `@page { margin: 10mm }` (was `8mm 10mm`) | Market Overview iteration | Institutional symmetric margin |
| Market Overview portrait (was landscape) | Market Overview revision | Institutional report standard; landscape variant remains wired but unused |
| Carousel: paged desktop + free swipe mobile + static grid print | Market Overview integration | Three modes, one DOM render, media-query driven |
| Stitch-verbatim Submarket / Class investment metrics | Second Stitch screen | Honour source of truth even when Stitch reuses Country/Market labels |
| Population footer as vertical KPI tile in column 3 | Footer revision | Future-proofing for 2 additional metrics in cols 1+2 |

### Problems detected and resolution adopted

| Problem | Solution |
|---|---|
| Audit identified two parallel report shells | Phase 0 deleted `layout/`, `report-context.tsx`, `[reportId]` route tree |
| `report-nav.ts` (6 items) + `sections.ts` (15 items) both alive | Phase 0 deleted `report-nav.ts`; rewrote `sections.ts` to match the canonical 6-section visible structure |
| `pdf-export-button.tsx` (window.print()) + `export-button.tsx` (full API) + `pdf-export.ts` (named function) | Consolidated into `lib/report/pdf-export.ts` (`exportReport(metadata?)`) and a single `PdfExportButton` primitive |
| Repo-root Vite cruft (`index.html`, `vite.config.js`, root `src/`, root `node_modules`) | Phase 0 cleanup: `git rm` tracked + `rm` untracked + `git mv backup.ps1 scripts/` |
| Sidebar showed all 4 hash-anchors as active on Market Overview | Replaced per-sub-item check with section-level two-pass selection |
| Population footer spanning the full row blocked future metrics | Switched to `grid grid-cols-3` with `col-start-3`; cols 1+2 reserved |
| Stitch reference uses different content for Submarket / Class | Updated `lib/report/market-overview-data.ts` to match second Stitch HTML byte-for-byte (Spain / Madrid investment context labels) |
| Print canvas was Chromium-only (`zoom: 0.74`) | Added `@-moz-document` Firefox fallback using `transform: scale()` for both portrait and landscape |
| First Market Overview attempt rendered in landscape A4 | Reverted to portrait; landscape canvas variant remains wired in shell + globals.css |
| Per-card content too tall for 2 × 2 print grid | Aggressive `print:` compaction across MarketInsightCard + nested primitives (paddings, gaps, chart heights, font sizes) |

### Recommended next steps

1. **Phase 4 — Data layer.** `lib/api/reports.ts` with TanStack Query hooks; backend stub at `apps/api/app/api/v1/reports/router.py`.
2. **Section 5 — Financials page.** Compose from existing primitives; reuse SVG chart pattern from Market Overview / CAPEX.
3. **Section 6 — Methodology page.** Lighter — typography + locked tiers list. Reuse `MethodologicalNote`.
4. **Phase 6 — Cross-browser print matrix.** Capture Chromium / Firefox / Safari PDF screenshots; store under `docs/_screenshots/print/`.
5. **Phase 7 — Mapbox state sharing.** Lift `useCompset` into `<CompsetProvider>` so layer toggles persist across `/compset` ↔ `/report/competitive-set`.
6. **Phase 9 — Bundle audit.** Drop `recharts` and `numeral` if unused; replace `<img>` with `next/image` for hotel photos.
7. **Auth gating** on report routes once role enforcement is wired.

### Verification

- `pnpm typecheck` passes (verified earlier in this session).
- All 5 implemented report routes return HTTP 200.
- Doc set: every file referenced by `ENTRYPOINTS.md` exists and is current.

---

## 2026-05-08 — Market Overview footer KPI → vertical 3-col tile

The card footer (Población / Premium Inventory) was a horizontal strip (label left, value right). It now renders as a vertical KPI tile inside a 3-column grid so future metrics can fill the left and centre columns without a layout change.

### Change
- Footer container: `flex items-center justify-between` → `grid grid-cols-3 gap-4`.
- Población / Premium Inventory tile placed in **column 3** via `col-start-3`. Adding new metrics before this block in JSX will auto-flow into columns 1 and 2.
- Tile styling now matches the investment metric tiles (label `text-[9px] font-bold uppercase tracking-wider`, value `text-sm font-bold text-slate-800`, print sizes `print:text-[7px]` / `print:text-[9px]`).

### Preserved
- Web layout proportions (carousel, card size, charts, spacing).
- PDF behavior — same card height budget; the only footer change is the internal label / value stacking.
- All 4 cards render the change uniformly: España (47.4M), Madrid (6.7M), Madrid Centro (1.4M) all show **Población** vertically; Luxury (18.5%) shows **Premium Inventory** vertically.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms 8× `grid grid-cols-3` + `col-start-3` (4 cards × 2 RSC payload), 0× old horizontal layout, 3× Población + 1× Premium Inventory still rendered.

---

## 2026-05-08 — Market Overview print → A4 portrait, single page

Print mode reverted from landscape to portrait per the institutional report standard. The 4 insight cards now compact aggressively in print so the 2 × 2 grid lives on one A4 portrait page. Web / mobile layouts are untouched — the changes are entirely behind `print:` modifiers.

### Page-level
- `<ReportShell>` no longer carries `printOrientation="landscape"` — falls back to canonical portrait canvas.
- Page padding tightened in print: `print:px-3 print:py-2 print:space-y-2`.

### Carousel
- `.market-carousel-track` in print now carries `break-inside: avoid` so the 2 × 2 grid stays on one A4 page.
- Print grid gap tightened to **6 px** (was 16 px).

### Per-card compaction (web unchanged)
- Outer container: `p-6 → print:p-2`, `gap-6 → print:gap-1.5`, `print:rounded-md`.
- Title: `text-2xl → print:text-sm`.
- `MetricGrid`: `py-4 → print:py-1`, `gap-y-4 → print:gap-y-1`, value `text-sm → print:text-[9px]`.
- `MiniBarChart`: `p-3 → print:p-1`, bar area `h-16 → print:h-7`.
- `TrendBars`: `p-3 → print:p-1`, bar area `h-12 → print:h-6`.
- `InvestmentChart`: `h-24 → print:h-9`.
- `InsightBadge`: `text-[10px] → print:text-[6px]`, `px-2 py-1 → print:px-1 print:py-0.5`.
- `SplitBar`: bar height `h-1.5 → print:h-1`.
- Investment metric grid: `gap-4 → print:gap-x-2 print:gap-y-0.5`. Footer: `pt-4 → print:pt-1`.

### Global @page
- Margin updated to `10mm` uniform (was `8mm 10mm`) per spec.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview` and every other report page (no regression).
- SSR: 0 instances of `report-print-canvas-landscape` (reverted to portrait), portrait `report-print-canvas` applied on `<main>`. Carousel still 4 slides + 2 arrows on web. Print compaction classes (`print:p-2 print:gap-1.5`, `print:py-1`, `print:h-7`, `print:h-9`, …) all in DOM.

---

## 2026-05-08 — Market Overview integration

New report section consolidating the previous two Stitch pages (Country/Market and Submarket/Class) into a single horizontal-scroll experience that collapses to a 2 × 2 print grid for A4 export.

### New page — `/report/market-overview`
- One canvas, 4 insight cards in a horizontal snap-scroller (web) → static 2 × 2 grid (print).
- `sections.ts` entry flipped to `implemented: true`; sub-anchors updated to `#country / #market / #submarket / #class`.
- `ActionBar` rendered below the paper.

### New section family — `components/report/market-overview/` (13 components)
- `HorizontalInsightScroller`, `MarketInsightCard`.
- Visual primitives: `MetricGrid`, `SplitBar`, `MiniBarChart`, `TrendBars`, `InvestmentChart`, `InsightBadge`.
- Shared modules: `CorporateSportsCard`, `SharedMapCard`, `DemandGeneratorsBlock`, `DemandGeneratorCard`, `DemandGeneratorsGallery`.

### Data layer — `lib/report/market-overview-data.ts`
- Fully data-driven. `getMockMarketOverview()` populated from both Stitch pages.
- Discriminated unions `InsightScope` and `DemandGeneratorCategory`.

### Global utility
- `.scrollbar-hide` added to `globals.css` — consumed by the horizontal scroller.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms: page title, all 4 insight titles + badges, scroller class chain, print 2 × 2 fallback, 4-col gallery, 16 map pins, Corporate & Sport block.

---

## 2026-05-08 — Top-grid rebalance (~68 / 32) for A4 vertical alignment

Adjusted the CAPEX & Renders top-grid proportions so the Property Gallery's last tile (Spa) lands close to the bottom of the CAPEX Schedule block on the A4 page.

- Top grid right column: **250 px** (was 316 px). Roughly a 68 / 32 split with the CAPEX content on lg+.
- Property Gallery card padding: **14 px** (was 12 px).
- Tile height: **92 px** (was 115 px), fixed via inline style.
- Tile width: 100 % of card content area (no fixed pixel width — `tileWidth` prop removed; the gallery's column controls the tile width).
- Tile radius: `rounded-[10px]` (was `rounded-[12px]`).
- Tile gap: **10 px** (`gap-2.5`, was `gap-3` = 12 px).
- Caption unchanged (`text-[14px] font-semibold`, white, drop-shadow, bottom-left).
- All 8 tiles render identical dimensions in SSR (`style="height:92px"` × 8).

CAPEX Schedule card unchanged — already a symmetric 6-cell grid with paired sliders, paired tick labels, and the visible "¿Hotel abierto…?" / "Porcentaje operativo…" labels removed in the previous pass.

`pnpm typecheck` passes. SSR confirms: top grid `grid-cols-[minmax(0,1fr)_250px]`, 8× `height:92px`, card `padding:14px`, schedule grid still `grid-cols-1 lg:grid-cols-2 ... gap-x-12 gap-y-4 items-center`.

---

## 2026-05-08 — Property Gallery fixed-size tiles

Per spec, every gallery tile is now strictly the same dimensions — no responsive variation, no auto-height.

- Tile width: **290 px** (explicit `style={{ width: "290px" }}`).
- Tile height: **115 px** (explicit `style={{ height: "115px" }}`).
- Border radius: `rounded-[12px]` (was `rounded-[8px]`).
- Tile gap: **12 px** (`gap-3`, was `gap-2.5`).
- Caption: **14 px / 600** (was 12 px / 600).
- Tile carries `shrink-0` so it never shrinks under flex/grid constraints.
- Top grid right column: **316 px** (was 220 px) to fit 290 px tiles + 12 px card padding + 1 px borders without overflow.

`pnpm typecheck` passes. SSR confirms 8× `height:115px;width:290px` + caption at `text-[14px]`. All 8 captions still render in order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

---

## 2026-05-08 — CAPEX Schedule symmetric paired-slider rebuild

The CAPEX Schedule card is now a perfectly symmetric 2-column control with paired sliders sitting on the same grid row.

### Layout
- Card body padding bumped to **32 px** (`p-8`).
- Inner row rebuilt as a 6-cell CSS grid (2 cols × 3 rows, `gap-x-12 gap-y-4 items-center`).
  - Row 1: LEFT label + emerald pill / RIGHT Abierto-Cerrado toggle.
  - Row 2: LEFT months `RangeTrack [0, 36]` / RIGHT percent `RangeTrack [0, 100]`. Both sit on the same grid row → identical Y-position.
  - Row 3: LEFT "0 MESES / 36 MESES" / RIGHT "0% / 100%" tick labels.

### Component changes
- New `RangeTrack` primitive — bare slider track + fill + thumb + invisible `<input type="range">` overlay. Used twice in the schedule row to guarantee both sliders share the exact same row geometry.
- `CapexScheduleRow` rebuilt as a 6-cell grid that owns `months`, `mode`, `pct` state. Toggle ↔ % wiring: Cerrado → 0 %; Abierto → 100 %. Manual slider drag is independent.
- `CapexScheduleCard` body padding `px-5 py-4` → `p-8` (32 px); title margin `mb-4` → `mb-6`.

### Removed UI text per spec
- Eliminated visible label "¿Hotel abierto o cerrado durante el CAPEX?".
- Eliminated visible label "Porcentaje operativo durante CAPEX" + `OperationalPercentInput` numeric component (deleted file). The percentage is now controlled exclusively by the right-column slider; "Porcentaje operativo durante CAPEX" remains only as the slider's `aria-label` for screen readers.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/asset-analysis/capex`.
- SSR confirms: 6-cell grid `grid-cols-2 gap-x-12 gap-y-4 items-center`, card `p-8`, both `RangeTrack` instances with `aria-label="Duración del CAPEX"` + `aria-label="Porcentaje operativo durante CAPEX"`, all 4 tick labels (`0 MESES`, `36 MESES`, `0%`, `100%`), no visible "Hotel abierto" / "Porcentaje operativo" labels.

---

## 2026-05-08 — CAPEX Schedule structural rebuild + operational %

The schedule card now reads as a compact operational-assumptions module: both column titles align on the same top line, the duration badge tracks the slider thumb, and a new operational-percentage field is wired in.

### Data
- `CapexSchedule.operationalPercentage: number` — added to the contract; mock value 100. Designed to feed the future financial engine's revenue / GOP / EBITDA scaling during CAPEX (UI-local state for now).

### Component additions
- `OperationalPercentInput` — labelled numeric % field (0–100 clamp). Same border / sizing as the financial inputs in `CostInputRow`. Local React state.

### Component changes
- `CapexTimeline` gained a `floatingBadge` mode: the emerald pill is positioned absolutely above the slider thumb and follows it (transition-[left]) instead of sitting in the header row. `showBadge` and `floatingBadge` are now mutually exclusive (floating wins).
- `CapexScheduleRow` rebuilt as a 2-column grid `1.2fr 1fr` (`align-items: start`, gap 48 px). LEFT carries title + slider with floating badge + min/max ticks. RIGHT carries title + Abierto/Cerrado toggle + operational % field.

### Visual contract
- Both internal titles ("Duración del CAPEX" and "¿Hotel abierto o cerrado durante el CAPEX?") sit on the same top line.
- Card itself unchanged — same chrome, padding, and the "CAPEX Schedule" h4 title remain.
- Renders block, gallery, page header, shell — untouched.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: schedule grid `grid-cols-[1.2fr_1fr]` (×2 lg + print), all 3 labels rendered, floating-badge selector present, operational % input rendered with `value="100"` and matching `aria-label`.

---

## 2026-05-08 — CAPEX Schedule moved into the left CAPEX stack

CAPEX Schedule is no longer a standalone full-width section below the grid — it now sits as the 5th card in the LEFT column, sharing the same chrome as Hard / Soft / Project Costs. This naturally balances the left stack height with the Property Gallery height.

### Component additions
- `CapexScheduleCard` — card wrapper that renders `CapexScheduleRow` inside the same `bg-white border-slate-200 rounded-xl shadow-sm` chrome used by `CapexCategory`. Accepts `id`, `title`, `className`. `print:break-inside-avoid` baked in.

### Component changes
- `CapexScheduleRow` inner grid gap tightened to 24 px (`gap-6`) per spec.

### Page restructure (`app/report/asset-analysis/capex/page.tsx`)
- Removed the standalone `<section id="schedule">` block.
- Added `<CapexScheduleCard schedule={...} />` as a sibling of `<CapexTable>` inside the LEFT column, wrapped in `space-y-4` so the gap matches the inter-category rhythm.
- Renders block stays full-width below the 2-column grid (`mt-8 pt-6 border-t`).

### Vertical balance check
- Left stack ≈ 933 px (TOTAL + 3 categories + Schedule card).
- Right gallery ≈ 927 px (8 × 92 px tiles + gaps + chrome).
- Bottom edges now align within ~6 px.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: 1× `id="schedule"`, 1× h4 "CAPEX Schedule" inside the card, schedule grid at `gap-6`, renders block still rendered below.

---

## 2026-05-08 — Property Gallery vertical balance

Single proportional adjustment to balance the gallery's bottom edge with the bottom of CAPEX Schedule.

- Tile height: **92 px** (was 72 px).
- Tile gap: **10 px** (was 8 px).
- Card padding unchanged at 12 px; column width unchanged at 220 px; tile radius / overlay / caption / order unchanged.

`pnpm typecheck` passes. SSR confirms `height:92px` × 8 tiles and `gap-2.5` on the tile stack.

---

## 2026-05-08 — CAPEX & Renders strict alignment pass

Tight institutional proportions across the page. No component redesign — only dimension, spacing and alignment changes.

### Property Gallery Sidebar — compact 220 px column
- Top grid right column: **220 px** (was 240 px). Top grid gap: **20 px** (was 24 px).
- Tile height: **72 px** (was 86 px). Tile radius: **8 px** (was 10 px).
- Tile gap: **8 px** (was 12 px). Card padding: **12 px** (was 16 px).
- Caption: **12 px / 600** (was 14 px / 600).
- Title text-sm; "8 items" badge text-[10px]; "View All Photos" footer text-xs.

### Top grid + tables
- Top grid: `grid-cols-[minmax(0,1fr)_220px] gap-5 items-start`.
- TOTAL CAPEX: `px-5 py-3`, inputs `h-8`, label `text-base` — total ≈ 64 px row.
- Category header: `md:h-11 px-5` — 44 px row, 20 px horizontal padding.
- Line items inside categories: `h-11` (44 px) with `pl-8` indent.

### CAPEX Schedule row — 3-column grid
- Switched outer container from flex to **grid**: `grid-cols-[1.4fr_120px_1fr] items-center gap-8`.
- Slider max-width tightened to **360 px** (was 420 px).
- Operational toggle buttons: **38 px tall × 100 px wide**, strictly equal width.

### Vertical rhythm
- Section dividers tightened to `mt-8 pt-6` (was `mt-10 pt-8`) — schedule sits closer to Project Costs; renders block starts higher.
- H3 bottom margin: `mb-6` (was `mb-8`).

### Verification
- `pnpm typecheck` passes.
- All four routes return 200.
- SSR confirms: top grid `minmax(0,1fr)_220px` (×2), 8 tiles at `height:72px` + `rounded-[8px]`, all 8 captions at `text-[12px]`, schedule grid `1.4fr_120px_1fr`, 12 cost rows at `h-11`, both toggle buttons at `h-[38px] w-[100px]`.

---

## 2026-05-08 — CAPEX & Renders layout polish

### Property Gallery — fixed-width institutional sidebar
- Top grid switched from `lg:grid-cols-3` to `grid-cols-[minmax(0,1fr)_240px]` with `gap-6` and `items-start`. Gallery column is exactly 240 px on `lg+`; on narrower widths it wraps below the table.
- Tiles now stack vertically (1 per row) with a fixed 86 px height and `rounded-[10px]`. Dark gradient + bottom-left white caption (14 px / 600).
- "View All Photos" CTA pinned to the card's bottom edge via `mt-auto`.
- 8 captions render in the institutional order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

### CAPEX Schedule — three-block horizontal row
- New `CapexScheduleRow` (client) composes the row and owns the duration state — keeps the slider and the badge in sync.
- LEFT block (`flex: 1.2`) hosts a re-used `CapexTimeline` with `showBadge={false}` and `sliderMaxWidth={420}`.
- CENTER block (`width: 110px`) renders the new `CapexDurationBadge` atom — same emerald pill as the inline badge, lifted to a standalone column.
- RIGHT block (`flex: 1`, `justify-end`, `gap-4`) hosts the question text + `ToggleSelector size="lg"`.
- `ToggleSelector` lg variant updated to `h-10 min-w-[92px] px-6` so the operational buttons hit the spec exactly.

### Section rhythm
- Project Costs → CAPEX Schedule and CAPEX Schedule → Renders gaps standardised to 40 px (`mt-10` + `border-t` + `pt-8`).

### Component additions
- `CapexDurationBadge` — emerald pill atom.
- `CapexScheduleRow` — schedule composite owning duration state.
- `CapexTimeline` extended with `value` / `onChange` / `showLabel` / `showBadge` / `sliderMaxWidth` (all backward compatible).

### Verification
- `pnpm typecheck` passes.
- All four routes (executive-summary, competitive-set, asset-analysis, asset-analysis/capex) return 200.
- SSR output confirmed: `grid-cols-[minmax(0,1fr)_240px]` on the top row, `height:86px` + `rounded-[10px]` on every gallery tile, `flex-[1.2]` + `w-[110px]` + `h-10 min-w-[92px]` in the schedule row.

---

## 2026-05-08 — Asset Analysis · CAPEX & Renders integration

### New page — `/report/asset-analysis/capex`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Combines CAPEX breakdown + property gallery + CAPEX schedule + AI render configurator on a single canvas; the renders block carries `id="renders"` so the sidebar's `Renders` sub-anchor lands correctly.
- Page does not use `ActionBar` — its terminal CTA is the in-section "Generar Variación IA" button.

### New section family — `components/report/asset-analysis/capex/`
Eleven components, all consumed through one barrel `index.ts`:
- `CapexTable` — composes `CapexTotalRow` + per-category breakdown.
- `CapexTotalRow` — headline TOTAL CAPEX band with editable amount + unit selector.
- `CapexCategory` — collapsible category block with editable category total + line items.
- `CostInputRow` — single label/value/unit row used inside categories.
- `CapexTimeline` — slider + duration badge with an accessible `<input type="range">` overlay (so the visual track + dragging both work).
- `ToggleSelector<T>` — generic segmented control (`size: "md" | "lg"`) reused for both CAPEX BÁSICO/PERSONALIZADO and Abierto/Cerrado.
- `PropertyGallerySidebar` — right-rail gallery with item-count badge + "View All Photos" CTA.
- `RenderConfigurator` — wraps preview + tag groups + final CTA row; whole block is `print:hidden`.
- `RenderPreviewCard` — hero render image with caption overlay.
- `RenderTagGroup` — one labelled row of pill buttons with single-select state.

### Data layer — `lib/report/capex-renders-data.ts`
- Fully data-driven: every CAPEX category, line item, render tag group, gallery item, and operational mode lives in the data file.
- Discriminated unions for future engine integration: `CapexUnit`, `CapexMode`, `OperationalMode`.
- `formatCapexAmount(n)` is the single Intl-based formatter for monetary display.
- `getMockCapexRenders()` mirrors Stitch reference values exactly.

### Sidebar sub-item migration — `hash` → `href`
- `ReportSubItem.hash: string` replaced by `ReportSubItem.href: string`. Sub-items can now point at full routes (`/report/asset-analysis/capex`) or page-relative anchors (`#renders`); the sidebar resolves either form.
- `sections.ts` updated for all sections; Asset Analysis now points its sub-anchors at the new sub-routes.
- `components/report/shell/report-sidebar.tsx` resolves sub-item href and adds an active-highlight rule (matches the Stitch bold-emerald sub-anchor when on a sub-route).

### Architecture invariants preserved
- Reused: `ReportShell`, `ReportPaper` (with `closed` + `headerLayout="stacked"`), `HotelToggle`, primitives barrel, print canvas, PDF pipeline.
- No edits to existing pages (`/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`).

### Documentation
- Updated: `REPORT_PAGES.md` (added Page 2a layout block + sidebar wiring + future-proofing notes).
- Updated: `UI_COMPONENTS.md` (added CAPEX & Renders family table).
- Updated: `docs/print-pdf.md` (interactive-control print policy + the new `print:break-inside-avoid` schedule rule).
- This entry.

### Verification
- `pnpm typecheck` passes.
- All four routes return 200 on the dev server: `/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`, `/report/asset-analysis/capex`.
- 26 canonical Stitch strings render in the new page's SSR output.

---

## 2026-05-08 — Asset Analysis (Hotel personalizado) integration

### New page — `/report/asset-analysis`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Page composes `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → 60/40 grid → `<ActionBar>`.
- `sections.ts` entry flipped to `implemented: true`; sidebar updates automatically.

### New section family — `components/report/asset-analysis/`
- `AssetMetricsTable` — left-column 12-row metrics with fixed-height label/value pairs.
- `FacilitiesCard` — 2-column availability checklist (Lucide `Check` / `Minus`).
- `RoomMixCard` — Type/Units/Size table with bolded totals row + thin spacer.
- `GuestInsightsCard` — slate-50 card with `tone: "positive" | "negative"` (Lucide `ThumbsUp` / `ThumbsDown`, filled).
- `PropertyImageCard` — square hero image + caption tabs (Catastro / Planos), client-side active-tab state.
- `PropertyGallery` — vertical labelled gallery with arrow-button `altSrc` swap (replaces Stitch inline `onclick`).
- `MethodologyNote` — compact inline variant of the methodology block, fits inside column layouts.
- Single barrel `index.ts` for the import surface.

### Page-local — `app/report/asset-analysis/`
- `page.tsx` — server component wiring data + composition.
- `hotel-toggle.tsx` — client toggle next to "Hotel personalizado" label (decoupled from `PrimeToggle` to avoid changing the Competitive Set toggle visual).

### Data layer
- `lib/report/asset-analysis-data.ts` — types (`AssetAnalysisData`, `AssetMetricsRow`, `FacilityItem`, `RoomMixRow`, `GalleryImage`, `PropertyMedia`, `GuestInsights`) + `getMockAssetAnalysis()` matching Stitch values.

### Canonical primitive extensions (backward-compatible)
- `ReportHeader` gains `layout?: "inline" | "stacked"` — `stacked` puts the PDF button on its own row above the section label / title row, matching Stitch. Default `inline` preserves Executive Summary + Competitive Set visuals unchanged.
- `ReportPaper` and `ReportSection` gain `closed?: boolean` — when `true`, the paper has full `border + rounded-xl` (Stitch Asset Analysis); default `false` preserves the rounded-top-only paper used by other pages.
- `ReportPaper` and `ReportSection` also gain pass-through `headerLayout?` and `hideExportButton?` for symmetry.

### Documentation
- New: `REPORT_PAGES.md` (root) — page-level reference for every report page (route, status, file path, component composition).
- New: `UI_COMPONENTS.md` (root) — catalog grouped by import surface (primitives → section families → shell).
- This entry.

### Verification
- `pnpm typecheck` passes.
- Existing `/report/executive-summary` and `/report/competitive-set` visuals unchanged (canonical defaults preserved).

---

## 2026-05-08 — Phase 0 architecture stabilization

### Canonical report architecture
- One shell, one sidebar, one paper, one PDF pipeline, one section registry.
- `lib/report/sections.ts` rewritten as the single canonical registry (6 sections, sub-anchors, `printPageBreak`, `implemented`).
- `types/report/index.ts` reworked to match the new section taxonomy.
- `shell/report-sidebar.tsx` refactored to consume `sections.ts` (Stitch visual preserved).
- `shell/report-paper.tsx` refactored to compose `ReportHeader` from primitives (eliminated internal duplicate).

### Canonical primitives — `components/report/primitives/`
- `MetricRow`, `MetricTable` — atomic table units for sections 4-15.
- `ReportSection` — page-level wrapper with section-metadata-driven page-breaks.
- `ReportHeader` — header bar primitive (extracted from internal `PaperHeader`).
- `StatCard` / `StatGrid` — re-exports `KPICard` / `KPIGrid` under canonical names.
- `UpgradeGate` / `UpgradeCard` — re-exports `LockedGate` / `LockedUpgradeCard`.
- `ImageGallery` / `ImageGalleryCard` — re-exports `HotelGalleryGrid` / `HotelGalleryCard`.
- `ReportMap` — re-exports from `ui/report-map.tsx`.
- `PrintPage` — declarative wrapper for inside-section page-break control.
- `PdfExportButton` — routes through canonical `exportReport()`.
- Barrel `primitives/index.ts` is the single import surface for new section pages.

### Print / PDF system
- `globals.css` print rules consolidated into a single block: `@page`, `.report-print-canvas`, generic utilities (`.print-break-before`, `.print-break-after`, `.print-keep`).
- Firefox fallback: `@-moz-document url-prefix() { @media print { transform: scale(0.74) } }` for older Firefox where `zoom` is a no-op.
- `lib/report/pdf-export.ts` simplified to a single `exportReport(metadata?)` entry; legacy `exportReportToPDF` aliased and marked deprecated.

### Deletions
- `components/report/layout/` (3 files — duplicate shell, replaced by `shell/`).
- `components/report/sections/` (3 files — only used by deleted parametric routes).
- `components/report/report-context.tsx` (only used by deleted layout).
- `components/report/ui/export-button.tsx` (dead code).
- `components/report/ui/pdf-export-button.tsx` (replaced by canonical primitive).
- `app/report/[reportId]/` (entire parametric tree — 4 files; will return under a single canonical pattern when multi-tenant data layer ships).
- `lib/report/mock-data.ts` (only used by deleted parametric layout).
- `lib/report/report-nav.ts` (replaced by canonical `sections.ts`).
- Repo root: `index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/` (Vite app leftovers), root `node_modules/`, `function hotelvalora {.txt`.
- `backup.ps1` moved to `scripts/backup.ps1` via `git mv`.

### Documentation
- New: `docs/print-pdf.md` — canonical print/PDF system reference.
- New: `docs/component-library.md` — canonical primitives catalog.
- Rewritten: `docs/report-system.md` — single-architecture reference, no parametric mentions.
- Updated: `docs/architecture.md` — registry pointer + primitives reference.
- Updated: `ENTRYPOINTS.md` — primitives table + canonical files.
- Updated: `AI_CONTEXT.md` — Phase 0 report module description.
- Audit artefacts: `TECH_AUDIT.md`, `NEXT_PHASE_PLAN.md`, `ARCHITECTURE_SCORECARD.md` (root).

### Verification
- `pnpm typecheck` passes (after clearing stale `.next/` types from deleted parametric routes).
- Visible pages (`/report/executive-summary`, `/report/competitive-set`) render unchanged.

---

## 2026-05-07 (continued)

### Navigation link — Sidebar item 3 "CompSET" → `/report/competitive-set`
- `report-nav.ts` item 3 `href` changed from `/report/compset` to `/report/competitive-set`
- `ReportSidebar` active-state highlight now lands correctly on the Competitive Set page

### Competitive Set — Distance column in comparison table
- Added `distance: string | null` to `CompetitorProperty` interface; `null` for the subject property itself (renders as `—`)
- Added **Distance** column to `CompetitiveSetTable` (rightmost, after Location Score); displays `"400 m"`, `"1.1 km"`, etc.
- Mock distances: Ritz-Carlton 650 m, Four Seasons 400 m, Rosewood Villa Magna 1.1 km, Westin Palace 320 m

### Competitive Set — gallery layout update
- `HotelGalleryGrid` restructured: top block = 2×2 images (left, `col-span-5`) + full CompSet map (right, `col-span-7`); bottom block = remaining 16 images in 4-per-row grid
- `HotelGalleryCard` updated: added optional `className` prop (`twMerge` handles conflict with `aspect-[4/3]`); top-4 images pass `h-full aspect-auto` to fill 2×2 cells; bottom images unchanged
- Parent block uses `min-h-[460px]` to satisfy map's `min-height: 450px` CSS constraint; `print:min-h-0 print:h-80` for PDF
- `ReportMap` reused exactly — same hooks (`useCompset`, `useMapViewport`), same overlays (`MapControls`, `MapLegend`), same layer toggles (heatmap/metro/histórico)

### Competitive Set report page — `/report/competitive-set`
- Created `src/app/report/competitive-set/page.tsx` — ReportShell + ReportPaper + ActionBar
- Created `CompetitiveSetTable` — 6-col table: property name (dot + name), stars, keys, submarket, facility icons, location score bar. Subject property row: emerald. Competitors: amber stars + slate bars
- Created `HotelGalleryGrid` — 4-col `aspect-[4/3]` image grid, `print:grid-cols-4`
- Created `HotelGalleryCard` — image with hover scale + frosted-glass arrow button bottom-right
- Created `PrimeToggle` — client component toggle switch (emerald-700 when on), `print:hidden`
- Updated `ReportPaper` — added `titleSize?: "2xl"|"4xl"` and `headerRight?: ReactNode` props; backward compatible
- Created `src/lib/report/competitive-set-data.ts` — `CompetitorProperty`, `GalleryImage`, `getMockCompetitiveSet()`
- Facility icons via Lucide: `Wine`, `UtensilsCrossed`, `Sun`, `Users`, `Dumbbell`, `Leaf`; unavailable = `opacity-30`

---

## 2026-05-07

### Navigation wiring — Landing ↔ CompSet ↔ Executive Summary
- `ReportTopNav`: "HotelVALORA" logo is now `<Link href="/">` (was inert `<div>`)
- `CompetitorPanel`: "Confirmar CompSet →" is now `<Link href="/report/executive-summary">` (was inert `<button>`)
- Establishes full 3-step flow: `/` → `/compset` → `/report/executive-summary`

### Mandatory documentation system
- Expanded `CLAUDE.md` with full docs maintenance rule (triggers, file list, process)
- Created 8 new `/docs` files: `routing.md`, `report-system.md`, `print-system.md`, `design-system.md`, `components.md`, `business-rules.md`, `financial.md`, `workflows.md`, `changelog.md`
- Updated `docs/frontend.md` and `ENTRYPOINTS.md` with report module + print system entries

---

## 2026-05-06 (prior session)

### Executive Summary — Professional A4 print system
- `globals.css`: `@page { size: A4 portrait; margin: 8mm 10mm }`, `.report-print-canvas { width: 960px; zoom: 0.74 }`, `compset-map-container { min-height: 0 }` in print
- `ReportShell`: added `report-print-canvas` class to `<main>`
- All 3 sections (`AssetSection`, `MarketSection`, `ValuationSection`): added `print:grid-cols-12`, `print:col-span-7`, `print:col-span-5` — fixes Chrome print grid collapse below 768px viewport
- `LockedGate` + `LockedUpgradeCard`: added `print:hidden`
- `MarketSection` map: `print:aspect-auto print:h-36` to cap height

### Hotel photo carousel
- Created `HotelPhotoCarousel` (client component) — `aspect-[4/3]`, 5 photos, prev/next arrows bottom-right, `1/5` counter
- Replaced static photo in `AssetSection`

### Full CompSet map in Market Overview
- Created `ReportMap` (`components/report/ui/report-map.tsx`) — uses `useCompset` + `useMapViewport`, renders `CompsetMapGL` + `MapControls` + `MapLegend`, no competitor panel
- Embedded in `MarketSection` right column

### Report shell infrastructure
- Created `ReportShell`, `ReportPaper`, `ReportTopNav`, `ReportSidebar`, `ReportFooter`, `ActionBar`
- Created `/report/executive-summary` standalone route
- `ActionBar`: 3 text-only buttons (FAVORITOS, GUARDAR, UPGRADE), positioned below ReportPaper

### Map size revert
- Map in MarketSection reverted to `aspect-video` (16:9) after carousel was added — user preferred original map proportions

---

## 2026-05-05 (initial build)

### Monorepo scaffold
- Next.js 14 + FastAPI monorepo initialized
- PostgreSQL domain schema established
- Core models: HotelAsset CRUD routes, service, schemas

### Executive Summary data layer
- `executive-summary-data.ts`: types (`AssetData`, `MarketMetricsData`, `ValuationData`, `ChartSeriesData`), formatters, mock data
- `SparklineBar`, `SparklineLine` SVG chart components
- `AssetSection`, `MarketSection`, `ValuationSection`, `SparklineGroup` components
- `LockedGate`, `LockedUpgradeCard`, `SubSectionHeading`, `MethodologicalNote` UI primitives

### CompSet map
- Mapbox GL integration with `react-map-gl` v8
- `CompsetMapGL`, `CompetitorPanel`, `CompetitorCard`, `MapControls`, `MapLegend`
- `useCompset`, `useMapViewport` hooks
- `/compset` route with full competitor selection flow

### Report navigation
- `report-nav.ts`: 6-section registry, 15 items
- `ReportSidebar` renders section links
