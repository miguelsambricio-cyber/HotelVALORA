# Phase 2 · Final CAPAS Mockup + Pre-Execution Confirmations

> Status: **pre-execution review** · operator's open decisions resolved · awaiting final green-light
> Operator adjustments 2026-05-22 (verbatim):
> · CAPAS panel único sistema de control visual · NO native AVUXI UI
> · 4 capas controladas directamente: Gastronomía · Atracciones Turísticas · Conectividad · Centro Histórico
> · AVUXI buttons hidden / fuera de pantalla si más sencillo
> · Default heatmap: Sightseeing
> · Initial flag: false
> · AVUXI position: no visible para usuario final
> · Deploy: preview primero

---

## 1 · Final CAPAS panel mockup

```
                           ┌─────────────────────────────────┐
                           │  CAPAS                       [×]│
                           │  Map Layers · Bloomberg-grade   │
                           ├─────────────────────────────────┤
                           │                                 │
                           │  ●  Hotel Ref                   │ ← static legend (no toggle)
                           │  ●  CompSet                     │ ← static legend (no toggle)
                           │                                 │
                           │  ─────────────────────────────  │
                           │                                 │
                           │  HEATMAP                        │ ← group label (radio behavior · see §1.1)
                           │  ◌  Gastronomía           ◯ ─●  │ ← AVUXI eating
                           │  🌅 Atracciones turísticas ●─ ◯ │ ← AVUXI sightseeing (default ON)
                           │                                 │
                           │  TRANSPORTE                     │
                           │  🚇 Conectividad           ●─ ◯ │ ← AVUXI transport + metro
                           │                                 │
                           │  ZONIFICACIÓN                   │
                           │  🏛 Centro Histórico       ●─ ◯ │ ← HV-native MapPolygonLayer (UNCHANGED)
                           │                                 │
                           └─────────────────────────────────┘
                           
Legend:
  ●─ ◯  = toggle ON
  ◯ ─●  = toggle OFF
```

### 1.1 · Critical UX consideration · heatmap radio behavior

AVUXI free tier renders ONE heatmap category at a time (native AVUXI UX is radio-like).

**Two design options for the operator to pick:**

**Option A · radio (recommended · institutional honest)**

Gastronomía and Atracciones Turísticas are mutually exclusive. Turning Gastronomía ON automatically turns Atracciones Turísticas OFF (and vice versa). Group label "HEATMAP" makes the radio nature explicit:

```
  HEATMAP (selecciona uno)
  ◯  Gastronomía
  ●  Atracciones turísticas         ← active heatmap
  ◯  (ocultar heatmap)               ← optional "show no heatmap" choice
```

**Option B · independent toggles · last-wins**

Both Gastronomía and Atracciones Turísticas behave as independent boolean toggles. If both are ON, the LAST one toggled is what AVUXI actually renders. Visual indicator in the panel shows which is "currently active":

```
  Gastronomía              ◯ ─●            ← OFF
  Atracciones turísticas   ●─ ◯  · active ← active heatmap
```

UX risk: operator may have both toggles ON and not realise only one shows.

**Recommendation: Option A · radio.** Honest about the underlying AVUXI free-tier reality. Zero confusion. Single source of truth (which category is active) is the radio selection itself.

(Multi-category simultaneous rendering would require AVUXI premium API · out of Phase 2 scope.)

---

## 2 · What the user sees · concretely

### 2.1 · Flag OFF (default · post-Phase-2-deploy state)

Production behavior 100% identical to today:

```
Map renders:
  · Mapbox base (light-v11)
  · Manual heatmap (when CAPAS Atracciones turísticas ON · driven by TOURIST_HEATMAP_DATA)
  · Manual metro lines (when CAPAS Conectividad ON · driven by METRO_LINE_DATA)
  · Centro Histórico polygon (when CAPAS Centro Histórico ON · driven by HISTORIC_CENTER_POLYGON)
  · Hotel pins (HotelMarker · always)

CAPAS panel:
  · Gastronomía toggle exists but has NO manual fallback · rendering nothing when ON
    (gracefully degrades · no visible effect · operator told this in tooltip)
  · Other 3 toggles drive manual layers as today

AVUXI native UI:
  · NOT loaded (script never injected)
  · No CSS impact
```

### 2.2 · Flag ON (post-validation · operator flips to true)

```
Map renders:
  · Mapbox base (light-v11) · unchanged
  · AVUXI heatmap (Sightseeing by default · operator picks via CAPAS radio)
  · AVUXI transit overlay (Conectividad toggle)
  · Centro Histórico polygon (HV-native · CAPAS Centro Histórico toggle · UNCHANGED · zero coupling to AVUXI)
  · Hotel pins (HotelMarker · always · unchanged)

CAPAS panel:
  · Gastronomía toggle → activates AVUXI Eating heatmap (deactivating Atracciones)
  · Atracciones turísticas toggle → activates AVUXI Sightseeing heatmap (deactivating Gastronomía)
  · Conectividad toggle → activates/deactivates AVUXI transit overlay
  · Centro Histórico toggle → activates/deactivates HV-native polygon · ZERO AVUXI involvement

AVUXI native UI:
  · Script loaded
  · mapStart called (4-arg signature)
  · Native button group HIDDEN via single CSS rule:
      .category-control-container { display: none !important; }
    (also hides the AVUXI native legend · CAPAS is the only legend)
  · Programmatic control only · CAPAS panel drives every AVUXI category via click delegation
  · User never sees AVUXI's native UI
```

### 2.3 · Default state of toggles (flag ON · first visit)

Per operator's "Default heatmap: Sightseeing":

| Toggle | Default state | Rationale |
|---|---|---|
| Gastronomía | OFF | Heatmap radio · Sightseeing wins by default |
| Atracciones turísticas | **ON** | Operator's default pick |
| Conectividad | ON | Useful by default for hotel underwriting · matches today's metro layer behavior |
| Centro Histórico | ON | Matches today's behavior (legacy Madrid polygon visible by default) |

Operator can disable any of them after first interaction.

---

## 3 · Centro Histórico independence · confirmation

| Aspect | Confirmation |
|---|---|
| Rendering path | `<MapPolygonLayer data={HISTORIC_CENTER_POLYGON}>` · same as today · component file UNCHANGED |
| Data source | `lib/maps/geo-data.ts` · `HISTORIC_CENTER_POLYGON` constant · UNCHANGED · 13-vertex Madrid Almendra polygon |
| Activation | CAPAS Centro Histórico toggle · same toggle key (`historico`) as today |
| Coupling to AVUXI | ZERO · neither the polygon nor the toggle nor the rendering path involves AVUXI in any way |
| Behavior when AVUXI flag = ON | Identical to flag = OFF · MapPolygonLayer renders the polygon · CAPAS toggle controls visibility |
| Behavior when AVUXI flag = OFF | Identical to flag = ON · same polygon · same toggle |
| Phase 2 changes to Centro Histórico | NONE · explicitly untouched |
| Future · global Historic Center engine | DOWNGRADED per 2026-05-21 operator decision · NOT in roadmap |

**Confirmed: Centro Histórico is the only Phase 2 layer that is HV-native and 100% independent of AVUXI · same component · same data · same toggle · same behavior regardless of feature flag state.**

---

## 4 · Rollback confirmation · feature flag mechanics

### 4.1 · Mechanism

Single Vercel env var · `NEXT_PUBLIC_AVUXI_ENABLED`:

| Value | Behavior |
|---|---|
| `"true"` (literal · case-sensitive) | AVUXI active in `/compset` + `/report/*` · manual heatmap+metro skipped · AVUXI native UI CSS-hidden · CAPAS drives everything |
| `"false"` · undefined · any other value | AVUXI never loads · manual layers render as today · zero AVUXI footprint |

Implementation check in code:
```ts
const AVUXI_ENABLED = process.env.NEXT_PUBLIC_AVUXI_ENABLED === "true";
```

Strict equality · ANY value other than `"true"` falls back to OFF. Operator-safe default.

### 4.2 · Rollback tiers

| Tier | Trigger | Action | Time to revert | Permanent? |
|---|---|---|---|---|
| **Tier 1 · flag flip** | Operator wants to disable AVUXI in production | `NEXT_PUBLIC_AVUXI_ENABLED=false` on Vercel · trigger redeploy | ~3 min Vercel rebuild | No · can flip back to `true` anytime |
| **Tier 2 · git revert** | Bug in `<AvuxiInsideMap>` causes errors even with flag off | `git revert <phase-2-commits>` · push · auto-deploy | ~3 min | Yes (until cherry-picked back) |
| **Tier 3 · partial code rollback** | Want to keep some Phase 2 work but remove AVUXI entirely | Manually delete `<AvuxiInsideMap>` import + branches in `<CompsetMapGL>` | ~5 min single PR | Yes |

### 4.3 · Why this is safe

- Default flag value is OFF · zero behavior change if env var is never set
- All Phase 2 code branches gated by the flag · manual layers stay as fallback (operator constraint #6: "No eliminar todavía geo-data.ts ni overlays manuales; dejarlos disponibles como fallback")
- The `<AvuxiInsideMap>` component is contained · all AVUXI complexity in one file
- CSS rule to hide AVUXI native UI is scoped · cleans up automatically when the script isn't loaded (when flag is OFF)
- `<MapPolygonLayer>` for Centro Histórico is unchanged · never affected by rollback

### 4.4 · Pre-deploy validation gate

Before flipping `NEXT_PUBLIC_AVUXI_ENABLED=true` in production · 10-item checklist (from execution plan §3.4):

1. ☐ Build succeeds with flag ON and OFF
2. ☐ `/compset` renders correctly with flag OFF (no regression)
3. ☐ `/compset` renders correctly with flag ON (AVUXI active · manual layers absent · Centro Histórico polygon present)
4. ☐ CAPAS Gastronomía toggle correctly activates AVUXI Eating · deactivates Atracciones (radio behavior)
5. ☐ CAPAS Atracciones turísticas toggle correctly activates AVUXI Sightseeing · deactivates Gastronomía
6. ☐ CAPAS Conectividad toggle correctly drives AVUXI transit on/off
7. ☐ CAPAS Centro Histórico toggle drives HV polygon · unchanged behavior
8. ☐ AVUXI native UI is NOT visible to end user (CSS hide working)
9. ☐ Hotel pins · two-click pattern · panels all functional in both modes
10. ☐ Network panel confirms `api.avuxi.com` traffic when flag ON · zero AVUXI traffic when flag OFF

If any fails → flag stays OFF · investigate · do not flip until green.

---

## 5 · Files affected · revised count

The operator's adjustment (4 CAPAS toggles instead of 3 · AVUXI UI hidden · category-aware control) adds modest scope vs my earlier plan:

| File | Change | Risk |
|---|---|---|
| `apps/web/src/types/compset.ts` | `MapLayerId` extended with `"eating"` (new) · `"heatmap"` keeps semantic meaning of Sightseeing · `"metro"` keeps semantic of Conectividad · `"historico"` unchanged | LOW · additive |
| `apps/web/src/lib/api/compset.ts` | `DEFAULT_LAYERS` adds Gastronomía entry · existing 3 keep IDs · UI labels updated to institutional vocabulary | LOW |
| `apps/web/src/components/compset/map-legend.tsx` | Renders 4 toggles · group headers (HEATMAP · TRANSPORTE · ZONIFICACIÓN) · radio behavior for Gastronomía + Atracciones turísticas (Option A) | MEDIUM · UI re-arrangement |
| `apps/web/src/components/maps/compset-map-gl.tsx` | Accept `avuxi?: boolean` · gate manual heatmap+metro when on · mount `<AvuxiInsideMap>` child · pass per-category layer state | MEDIUM |
| `apps/web/src/components/maps/hv-map/avuxi-overlay.tsx` | Graduate from stub · lift v9 implementation · category-aware control (eating/sightseeing/transit) · CSS hide injection for `.category-control-container` | MEDIUM · contained |
| `apps/web/src/components/compset/compset-map.tsx` | 1 line · read env · pass `avuxi` prop | LOW |
| `apps/web/src/components/report/ui/report-map.tsx` | 1 line · read env · pass `avuxi` prop | LOW |
| `apps/web/README.md` | Document `NEXT_PUBLIC_AVUXI_ENABLED` | LOW · doc |
| `docs/maps/avuxi-integration-architecture.md` | Append Phase 2 row to approval header | LOW · doc |
| `docs/changelog.md` | Phase 2 entry | LOW · doc |

**Untouched** (per operator constraints):
- `lib/maps/geo-data.ts` · all 3 datasets preserved as fallback
- `MapHeatmapLayer` · `MapMetroLayer` · `MapPolygonLayer` components · all preserved
- `useCompset` hook · NO changes to logic (just consumes the updated DEFAULT_LAYERS)
- CompSet algorithm · zero changes
- HotelMarker · two-click pattern · panels · zero changes
- Cap-rate engine · runForHotel · canonical-reader · zero changes
- `/experiment-avuxi` v9 baseline · `/experiment-avuxi-sandbox` · zero changes
- `/library/*-map` surfaces · zero changes

---

## 6 · 4-commit execution sequence (when approved)

| # | Commit | Files |
|---|---|---|
| 1 | `feat(avuxi): graduate AvuxiOverlay stub · category-aware in-map controller + CSS hide native UI` | `components/maps/hv-map/avuxi-overlay.tsx` |
| 2 | `feat(map-legend): institutional 4-toggle CAPAS · radio heatmap · group headers` | `types/compset.ts` · `lib/api/compset.ts` · `components/compset/map-legend.tsx` |
| 3 | `feat(maps): CompsetMapGL · avuxi flag · gate manual · mount AvuxiInsideMap` | `components/maps/compset-map-gl.tsx` |
| 4 | `feat+docs: wire NEXT_PUBLIC_AVUXI_ENABLED · README · architecture · changelog` | `components/compset/compset-map.tsx` · `components/report/ui/report-map.tsx` · `apps/web/README.md` · `docs/maps/avuxi-integration-architecture.md` · `docs/changelog.md` |

Each commit ships with flag OFF · production behavior identical.

After commits land, operator can:
- Use Vercel preview deploy to validate with flag ON
- Flip flag in production env when ready
- Rollback anytime via Tier 1 (3-min env flip)

---

## 7 · Open decisions before execution

| Decision | Recommendation | Awaiting |
|---|---|---|
| **Radio vs independent toggles** for Gastronomía + Atracciones Turísticas | **Option A · radio** (institutional honest about AVUXI free-tier reality · zero UX confusion) | Operator confirmation |
| Group labels in CAPAS panel (HEATMAP · TRANSPORTE · ZONIFICACIÓN) | Add them for clarity | Operator confirmation or "drop the labels" |
| Icon emojis (🌅 · 🚇 · 🏛) for each toggle | Optional · could be Lucide icons for institutional fit (Camera · Train · Landmark) instead | Operator preference |
| First flag flip target environment | Preview deploy first · validate the 10-item checklist · then production | Operator confirmation |

---

## 8 · Summary table · pre-execution

| Item | Status |
|---|---|
| Mockup CAPAS final | ✅ §1 · 4 toggles + group headers + radio behavior for heatmap |
| User-visible layers explained | ✅ §2 · OFF state + ON state + default state |
| Centro Histórico independence | ✅ §3 · zero coupling to AVUXI · same component · same data · same behavior |
| Rollback strategy | ✅ §4 · 3-tier · default OFF · 10-item pre-deploy gate |
| Files affected | ✅ §5 · 10 modified · 0 deleted |
| Execution sequence | ✅ §6 · 4 commits |
| Open decisions for operator | §7 · radio confirmation · group labels · icons · deploy target |

**Awaiting operator green-light to execute commits 1-4.**

No code changes triggered by this doc. Operator reviews, decides on §7 questions (or accepts recommendations), and gives explicit "execute" before any production-touching changes ship.
