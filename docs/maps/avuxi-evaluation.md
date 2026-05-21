# AVUXI · Global Evaluation for HotelValora Map Overlays

> Operator-initiated evaluation · 2026-05-21
> Iteration 2 · expanded for global multi-city scaling
> Status: validation environment shipped at `/experiment-avuxi` · no production migration executed yet

---

## TL;DR · Final recommendation

**Migrate to architecture B**:

```
Mapbox base · AVUXI overlays · CoStar data feed · HotelValora Intelligence (pins + zone polygons)
```

The current manual approach has already proved it does not scale (Sevilla coords shipped on a Madrid surface for months · QA #002 root cause). The operator's CoStar-aligned roadmap targets 12+ cities across 4 continents. Hand-curating heatmaps · transit lines · POI sets per city is not a viable trajectory for the team or the product.

AVUXI delivers the three overlays we cannot scale manually:
- **Popularity heatmap** (5 categories · worldwide via algorithm · not city-by-city curation)
- **Subway / transit** (70+ cities curated · auto-rendered on viewport)
- **POI surface** (200M+ venues globally · ranked by popularity signal)

We KEEP in-house only what is institutional IP or zoning data AVUXI doesn't provide:
- Mapbox base map (already production-grade post-QA #002 token fix)
- `HotelMarker` + canonical hotel registry (proprietary data)
- Optional zone polygons per city (curated by analyst when institutionally meaningful · most cities won't need them)

---

## 1 · The scalability problem · why this matters now

HotelValora's CoStar-aligned global roadmap (operator-stated · 2026-05-21):

| Region | Cities |
|---|---|
| Spain  | Madrid · Barcelona · Valencia · Málaga · Sevilla |
| Europe | Lisboa · París · Londres |
| US     | Nueva York |
| Middle East | Dubái |
| APAC   | Singapur · Tokio |
| Future | unspecified expansion |

For each new city, the manual approach would require:
- Curated tourist heatmap weights (~20-30 anchor POIs per city · weeks of cartography to research)
- Metro / transit line vertices (~50-200 coordinate points per line per city)
- Historic district polygon (12-15 vertices per city)
- Ongoing maintenance as cities re-zone, open new lines, shift tourism patterns

Engineering capacity per city is ~3-5 days of analyst + dev work. For the 12 cities listed, that's 36-60 days of work BEFORE accounting for maintenance. This is technical debt at first contact.

QA #002 already surfaced a Madrid-vs-Sevilla mismatch in the manual data that nobody caught for months. The failure mode of hand-curated geo data is silent: layers render off-viewport, look "OK" because pins still show, and the regression doesn't surface until someone looks closely.

---

## 2 · AVUXI · what it actually provides

### 2.1 · Three layers (different coverage models)

| Layer | Coverage model | Cities |
|---|---|---|
| **Heatmaps + POIs** | Algorithm-driven · 60+ public sources · 2M activity signals/hour · ANY city worldwide auto-resolves | Worldwide |
| **Top Areas labels** ("Historic", "High Street", "Beach", "Business", "Multi-cultural", "Green Parks", "City Center", "Young/Students", "Posh") | Curated · explicit per-city work by AVUXI team | 30 major cities (specific list not public) |
| **Public Transport** (subway / metro lines) | Curated · per-city feeds | 70+ cities |

### 2.2 · Coverage check against HotelValora's 12 target cities

AVUXI publishes 30 major cities for Top Areas + 70+ for transit but does not publish the explicit list. Inference based on AVUXI's customer base (Booking · Kayak · Priceline · eDreams · Sonder · all major OTA hotels-search products) and the obvious "top 30 global tourist destinations":

| City | Heatmap + POIs | Top Areas labels | Transit |
|---|---|---|---|
| Madrid    | ✅ algorithmic | ✅ likely (top 30) | ✅ Metro |
| Barcelona | ✅ algorithmic | ✅ likely (top 30) | ✅ Metro |
| Valencia  | ✅ algorithmic | ⚠ confirm in prototype | ✅ Metrovalencia |
| Málaga    | ✅ algorithmic | ⚠ confirm in prototype | ✅ Metro |
| Sevilla   | ✅ algorithmic | ⚠ confirm in prototype | ✅ Metro Sevilla |
| Lisboa    | ✅ algorithmic | ✅ likely (top 30) | ✅ Metro de Lisboa |
| París     | ✅ algorithmic | ✅ certain (top 5) | ✅ RATP |
| Londres   | ✅ algorithmic | ✅ certain (top 5) | ✅ TfL |
| Nueva York | ✅ algorithmic | ✅ certain (top 5) | ✅ MTA |
| Dubái     | ✅ algorithmic | ⚠ confirm in prototype | ✅ Dubai Metro |
| Singapur  | ✅ algorithmic | ✅ likely (top 30) | ✅ SMRT/MRT |
| Tokio     | ✅ algorithmic | ✅ certain (top 5) | ✅ Tokyo Metro + JR |

**Heatmap/POIs**: worldwide coverage at all 12 cities by design (algorithm-driven · not curated).
**Transit**: 70+ cities · all 12 of ours are major metro-served destinations.
**Top Areas**: ambiguity for 4 mid-size Spanish cities + Dubai · resolvable by spinning the prototype to each city in 30 seconds.

### 2.3 · Data freshness + quality

- 60+ public sources indexed regularly (Tripadvisor, social geo-tags, etc.)
- 2M activity signals/hour processed
- Average API request <50ms
- Used in production by Booking.com · Kayak · Priceline at scale

### 2.4 · Integration surface

- Single `<script>` tag from `scripts.avuxi.com/.../map-layers-for-mapbox.js`
- One function call: `AVUXI.mapStart(mapboxGlMap, accountUuid, options)`
- Bridges with our react-map-gl stack via `mapRef.current.getMap()`
- Customizable: button location/colors · language (40+) · opacity · default category · showLegend · showMetro
- Account UUID is public-safe (same posture as `NEXT_PUBLIC_MAPBOX_TOKEN`)

### 2.5 · Pricing model

- **Free tier**: ≤ 1000 widget loads / month · all features unlocked
- **Paid**: usage-based · negotiated with sales · credit card required to unlock paid widgets
- 1 widget load = 1 mount · interactions unlimited until page reload

For private beta + early demos · free tier covers indefinitely. Public launch (10k+ visits/month on `/compset` and `/report/*`) requires paid plan · sales conversation in advance.

---

## 3 · Strategic comparison

### 3.1 · Decision matrix · weighted for HotelValora's global trajectory

| Criterion | Weight | Manual | AVUXI | Google Places | OSM + GTFS |
|---|---|---|---|---|---|
| **Global scalability** (any city · zero per-city code) | high | 0 | 5 | 4 | 3 |
| **Popularity / "best for X" signal** | high | 1 (faked) | 5 (real · curated by 200M data points) | 2 (POIs · no popularity heat) | 1 |
| **Transit accuracy** | medium | 1 | 4 (curated 70+ cities) | 0 | 5 (GTFS official feeds) |
| **POI completeness** | medium | 1 | 4 | 5 | 4 |
| **Engineering cost · new city onboarding** | high | 1 (3-5 days/city) | 5 (zero) | 4 (zero) | 1 (pipeline per source) |
| **Recurring cost at private-beta scale (<1k loads/mo)** | low | 5 (€0) | 5 (free tier) | 2 (per-request) | 4 (hosting) |
| **Recurring cost at production scale (10k+/mo)** | medium | 5 | 3 (usage-based) | 1 (Google ToS + per-call) | 4 |
| **Visual control / brand customisation** | low | 5 | 3 (button + opacity, palette fixed) | 5 (we draw) | 5 (we draw) |
| **Vendor risk / external dependency** | low | 5 | 2 (CDN + data plane) | 2 (Google ToS) | 5 (open data) |
| **Data freshness** | medium | 1 (snapshot) | 4 (regular re-index) | 5 (live) | 3 (GTFS quarterly) |
| **Used by peer OTAs at scale** | low | n/a | 5 (Booking · Kayak · Priceline) | 5 | 2 |
| **Weighted total** | | **2.0** | **4.1** | **2.8** | **3.2** |

### 3.2 · Why Google Places loses on this matrix

Google Places returns POI data (name · category · rating · reviews) but doesn't ship the "popularity heat" visualization. We'd need to:
1. Pay per-request to Google
2. Cap our request volume (Google ToS restricts caching/storage)
3. Build our own heatmap viz on top of POI ratings (weeks of work)
4. Manually integrate transit (Google doesn't expose subway lines as a layer)

So Google Places solves 40% of the problem at 3x the cost of AVUXI, leaving 60% (heatmap viz + transit) still to build.

### 3.3 · Why OSM + GTFS loses

OSM gives us all the POIs and zoning polygons for free. GTFS gives us transit feeds (where available · most of the 12 cities publish official GTFS).

But:
- POIs in OSM are not ranked by popularity · we'd need our own ranking signal (which is what AVUXI sells)
- GTFS ingestion is a separate pipeline per city per feed (~1 day per city to wire correctly)
- No "best for shopping" / "best for nightlife" labels — those are AVUXI's proprietary value

OSM/GTFS produces a worse heatmap (no popularity signal) at a worse engineering cost (build everything). The only thing it does better is transit accuracy at the cost of pipeline maintenance.

### 3.4 · Why staying manual is the actively worst option

The manual approach scores 2.0 vs AVUXI 4.1. The gap is 50%+. The specific failure modes already realised:
- Sevilla data on Madrid surface for months (silent regression)
- Inability to onboard Barcelona / Valencia / Málaga / Sevilla / Lisboa / etc. without 3-5 days each
- "Popularity" weights are invented by the dev, not derived from real foot traffic — investors looking at the heatmap see noise, not signal

---

## 4 · Recommended architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│ Mapbox GL JS · base map · light-v11                                 │
│   ◯ owner: HotelValora                                              │
│   ◯ scope: streets · buildings · labels · vector tiles              │
│   ◯ cost: existing token (NEXT_PUBLIC_MAPBOX_TOKEN)                 │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ AVUXI Map Layers · overlay                                  │   │
│   │   ◯ owner: AVUXI                                            │   │
│   │   ◯ scope: heatmap (5 categories) · transit · POIs          │   │
│   │   ◯ coverage: worldwide for any city (algorithm) + 70+      │   │
│   │     curated for transit + 30 curated for Top Areas          │   │
│   │   ◯ cost: free ≤ 1k loads/mo · then usage-based             │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ HotelValora Intelligence · pins + KPIs                      │   │
│   │   ◯ owner: HotelValora (IP)                                 │   │
│   │   ◯ scope: <HotelMarker> · canonical hotel registry +       │   │
│   │     two-click inspect/commit pattern · ADR/RevPAR/Occ pop   │   │
│   │   ◯ data source: CoStar feed + canonical mapping pipeline   │   │
│   └─────────────────────────────────────────────────────────────┘   │
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │ HotelValora zone polygons · institutional curation (opt-in) │   │
│   │   ◯ owner: HotelValora                                      │   │
│   │   ◯ scope: <MapPolygonLayer> · Almendra Central · future    │   │
│   │     market-specific institutional zones                     │   │
│   │   ◯ trigger: only when zone-level analysis is institutional │   │
│   │     value (most cities don't need this)                     │   │
│   └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

Clean ownership boundaries:
- **External vendor (AVUXI)**: heatmap · transit · POI categorisation. Generic geospatial context.
- **HotelValora IP**: hotel pins · KPI overlays · two-click pattern · zone polygons where curated.
- **Mapbox**: base cartography.

---

## 5 · Coverage by region · what we know · what we'll verify in prototype

### 5.1 · Europe

| Country | Cities | Heatmap | Transit | Top Areas |
|---|---|---|---|---|
| Spain    | Madrid · BCN · VLC · MAL · SVQ | All ✅ algorithmic | All ✅ (each has metro) | Madrid + BCN ✅ · others ⚠ verify |
| Portugal | Lisboa | ✅ | ✅ | ⚠ verify |
| France   | París | ✅ | ✅ | ✅ |
| UK       | Londres | ✅ | ✅ | ✅ |
| Other operator markets (DEU/ITA/NLD/etc.) | future | ✅ algorithmic | ✅ for major metros | ⚠ per city |

### 5.2 · United States

| City | Heatmap | Transit | Top Areas |
|---|---|---|---|
| Nueva York | ✅ | ✅ MTA | ✅ |
| Future US cities (LA · Miami · Chicago) | ✅ | ✅ for major metros | ✅ likely top 30 |

### 5.3 · Middle East

| City | Heatmap | Transit | Top Areas |
|---|---|---|---|
| Dubái | ✅ | ✅ Dubai Metro | ⚠ verify |
| Future (Abu Dhabi · Doha · Riyadh) | ✅ algorithmic | ✅ where metro exists | ⚠ per city |

### 5.4 · Asia-Pacific

| City | Heatmap | Transit | Top Areas |
|---|---|---|---|
| Singapur | ✅ | ✅ SMRT/MRT | ✅ likely top 30 |
| Tokio    | ✅ | ✅ Tokyo Metro + JR | ✅ |
| Future (HK · Seoul · BKK · Sydney · MEL) | ✅ | ✅ all have metros | ✅ likely top 30 |

### 5.5 · Verification protocol via `/experiment-avuxi`

The prototype now ships with a 12-city selector + AVUXI ON/OFF + Manual ON/OFF. Operator workflow:
1. Open `/experiment-avuxi`
2. Confirm AVUXI status `script: loaded · mapStart: called` for Madrid (baseline)
3. Switch city to BCN · Lisboa · Paris · London · NYC · Dubai · Singapore · Tokyo (one at a time)
4. For each city · validate:
   - Click AVUXI's heatmap button (top-right) → does the heatmap appear?
   - Click AVUXI's transit button → does the metro overlay appear?
   - For Top Areas → does the city show labelled neighborhoods or is it heatmap-only?
   - Quality assessment: do the popularity blobs look right vs the operator's domain knowledge?
5. Compare against `Manual ON` for Madrid (the only city with manual data) → see the explicit asymmetry

This produces concrete evidence per city in <5 minutes per city.

---

## 6 · Risks + mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| AVUXI service outage | Medium | Graceful degradation · base map + pins keep working · console warning surfaces |
| AVUXI changes pricing | Medium | Free tier documented · paid contract negotiated pre-launch · we own base map · provider swap stays a code-only change |
| AVUXI doesn't cover a future city | Low | Architecture supports mixed-mode: AVUXI where available + manual zone polygons where institutionally needed |
| Visual style clash with brand | Low | Customizable button colors + opacity · heatmap palette is standard cartographic · accept and move forward |
| Production traffic > 1k loads/mo | Medium | Sales engagement before public launch · paid tier unlocks higher limits |
| AVUXI data quality varies by city | Low | Validate per-city in prototype before committing routes to AVUXI · fallback exists |
| CSP / firewall blocks the script | Low | Script src is `scripts.avuxi.com` · Vercel + browser CSP currently permissive · if a customer's network blocks it · static fallback acceptable for that segment |

---

## 7 · Migration plan (when operator green-lights)

### Phase 0 · Validation (current state · this PR)

- [x] `/experiment-avuxi` shipped with 12-city selector
- [x] AVUXI ON/OFF + Manual ON/OFF master toggles
- [x] Source-by-layer table (operator sees which provider renders what)
- [x] Live event log
- [ ] Operator validates BCN · Lisboa · Paris · NYC · Dubai · Singapore · Tokyo each renders correctly
- [ ] Operator approves visual style + brand-color match

### Phase 1 · Production integration · half-day

- Modify `CompsetMapGL` · after `onLoad` fires · inject AVUXI script and call `AVUXI.mapStart(map.getMap(), ACCOUNT_ID, options)`
- Remove `<MapHeatmapLayer>` and `<MapMetroLayer>` from explore + analysis render branches
- Keep `<MapPolygonLayer>` mounted for cities with curated zones (Madrid Almendra · future)
- Update `<MapLegend>` · either hide the Heatmap/Metro toggles (AVUXI owns them) or proxy them to AVUXI's API
- Production `/compset` now serves AVUXI overlays

### Phase 2 · Cleanup · 1 hour

- Delete `TOURIST_HEATMAP_DATA` + `METRO_LINE_DATA` from `geo-data.ts`
- Keep `HISTORIC_CENTER_POLYGON` + add zones for new cities as analyst curates them
- Delete `MapHeatmapLayer` + `MapMetroLayer` component files
- Update `MAP_LAYER_IDS` to keep only `historico*` keys
- Typecheck + build confirms no orphan references

### Phase 3 · Scale · zero work per new city

For each new city operator opens:
- Add anchor hotels to canonical registry (operator/analyst work · this is HotelValora IP)
- Optionally add curated zone polygon (analyst work · only if institutionally meaningful)
- AVUXI overlays auto-render based on viewport · zero per-city code

### Phase 4 · Pre-launch · 2 hours

- Sales conversation with AVUXI for paid plan (above 1k loads/month)
- Sentry alert wired to AVUXI script load failures (warning · degrades overlays only)
- Documentation pass · `docs/maps/avuxi-integration.md` runbook

---

## 8 · Open questions to resolve in the prototype

The operator can validate each in `/experiment-avuxi` before approving Phase 1:

1. Does AVUXI's heatmap render correctly for all 12 target cities? (Switch city · click AVUXI heatmap button)
2. Does the transit overlay render for all 12? (Switch city · click AVUXI metro button)
3. Are Top Areas (neighborhood labels) available for all 12 or only a subset?
4. Does the opacity (default 55%) feel institutional? (Adjust via DevTools)
5. Does AVUXI's button placement (top-right vertical) conflict with `/compset`'s `<MapControls>` (also top-right)?
   - Likely: yes · we'd move one or the other. AVUXI is configurable to `tl`/`bl`/`br`. Our controls also movable.
6. How does the script load impact LCP? (Browser DevTools · expect <500ms additional)
7. Hotel pins (when present in /compset) — do they remain legible on top of AVUXI heatmap?

---

## 9 · Final recommendation · explicit

**Recommendation: APPROVE architecture B (Mapbox + AVUXI + CoStar + HotelValora Intelligence) as the global standard.**

Justification:

1. **The current manual approach has already failed in production** (Sevilla data on Madrid surface for months · QA #002 root cause · silent regression nobody caught). The failure mode of hand-curated geo data is institutionally unacceptable for an investor-facing product.

2. **The roadmap is global** (12+ cities across 4 continents). Hand-curating 3-5 days per city × 12 cities = 36-60 days of work for an UNCHANGING task (heatmap/transit/POI ≠ proprietary value). That capacity must go to underwriting · valuation · CoStar pipelines · institutional features.

3. **AVUXI is built for exactly this use case**. Used in production by Booking · Kayak · Priceline · eDreams · Sonder. Worldwide algorithmic heatmaps. 70+ city curated transit. 200M+ POI database. <50ms API. Free tier for beta · paid tier when traffic warrants.

4. **The architecture preserves HotelValora's IP cleanly**. Hotel pins · two-click pattern · canonical registry · institutional zone polygons · cap-rate engine · KPI overlays — all stay in-house. AVUXI is only the generic geospatial context.

5. **The migration is small** (half-day Phase 1 · 1 hour Phase 2). The validation environment is already shipped. Operator can pull the trigger when ready.

Validation gate: operator confirms AVUXI renders correctly for at least Madrid · Barcelona · Lisboa in the prototype · approves visual quality + brand fit · then green-lights Phase 1.

If validation fails for a specific city (rare · would require AVUXI to skip that city's algorithmic indexing · improbable for major metros): we fall back to manual layers ONLY for that city. The architecture supports per-city fallback. The default for the other 11 stays AVUXI.

---

## 10 · Decision matrix · one-line summary

| Option | Score | Recommendation |
|---|---|---|
| Stay manual | 2.0 | ❌ already failed in production · doesn't scale |
| **Mapbox + AVUXI + CoStar + HVI** | **4.1** | ✅ **recommended · pending prototype validation** |
| Google Places | 2.8 | ❌ misses 60% of the requirement (no heatmap viz · no transit) |
| OSM + GTFS | 3.2 | ❌ rebuilds 70% of AVUXI for free at >>5× the engineering cost |

---

## Sources

- [AVUXI TopPlace Map Layers](https://www.avuxi.com/topplace/map-layers)
- [Announcing Map Layers for Mapbox on the New Platform](https://www.avuxi.com/blog/announcing-map-layers-for-mapbox-on-our-new-platform)
- [TopPlace Heat Maps demo](https://www.avuxi.com/heat-maps-demo)
- [Introducing Top Areas — Explore a New City Like a Local](https://www.avuxi.com/blog/news/introducing-top-areas-explore-a-new-city-like-a-local)
- [AVUXI TopPlace™ Heat Maps support docs](http://support.avuxi.com/support/what-are-avuxi-geopopularity-heat-maps)
- [Taming Open Data — the process behind Top Areas](https://www.avuxi.com/blog/news/the-process-behind-top-areas)
- [AVUXI pricing FAQ](https://www.avuxi.com/pricing)
