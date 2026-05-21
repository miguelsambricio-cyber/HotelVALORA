# AVUXI · Phase 2 Execution Plan

> Status: **plan only · no execution yet** · awaiting operator green-light
> Operator approval scope (verbatim 2026-05-22):
> · Mantener Hotel Ref · CompSet · Centro Histórico (HV-native)
> · Sustituir Heatmap manual por AVUXI
> · Sustituir Líneas de Metro manuales por AVUXI
> · CAPAS panel sigue siendo el único punto de control
> · Feature flag para rollback sencillo
> · No eliminar geo-data.ts · queda como fallback
> · No scoring · no weighting · no tiering · no suppression · no CompSet algorithm changes

---

## 1 · Final architecture

```
NEXT_PUBLIC_AVUXI_ENABLED = "true" | "false"   ← single feature flag (Vercel env)

┌─ /compset · CompsetMap (explore + analysis · UNCHANGED logic) ──────┐
│                                                                      │
│   ┌─ CompsetMapGL (Mapbox <Map>) · UPDATED to accept `avuxi` flag ┐ │
│   │                                                                │ │
│   │   layers.heatmap   && !avuxi  →  <MapHeatmapLayer/>   ← manual│ │
│   │   layers.metro     && !avuxi  →  <MapMetroLayer/>     ← manual│ │
│   │   layers.historico             →  <MapPolygonLayer/>  ← HV-native unchanged
│   │                                                                │ │
│   │   avuxi                        →  <AvuxiInsideMap        ← NEW │ │
│   │                                       heatmapOn={layers.heatmap}│ │
│   │                                       transitOn={layers.metro}/>│ │
│   │                                                                │ │
│   │   {hotel markers · UNCHANGED}                                  │ │
│   └────────────────────────────────────────────────────────────────┘ │
│                                                                      │
│   <MapControls/> <MapLegend layers={layers} onToggleLayer={...}/>    │
│   {right-edge panel · CompetitorPanel | AssetSelectionPanel}         │
│                  UNCHANGED · same logic · same UX                    │
└──────────────────────────────────────────────────────────────────────┘

Same composition for /report/* via ReportMap (which already uses HVMap shell from Phase 1b).
```

### 1.1 · How the CAPAS panel drives AVUXI

The existing `<MapLegend>` already exposes 3 boolean toggles via the `useCompset` hook:
```ts
layers = [
  { id: "heatmap",   enabled: bool },  // CAPAS · Heatmap toggle
  { id: "metro",     enabled: bool },  // CAPAS · Líneas de Metro toggle
  { id: "historico", enabled: bool },  // CAPAS · Centro Histórico toggle
]
```

Phase 2 re-wires the `heatmap` and `metro` booleans inside `<CompsetMapGL>`:
- When `avuxi=false` (flag off · current production behavior): both flags drive manual `MapHeatmapLayer` + `MapMetroLayer` as today
- When `avuxi=true` (flag on): both flags drive AVUXI via `<AvuxiInsideMap>` programmatic control

`historico` is untouched · always drives `<MapPolygonLayer>` (HV-native Madrid Almendra).

### 1.2 · `<AvuxiInsideMap>` internal behavior

```tsx
function AvuxiInsideMap({ heatmapOn, transitOn }) {
  const { current: mapRef } = useMap();          // react-map-gl hook
  const map = mapRef?.getMap();                  // raw mapbox-gl Map

  // Mount AVUXI script + call mapStart with 4-arg signature
  // (same code path as /experiment-avuxi v9 baseline · proven working)
  useEffect(() => { /* script inject + mapStart */ }, [map]);

  // React to CAPAS heatmap toggle changes
  useEffect(() => {
    if (heatmapOn) {
      // If no AVUXI heatmap category is currently active in the DOM,
      // programmatically click the first available category button
      // (default · Sightseeing if found · else first match).
      // Operator can still switch categories via AVUXI's native buttons.
    } else {
      // Find the currently-active heatmap category button and click
      // it to toggle off (AVUXI's own deactivation pattern).
    }
  }, [heatmapOn]);

  // Same pattern for transit
  useEffect(() => {
    if (transitOn) { /* click metro button if not active */ }
    else { /* click metro button if active */ }
  }, [transitOn]);

  return null;  // pure controller · no UI
}
```

### 1.3 · AVUXI native button group · visibility

During Phase 2 validation, AVUXI's native button group (top-right · 5 heatmap categories + transit) **remains visible** so the operator can switch between categories at will. The CAPAS panel controls layer visibility · the AVUXI buttons control category selection · these are complementary not redundant.

This honors:
- ✅ "All AVUXI categories remain available during validation"
- ✅ "CAPAS panel is the único punto de control" (for on/off visibility)
- ✅ No category suppression · no tiering · no decisions baked in

### 1.4 · Centro Histórico independence

The `historico` toggle and `<MapPolygonLayer>` are **NOT touched** by Phase 2. They remain HV-native. The Almendra Central polygon stays exactly as today.

---

## 2 · Files affected · concrete list

### 2.1 · Modified (5 files)

| File | Change | Risk |
|---|---|---|
| `apps/web/src/components/maps/compset-map-gl.tsx` | Accept new optional `avuxi?: boolean` prop · skip `<MapHeatmapLayer>` + `<MapMetroLayer>` when `avuxi=true` · render `<AvuxiInsideMap>` when `avuxi=true` | LOW · gated by flag · default false · falls through to current behavior |
| `apps/web/src/components/maps/hv-map/avuxi-overlay.tsx` | Graduate from stub to functional · lift v9 implementation from `/experiment-avuxi` · convert to a child of `<Map>` via `useMap()` hook · expose `heatmapOn` + `transitOn` props | MEDIUM · new code · contained inside one component |
| `apps/web/src/components/compset/compset-map.tsx` | Single line · read `process.env.NEXT_PUBLIC_AVUXI_ENABLED === "true"` at module scope · pass `avuxi` prop to `<CompsetMapGL>` in both AnalysisMode and ExploreMode | LOW · 1-line additions · QA #001 patterns (two-click · panels) untouched |
| `apps/web/src/components/report/ui/report-map.tsx` | Same single-line addition · read env flag · pass to `<CompsetMapGL>` · `<HVMap mode="report-embed" avuxi={flag}>` | LOW · 1-line addition |
| `apps/web/src/components/maps/hv-map/index.tsx` | Accept `avuxi` prop · forward to `<AvuxiOverlay>` when mounted standalone (Phase 1b path) · no functional change if not used | LOW · already a thin shell |

### 2.2 · Documentation updated (3 files)

| File | Change |
|---|---|
| `apps/web/README.md` | Document new env var `NEXT_PUBLIC_AVUXI_ENABLED` |
| `docs/maps/avuxi-integration-architecture.md` | Add 2026-05-23 (Phase 2 shipped) line to operator-approvals header |
| `docs/changelog.md` | Phase 2 entry |

### 2.3 · `/user/admin/integrations` registry

| Change | Action |
|---|---|
| Status: `testing` → `partial` once Phase 2 lands in production with the flag ON | Single-line update in `lib/admin/integrations/platform-registry.ts` · platform-integration-tile display label maps `testing` → "Validation" today · we'll add a `partial` mapping too |

If we keep the flag default OFF in production, status stays `testing/validation`. Only when operator flips the flag ON does the integration go `partial`. Documented inline.

### 2.4 · NOT touched

- `apps/web/src/lib/maps/geo-data.ts` · all 3 datasets (`TOURIST_HEATMAP_DATA` · `METRO_LINE_DATA` · `HISTORIC_CENTER_POLYGON`) **stay** as the manual fallback per operator directive
- `apps/web/src/components/maps/map-heatmap-layer.tsx` · stays · used when flag is off
- `apps/web/src/components/maps/map-metro-layer.tsx` · stays · used when flag is off
- `apps/web/src/components/maps/map-polygon-layer.tsx` · stays · drives Centro Histórico (independent of AVUXI)
- `useCompset` hook · unchanged · layers state untouched
- CompSet algorithm (Haversine + ±1-star similarity) · unchanged
- Hotel pins (`<HotelMarker>`) · unchanged
- Two-click inspect/commit pattern · unchanged
- AssetSelectionPanel · CompetitorPanel · unchanged
- `/experiment-avuxi` v9 baseline · unchanged (validation surface)
- `/experiment-avuxi-sandbox` · unchanged

---

## 3 · Rollback strategy

### 3.1 · Feature flag mechanism

Single Vercel env var:
```
NEXT_PUBLIC_AVUXI_ENABLED = "true"   → AVUXI activated in /compset + /report/*
NEXT_PUBLIC_AVUXI_ENABLED = "false"  → manual layers active (or absent if not set)
```

Default behavior · flag NOT set or set to anything other than literal `"true"` → flag is FALSE → manual layers render exactly as today. No surprises for downstream consumers.

### 3.2 · Rollback paths · 3 tiers

| Tier | Trigger | Action | Time to revert | Risk |
|---|---|---|---|---|
| **Tier 1 · flag flip** | Operator wants to disable AVUXI in production | Set `NEXT_PUBLIC_AVUXI_ENABLED=false` in Vercel env · trigger redeploy | ~3 min (Vercel rebuild) | Zero · single env var · same code path that's been working since pre-AVUXI |
| **Tier 2 · git revert** | Bug in `<AvuxiInsideMap>` causes errors even with flag off | `git revert <phase-2-commit-sha>` · push · auto-deploy | ~3 min | Low · all changes contained in 5 files · revert is mechanical |
| **Tier 3 · partial code rollback** | Want to keep some Phase 2 work but disable AVUXI globally | Manually delete the `<AvuxiInsideMap>` import + render branches · keep all other changes | ~5 min · single PR | Low · localised |

### 3.3 · Why NEXT_PUBLIC env var (vs runtime check)

| Option | Pro | Con |
|---|---|---|
| **NEXT_PUBLIC env var** ✅ | Single source of truth · baked at build · simple · matches existing patterns (`NEXT_PUBLIC_AUTH_ENABLED` · `NEXT_PUBLIC_MAPBOX_TOKEN` · `NEXT_PUBLIC_SUPABASE_*`) | Requires redeploy to flip · not instant |
| Runtime cookie / localStorage | Instant toggle · per-user A/B | Adds state complexity · per-user behavior drift · not appropriate for institutional product |
| URL query string | Instant per-page · easy testing | Operator must manage URLs · not a production rollback mechanism |

Decision: NEXT_PUBLIC env var. Matches the existing platform pattern · simple · low cognitive load. The 3-minute redeploy is acceptable for an institutional rollback (this is not an instant-failover system).

### 3.4 · Pre-deploy verification checklist

Before flipping `NEXT_PUBLIC_AVUXI_ENABLED=true` in production:
1. ☐ Build succeeds with flag on AND off (both paths must compile)
2. ☐ `/compset?ref=bless-hotel-madrid` renders correctly with flag off (no regression from current state)
3. ☐ `/compset?ref=bless-hotel-madrid` renders correctly with flag on (AVUXI overlay active · manual layers absent · Centro Histórico polygon still visible)
4. ☐ CAPAS Heatmap toggle on/off correctly drives AVUXI heatmap visibility
5. ☐ CAPAS Líneas de Metro toggle on/off correctly drives AVUXI transit visibility
6. ☐ Centro Histórico toggle unchanged · still drives manual polygon
7. ☐ AVUXI's native button group remains visible · category switching works
8. ☐ Hotel pins · two-click pattern · panels all functional in both modes
9. ☐ `/report/competitive-set` ReportMap renders correctly with flag on
10. ☐ Network panel confirms `api.avuxi.com` requests when flag on · zero AVUXI traffic when flag off

If any item fails → flag stays off · investigate before retry.

### 3.5 · Monitoring after activation

- Sentry / Vercel runtime logs · watch for errors from `<AvuxiInsideMap>`
- `/user/admin/integrations` AVUXI card · status flips to `partial` when activated · revert if telemetry shows degradation
- Operator manual visual check · same as Phase 1 validation

---

## 4 · Implementation sequence (when approved)

Five commits · each one revert-able independently:

| # | Commit | Scope | Files |
|---|---|---|---|
| 1 | `feat(avuxi): graduate AvuxiOverlay stub to functional · in-map controller` | Lift v9 implementation into `<AvuxiInsideMap>` · uses `useMap()` · script + mapStart + 4-arg signature + click-based heatmap/transit control | `components/maps/hv-map/avuxi-overlay.tsx` |
| 2 | `feat(maps): CompsetMapGL · avuxi flag · skip manual heatmap+metro when on` | Accept `avuxi` prop · gate `<MapHeatmapLayer>` + `<MapMetroLayer>` rendering · mount `<AvuxiInsideMap>` inside `<Map>` when flag on · Centro Histórico polygon unchanged | `components/maps/compset-map-gl.tsx` |
| 3 | `feat(compset+report): wire NEXT_PUBLIC_AVUXI_ENABLED through to CompsetMapGL` | Read env var in CompsetMap + ReportMap · pass to CompsetMapGL · default false | `components/compset/compset-map.tsx` · `components/report/ui/report-map.tsx` |
| 4 | `docs(maps): Phase 2 shipped · env var documented · architecture updated` | README env var entry · architecture doc 2026-05-23 line · changelog entry · integrations registry note | `apps/web/README.md` · `docs/maps/avuxi-integration-architecture.md` · `docs/changelog.md` |
| 5 | (Optional · when flag flipped ON in production) `chore(integrations): AVUXI status → partial` | Update registry status when production verified | `lib/admin/integrations/platform-registry.ts` |

Commits 1-4 ship with flag OFF · production behavior identical to today. Commit 5 happens only when operator flips the flag.

---

## 5 · Risk analysis

| Risk | Likelihood | Mitigation |
|---|---|---|
| Bug in `<AvuxiInsideMap>` script-mount race | LOW (already solved in v9 with `mapReady` state + race-fix pattern) | Reuse v9 proven implementation verbatim |
| `useMap()` hook doesn't return expected ref shape | LOW | Documented react-map-gl API · used in production already by hooks/maps |
| AVUXI category button click handlers depend on internal "active" CSS class we haven't identified | MEDIUM | Phase 2 starts with the SIMPLEST coupling: when CAPAS Heatmap on, ensure AVUXI heatmap visible (click default category if nothing active); when CAPAS Heatmap off, query for ANY active heatmap category and click it to toggle off. If this proves unreliable, fall back to a single-button approach (always-click-a-known-category) · operator workflow still works |
| `NEXT_PUBLIC_AVUXI_ENABLED=true` in Vercel · build cache issue serves stale bundle | LOW | Vercel rebuilds on env change automatically · documented in deploy.md |
| CSS clash with AVUXI's native button group · UI overlap with our `<MapControls>` (both top-right) | MEDIUM | AVUXI options support `buttonLocation: 'tr'\|'tl'\|'br'\|'bl'` · we can move AVUXI to `tl` or `bl` if conflict appears · zero CSS injection needed |
| Operator wants to revert | LOW | Tier 1 rollback · 3-min env var flip · documented |
| `/library/*-map` surfaces using static placeholder break | NONE | These surfaces are NOT touched by Phase 2 (they don't use CompsetMapGL) |

---

## 6 · Constraints honoured · checklist

| Operator constraint | Honoured by Phase 2 plan |
|---|---|
| Mantener Hotel Ref | ✅ HotelMarker rendering unchanged |
| Mantener CompSet | ✅ CompSet algorithm unchanged · `useCompset` hook untouched |
| Mantener Centro Histórico actual (HV-native) | ✅ MapPolygonLayer + HISTORIC_CENTER_POLYGON untouched |
| Sustituir Heatmap manual por AVUXI | ✅ Gated by flag · MapHeatmapLayer skipped when on · AVUXI heatmap renders instead |
| Sustituir Líneas de Metro manuales por AVUXI | ✅ Gated by flag · MapMetroLayer skipped when on · AVUXI transit renders instead |
| No implementar scoring | ✅ Zero scoring code |
| No implementar weighting | ✅ Zero weighting code |
| No tocar underwriting logic | ✅ Cap-rate engine · runForHotel · canonical-reader unchanged |
| No category tiering | ✅ Zero tier framing · all categories available |
| No category suppression / ocultación | ✅ Zero suppression · all AVUXI categories reachable via native button group |
| No cambios en algoritmo CompSet | ✅ buildCompsetForHotel + Haversine + similarity unchanged |
| CAPAS panel es el único punto de control | ✅ MapLegend toggles drive AVUXI · AVUXI native is for category switching only · no new HV panel |
| Heatmap activa/desactiva AVUXI heatmap | ✅ Via click delegation in `<AvuxiInsideMap>` |
| Líneas de Metro activa/desactiva AVUXI transit | ✅ Same pattern |
| Centro Histórico permanece independiente | ✅ MapPolygonLayer drives it · zero coupling to AVUXI |
| Rollback sencillo mediante feature flag | ✅ `NEXT_PUBLIC_AVUXI_ENABLED` Vercel env · single flip · 3-min redeploy |
| No eliminar geo-data.ts | ✅ All 3 datasets preserved as fallback · loaded by manual layer components when flag is off |
| Actualizar documentación e integrations | ✅ README · architecture doc · changelog · registry status updates planned |

---

## 7 · Open operator decisions before execution

| Decision | Default if no input | Operator action |
|---|---|---|
| Pick default AVUXI heatmap category when CAPAS Heatmap toggles ON · we recommend Sightseeing (first AVUXI category) | Sightseeing (we'll pick if no input) | Confirm or pick another from: Eating · Sightseeing · Shopping · Nightlife · Parks · Food |
| Initial flag state on Vercel production after Phase 2 ships | `false` (deploy with no behavior change · flip when operator validates locally) | Confirm |
| AVUXI native button group position · default `tr` (top-right · could clash with MapControls) | `tr` if no input · we'll move to `tl` if clash observed during pre-deploy verification | Confirm or pick: tr · tl · br · bl |
| Where the env var is set first · operator's preference: Vercel directly OR a preview deploy first | Preview deploy first · validate · then production | Confirm |

---

## 8 · Summary · what changes vs what stays

### Changes (5 files · gated by flag)
- New env var `NEXT_PUBLIC_AVUXI_ENABLED`
- AvuxiOverlay graduates from Phase 1 stub to functional in-map controller
- CompsetMapGL accepts `avuxi` flag · skips manual layers when on · renders AVUXI overlay when on
- CompsetMap + ReportMap pass the flag through
- README · architecture doc · changelog · registry · all reflect Phase 2

### Stays (everything else)
- Manual geo-data.ts · all 3 datasets · used as fallback
- MapHeatmapLayer · MapMetroLayer · MapPolygonLayer components · all preserved
- useCompset hook · layers state · toggleLayer · zero changes
- CompSet algorithm · Haversine · similarity · zero changes
- Hotel pins · two-click pattern · panels · zero changes
- Cap-rate engine · runForHotel · canonical-reader · zero changes
- /experiment-avuxi v9 baseline · /experiment-avuxi-sandbox · zero changes
- /library/*-map surfaces · zero changes

---

## 9 · Next step

Operator reviews this plan. If approved:
- 5-commit sequence executes in single session · ~2-3 hours · each commit revert-able
- Flag stays OFF in production until operator green-lights flip
- Documentation updated alongside code

If not approved:
- Identify specific concerns · iterate on this doc
- No code changes triggered

**Awaiting operator approval to execute.**
