# Map Workspace Architecture · CoStar + AVUXI + Mapbox + HotelVALORA

> Architectural design doc · 2026-05-21 (v2 · operator-approved 2026-05-21)
> Status: **approved · Phase 1 scaffolding shipped** · production migrations gated on per-phase green-light
> Trigger: operator-confirmed AVUXI functional baseline on /experiment-avuxi · refocus from "validate per-city" to "design the final architecture"
>
> **Operator approvals 2026-05-21 (v2 revision):**
> · ✅ 4-layer architecture (Mapbox · AVUXI · CoStar · HotelValora)
> · ✅ `<HVMap>` shell + `<AvuxiOverlay>` encapsulator
> · ✅ Future retirement of manual heatmap + manual metro
> · ✅ Phase 1 ONLY (HVMap scaffolding · zero behavior change) · Phases 2+ deferred
> · ⏸ **Historic Center polygon · DOWNGRADED** · do NOT extend globally · Madrid-only legacy · postponed indefinitely · operator rationale: "Madrid · Barcelona · Lisboa · París · Londres NO deberían requerir polígonos manuales"
> · ⏸ Custom AVUXI labels (proxy panel) · postponed
> · ⏸ AVUXI premium tier · postponed
> · ⏸ New-city onboarding · postponed (validation-baseline only)
> · 💡 NEW · **Dynamic Zones Engine** future capability documented in §11
>
> **Phase 2 SHIPPED 2026-05-22 · preview-first activation:**
> · ✅ 4 commits landed on main · `fbb9477` · `981ab37` · `56ebbc2` · (this commit)
> · ✅ `<AvuxiOverlay>` graduated · script + 4-arg mapStart + CSS hide native UI + click delegation per category
> · ✅ MapLegend 4-toggle institutional · Demanda Turística · Gastronomía · Conectividad · Centro Histórico · Lucide icons · radio behavior for heatmap
> · ✅ CompsetMapGL `avuxi` flag · default false · gates manual layers · mounts AVUXI when on
> · ✅ /compset + /report/* surfaces read `NEXT_PUBLIC_AVUXI_ENABLED` · pass to GL
> · ✅ Production behaviour identical when flag unset · zero impact until operator flips
> · ⏳ Pending: operator sets flag to "true" on Vercel Preview env · validates · then production
>
> **Operator directive 2026-05-22 (further refinement):**
> · CAPAS panel (existing `<MapLegend>` 3-toggle) is the integration point for AVUXI · NOT a new HV-owned proxy panel · NOT the AVUXI native button group exposed as primary UI
> · ALL AVUXI categories remain available during validation · zero suppression · zero tiering
> · Centro Histórico stays as a HV-native independent toggle · not coupled to AVUXI's category model
> · Scoring / weighting decisions explicitly postponed
> · Phase 2a (ReportMap activates AVUXI) NOT approved · awaiting CAPAS-panel integration design review
> · See `docs/maps/avuxi-validation-direction-2026-05-22.md` for current active direction · `docs/maps/avuxi-underwriting-utility.md` Tier 1/2/3 content shelved as reference

---

## 0 · Executive frame

HotelVALORA's map workspace stacks FOUR distinct systems, each owning a separate layer of the geospatial intelligence value chain. None of them is a substitute for another. The institutional design is to compose them — never to merge them.

| Layer | System | Owner | What it provides |
|---|---|---|---|
| 1. Foundation cartography | **Mapbox GL JS** | Mapbox Inc. | Streets · buildings · labels · terrain · WebGL render |
| 2. Geo-context intelligence | **AVUXI** | AVUXI (3rd party) | Tourism heatmaps · transit · POI categorisation · worldwide popularity scores |
| 3. Institutional market data | **CoStar** | CoStar Group (data) + HotelValora (ingestion) | ADR · RevPAR · Occupancy · transaction comps · class/segment aggregates |
| 4. Proprietary IP layer | **HotelVALORA** | HotelValora | Hotel registry · institutional pin UX · zone polygons · cap-rate engine · underwriting overlays · brand styling |

Each system has different dependencies, different cost models, different update cadences, and different failure modes. The architecture treats them accordingly.

---

## 1 · System responsibility matrix

### 1.1 · Mapbox · Foundation

| Aspect | Detail |
|---|---|
| Role | Base cartographic foundation · WebGL canvas · projection · pan/zoom |
| Surface | Every `/compset` · `/report/*` map · `/library/*` future · all map-bearing routes |
| Data source | Mapbox tile API (vector tiles + sprites + glyphs) |
| Cost | Token-based · free tier ≤ 50k loads/month |
| Provisioning | `NEXT_PUBLIC_MAPBOX_TOKEN` env var · domain-restricted in Mapbox dashboard |
| Dependency | None upstream · everything else depends on this |
| Failure mode | Loud · canvas grays out · onError surfaces the issue (QA #002 fix) |
| Replacement risk | LOW · Mapbox is the institutional standard · MapLibre would be the open-source drop-in if needed |

### 1.2 · AVUXI · Geo-context intelligence

| Aspect | Detail |
|---|---|
| Role | Generic geospatial overlays · NOT hotel-specific · NOT proprietary |
| Surface | `/experiment-avuxi` (validation) · future `/compset` · future `/report/competitive-set` widget |
| Data source | AVUXI · 60+ public sources indexed regularly · 2M activity signals/hour |
| Coverage | Heatmaps + POIs worldwide (algorithm) · transit 70+ cities (curated) · Top Areas 30+ cities (curated) |
| Cost | Free ≤ 1000 widget loads/month · paid tier via sales |
| Provisioning | scriptId in AVUXI dashboard · domain-allowlisted per project |
| Dependency | Mapbox base (lives ON TOP of it) |
| Failure mode | Silent · script load failures degrade overlays only · base map continues |
| Replacement risk | MEDIUM · the alternative (manual heatmap/metro/POI curation per city) doesn't scale · institutional commitment |

### 1.3 · CoStar · Institutional market data

| Aspect | Detail |
|---|---|
| Role | Per-market hotel KPIs · operator-licensed source of truth for ADR · RevPAR · Occ · transaction comps |
| Surface | KPI overlays + tables on `/report/executive-summary` · `/report/market-overview` · `/compset` competitor cards · cap-rate engine inputs |
| Data source | CoStar XLSX exports · 4 granularities (PAIS · MERCADO · SUBMERCADO · CLASS) · operator-managed |
| Coverage | Global where CoStar licenses extend |
| Cost | CoStar licence (operator-managed · outside HotelVALORA) |
| Provisioning | XLSX drop → `services/costar/<level>/INPUT/` → `services/costar/scripts/build_masters.py` → Supabase `market_snapshots` table |
| Dependency | Independent of map providers · feeds data layer not visual layer |
| Failure mode | Stale data · operator re-drops a fresh export · graceful fallback to MADRID_2024_INSTITUTIONAL_BASELINE constants when level not populated |
| Replacement risk | HIGH · CoStar IS the institutional reference for hospitality real estate · replacement equivalents are STR Global, AirDNA (different segment), Hotstats. Roadmap assumes CoStar continues. |
| NOT a map | CoStar is data · it appears on the map only as marker KPIs · the geospatial overlay is AVUXI / Mapbox / HV |

### 1.4 · HotelVALORA · Proprietary IP layer

| Aspect | Detail |
|---|---|
| Role | Every product-specific decision · branding · canonical hotel registry · institutional UX patterns · valuation engine · zone curation |
| Components | `<HotelMarker>` (two-click inspect/commit · static halo · NO pulsing) · `<AssetSelectionPanel>` / `<CompetitorPanel>` · `MapPolygonLayer` for HV-curated zones · `useCompset` hook · cap-rate engine (`lib/underwriting/cap-rate-engine`) · `runForHotel` adapter · KPI mapper layer |
| Data | Canonical hotel registry (Supabase `hotel_canonical` + dependents) · `lib/data/madrid-hotels.ts` 18-hotel Tier-2 mock · `RECOMMENDED_MADRID_ANCHOR_IDS` curated set · Almendra Central polygon (Madrid · LEGACY · not extended globally per operator decision 2026-05-21 · see §11 Dynamic Zones Engine) |
| Cost | Internal · engineering capacity |
| Dependency | All of Mapbox + AVUXI + CoStar feed into this layer; HV is the composition + product surface |
| Failure mode | Code bug · we own the fix |
| Replacement risk | N/A · this IS the product |

---

## 2 · What manual overlays AVUXI replaces · what stays HotelValora

### 2.1 · Replace with AVUXI (retire manual code path)

| Today (manual) | Replacement (AVUXI) | Why |
|---|---|---|
| `TOURIST_HEATMAP_DATA` in `lib/maps/geo-data.ts` · 21 Madrid POIs with operator-invented weights | AVUXI heatmap · 5 categories (Eating · Sightseeing · Shopping · Nightlife · Parks) · worldwide algorithmic | "Popularity" is what AVUXI's product IS · invented weights cannot match billions of indexed signals · doesn't scale to BCN · Lisboa · 12+ future cities |
| `METRO_LINE_DATA` in `lib/maps/geo-data.ts` · L1 + L6 hand-drawn vertices | AVUXI transit overlay · 70+ cities curated | Hand-drawing transit lines per city is multi-day work per city · AVUXI provides this as a checkbox |
| `MapHeatmapLayer` + `MapMetroLayer` components | Inside `<AvuxiOverlay>` · injected via AVUXI script | One less render path · one less component family |

### 2.2 · Keep HotelValora-native (do NOT delegate to AVUXI)

| Layer | Why we keep it ourselves |
|---|---|
| **`<HotelMarker>` pins** | This IS the institutional asset register · 18-hotel Madrid registry + future cities · proprietary data + the two-click inspect/commit UX pattern (also documented as production-grade in QA #001) |
| **`HISTORIC_CENTER_POLYGON` (Almendra Central)** | **LEGACY · Madrid-only · not extended globally.** Operator decision 2026-05-21 · per-city hand-curated polygons do not scale and conflict with the "no per-city engineering" principle. Stays in source as Madrid-specific historical artefact. Replacement direction is the Dynamic Zones Engine (§11) · auto-derived from AVUXI signals + CoStar submarket definitions |
| ~~**Future zone polygons**~~ | ~~Per-city operator-curated zones~~ · **REMOVED FROM SCOPE** per operator decision 2026-05-21 · superseded by the Dynamic Zones Engine direction in §11 |
| **`<AssetSelectionPanel>` / `<CompetitorPanel>`** | The right-edge map workspace UI · institutional density · inspect/commit pattern · scrollIntoView · auto-open behavior |
| **Cap-rate / IRR / CAPEX overlays** | Underwriting outputs · proprietary engine · presented on the map as marker KPI badges or compset table rows |
| **CoStar KPI overlays** (ADR · RevPAR · Occ on pins) | CoStar is the DATA · HotelValora is the UI · we render them on our `<HotelMarker>` via the popup or compset table |
| **Brand styling** | Forest-900 · institutional typography · no-pulsing markers · density rules |
| **Search bar + autocomplete** | Hotel registry-driven search · own data · own UX (`<HeroSearch>` · `<PanelSearchBar>`) |

### 2.3 · Optional · open question

| Layer | Decision |
|---|---|
| AVUXI native button group + legend | Currently raw native UI · per operator freeze (2026-05-21). Future option: hide via single `display: none` on `.category-control-container` and proxy clicks from HV-owned buttons. Gated on (a) AVUXI customisation API enquiry + (b) empirical per-category identifier confirmation via inspector. |

---

## 3 · Reusable component design · `<HVMap>`

### 3.1 · Composition

```
<HVMap                                              ← HotelValora map workspace shell
  cityCenter={...}
  initialZoom={...}
  mode="explore" | "analysis" | "report-embed"
>
  ─── Foundation ─────────────────────────────────
  <Map>                                            ← react-map-gl/mapbox · Mapbox tiles
    
    ─── Geo-context overlay (optional) ─────────
    <AvuxiOverlay                                  ← HotelValora-owned wrapper · ENCAPSULATES AVUXI
      scriptId={OFFICIAL_SCRIPT_ID}
      categories={INSTITUTIONAL_CATEGORIES}
      onError={…}
    />
    
    ─── Zone polygons (HV-curated) ─────────────
    <HVZonePolygons zones={…} />                  ← MapPolygonLayer · Almendra · custom zones
    
    ─── Asset layer (HV IP) ────────────────────
    <HVHotelMarkers
      hotels={…}
      onInspect={…}
      onCommit={…}
      inspectedHotelId={…}
    />
    
    ─── KPI overlays (CoStar data via HV UI) ───
    <HVMarketKpiBand                              ← CoStar feeds · HV renders
      market={…}
      submarket={…}
    />
  </Map>
  
  ─── Map controls (HV-owned) ───────────────────
  <MapControls
    zoom + layers + filter
    layersPanelOpen + onToggleLayersPanel
  />
  
  ─── Right-edge workspace panel (HV IP) ────────
  {mode === "analysis"   && <CompetitorPanel … />}
  {mode === "explore"    && <AssetSelectionPanel … />}
  {mode === "report-embed" && null /* widget mode · no side panel */}
</HVMap>
```

### 3.2 · `<AvuxiOverlay>` · encapsulates AVUXI cleanly

This is the single component that knows AVUXI exists. Responsibilities:
- Inject the AVUXI script (idempotent · once per session)
- Wait for `window.AVUXI.mapStart` + map's `onLoad` to both fire (race-fix from v4)
- Call `AVUXI.mapStart(map, mapboxgl, scriptId, options)` with the 4-arg signature
- Expose an `onError` callback so the parent surface can degrade gracefully
- Optionally future-host the proxy-panel layer (when curation is confirmed) · today, no-op

```tsx
interface AvuxiOverlayProps {
  scriptId: string;
  /** Optional · render-time options forwarded to AVUXI.mapStart */
  options?: Partial<AVUXIOptions>;
  /** Lifecycle hooks · parent surface can react */
  onMounted?: () => void;
  onError?: (err: Error) => void;
}
```

The component is a one-liner from a parent surface:
```tsx
<AvuxiOverlay scriptId={OFFICIAL_SCRIPT_ID} />
```

All AVUXI complexity (script load · mapStart race · network probing · DOM observers · category curation) lives inside this single file. No surface needs to know.

### 3.3 · Why encapsulate · 4 reasons

1. **Replaceability** · if AVUXI ever needs to be swapped (different provider · build it ourselves · etc.), only `<AvuxiOverlay>` changes · zero side surfaces touched
2. **Single source of truth** · script URL · scriptId · options · race-fix · all in one file
3. **Testability** · the component can be feature-flagged in any environment
4. **Brand boundary** · the institutional surfaces (`/compset` · `/report/*`) NEVER reference AVUXI directly · they just compose `<HVMap>` · AVUXI is an implementation detail of `<AvuxiOverlay>`

---

## 4 · Progressive migration plan

Five phases · zero forced production changes · each gated on operator green-light.

### Phase 0 · Validation baseline (current state · 2026-05-21)

- `/experiment-avuxi` baseline · AVUXI functional · raw native UI · v9 read-only inspector
- `/experiment-avuxi-sandbox` · pure HTML reference
- `/user/admin/integrations` registers AVUXI
- Production `/compset` runs the manual `geo-data.ts` overlays · UNTOUCHED
- **Status: ✅ done**

### Phase 1 · Build `<HVMap>` foundation (zero behavior change)

Refactor `<CompsetMap>` from compset-map.tsx into the composition above. Same input · same output · same render result. Just restructured for layering.

- Create `<HVMap>` shell · `<AvuxiOverlay>` (no-op stub · just renders nothing) · `<HVHotelMarkers>` (lift existing markers logic) · `<HVZonePolygons>` (lift `MapPolygonLayer`)
- `/compset` adopts `<HVMap mode="explore|analysis">` · keeps current behavior
- `/report/competitive-set` ReportMap migrates to `<HVMap mode="report-embed">`
- Estimate: 1 day · low risk · refactor with byte-equal visual output

### Phase 2 · Wire AVUXI as opt-in layer (feature flag)

- `<AvuxiOverlay>` graduates from stub to working component
- `<HVMap avuxi={false}>` on every production surface · zero visual change
- `<HVMap avuxi={true}>` on `/experiment-avuxi` · operator can flip prop and re-validate
- Estimate: half-day

### Phase 3 · Retire manual heatmap + metro from production

After operator green-lights based on validation:
- `<HVMap avuxi={true}>` becomes default on `/compset`
- Delete `TOURIST_HEATMAP_DATA` · `METRO_LINE_DATA` from `lib/maps/geo-data.ts`
- Delete `MapHeatmapLayer` · `MapMetroLayer` component files
- Keep `HISTORIC_CENTER_POLYGON` (HV-owned curation · AVUXI doesn't surface)
- Update `MAP_LAYER_IDS` constants
- Estimate: 1 hour cleanup

### Phase 4 · Scale to new cities (zero per-city engineering)

- Onboard new cities in the canonical hotel registry (`lib/data/<city>-hotels.ts` or Supabase population)
- AVUXI overlays auto-render based on the map viewport
- Curate optional zone polygons per city WHERE institutionally meaningful (most cities won't need them)
- Estimate: data work per city · zero map engineering

### Phase 5 · Custom labels (deferred · gated)

When AVUXI exposes a customisation API OR we identify the per-category DOM identifier empirically:
- Implement institutional labels (Atracción turística · Gastronomía · Conectividad) inside `<AvuxiOverlay>`
- Either via AVUXI's API (clean) or proxy-panel pattern (HV-owned buttons proxying clicks)
- Estimate: dependent on AVUXI's API · ½ day to 1 day if proxy-panel

---

## 5 · Cross-system dependencies and data flow

```
                          ┌────────────────┐
                          │   CoStar       │
                          │   licence      │
                          └───────┬────────┘
                                  │ XLSX exports
                                  ▼
                          ┌────────────────┐
                          │  services/     │
                          │  costar/scripts│
                          └───────┬────────┘
                                  │ build_masters.py
                                  ▼
                          ┌────────────────┐
                          │  Supabase      │
                          │  market_snapshots
                          └───────┬────────┘
                                  │ canonical-reader
                                  ▼
                          ┌────────────────┐                ┌───────────────┐
                          │  Cap-rate      │                │  AVUXI        │
                          │  engine + KPI  │                │  scripts      │
                          │  mappers       │                └───────┬───────┘
                          └───────┬────────┘                        │ window.AVUXI
                                  │ valuations + scenario           ▼
                                  │                         ┌───────────────┐
                                  │                         │  AvuxiOverlay │
                                  │                         │  encapsulator │
                                  │                         └───────┬───────┘
                                  │                                 │
                                  ▼                                 ▼
                          ┌─────────────────────────────────────────────────┐
                          │                <HVMap>                          │
                          │ ┌────────────────────────────────────────────┐  │
                          │ │  Mapbox base (light-v11)                   │  │
                          │ │  └─ AVUXI overlay (Phase 2+)               │  │
                          │ │  └─ HV zone polygons                       │  │
                          │ │  └─ HV hotel markers + CoStar KPI badges   │  │
                          │ └────────────────────────────────────────────┘  │
                          └─────────────────────────────────────────────────┘
                                                  │
                                                  ▼
                                        /compset · /report/* · /library/*
```

Key invariants:
- CoStar feeds DATA (not visual) · enters Supabase via operator-managed pipeline
- AVUXI feeds VISUAL OVERLAY · script + API · no Supabase touch
- Mapbox feeds CANVAS · zero coupling to CoStar or AVUXI
- HotelValora composes all four · the only system aware of all dependencies

---

## 6 · Failure modes per system

| System | Failure | HV degradation |
|---|---|---|
| Mapbox tile failure | Base map gray | Pin layer still renders · markers still positioned · QA #002 onError surfaces error |
| Mapbox token expired/restricted | Style fetch 401 | Same as above · `onError` shows specific Mapbox message |
| AVUXI script load failure (CDN down) | Heatmap + transit absent | Base map + pins continue · UX degraded but functional |
| AVUXI API rate limit (paid tier ceiling) | Some categories fail to render | Same · partial degradation |
| AVUXI customisation API breaks | Could leak shopping/nightlife back into UI | Revert to current frozen baseline (raw AVUXI) |
| CoStar XLSX stale | KPIs anchored on older period | `MarketKpiBundle.source` exposes provenance · scenario field surfaces "(stale)" hint when applicable |
| HotelValora hotel registry incomplete | Pins missing for some markets | Per-market degradation · operator escalates as new market onboarding task |

---

## 7 · Encapsulated reuse · which surfaces consume `<HVMap>`

| Surface | Mode | AVUXI flag | Notes |
|---|---|---|---|
| `/compset` (bare) | `explore` | true (Phase 2+) | `<AssetSelectionPanel>` right-edge |
| `/compset?ref=<hotel>` | `analysis` | true (Phase 2+) | `<CompetitorPanel>` right-edge |
| `/report/competitive-set` | `report-embed` | true (Phase 2+) | No side panel · embedded widget |
| `/report/market-overview` | `report-embed` | optional | Today static-image · candidate migration |
| `/user/admin/hotels/[hotelId]` | `report-embed` | optional | Per-hotel detail · candidate |
| `/library/favorites-map`, `/library/top-map` | `report-embed` | optional | Today static-image · candidate when business justifies engineering |
| `/experiment-avuxi` | n/a | flag-driven | Diagnostic surface · NOT replaced |
| `/experiment-avuxi-sandbox` | n/a | always-on | Pure HTML reference · NOT replaced |

---

## 8 · Cost model summary

| System | At validation scale (≤ 1k loads/mo) | At public-launch scale (10-50k loads/mo) | At full scale (100k+/mo) |
|---|---|---|---|
| Mapbox | Free | Free | Paid · scales with usage |
| AVUXI | Free | Paid (sales conversation) | Paid · institutional tier |
| CoStar | Operator-licensed | Same | Same |
| HotelValora | Engineering only | Same | Same |

Cost crossover · the Mapbox + AVUXI subscription combined remains cheaper than the engineering cost of building the AVUXI value (heatmaps, transit curation per city, POI ranking) in-house · until we scale past dozens of cities, this hierarchy is correct.

---

## 9 · Open architectural questions

| Question | Status | Resolution path |
|---|---|---|
| Does AVUXI expose a documented customisation API? | Open | Operator sales/support enquiry |
| What is the per-category DOM identifier in AVUXI's rendered UI? | Open | v9 inspector capture once operator validates the page |
| Do we need a 5th system (Google Places / OSM POIs) for specific markets? | Deferred | Re-evaluate when AVUXI coverage gap is identified empirically |
| MapLibre as Mapbox replacement? | Not now | Mapbox is the institutional standard · MapLibre is a parallel safety net not a current need |

---

## 10 · One-paragraph summary

**HotelValora composes a 4-layer institutional map workspace.** Mapbox owns the base cartography (foundation · token-licensed · ubiquitous). AVUXI owns the geo-context intelligence (third-party overlay · worldwide heatmaps + transit + POIs · subscription-licensed · encapsulated inside an `<AvuxiOverlay>` component). CoStar owns the institutional market data (operator-licensed · ingested via XLSX into Supabase · feeds the cap-rate engine and KPI overlays · NOT a map provider). HotelValora owns everything else: the canonical hotel registry, the institutional pin UX (two-click inspect/commit · static halo · no pulsing), the cap-rate engine, the underwriting flows, and the composition itself. The four systems are independent: any can fail without taking the others down. The migration plan moves the heatmap + transit layers from manual `geo-data.ts` to AVUXI in Phases 2-3, retires the hand-curated overlays, and unlocks zero-engineering onboarding of new cities. Per-city zone polygons are explicitly out of scope · the Dynamic Zones Engine (§11) is the future direction for institutional zone derivation. Custom AVUXI labels remain deferred until AVUXI's customisation API is confirmed or the per-category DOM identifier is empirically captured.

---

## 11 · Dynamic Zones Engine · future capability

> Operator-introduced concept · 2026-05-21 · reflected in architecture for forward visibility · NOT in current roadmap · NOT a near-term build.

### 11.1 · Why per-city manual polygons fail

The Almendra Central polygon is hand-coded in `lib/maps/geo-data.ts`. To replicate for Barcelona (Eixample), Lisboa (Belém), París (1er arrondissement), London (City + West End), New York (Manhattan-Midtown), Dubái (Downtown), Singapur (Marina Bay), Tokio (Chiyoda) means:
- Operator/analyst hand-draws 12-20 vertices per city per zone
- Multiple zones per city (City Center · Prime Tourism · Luxury Cluster · Convention Cluster · Airport Cluster · Business District · Beach Front · ...)
- Maintenance burden as cities re-zone or as institutional definitions evolve
- Inconsistent across markets · operator bias drift

This is exactly the kind of "per-city engineering" the operator has explicitly ruled out.

### 11.2 · Dynamic Zones Engine concept

A HotelValora-owned capability that DERIVES institutional zones automatically from upstream signals · NOT hand-drawn · NOT per-city:

| Zone | Derivation signal |
|---|---|
| **City Center** | AVUXI heatmap density (Sightseeing + Eating) > threshold · centroid + isoline contour |
| **Prime Tourism** | AVUXI Sightseeing density above N-th percentile city-wide |
| **Prime Business** | AVUXI POI density (business category) + CoStar submarket class "Office" |
| **Luxury Cluster** | Hotel canonical registry · stars ≥ 5 · ADR percentile · 500m radius hot-spot detection |
| **Convention Cluster** | POI density of "Convention Center" / "Exhibition Hall" + 1km radius |
| **Airport Cluster** | Distance to airport coordinates < N km (Mapbox geocoder · single static query per city) |
| **Beach Front** | OSM coastline data + 500m buffer (in coastal cities) |

### 11.3 · Architectural fit

The engine sits inside HotelValora's IP layer · same level as the cap-rate engine. It:
- Consumes AVUXI overlay data (when AVUXI exposes API access to heatmap underlying scores · paid tier likely)
- Consumes CoStar market_snapshots from Supabase
- Consumes our canonical hotel registry from Supabase
- Produces zone polygons + zone labels at runtime · zero per-city hand-curation

Output format: same GeoJSON `PolygonGeoJSON` shape the existing `MapPolygonLayer` consumes · drop-in compatibility.

### 11.3.5 · Future categories reserved · NOT implemented

Operator directive 2026-05-22 · reserve space in the layer model for
the following future categories. **No implementation required now ·
the layer model accepts new MapLayerId entries additively, so adding
any of these later is a 2-line type extension + DEFAULT_LAYERS entry.**

| Reserved category | Likely source | Underwriting signal |
|---|---|---|
| **Seguridad** | external crime/safety APIs (e.g. AVUXI safety score if exposed · or city open-data feeds) | Risk-adjusted occupancy + brand-segment fit |
| **Walkability** | AVUXI POI density derivatives · OR third-party (e.g. Walk Score equivalent) | Leisure-segment demand · luxury amenity |
| **Demanda Corporativa** | Office density · convention venues · LinkedIn-like business-traffic proxies | Business-segment ADR + occupancy weekday |
| **Mercado Hotelero** | CoStar / STR per-submarket density · hotel-count overlays | Saturation risk · supply pressure |

When activated in a future phase: each becomes a new toggle in the
CAPAS panel (same `<MapLegend>` shell · new `MapLayer` entry · new
toggle row with Lucide icon). Same integration discipline · zero
per-city engineering.

### 11.4 · Roadmap positioning

- **Phase 1** (this commit) · scaffolding · zero engine work
- **Phases 2-4** · AVUXI overlays + retire manual layers · still no engine
- **Phase 6** (future · post-Phase-4 stabilisation) · Dynamic Zones Engine v1 prototype
  - Single-city proof (Madrid) using AVUXI score samples + CoStar SUBMERCADO
  - Generates Almendra equivalent · validates against the legacy hand-coded polygon
- **Phase 7** (future · post v1 prototype validation) · multi-city rollout · zero per-city code
- **Phase 8** (future) · operator-configurable zone definitions · institutional clients pick which zone types matter for their underwriting

### 11.5 · Why mention now

So the architecture document carries the strategic direction even though we are NOT building it. Future contributors reading this doc see:
- ❌ "Don't hand-code more zone polygons per city" (anti-pattern · explicit prohibition)
- ✅ "If we need zones, build the engine instead" (the right direction · documented · greenlightable)

Premature implementation is its own anti-pattern. The engine is a future build · referenced here so the architecture stays honest about the long-term direction.
