# Report Integrity Audit · 8×8 Matrix · 2026-05-25

**Scope** — verify that every section of a HotelVALORA report (Executive Summary · Asset Analysis · Competitive Set · Market Overview · Financials · Underwriting · Export PDF · Library entry) consumes the SAME canonical hotel from end to end. Identify decoupled surfaces · mocks · hardcoded datasets · architectural gaps. No code changes performed. No remediation implemented.

---

## 1 · Surface inventory · canonical-coupling map

| # | Route | canonical_id accepted? | Data source when canonical_id present | Data source when absent / always |
|---|---|---|---|---|
| 1 | `/report/executive-summary` | ✅ | `getCanonicalHotelById` + `resolveBestAvailableMarketKpis` + `mapCanonicalToExecutiveSummary` + cap-rate engine + persistence to `hotel_report_library` | `getMockExecutiveSummary('demo-report-001')` |
| 2 | `/report/asset-analysis` | ✅ | `mapCanonicalToAssetAnalysis(hotel)` reading canonical amenities + chain_scale + brand | `getMockAssetAnalysis()` |
| 3 | `/report/competitive-set` | ✅ | `mapCanonicalToCompetitiveSet(hotel)` · 4 peers picked by same chain_scale + Madrid + haversine distance | `getMockCompetitiveSet()` |
| 4 | `/report/market-overview` | ✅ | `mapCanonicalToMarketOverview(hotel, marketKpi)` · ADR/Occ/RevPAR/Yield overrides + hotelLabel | `getMockMarketOverview()` |
| 5 | `/report/asset-analysis/capex` | ❌ | n/a | **HARDCODED** `getMockCapexRenders()` |
| 6 | `/report/market-overview/dynamics` | ❌ | n/a | **HARDCODED** `CHART_PRESETS` from `market-dynamics-data` |
| 7 | `/report/market-overview/projects` | ❌ | n/a | **HARDCODED** `getMockProjects()` |
| 8 | `/report/market-overview/transactions` | ❌ | n/a | **HARDCODED** `getMockTransactions()` |
| 9 | `/report/financials` (landing) | ❌ | n/a | Static navigation index · no data |
| 10 | `/report/financials/pl` | ❌ | n/a | **HARDCODED** `computePL(getDefaultAssumptions())` |
| 11 | `/report/financials/underwriting` | ❌ | n/a | **HARDCODED** `SCENARIO_BASE` (single scenario for every hotel) |

**Verdict on coupling: 4 of 11 report routes are canonical-coupled. 7 are decoupled from the selected hotel.**

**Note on `HotelToggle`** (shared across asset-analysis · financials/pl · financials/underwriting · market-overview sub-pages): the toggle has **purely local React state** (`useState(defaultEnabled)`) · changing it does NOT switch any data source · the comment in the source says "wire to a real preference store when the data layer ships". It is a visual placeholder · not a functional control.

---

## 2 · Per-cell verdicts · 8 showcases × 8 surfaces

Surfaces:
- A · Executive Summary
- B · Asset Analysis
- C · Competitive Set
- D · Market Overview
- E · Financials (P&L)
- F · Underwriting
- G · Export PDF
- H · Library entry

```
Hotel                                       A      B      C      D      E      F      G      H
─────────────────────────────────────────── ────── ────── ────── ────── ────── ────── ────── ──────
Eurostars Madrid Tower (Premium · TP)        PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
Mandarin Oriental Ritz (Premium)             PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
Four Seasons Madrid (Premium)                PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
Hotel Indigo Gran Vía (Pro · TP)             PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
The Madrid EDITION (Premium)                 PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
Petit Palace Plaza Mayor (Pro)               PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
VP Plaza España Design (Free · TP)           PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
Meliá Madrid Barajas (Free)                  PASS   PASS   PASS   PASS   FAIL   FAIL   WARN   PASS
```

### 2.1 Roll-up by surface

| Surface | PASS | WARN | FAIL | Severity |
|---|---|---|---|---|
| Executive Summary | 8 | 0 | 0 | — |
| Asset Analysis | 8 | 0 | 0 | — |
| Competitive Set | 8 | 0 | 0 | — |
| Market Overview (root) | 8 | 0 | 0 | — |
| Financials (P&L) | 0 | 0 | **8** | 🔴 critical |
| Underwriting | 0 | 0 | **8** | 🔴 critical |
| Export PDF | 0 | 8 | 0 | 🟡 inherits coupling state of source page |
| Library entry | 8 | 0 | 0 | — |
| **Total cells** | **48** | **8** | **16** | |

### 2.2 Verdict rationale per section

#### A · Executive Summary · PASS (8/8)
Server component reads `canonical_id` searchParam · loads hotel via `getCanonicalHotelById` · resolves market KPI via the 6-level ladder · runs cap-rate engine for valuation · auto-persists to `hotel_report_library`. All 8 showcase renders verified in `library-integrity-qa.mjs` and showcase-integrity sweep · same hotel name + market + submarket as canonical. Engine valuations consistent with chain_scale tier (luxury 800k · upper_upscale 500k · upscale 340k €/key).

#### B · Asset Analysis · PASS (8/8)
Same pattern · `mapCanonicalToAssetAnalysis(hotel)` consumes amenities JSONB + chain_scale + total_rooms. Cross-section sweep verified hotel name present in all 8 renders. **BUT** the sub-page `/report/asset-analysis/capex` is fully hardcoded (`getMockCapexRenders()`) — surfaced as a separate concern below.

#### C · Competitive Set · PASS (8/8)
Subject hotel + 4 peers picked by same `chain_scale` + city='Madrid' + haversine distance ranking. Verified subject hotel name present in all 8 renders. Peers are real canonical Madrid hotels matching the subject's chain_scale. Where the subject is `chain_scale='unknown'` (none of the 8 showcases · all are luxury/upper_upscale/upscale) the resolver falls back gracefully.

#### D · Market Overview · PASS (8/8) at root level
Root page reads canonical + injects hotelLabel + ADR/Occ/RevPAR overrides from `resolveBestAvailableMarketKpis`. Verified hotel name + submarket label present. **BUT** the 3 sub-pages (`/dynamics`, `/projects`, `/transactions`) are fully hardcoded (`CHART_PRESETS`, `getMockProjects`, `getMockTransactions`) — see §3.

#### E · Financials (P&L) · FAIL (0/8)
**Architectural gap.** `/report/financials/pl/page.tsx` is a Server Component that renders `<PLContent />` (Client Component). PLContent calls `computePL(getDefaultAssumptions())` · NO `canonical_id` is read from the URL · NO hotel context propagates. **Every showcase shows the IDENTICAL P&L forecast.** The 5-Year forecast (rooms revenue · F&B · OpEx · GOP · EBITDA) is computed from a single hardcoded `PLAssumptions` object that does not encode hotel-specific keys / ADR / chain_scale.

Evidence:
- `apps/web/src/app/report/financials/pl/page.tsx` line 22 · `export default function PLPage()` · NO `searchParams` parameter
- `apps/web/src/app/report/financials/pl/pl-content.tsx` line 36 · `getDefaultAssumptions()` · no hotel parameter
- `lib/report/financials/computePL.ts` derives revenue from `assumptions.rooms × assumptions.adr × assumptions.occupancy` · no canonical lookup

#### F · Underwriting · FAIL (0/8)
**Same architectural gap, more severe.** `/report/financials/underwriting/page.tsx` is a Server Component that mounts `<UnderwritingShell>` with `SCENARIO_BASE` · a single deep-frozen scenario snapshot. UnderwritingShell exposes a scenario picker (downside/base/upside/stress) but ALL scenarios are computed from the same hardcoded inputs · independent of which hotel the operator was just viewing.

Evidence:
- `apps/web/src/app/report/financials/underwriting/page.tsx` line 6 · `import { SCENARIO_BASE } from "@/lib/underwriting/defaults"` · static import
- The UnderwritingShell consumes the snapshot directly · no canonical_id query · no `runForHotel` call

The result is that a "Madrid Marriott Auditorium · 869 rooms · upper_upscale" Underwriting view renders **the same Project IRR · Equity IRR · MOIC · BS as a 34-room Petit Palace Plaza Mayor**. This is a fundamental report-integrity break.

#### G · Export PDF · WARNING (0 PASS · 8 WARN)
There is no dedicated `/report/pdf` route. PDF export happens via browser print (CSS `@media print` + Tailwind `print:` classes). The PDF inherits the canonical-coupling state of whatever page emitted it:
- Print of Executive Summary → canonical-coupled (PASS)
- Print of Financials/PL → decoupled (FAIL inherited)

We mark Export PDF as WARNING globally because the print pipeline ITSELF is fine · but the underlying surfaces are mixed.

#### H · Library entry · PASS (8/8)
Each showcase has a `hotel_report_library` row pointing to the correct `canonical_id` · with `report_origin='showcase'` · matching `tier_badge` · matching `is_top_promote`. Validated row-by-row via Supabase. `report_url` field always points to `/report/executive-summary?canonical_id=<row.canonical_id>` (100% well-formed across 224 corpus).

---

## 3 · Detailed inventory of decoupled surfaces

### 3.1 Mock / hardcoded data sources

| Source file | Used by | Nature |
|---|---|---|
| `lib/report/capex-renders-data.ts` (`getMockCapexRenders`) | `/report/asset-analysis/capex` | Fixed CAPEX schedule + render gallery |
| `lib/report/market-dynamics-data.ts` (`CHART_PRESETS`) | `/report/market-overview/dynamics` | Hardcoded ADR/Occ/RevPAR/Pipeline chart presets |
| `lib/report/projects-data.ts` (`getMockProjects`) | `/report/market-overview/projects` | Fixed list of supply pipeline projects |
| `lib/report/transactions-data.ts` (`getMockTransactions`) | `/report/market-overview/transactions` | Fixed list of past transaction comparables |
| `lib/report/financials/getDefaultAssumptions` | `/report/financials/pl` | Single P&L assumption set (rooms/ADR/occ/cost lines) |
| `lib/underwriting/defaults` (`SCENARIO_BASE`) | `/report/financials/underwriting` | Single Underwriting scenario (investment · financing · P&L · DCF · IRR · BS · 8 modules) |
| `lib/report/executive-summary-data` (`getMockExecutiveSummary`) | `/report/executive-summary` fallback only | Demo data shown when no `canonical_id` present |
| `lib/report/asset-analysis-data` (`getMockAssetAnalysis`) | `/report/asset-analysis` fallback | Same pattern |
| `lib/report/competitive-set-data` (`getMockCompetitiveSet`) | `/report/competitive-set` fallback | Same pattern |
| `lib/report/market-overview-data` (`getMockMarketOverview`) | `/report/market-overview` fallback | Same pattern |

The fallback mocks (last 4 rows) are NOT a problem · they only render when no canonical_id is supplied · the canonical path supersedes them when present. The first 6 rows ARE the gap · they are ALWAYS used regardless of context.

### 3.2 Decoupled UI components

| Component | Location | Behaviour |
|---|---|---|
| `HotelToggle` | `apps/web/src/app/report/asset-analysis/hotel-toggle.tsx` | Local React `useState` · no data switching · visual placeholder |
| Underwriting scenario picker | Inside `UnderwritingShell` | Switches between SCENARIO_BASE variants · all same hotel-less inputs |
| Asset analysis amenities heuristic | `mapCanonicalToAssetAnalysis` | Reads canonical amenities JSONB · CORRECT |
| CompSet peer ranking | `mapCanonicalToCompetitiveSet` | Reads canonical hotels · CORRECT |
| Market dynamics chart | `DynamicsChartCard` | Renders `CHART_PRESETS` · no hotel context |

### 3.3 Shared datasets across hotels (incorrect coupling)

| Data | Where it lives | Should be per-hotel? |
|---|---|---|
| `SCENARIO_BASE` (single scenario) | `lib/underwriting/defaults.ts` | YES · should be derived from hotel canonical |
| `getDefaultAssumptions()` | `lib/report/financials/defaults.ts` | YES · should be seeded from hotel keys + chain_scale + market |
| `getMockProjects()` | `lib/report/projects-data.ts` | NO · pipeline projects are SUBMARKET-level (every Madrid Centre hotel sees the same · correct) — but currently the list is identical regardless of submarket |
| `getMockTransactions()` | `lib/report/transactions-data.ts` | NO · transactions are MARKET-level (every Madrid hotel sees Madrid transactions) — but currently identical for every market |
| `CHART_PRESETS` | `lib/report/market-dynamics-data.ts` | NO · dynamics are MARKET/SUBMARKET-level — but currently identical |
| `getMockCapexRenders()` | `lib/report/capex-renders-data.ts` | YES · CAPEX schedule depends on hotel state · age · renovation history |

So among the decoupled surfaces:
- **3 should be canonical-coupled** (CAPEX · P&L · Underwriting)
- **3 should be submarket/market-coupled** (Dynamics · Projects · Transactions) — they are NOT canonical-specific but they should at least respect the hotel's submarket

---

## 4 · Risk per surface · investor-facing severity

| Risk | Affected surfaces | Severity | Why |
|---|---|---|---|
| Investor reads "Madrid Marriott Auditorium 869 rooms" header + sees Underwriting IRR computed from 200-room generic inputs | Underwriting | 🔴 Critical | Numbers contradict reality of the asset |
| 5-Year P&L forecast identical for every showcase | Financials / P&L | 🔴 Critical | Eurostars 472 keys and Petit Palace 34 keys cannot have the same revenue trajectory |
| CAPEX schedule identical for every showcase | CAPEX | 🟠 High | A new 2022 hotel (EDITION) has fundamentally different CAPEX needs vs a 1972 property (Meliá Barajas) |
| Market dynamics chart identical regardless of submarket | Market dynamics | 🟡 Medium | Investor expects Retiro vs Barajas vs Centre to show different occupancy/ADR curves |
| Transactions list identical for every Madrid hotel | Market transactions | 🟢 Low | Madrid market transactions are inherently market-level · acceptable as long as labelled as "Madrid market" |
| Projects pipeline identical | Market projects | 🟢 Low | Same as transactions · acceptable if labelled clearly |
| Library row pointing to wrong canonical | Library | 🟢 None | Validated 100% well-formed |

---

## 5 · Remediation proposal · "Unified Report Object" pattern

### 5.1 Concept

Introduce a single typed object that every report section consumes:

```typescript
// apps/web/src/lib/report/report-object.ts
export interface ReportObject {
  canonical_id: string;
  hotel: CanonicalHotelRow;             // already exists
  marketKpi: MarketKpiBundle;           // already exists (6-level resolver)
  engineRun: UnderwritingRunResult;     // already exists (cap-rate engine)
  // Derived per-section snapshots — built once at the top of /report/* tree
  executiveSummary: ExecutiveSummaryData;
  assetAnalysis: AssetAnalysisData;     // including capex schedule derived from year_opened + chain_scale
  competitiveSet: CompetitiveSetData;
  marketOverview: MarketOverviewData;
  financials: FinancialsData;           // computePL fed by hotel.total_rooms + marketKpi.adr_12m + chain_scale defaults
  underwriting: UnderwritingScenario;   // runScenario(hotel) instead of SCENARIO_BASE
  meta: {
    generated_at: string;
    schema_version: number;
    source_provenance: Record<string, string>;
  };
}

export async function buildReportObject(canonicalId: string): Promise<ReportObject | null>;
```

### 5.2 Three-layer architecture

```
LAYER 1 · Canonical resolution (already exists)
  canonical_id → hotel + marketKpi + engineRun

LAYER 2 · NEW · Per-section derivation
  derive7Sections(hotel, marketKpi, engineRun) → ReportObject

LAYER 3 · Page-level dispatch (existing pattern, extended)
  Every /report/* page reads canonical_id → buildReportObject(canonical_id) → renders its section from the unified object
```

### 5.3 Required code work

| Step | File | Change | Effort |
|---|---|---|---|
| 1 | `lib/report/report-object.ts` (NEW) | `buildReportObject(canonical_id)` orchestrator | 2 h |
| 2 | `lib/report/financials/defaults.ts` | New `buildAssumptions(hotel, marketKpi)` derives keys/ADR/occ/cost lines from canonical | 2 h |
| 3 | `lib/underwriting/runScenario.ts` (NEW) | Wrap existing SCENARIO_BASE → accept hotel + marketKpi · seed scenario inputs from hotel.total_rooms + chain_scale benchmarks + marketKpi | 3 h |
| 4 | `lib/report/capex-derivation.ts` (NEW) | Derive CAPEX schedule from `year_opened` + `year_renovated_last` + `chain_scale` heuristic ladder | 2 h |
| 5 | `lib/report/market-dynamics-data.ts` | Accept `submarket` parameter · return submarket-specific chart presets · fallback to market-level | 1 h |
| 6 | `lib/report/projects-data.ts` | Same submarket filtering | 1 h |
| 7 | `lib/report/transactions-data.ts` | Same · market-level scope | 1 h |
| 8 | `/report/financials/pl/page.tsx` | Accept `canonical_id` searchParam · call `buildReportObject` · pass to PLContent | 30 min |
| 9 | `/report/financials/underwriting/page.tsx` | Same · accept canonical_id · pass scenario to UnderwritingShell | 30 min |
| 10 | `/report/asset-analysis/capex/page.tsx` | Accept canonical_id · derive CAPEX | 30 min |
| 11 | `/report/market-overview/{dynamics,projects,transactions}/page.tsx` | Accept canonical_id · resolve submarket · pass to component | 30 min × 3 |
| 12 | `HotelToggle` | Replace local state with a real `useReportContext` store · or remove until it has a purpose | 1 h |
| 13 | QA harness extension | Extend `showcase-integrity-audit.mjs` to verify hotel name + key metrics present in ALL 8 surfaces | 1 h |
| 14 | Cross-section consistency tests | Add automated test that the same canonical_id renders consistent metrics across all 8 surfaces | 2 h |
| | | **Total** | **~18-20 h** |

### 5.4 Phased delivery

| Phase | Scope | Effort | Risk |
|---|---|---|---|
| Phase A · Foundation | Build `ReportObject` + `buildReportObject(canonical_id)` orchestrator · all data deriva exists from current canonical + engine layers | 2-3 h | Low · pure refactor of existing data |
| Phase B · Underwriting coupling | Wire `/report/financials/underwriting` to read canonical_id + run scenario derived from hotel | 3-4 h | Medium · Underwriting engine has 8 modules + IRR + BS reconciliation · need to validate every module reads hotel inputs cleanly |
| Phase C · Financials/PL coupling | Same for `/report/financials/pl` | 2-3 h | Medium · P&L assumptions are simpler than Underwriting but cost-line drivers need hotel-specific benchmarks |
| Phase D · CAPEX + sub-pages | Wire CAPEX + market-overview sub-pages | 3-4 h | Low · sub-pages are simpler · data already exists |
| Phase E · QA + consistency tests | Re-run 8x8 audit + automated regression suite | 2-3 h | Low |
| **Total** | | **12-17 h** | |

### 5.5 What NOT to do

- ❌ Do NOT delete the existing `getMockX` functions · they are useful fallbacks when no canonical_id is supplied (e.g. design preview · component storybook).
- ❌ Do NOT redo the canonical-mapper layer · it works correctly for 4 of the 7 sections.
- ❌ Do NOT add new tables · the `ReportObject` is computed in-memory · no new schema.
- ❌ Do NOT touch UI components / shells / primitives / design tokens · this is a data-layer fix.
- ❌ Do NOT change the cap-rate engine · only wrap it in `runForHotel(canonical)` consistently.

---

## 6 · Open questions for operator

Before scheduling Phase A:

1. **CAPEX scope** — does the operator want a *true* derived CAPEX (based on year_opened · year_renovated · chain_scale benchmark) OR a simpler "showcase-curated" CAPEX (operator manually defines a schedule for the 8 showcases)? The former is broader · the latter ships faster but doesn't generalize.
2. **Market dynamics data** — does HotelVALORA already have submarket-level ADR/Occ/RevPAR time-series in CoStar that could feed the dynamics chart, or is the current `CHART_PRESETS` deliberately a generic Madrid average?
3. **Transactions/Projects scope** — are these meant to be market-level (Madrid-wide) or submarket-level (Retiro · Salamanca · etc.)? Current code is implicitly market-level · code-comment is silent.
4. **Tier gating** — if a Free-tier showcase opens Underwriting, should the page render `LockedGate` instead of full data? Current `useTier` hook in PL handles this · need to extend to Underwriting.

---

## 7 · Summary verdict

**Library + 4 of 6 main report sections (Executive Summary · Asset Analysis · Competitive Set · Market Overview root) are canonical-coupled and integrity-clean** · zero hotel-name mismatches across 8 showcases.

**Financials/PL + Underwriting are fully decoupled from the canonical layer** · every showcase shows the same hardcoded scenario · this is the principal risk to report integrity right now and the main reason a HotelVALORA report cannot yet claim "consistent end-to-end" institutional content.

**3 sub-pages of asset-analysis + market-overview** (capex · dynamics · projects · transactions) inherit the same decoupling · severity ranges from medium (CAPEX should be canonical) to low (Transactions can stay market-level if labelled).

**Recommended action**: Phase A (build `ReportObject` orchestrator · 2-3 h) is a no-risk refactor that lays the foundation. Then Phase B (Underwriting) is the highest-impact fix · investors will care most about Underwriting numbers matching the asset header. Phases C-D close the remaining gaps.

**No remediation has been implemented in this audit.** Awaiting operator authorization on the Phase A→E delivery plan + decisions on the 4 open questions in §6.
