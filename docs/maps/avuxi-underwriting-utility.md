# AVUXI Layers · Underwriting Utility Proposal

> Strategic doc · 2026-05-21
> **Status: DEFERRED 2026-05-22 by operator decision** · this entire proposal (tiering · default-on policy · scoring roadmap · Phase ordering of category-by-category activation) is shelved. The content stays as REFERENCE for a future review · do not act on it. See `docs/maps/avuxi-validation-direction-2026-05-22.md` for the active direction.
> Trigger: operator requested layer-by-layer utility analysis before any Phase 2 AVUXI activation in production maps
> Companion to: `docs/maps/avuxi-integration-architecture.md` (architecture · 4-layer composition · `<HVMap>` · `<AvuxiOverlay>`)

---

## ⚠ ACTIVE OPERATOR DIRECTIVE (2026-05-22)

The 5 questions answered in §1-5 below are **explicitly NOT being decided yet.** Operator directive:

- **No tiering** of Tier 1 / 2 / 3 categories
- **No** default-on / default-off policy
- **No** scoring integration roadmap
- **No** category hiding · ALL AVUXI categories remain available during validation
- **CAPAS panel (existing 3-toggle MapLegend)** is the integration point for AVUXI layer control · not a new HV-owned panel · not the AVUXI native button group as the primary UI
- **Centro Histórico** stays as an independent HotelValora layer · not delegated to AVUXI · not coupled to the AVUXI category model
- **Phase 2a** (ReportMap activates AVUXI in production) NOT approved · operator wants to see the CAPAS-panel integration model first

The content below ($1-§8) is preserved verbatim · do not edit or delete · re-evaluate when the operator explicitly reopens the categorisation question.

---

---

## 0 · Frame

Before AVUXI is wired into production map surfaces (`/compset` · `/report/*` · etc.), the operator needs an explicit answer per layer:
- Which layers ACTUALLY drive hotel underwriting decisions?
- Which should be ON by default · which OPTIONAL?
- How do we expose them in the HotelValora UX without leaning on AVUXI's native button group?
- Which contribute only visual context · which could power future scoring / Dynamic Zones?

This doc answers all five.

---

## 1 · Per-layer underwriting utility

AVUXI ships 6 layers (5 categorical heatmaps + 1 transit). Each is ranked here against its actual relevance to a hotel investor's underwriting decision.

| AVUXI layer | Underwriting signal | Direct impact on valuation drivers | Verdict |
|---|---|---|---|
| **Sightseeing** | Tourist demand source · iconic attractions = sustained leisure demand · positively correlates with ADR for upper-tier hotels | High · ADR + Occupancy ceiling + RevPAR stability | **TIER 1** · institutional must-show |
| **Eating (Gastronomy)** | Area liveliness · F&B density signals destination appeal · supports leisure occupancy + ancillary revenue potential | High · location desirability + leisure-segment demand · weaker signal for purely business hotels | **TIER 1** · institutional must-show |
| **Transit (Metro/Subway)** | Connectivity · airport accessibility via the network · business-demand enabler · cost-of-friction inverter | High · business demand + occupancy stability across the week · property value | **TIER 1** · institutional must-show |
| **Shopping** | Retail density · supports leisure tourism marginally · indirect demand driver | Low · retail areas correlate with tourism but the signal is already captured by Sightseeing + Eating · redundant for underwriting | **TIER 3** · de-emphasise |
| **Nightlife** | Entertainment density · positive for some hotel brands · NEGATIVE for luxury (noise · brand fit) · context-dependent | Low-medium · brand-segment-dependent signal · ambiguous direction · noise > signal | **TIER 3** · de-emphasise · brand-conditional |
| **Parks & Waterfront** | Green amenity · luxury brands value · family segment · scenic premium | Medium · positive amenity signal for luxury+upscale · weak for upper-midscale and below | **TIER 2** · optional · default off |

**Rationale for Tier 1:**
- Tourism · gastronomy · transit map directly to the institutional underwriting variables: ADR, Occupancy ceiling, business-vs-leisure mix, accessibility premium. They are also the three layers an institutional investor would manually research first when evaluating a new asset · automating that research IS the institutional value.

**Rationale for Tier 3 demotion:**
- Shopping density tracks Sightseeing + Eating closely · marginal incremental signal · clutter penalty exceeds intelligence value
- Nightlife is brand-segment-conditional · a luxury hotel investor sees high nightlife near the asset as a RISK (noise · clientele mismatch) · a midscale leisure brand sees it as a POSITIVE · including it default-on biases the read

**Rationale for Tier 2 (Parks):**
- Luxury and family-oriented brands value green amenity · institutional value exists · but the signal is segment-conditional and weaker than Tier 1 · keep available as opt-in for analysts working on luxury-segment underwriting

---

## 2 · Default visibility policy

### 2.1 · Default ON (visible without operator action)

| Layer | HotelValora label | Default state | Reasoning |
|---|---|---|---|
| Sightseeing | **Atracción turística** | Visible on map mount | Tier 1 · primary tourism demand driver |
| Transit | **Conectividad** | Visible on map mount | Tier 1 · primary accessibility signal |

Two layers default-on is the institutional norm · keeps the map readable · matches investor mental model (where do tourists go + how do they get there).

### 2.2 · Default OFF · operator toggle reveals

| Layer | HotelValora label | Default state | Reveal mechanism |
|---|---|---|---|
| Eating | **Gastronomía** | Off · toggle available | Tier 1 but visually conflicts with Sightseeing when both active · operator toggles when investigating F&B-driven demand |
| Parks | **Espacios verdes** | Off · toggle available | Tier 2 · luxury-segment investigation |

### 2.3 · Hidden by default · re-enableable via config

| Layer | HotelValora policy | Why hidden |
|---|---|---|
| Shopping | Suppressed from default UX · config flag re-enables | Tier 3 · redundant signal · clutter penalty |
| Nightlife | Suppressed from default UX · config flag re-enables | Tier 3 · brand-conditional · biases default read · luxury-investor lens differs from leisure-investor lens |

Re-enable mechanism is the `INSTITUTIONAL_CATEGORIES` config in source · same single-source-of-truth pattern documented in v9.

### 2.4 · Why default-on is restrictive (only 2 layers)

Stacking 4-5 heatmaps simultaneously creates visual mud · density blobs overlap · operator can't read individual signals. The institutional discipline is: show what matters most · gate the rest behind one tap.

---

## 3 · UX integration without depending on AVUXI's native button group

AVUXI's native UI (the vertical button stack with category icons) is functional but generic. Three integration patterns evaluated:

### 3.1 · Pattern A · AVUXI native UI exposed as-is (current `/experiment-avuxi` baseline)

| Pro | Con |
|---|---|
| Zero code · works out of the box | Generic icons · not branded · non-institutional aesthetic |
| Operator sees what AVUXI ships | Shopping + Nightlife buttons visible even if we don't want them |
| AVUXI handles all state · zero bug surface | Cannot reorder · cannot relabel · cannot hide without DOM hacks |

**Verdict:** Acceptable for validation surfaces. Not acceptable for production `/compset` · `/report/*` · brand consistency demands HV ownership of the UI.

### 3.2 · Pattern B · HotelValora-owned proxy panel (recommended)

```
HV renders its own button group with institutional labels:
  · Atracción turística  ┐
  · Gastronomía           ├──→ click handler → programmatic click of corresponding AVUXI button under the hood
  · Conectividad          ┘
  · Espacios verdes (opt) ┘

AVUXI's native button group is HIDDEN via single CSS rule:
  .category-control-container { display: none !important; }

Shopping + Nightlife AVUXI buttons never get exposed.
```

| Pro | Con |
|---|---|
| Full institutional control · brand-consistent labels · forest-900 styling | Requires confirming the AVUXI button DOM signature (one-time inspector capture · already designed in v9) |
| Hide unwanted categories by simply not exposing them in HV panel · no DOM mutation on AVUXI's own buttons | If AVUXI changes its DOM structure, proxy clicks break · need monitoring |
| Phase 2 of `<AvuxiOverlay>` lifts this into the component | Lock-in to AVUXI's internal click event format |

**Verdict:** RECOMMENDED for production. The CSS hide is a single rule on AVUXI's whole panel container · not per-button · much safer than v7/v8 attempts. The proxy panel is HV-owned · we control labels · order · default state · density.

### 3.3 · Pattern C · AVUXI options API (preferred if available)

If AVUXI exposes documented options like:
```js
AVUXI.mapStart(map, mapboxgl, scriptId, {
  enabledCategories: ["sightseeing", "transport"],
  categoryLabels: { sightseeing: "Atracción turística", ... },
  hideNativeButtonGroup: true,
});
```

Then we use that API · zero DOM tricks · cleanest possible integration.

**Action:** operator should open a sales/support ticket with AVUXI asking exactly this · half-day turnaround typically · most B2B SaaS support these customisation requests for enterprise accounts.

**Verdict:** PREFERRED if available. Operator-managed action.

### 3.4 · Recommended path

1. Open AVUXI sales/support ticket re: customisation API (Pattern C) · zero engineering until response
2. If yes · use the documented API · Phase 2 trivial
3. If no · implement Pattern B (proxy panel · hide AVUXI native container · HV buttons proxy clicks)

---

## 4 · Visual signal vs scoring signal

Today AVUXI is visual-only · heatmaps + transit lines that an investor reads with their eyes. Tomorrow (premium tier) AVUXI exposes a Score API · numeric values per coordinate per category.

### 4.1 · Visual-only (immediate · Phase 2-4)

| Layer | Visual delivery |
|---|---|
| Sightseeing | Heatmap density blobs over the map · operator visually assesses tourism intensity around the hotel pin |
| Gastronomía | Same · density blobs · operator visually checks F&B activity |
| Conectividad | Curved lines · operator traces accessibility from the hotel pin to transit nodes |
| Parks | Density blobs · luxury-segment context |

These are READS. The operator interprets. No machine consumption. No scoring impact. No KPI overlay.

### 4.2 · Scoring potential (future · requires AVUXI premium API access · Phase 6+)

When operator activates AVUXI premium tier (post-public-launch · per `docs/maps/avuxi-evaluation.md` cost model), AVUXI exposes numeric scores per coordinate per category. This unlocks:

#### 4.2.1 · Per-hotel institutional scores

| Score | Derivation | Underwriting use |
|---|---|---|
| **Tourism Score** | AVUXI sightseeing density at hotel coordinates · normalised against city median | KPI badge on hotel pin · CompSet table column · cap-rate adjustment input |
| **Gastronomy Score** | AVUXI eating density at hotel coordinates · same normalisation | KPI badge · leisure-demand adjustment |
| **Connectivity Score** | Distance to nearest metro × metro line frequency · OR AVUXI transit_score if exposed | Business-demand adjustment · accessibility premium |
| **Composite Location Score** | Weighted combo (Tourism 0.4 + Gastronomy 0.2 + Connectivity 0.4) | Single institutional headline number on the hotel card |

#### 4.2.2 · Cap-rate engine integration

Current cap-rate engine in `lib/underwriting/cap-rate-engine/` consumes comparables + market KPIs. A new "Location Quality" adjustment factor could be derived from the AVUXI scores · feeding `runForHotel(canonical_hotel)` as an additional dimension.

#### 4.2.3 · Dynamic Zones Engine (per architecture doc §11)

AVUXI scores at sampled grid points feed the auto-derivation:
- City Center polygon = isoline contour where (Sightseeing + Eating) score > P75 city-wide
- Prime Tourism polygon = isoline where Sightseeing alone > P90
- Connectivity polygon = isoline where transit_score > P75

Polygon output feeds `MapPolygonLayer` (existing component · same GeoJSON shape).

#### 4.2.4 · CompSet selection refinement

Existing `buildCompsetForHotel(subjectId)` uses Haversine + ±1-star filter. With AVUXI scores · we add:
- Hotels with similar Tourism Score (±15 percentile)
- Hotels with similar Connectivity Score
This produces compsets that are NOT just geographically near but also institutionally COMPARABLE in location quality.

### 4.3 · Visual-vs-scoring decision matrix

| Layer | Phase 2-4 (visual only) | Phase 6+ (scoring potential) |
|---|---|---|
| Sightseeing | ✅ Visual heatmap | 🎯 Tourism Score · cap-rate · Dynamic Zones · CompSet refinement |
| Eating | ⚪ Visual heatmap (toggle) | 🎯 Gastronomy Score · CompSet refinement |
| Transit | ✅ Visual lines | 🎯 Connectivity Score · cap-rate · Dynamic Zones |
| Parks | ⚪ Visual heatmap (opt) | 🎯 Luxury-segment amenity score |
| Shopping | ❌ Hidden by default | ❌ No scoring use · skip entirely |
| Nightlife | ❌ Hidden by default | 🎯 Risk score for luxury brands (negative weight) · use only when operator runs luxury-underwriting analysis |

---

## 5 · Phased adoption proposal

### Phase 2a · ReportMap activates AVUXI (low-risk widget)

- ReportMap (the embedded widget in `/report/competitive-set` and `/report/executive-summary`) toggles `<HVMap avuxi={true}>`
- `<AvuxiOverlay>` lifts the v9 implementation from `/experiment-avuxi`
- Pattern B proxy panel hides AVUXI native UI · HV exposes 2 default-on layers (Sightseeing + Transit)
- No CompsetMap impact · /compset stays manual

### Phase 2b · CompsetMap activates AVUXI (high-risk · institutional flow)

- After Phase 2a runs stable for a defined period (e.g. 1-2 weeks of operator validation)
- CompsetMap explore mode + analysis mode adopt `<HVMap avuxi={true}>`
- Manual TOURIST_HEATMAP_DATA + METRO_LINE_DATA retired from `lib/maps/geo-data.ts`
- HISTORIC_CENTER_POLYGON stays (Madrid · legacy · downgraded per operator decision)

### Phase 3 · cleanup

- Delete unused manual layer components
- Remove the geo-data.ts deprecated exports
- Update CHANGELOG

### Phase 6+ · scoring activation (post-premium)

- Operator activates AVUXI premium tier
- New `lib/intelligence/location-scoring.ts` consumes AVUXI score API
- Tourism / Gastronomy / Connectivity scores landed on hotel pins · CompSet table · cap-rate engine
- Dynamic Zones Engine v1 prototype

### Phase 7+ · Dynamic Zones rollout

- Auto-derived polygons replace any remaining hand-coded zones
- Per-city zero engineering · global scale unlock

---

## 6 · Summary table

| Question | Answer |
|---|---|
| Which AVUXI layers have real underwriting utility? | Sightseeing · Eating · Transit (Tier 1) · Parks (Tier 2 · luxury only) · Shopping + Nightlife (Tier 3 · suppressed by default) |
| Which should be default-on? | Sightseeing (Atracción turística) + Transit (Conectividad). Two layers · institutional readability discipline |
| Which optional? | Gastronomía + Espacios verdes · operator toggles when relevant |
| Hidden by default? | Shopping + Nightlife · re-enable via INSTITUTIONAL_CATEGORIES config flip · no UI surface change needed |
| How to integrate without AVUXI native UI? | Pattern C (AVUXI options API) preferred if exists · Pattern B (HV proxy panel hiding AVUXI's native group) fallback |
| Visual only today? | Heatmaps + transit lines · operator interprets · no machine consumption |
| Scoring potential (Phase 6+)? | Tourism Score · Gastronomy Score · Connectivity Score · Composite Location Score · cap-rate adjustment input · Dynamic Zones derivation · CompSet selection refinement |

---

## 7 · Open operator decisions

| Decision | Recommendation | Status |
|---|---|---|
| Open AVUXI sales/support ticket re: customisation API (Pattern C feasibility) | Operator-action · zero engineering blocking | Pending |
| Approve Phase 2a (ReportMap activates AVUXI · low-risk widget) | Approve when this doc reviewed | Pending |
| Approve Phase 2b (CompsetMap activates AVUXI · institutional flow) | Approve AFTER Phase 2a runs stable for 1-2 weeks | Pending |
| Approve scoring activation roadmap (Phase 6+) | Approve in principle today · execute post-public-launch | Pending |
| Reject Shopping + Nightlife default-off policy (re-enable globally?) | Default-off per Tier 3 rationale · operator can override per-tenant in future config | Pending |

---

## 8 · Constraints honoured

- ❄️ `/compset` · UNTOUCHED
- ❄️ `/experiment-avuxi` v9 baseline · UNTOUCHED
- ❄️ Phase 2+ migrations · NOT executed
- ❄️ Manual `geo-data.ts` overlays · all still active in production
- ✅ Only Phase 1b · ReportMap → `<HVMap mode="report-embed">` · byte-equal output

This doc is a PROPOSAL · all activation decisions remain with the operator · no code changes triggered by this doc's contents.
