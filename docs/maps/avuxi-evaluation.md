# AVUXI · Technical Evaluation for HotelValora Map Overlays

> Operator-initiated evaluation · 2026-05-21
> Status: recommendation drafted · functional prototype shipped at `/experiment-avuxi` · no production migration executed yet.

---

## 1 · Executive recommendation

**Adopt AVUXI Map Layers for Mapbox** as the primary provider for the three institutional overlays (tourist popularity heatmap · subway/transit · curated POIs by activity category) across all current and future cities. Retire the manually-curated `lib/maps/geo-data.ts` Madrid dataset.

**Keep building in-house**:
- The base map (Mapbox GL JS · light-v11 style · already production-grade after QA #002 token fix)
- The hotel pin layer (`<HotelMarker>` · 18-hotel Madrid registry · proprietary data + institutional pin styling + two-click inspect/commit pattern · this IS our IP, not a generic POI overlay)
- The historical zone polygon · because AVUXI doesn't surface "historical/heritage districts" as a discrete layer (they expose POIs and popularity heatmaps, not zoning polygons)

This produces a clean separation of concerns: **proprietary asset layer (ours) + generic geospatial context layer (AVUXI)**.

---

## 2 · Why AVUXI wins on the strategic axis

The operator's stated goal is scaling to Madrid · Barcelona · Valencia · Málaga · Sevilla · Lisboa · París · Londres · future cities. The current manual approach was already broken: `geo-data.ts` shipped Sevilla coordinates on a Madrid-centric workspace for months without anyone noticing (QA #002 surfaced this). Hand-curated geo data does not scale.

| Need | Manual Mapbox | AVUXI | Google Places | OSM/GTFS |
|---|---|---|---|---|
| Popularity heatmap (where tourists actually go) | ❌ would need foot-traffic data we don't have | ✅ "GeoPopularity scores · 2M activity signals/hour" | ❌ (POI list only · no popularity heat) | ❌ |
| Subway / metro lines | ❌ hand-trace per city | ✅ 70+ cities curated | ❌ | ✅ via GTFS feeds (need pipeline) |
| Curated POI categories (eating · sightseeing · shopping · nightlife · parks) | ❌ would need ranking signal | ✅ 5 categories pre-built worldwide | ⚠ POI data but no curation by "best for tourists" | ⚠ raw OSM tags · no quality filter |
| New city onboarding | weeks of cartography per city | zero (worldwide coverage) | zero (POIs) but no curation | zero (data) but weeks of pipeline |
| Recurring cost | €0 + maintenance time | free ≤ 1000 widget loads/month · then usage-based | per-request (Maps API + Places API) | €0 + pipeline maintenance |
| External dependency | none | yes · cdn script + their data plane | yes · Google ToS | none |
| Visual customisation | full control | medium (colors · opacity · button position · legend toggle) | full control (we draw) | full control (we draw) |
| Used in production by peers | n/a | Booking.com · Kayak · Priceline · eDreams · Sonder | ubiquitous | various |

AVUXI is the only provider that DELIVERS the "popularity" signal (which is the institutional value the manual heatmap was trying to fake). The others only return POI lists.

---

## 3 · Technical analysis of the SDK

### 3.1 · Mapbox-compatible loader

The official Mapbox build of Map Layers is at:

```
https://scripts.avuxi.com/travel/map-layers/latest/map-layers-for-mapbox.js
```

Loader contract (browser-side):
```js
AVUXI.mapStart(mapboxGlMapInstance, accountUuid, options)
```

`mapboxGlMapInstance` is a vanilla `mapboxgl.Map`. In our React stack the `<Map>` from `react-map-gl/mapbox` exposes the underlying instance via `mapRef.current.getMap()`. That bridges the integration cleanly without needing to abandon react-map-gl.

### 3.2 · Options surface

From the user's reference snippet + AVUXI documentation:

| Option | Type | Purpose |
|---|---|---|
| `buttonOrientation` | `"horizontal"` \| `"vertical"` | Layout of AVUXI's own toggle button row |
| `buttonLocation` | `"tr"` \| `"tl"` \| `"br"` \| `"bl"` | Position of toggle buttons |
| `buttonBackgroundColor` | CSS color | Brand match |
| `buttonForegroundColor` | CSS color | Brand match |
| `showLegend` | boolean | AVUXI-rendered legend toggle |
| `language` | locale string | i18n (40+ langs · Spanish included) |
| `showMetro` | boolean | Activates transit layer |
| `defaultCategory` | `"eating"\|"sightseeing"\|"shopping"\|"nightlife"\|"parks"` | Heatmap initial category |
| `initialZoom`, `initialLocation` | number / `{lat,lng}` | Optional initial viewport (else map's current) |
| `opacity` | 0-100 | Heatmap opacity vs base map |

### 3.3 · Coverage

| Layer | Coverage |
|---|---|
| POI categorisation | Worldwide · 200M+ venues |
| Popularity heatmap | "Worldwide" claim · Social Neighborhoods explicitly listed for 30 major cities (more rolling out) |
| Subway / transit | 70+ cities |
| Localisation | 40+ languages |

The 30-city explicit list is not publicly enumerated. Confirmation for the operator's 8 target cities (Madrid · Barcelona · Valencia · Málaga · Sevilla · Lisboa · París · Londres) requires either a quick test in `/experiment-avuxi` (recentre the map on each city) or a sales conversation. The 5 Spanish capitals + Lisbon + Paris + London are all in the obvious "first 30" bucket of major tourist destinations, so coverage is highly likely.

### 3.4 · Pricing model

- **Free tier**: ≤ 1000 widget loads / month · all features unlocked
- **Paid**: usage-based · "contact sales" · credit card required to unlock paid widgets
- 1 widget load = 1 mount of the AVUXI script · interactions after mount are unlimited until page reload

For HotelVALORA today, `/compset` traffic is institutional/operator-driven (private beta · QA · early demos). 1000 loads/month is enough headroom. Once we onboard live customers, we'll hit the threshold quickly and need a paid plan · sales conversation should land before public launch.

### 3.5 · External-dependency risk

- The script is loaded from `scripts.avuxi.com` · CDN failures or sub-second outages would degrade overlays (NOT the base map · NOT pins · NOT compset workflow)
- Graceful degradation: our base map + pins continue to work if AVUXI fails to load
- Sentry/console will catch script load failures (we already added `onError` handling patterns for Mapbox)
- Operator's own brand IS NOT exposed via the script · AVUXI account UUID is public-safe (same posture as `NEXT_PUBLIC_MAPBOX_TOKEN`)

---

## 4 · Comparison vs alternatives

### 4.1 · Stay with manual Mapbox + custom geo-data

**Pros**: zero external dependency · zero recurring cost · full control.
**Cons**: every new city = manual cartography + manual ingestion + manual maintenance · we just shipped Sevilla coordinates on a Madrid surface for months without detection · "popularity" is faked from invented weights · this approach simply does not scale to 8+ cities.

### 4.2 · Google Places / Google Maps Platform

**Pros**: POI completeness · official maps · per-place ratings/reviews.
**Cons**: per-request pricing · doesn't ship the popularity heatmap visualisation (we'd build our own viz on top of Places ratings · weeks of work) · doesn't ship transit overlays · Google's enterprise terms have strict caching/storage rules.

### 4.3 · OpenStreetMap + GTFS feeds + custom popularity model

**Pros**: free · open data · transit feeds are accurate via official GTFS.
**Cons**: significant pipeline work (GTFS ingestion · OSM tag normalisation) · still no popularity signal without our own data acquisition · we end up rebuilding 30% of what AVUXI sells.

### 4.4 · AVUXI (recommended)

**Pros**: scales to ANY city without code · popularity signal IS the institutional value we lacked · transit curated · used by Booking/Kayak/Priceline at institutional scale · 2-line integration · free tier covers beta.
**Cons**: external dependency · their visual style on the overlay (we customise the toggle button but not the heatmap colours · institutional-acceptable since AVUXI uses standard cartographic palettes) · usage-based pricing at production scale.

---

## 5 · Recommended architecture

```
┌─ Mapbox GL JS (base map · streets · labels · buildings) ─┐
│                                                          │
│  ┌─ AVUXI Map Layers (heatmap · metro · POI) ─────────┐  │
│  │      provider:    scripts.avuxi.com                │  │
│  │      cost:        free ≤ 1k loads/mo               │  │
│  │      data:        worldwide · 200M venues · curated│  │
│  │      cities:      auto-detect from map viewport    │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Institutional pin layer (ours · IP) ──────────────┐  │
│  │      HotelMarker · ALL_MADRID_AS_COMPETITORS       │  │
│  │      Two-click inspect/commit pattern              │  │
│  │      Static halo (no pulsing)                      │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌─ Institutional zone polygons (ours · optional) ────┐  │
│  │      Almendra Central · curated by analyst         │  │
│  │      AVUXI doesn't surface zoning polygons         │  │
│  │      (their heatmap is point-density not polygon)  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Retire from `geo-data.ts`**:
- `TOURIST_HEATMAP_DATA` (replaced by AVUXI heatmap)
- `METRO_LINE_DATA` (replaced by AVUXI transit)

**Keep in `geo-data.ts`** (or migrate to its own file):
- `HISTORIC_CENTER_POLYGON` (NOT replaced by AVUXI · custom institutional zoning)
- Future zone polygons per city · curated by analyst when needed

---

## 6 · Migration plan (when operator green-lights)

### Phase 1 · validation (parallel to current /compset · 1 day)

- [x] `/experiment-avuxi` route shipped with AVUXI Mapbox SDK loaded against the 18-hotel Madrid registry
- [ ] Operator opens `/experiment-avuxi` and `/compset` in two tabs · validates:
  - AVUXI heatmap appears for Madrid (5 categories switchable)
  - AVUXI transit overlay appears for Madrid metro
  - Brand-color match acceptable (buttonBackgroundColor: white · foregroundColor: forest-900)
  - Hotel pins (`<HotelMarker>`) don't visually conflict with AVUXI overlays
- [ ] Operator recentres the AVUXI map on Barcelona / Valencia / Lisboa / Paris / London to confirm coverage (using DevTools to call `mapInstance.flyTo({...})`)

### Phase 2 · production integration (~ half-day)

- Modify `<CompsetMapGL>` so when `mode === "explore"` or `mode === "analysis"`, after the base map mounts, inject the AVUXI script and call `AVUXI.mapStart()` against the underlying mapbox-gl instance.
- Remove the three manual layer components (`MapHeatmapLayer` · `MapMetroLayer` from compset surfaces · `MapPolygonLayer` STAYS).
- Update `<MapLegend>` (the collapsible panel) so the layer toggles for "Heatmap" + "Metro" defer to AVUXI's own toggle UI (or hide them and let AVUXI's button group be the canonical control).
- Keep the "Centro Histórico" toggle in our panel (still ours).

### Phase 3 · cleanup (~ 1 hour)

- Delete `TOURIST_HEATMAP_DATA` + `METRO_LINE_DATA` from `geo-data.ts`
- Delete `lib/maps/types.ts` types that only served those (`HeatmapGeoJSON` · `LineGeoJSON`)
- Delete `MapHeatmapLayer` + `MapMetroLayer` component files
- Update `MAP_LAYER_IDS` to keep only `historico*` keys
- `npm run typecheck && npm run build` to confirm no orphan references

### Phase 4 · scale (when operator opens new cities · zero work per city)

For each new city we onboard:
- Add the city's anchor hotels to the canonical registry (operator work)
- Add the city's curated zone polygons (analyst work · only if institutionally meaningful · most cities don't need this)
- AVUXI overlays auto-render based on the map viewport · zero per-city code

### Phase 5 · pre-launch (when public traffic ramps)

- Sales conversation with AVUXI for paid plan (1k free → unlimited)
- Wire `AVUXI` script load failure to Sentry as a warning (degrades overlays but not core)

---

## 7 · Risks + mitigations

| Risk | Mitigation |
|---|---|
| AVUXI service outage | Graceful degradation already designed · base map + pins keep working · console warning surfaces issue |
| AVUXI changes pricing | Free tier is documented · paid contracts negotiated before public launch · we own the base map so a switch back to manual or a different provider stays a code-only change |
| AVUXI doesn't cover a future city | Use AVUXI where covered + manual layers where not (the architecture supports mixed-mode per route since `geo-data.ts` is still consulted for our own polygons) |
| Visual style of AVUXI overlay clashes with brand | `buttonBackgroundColor` / `buttonForegroundColor` / `opacity` cover most adjustments · if the heatmap palette itself is a blocker, fall back to manual via the same architecture |
| Production traffic exceeds 1k loads/mo | Sales engagement before public launch · paid tier unlocks higher limits |

---

## 8 · Open questions to resolve in the prototype

The `/experiment-avuxi` page surfaces these answers visually:

1. Does AVUXI's overlay render at brand-friendly opacity? (Default 55% in prototype · adjust live via options)
2. Do the `<HotelMarker>` pins remain readable on top of the AVUXI heatmap? (Visible in prototype)
3. Does AVUXI's button placement (top-right) collide with our `<MapControls>` + Layers button stack? (Yes if both at `tr` · we'd move ours or change AVUXI's location)
4. Does the AVUXI script load fast enough that it doesn't lag the base map? (Event log in prototype shows the load timing)
5. Does the Spanish localisation read institutional? (`language: "es"` in prototype)

---

## 9 · Decision matrix

| Criterion | Weight | Manual | AVUXI | Google | OSM |
|---|---|---|---|---|---|
| Scales to new cities zero-code | high | 0 | 5 | 4 | 3 |
| Popularity signal quality | high | 1 (fake) | 5 (real) | 2 | 1 |
| Transit accuracy | medium | 1 | 4 (curated) | 0 | 5 (GTFS) |
| Cost at private-beta scale | low | 5 (free) | 5 (free tier) | 2 (paid) | 4 |
| Cost at production scale | medium | 5 | 3 | 1 | 4 |
| Engineering effort | high | 1 (high · per city) | 5 (2 lines · global) | 2 | 1 (build everything) |
| Visual control | low | 5 | 3 | 5 | 5 |
| Vendor risk | low | 5 (none) | 2 | 2 | 5 (none) |
| **Weighted score** | | ~2.0 | **~4.1** | ~2.2 | ~3.0 |

---

## 10 · Final recommendation

**Approve the AVUXI integration.** Validate on the prototype first. If the operator confirms the prototype matches the institutional bar, execute Phases 2-3 in a single half-day commit. The `/experiment-avuxi` route can stay or be removed after migration · it carries no production cost (route weight ~10 kB · only mounted when visited).

If the prototype reveals a deal-breaker (brand clash · coverage gap · script reliability), fallback is the existing architecture · zero work lost · the manual layers are already shipped and tested in production.
