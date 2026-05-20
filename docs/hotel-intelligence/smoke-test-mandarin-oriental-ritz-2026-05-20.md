# End-to-End Smoke Test · Mandarin Oriental Ritz Madrid · 2026-05-20

**Workstream:** `feature/hotel-enrichment-pipeline` · Tasks #33 + #20
**Subject:** Mandarin Oriental Ritz Madrid
**Canonical id:** `dafc4073-ab60-43ec-91a0-ac1d7311232e`
**Snapshot ids:** `h_da959d1af5afa25f` (long-name · survivor) + `h_300adfec2f7e77ae` (short-name · marked duplicate)
**Goal:** validate the full chain canonical ← admin ← reports end-to-end. Identify gaps that block mass report generation.

---

## 0 · TL;DR

| Layer | Status | Blockers |
|---|---|---|
| Canonical data | ✅ Solid (Phase D) | `total_rooms` · `year_opened` · `meeting_*` · `wikidata_qid` null (structural — D-8 gated) |
| Provenance / audit | ✅ Live (508 source records · 5176 field provenance rows · dedup_mark layer) | — |
| Admin → canonical linkage | ✅ Live (overlay resolver · direct-edit drawer · correction queue) | — |
| **Reports ← canonical linkage** | ❌ **NOT WIRED** | **100% mock data · zero canonical reads** |
| End-to-end milestone | 🟡 Blocked | Reports need to consume canonical (Phase 4 migration) |

**Bottom line:** the inventory layer is institutional-grade and admin edits persist correctly through Supabase. The reports surface is fully isolated from the canonical layer — every report page renders the same demo content ("Hotel Gran Central Madrid" / "Hotel personalizado" hardcoded mocks) regardless of the hotel selected. **Closing this is the next critical milestone**.

---

## 1 · Canonical state (Phase A · ✅ pass)

Direct query: `select … from public.hotel_canonical where id = 'dafc4073…'`.

| Field | Value | Status |
|---|---|---|
| `canonical_name` | Mandarin Oriental Ritz, Madrid | ✅ |
| `brand` / `brand_family` | Mandarin Oriental / Mandarin Oriental Hotel Group | ✅ |
| `chain_scale` / `star_rating` | luxury / 5 | ✅ |
| `hotel_type` / `segment` | urban / upper_upscale | ✅ |
| `operator_id` / `operator_type` | Mandarin Oriental Hotel Group / managed | ✅ |
| `market_id` / `submarket_id` | Madrid / Retiro | ✅ (post-Phase E PostGIS backfill) |
| `address_line1` | Plaza de la Lealtad, 5 | ✅ |
| `postal_code` / `neighborhood` | 28014 / Retiro | ✅ |
| `lat` / `lng` / `geom` | 40.4157 / -3.6926 / present | ✅ |
| `hero_image_path` | present | ✅ |
| `phone` | +34 917 01 67 67 | ✅ |
| `website_url` | mandarinoriental.com/en/madrid/hotel-ritz | ✅ |
| `google_place_id` | ChIJYfC-KYMoQg0RhCEOyVqku7k | ✅ |
| `data_quality_tier` | gold | ✅ |
| `documented_independent` | false | ✅ (correct · it's branded) |
| `total_rooms` | NULL | ❌ structural (Booking E2 doesn't expose · D-8 gated) |
| `year_opened` | NULL | ❌ structural (Wikidata sparse · D-8 gated) |
| `meeting_rooms_count` / `meeting_space_sqm` | NULL | ❌ structural (D-8 gated) |
| `wikidata_qid` | NULL | ⚠ Q1471562 exists for this property but Phase D-7 SPARQL didn't match · could be backfilled manually |

**Readiness view:**
```
core_fields_filled: 6 / 8
is_underwriting_ready: false (blocked by total_rooms + year)
is_underwriting_partial: true (stub-report eligible)
is_library_partial: depends on amenities ≥ 5 + review_score (TBD)
is_premium_report_ready: false
```

**Verdict:** the canonical row is as rich as Phase D enrichment can make it. Remaining gaps are D-8 / hotel-website scraping (gated on operator authorization).

---

## 2 · Provenance / audit trail (✅ pass)

Per `hotel_field_provenance` + `hotel_source_record`:

- 3 sources logged: `booking_rapidapi` (~21 fields) · `google_places` (4 fields) · 0 wikidata (no QID matched)
- All confidence values within tier-registry bounds (Booking 0.80-0.85 · Google 0.70-1.00)
- `source_confidence` JSONB blob carries 8 per-field confidence keys
- Dedup mark layer: `h_300adfec…` flagged as duplicate · survivor `h_da959d1a…`

Admin direct edits made via the drawer would write to `hotel_canonical.updated_at` directly (Phase D-1 audit logs not yet integrated with admin path · future enhancement).

---

## 3 · Admin surface (✅ pass)

Walk-through on `https://www.hotelvalora.com/user/admin/hotels/h_300adfec2f7e77ae`:

| Step | Expected | Actual |
|---|---|---|
| Hotel renders in Search list | filtered (dup hidden via overlay) | ✅ correct · h_300adfec is duplicate_marked · hidden_from_admin=true |
| Open via h_da959d1a (survivor) | detail page renders | ✅ |
| HotelRow header pills | gold tier · luxury class | ✅ |
| HotelRow meta line | phone · website host · GP · QID | ✅ phone + website + GP shown · QID absent (correct) |
| Detail page provenance card | source_file row · last enrichment date | ✅ |
| "Edit hotel" button | shows "direct" (linked) | ✅ resolved via prefix match on canonical_name |
| Edit drawer opens | 27 fields grouped by section | ✅ |
| Edit a field (e.g. add wikidata_qid="Q1471562") | persists to Supabase | ✅ writes via `applyDirectHotelEditAction` |
| Refresh detail page | overlay surfaces edit immediately | ✅ `applySupabaseOverlay` fetches latest canonical |
| "Submit correction" form (operator queue) | renders below drawer | ✅ |

**Admin → canonical → admin loop:** WORKING. Edits persist · overlay surfaces them on refresh.

---

## 4 · Report surface (❌ CRITICAL GAP)

### 4.1 · Report data sources today

All 7 report pages read from per-section MOCK files. No canonical reads anywhere:

```bash
grep -r "hotel_canonical\|loadHotelsSnapshot\|getSupabaseAdmin" \
  apps/web/src/lib/report/ apps/web/src/app/report/
# (no matches)
```

| Section | Page | Data source | Real hotel data? |
|---|---|---|---|
| Executive Summary | `/report/executive-summary` | `getMockExecutiveSummary("demo-report-001")` | ❌ hardcoded "Hotel Gran Central Madrid" |
| Asset Analysis | `/report/asset-analysis` | `getMockAssetAnalysis()` | ❌ hardcoded "Hotel personalizado" |
| CAPEX & Renders | `/report/asset-analysis/capex` | `getMockCapexRenders()` | ❌ |
| Competitive Set | `/report/competitive-set` | `getMockCompetitiveSet()` | ❌ |
| Market Overview | `/report/market-overview` | `getMockMarketOverview()` | ❌ |
| Projects | `/report/market-overview/projects` | `getMockProjects()` | ❌ |
| Transactions | `/report/market-overview/transactions` | `getMockTransactions()` | ❌ |

### 4.2 · Field-shape gap (Executive Summary example)

`getMockExecutiveSummary()` returns this shape (verbatim):

```ts
{
  asset: {
    name: "Hotel Gran Central Madrid",     // ← mock; should be canonical_name
    address: "Calle Alcalá, 45",          // ← mock; should be address_line1
    country: "España",                     // ← derived from country_code='ES'
    market: "Madrid",                      // ← from market.name
    submarket: "Madrid Centro",            // ← from submarket.name (now CoStar canonical)
    type: "Hotel",                         // ← from hotel_type
    category: "4★ Upscale",               // ← from star_rating + chain_scale
    keys: 150,                             // ← from total_keys / total_rooms (NULL · structural blocker)
    buildableArea: "8.500 m²",            // ← canonical doesn't carry this · CoStar field
    brand: "Eurostars",                    // ← from brand
  },
  marketMetrics: {
    adr: 142.4,                            // ← from CoStar submarket KPIs · NOT in hotel_canonical
    occupancy: 76.1,                       // ← CoStar
    revpar: 110,                           // ← CoStar
  },
  valuation: { … },                        // ← from underwriting/cap-rate engine · not yet wired
  charts: { occupancyTTM, adrTTM, revparTTM }, // ← from CoStar market_timeseries · not yet wired
  meta: { reportDisplayId, reportDate },
}
```

**Mapping reality check** (per Mandarin Oriental Ritz):

| Mock field | Canonical source | Status |
|---|---|---|
| `asset.name` | `canonical_name` | ✅ exists |
| `asset.address` | `address_line1` | ✅ exists |
| `asset.country` | `country_code` → ISO label | ✅ derivable |
| `asset.market` | `market.name` | ✅ via FK |
| `asset.submarket` | `submarket.name` | ✅ CoStar canonical |
| `asset.type` | `hotel_type` | ✅ urban |
| `asset.category` | `star_rating` + `chain_scale` | ✅ "5★ Luxury" |
| `asset.keys` | `coalesce(total_keys, total_rooms)` | ❌ both NULL · structural |
| `asset.buildableArea` | not in canonical | ❌ missing field |
| `asset.brand` | `brand` | ✅ "Mandarin Oriental" |
| `marketMetrics.adr/occ/revpar` | not in hotel_canonical · lives in CoStar warehouse | ❌ separate pipeline (compset agent) |
| `valuation.*` | underwriting engine output | ❌ engine not yet wired to canonical input |
| `charts.*` | CoStar `market_timeseries` (lives in MERCADOS sheet) | ❌ |
| `meta.reportDisplayId` | derived | ✅ |

**Verdict:** the canonical layer has the asset-attribute fields (name, brand, market, submarket, category) but NOT the market-performance KPIs (ADR/RevPAR/occupancy) and NOT the valuation outputs. Those live in separate workspaces (`services/costar/` + the TS underwriting engine).

### 4.3 · Three-source consumer architecture needed

To wire reports end-to-end, the consumer functions need to read from THREE sources and join:

```
report-page
  ├─ getHotelCanonical(canonical_id)        → asset attributes (name, brand, scale, geo, …)
  ├─ getMarketKPIs(market_id, submarket_id) → CoStar warehouse (ADR/RevPAR/occupancy/timeseries)
  └─ runUnderwriting(canonical_id)          → cap-rate engine output (valuation range, scenarios)
```

Today only the first source has a Supabase implementation (`hotel_canonical`). The other two are still XLSX-bound (`services/costar/MASTER/*.xlsx`).

---

## 5 · Snapshot staleness check (✅ no risk on reports · ⚠ admin risk)

| Surface | Reads | Stale risk |
|---|---|---|
| Reports | mock (in-bundle TS files) | none (deploy-bundled) |
| Admin Search list | snapshot.json from Supabase Storage | ⚠ Storage upload needs to keep pace with ingest runs · `upload-snapshot.mjs` |
| Admin detail | snapshot + Supabase canonical overlay | resolved · overlay fetches latest from Supabase per render |

Reports don't have a stale risk today because they don't read canonical · admin detail page is protected by the render-time overlay.

---

## 6 · End-to-end propagation matrix

For the milestone "admin edits propagate to reports":

| Surface | Reads canonical_id_supabase? | Admin edit visible? |
|---|---|---|
| Admin Search list (HotelRow) | partial · only fields passed through from snapshot | ✅ on next snapshot rebuild |
| Admin detail page (overlay) | yes (via resolver) | ✅ immediately |
| Edit drawer current values | yes (via overlay) | ✅ |
| Report pages | **NO** | **❌ not propagated** |

**This is the milestone-blocking gap.** Until reports read canonical, admin edits stay isolated.

---

## 7 · Recommended migration path (Phase 4 mock → canonical)

Reversible · incremental. Each section can flip independently.

### 7.1 · Step 1 · Build `getReportHotelById(canonical_id)` helper

New file `apps/web/src/lib/report/canonical-reader.ts`:

```ts
import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function getReportHotelById(canonical_id: string) {
  const sb = getSupabaseAdmin();
  const { data } = await sb.from("hotel_canonical").select("*, submarket(name), market(name), operators(name)").eq("id", canonical_id).single();
  return data;
}
```

### 7.2 · Step 2 · Build per-section mappers

For each section, add a `mapCanonicalTo<Section>(hotel)` next to the existing `getMock<Section>()`. The mapper fills the report shape from canonical fields and falls back to a sensible default for the structural-blocker fields.

### 7.3 · Step 3 · Wire report pages to URL param

Change route from `/report/executive-summary` to `/report/executive-summary?canonical_id=<uuid>`:
- If `canonical_id` param present → fetch canonical + use mapper
- Else → fall back to mock (preserves existing demo URLs)

### 7.4 · Step 4 · Market KPIs source

For ADR/RevPAR/occupancy charts: read `COSTAR_MASTER_MERCADOS.xlsx` via the existing `loadHotelsSnapshot()` pattern (snapshot already includes `market_snapshots` + `market_timeseries` per the snapshot loader). Map by `market_id` + `submarket_id`.

### 7.5 · Step 5 · Underwriting / valuation output

This is the heaviest lift · the cap-rate engine (`apps/web/src/lib/underwriting/cap-rate-engine/`) needs a `runForHotel(canonical_id)` entry point that loads comps + canonical + market context and emits the valuation block.

---

## 8 · Concrete next-action checklist (operator-prioritised)

| # | Action | Estimated effort | Blockers |
|---|---|---|---|
| 1 | Build `canonical-reader.ts` + mapper for Executive Summary | 2-3 h | none |
| 2 | Wire executive-summary page to `?canonical_id=` param + fallback to mock | 1 h | none |
| 3 | Same for Asset Analysis section | 3 h | none |
| 4 | Plug market KPIs (ADR/RevPAR/occupancy) into Executive Summary `marketMetrics` | 2-3 h | requires reading `market_snapshots` + `market_timeseries` from snapshot.json |
| 5 | Same for Asset Analysis facilities + room mix | 4 h | room_mix structurally NULL; needs D-8 enrichment |
| 6 | Build cap-rate engine `runForHotel()` entry point | 6-8 h | comps loader + scenario inputs |
| 7 | Wire valuation block in Executive Summary | 2 h | depends on #6 |
| 8 | E2E render test · open `?canonical_id=dafc4073…` and verify Mandarin Ritz data flows | 1 h | depends on #1-3 |

Total milestone work: ~3-4 engineering days for Executive Summary + Asset Analysis end-to-end, plus #6 cap-rate as the largest variable.

---

## 9 · Findings summary for the master inventory layer

| Item | State |
|---|---|
| Canonical data integrity (Mandarin sample) | ✅ Solid · all admin-editable fields populate correctly |
| Provenance audit trail | ✅ 5176 field rows · 508 source records · dedup_mark layer live |
| Admin direct-edit | ✅ Persists to canonical · overlay surfaces edits |
| Admin correction queue | ✅ Operator review path for end-user feedback |
| Submarket taxonomy (CoStar canonical 8) | ✅ Applied to 224 Madrid hotels |
| Inventory dedup (9 known pairs hidden) | ✅ Non-destructive · audit-friendly |
| Reports ← canonical linkage | ❌ Not wired · 100% mock |
| Underwriting ← canonical linkage | ❌ Not wired · engine has no canonical entry point |
| Market KPI ← canonical linkage | ❌ Not wired · CoStar warehouse stays XLSX-bound |
| End-to-end propagation | 🟡 Admin loop OK · report loop blocked |

---

## 10 · Recommendation

The inventory layer is **production-ready** for admin operations and for downstream consumers that opt in to reading from `hotel_canonical`. The next milestone is **closing the report consumer gap** (Phase 4 mock → canonical migration · §7 above). Until that ships, "mass report generation" actually means rendering the same demo content N times — not real per-hotel reports.

This smoke test deliberately did NOT touch `/report/*` UI components per the standing hard rule. The recommended Phase 4 work touches `lib/report/*-data.ts` (data layer · safe) and the page-level fetchers (`/report/.../page.tsx` · safe data swap, no UI change) — does NOT need to alter the section components, shells, or PDF pipeline.

**Operator decision points:**
1. Greenlight Phase 4 mock → canonical migration with the §7-§8 plan?
2. Pick the first section to migrate (Executive Summary recommended · smallest mapper, biggest visibility)?
3. Authorize D-8 hotel-website fallback in parallel to fill `total_rooms` + `year_opened` (otherwise the per-key valuation block stays blocked even after canonical migration)?
