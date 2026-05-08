# Map System

**Status:** canonical, 2026-05-08.

The platform uses **two independent map systems** with deliberately different roles. Don't try to unify them — each carries its own data model and visual language.

---

## 1. Mapbox CompSet map (`/compset` + `/report/competitive-set`)

The interactive Mapbox GL map used for competitor selection AND for the embedded CompSet view inside the Competitive Set report.

| Concern | File |
|---|---|
| Mapbox GL component (dynamic-imported, `ssr: false`) | `apps/web/src/components/maps/compset-map-gl.tsx` |
| CompSet hooks (state for reference hotel + competitors + suggested + layers + panel) | `apps/web/src/lib/hooks/use-compset.ts` |
| Map viewport hook (camera + zoomIn/zoomOut) | `apps/web/src/hooks/maps/use-map-viewport.ts` |
| Full CompSet selection map (with side panel) | `apps/web/src/components/compset/compset-map.tsx` |
| Compact "report-mode" map (no panel) | `apps/web/src/components/report/ui/report-map.tsx` |
| Map controls (zoom +/-) | `apps/web/src/components/compset/map-controls.tsx` |
| Layer legend (heatmap / transport / historic toggles) | `apps/web/src/components/compset/map-legend.tsx` |
| Layer components | `apps/web/src/components/maps/{compset-map-gl,hotel-marker,map-heatmap-layer,map-metro-layer,map-polygon-layer}.tsx` |
| Token | `NEXT_PUBLIC_MAPBOX_TOKEN` (env) |

### Data flow

```
useCompset(referenceHotelId?)
  ↓
{ referenceHotel, competitors, suggested, layers, panelOpen, ... }
  ↓
<CompsetMapGL viewState ... layers />  (Mapbox GL JS, dynamic import, ssr:false)
  ↓
react-map-gl v8
```

Currently each `useCompset()` call mounts independent state. A single CompSet selection on `/compset` does NOT carry layer toggles into `/report/competitive-set` — the map re-initialises with default toggles when the user reaches the report. **Phase 7 plan:** lift `useCompset` into a `<CompsetProvider>` so the layer toggles persist across routes.

### Print behaviour

- The Mapbox map renders to a `<canvas>`. Some Chromium builds rasterise this at low DPI for PDF output. Acceptable today; Phase 6 will capture cross-browser screenshots to verify.
- Map height is capped in print on the CompSet page (`compset-map-container { min-height: 0 !important }` in `globals.css`) so embedded maps respect their wrapper's `print:h-N` class.

### Reuse pattern

```tsx
// /compset page
<CompsetMap referenceHotelId={...} />              {/* full UI: panel + map + controls */}

// /report/competitive-set page
<HotelGalleryGrid>
  <ReportMap />                                     {/* compact: just map + zoom + legend */}
</HotelGalleryGrid>

// canonical primitive re-export
import { ReportMap } from "@/components/report/primitives";
```

### Outstanding

- Layer state sharing across routes (Phase 7).
- Pin clustering above 50 markers (planned).
- Numeric heatmap legend (planned).
- Mapbox attribution / TOS audit.

---

## 2. Stylised pin map (`SharedMapCard` for Market Overview)

A purely-visual map used in the Market Overview demand generators block. **No Mapbox token, no JS map library.** It's a teal-background card with a centred map silhouette image and numbered category-coloured pins layered on top via absolute positioning.

| Concern | File |
|---|---|
| Map card | `apps/web/src/components/report/market-overview/shared-map-card.tsx` |
| Pin data type | `DemandGeneratorMapPin` in `apps/web/src/lib/report/market-overview-data.ts` |
| Demand generator categories (drives both pin colour AND list pin colour) | `DemandGeneratorCategory` discriminated union (`poi` / `metro` / `train` / `airport`) |
| Wrapper block (list + map) | `apps/web/src/components/report/market-overview/demand-generators-block.tsx` |

### Why a separate map system

- The CompSet map is interactive (pan, zoom, layer toggles). The demand generators map is descriptive (where landmarks sit relative to the hotel).
- The Market Overview page already lives in a fixed-width A4-friendly canvas; loading Mapbox tiles + initialising GL JS would be expensive overhead for what is effectively a static illustration.
- Print fidelity: SVG/image-based pins are pixel-perfect on PDF; Mapbox tile rasterisation is browser-dependent.

### Data shape

```ts
type DemandGeneratorCategory = "poi" | "metro" | "train" | "airport";

interface DemandGeneratorMapPin {
  pin: number;            // numeric label (1–N)
  category: DemandGeneratorCategory;
  top: string;            // CSS top, e.g. "28%"
  left: string;           // CSS left, e.g. "25%"
}
```

### Pin styling (per category)

| Category | List pin (numbered chip) | Map pin (overlay) |
|---|---|---|
| `poi` | `bg-slate-100 text-slate-600 rounded-full` | `bg-[#172B4D] rounded-full` (pin 1 = `bg-[#00875A]`) |
| `metro` | `bg-blue-50 text-blue-700 rounded-sm` | `bg-[#0052CC] rounded-sm` |
| `train` | `bg-purple-50 text-purple-700 rounded-sm` | `bg-[#6554C0] rounded-sm` |
| `airport` | `bg-orange-50 text-orange-700 rounded-sm` | `bg-[#FF8B00] rounded-sm` |

The list pin and map pin share the same number, so a reader can cross-reference them visually. Adding a new category means one entry per table here + one entry in the discriminated union.

### Print

`SharedMapCard` carries `print:shadow-none` and reduces `min-h-[400px]` to `print:min-h-[260px]` for compact A4 layout. The pin geometry is defined as percentages so it stays correct at any container size.

---

## 3. Map system comparison

| | Mapbox CompSet map | Stylised pin map |
|---|---|---|
| Interactive | Yes (pan, zoom, layer toggles) | No |
| Library | react-map-gl v8 + Mapbox GL JS | None (CSS + img) |
| Token required | Yes (`NEXT_PUBLIC_MAPBOX_TOKEN`) | No |
| Print fidelity | Browser-dependent (canvas rasterisation) | Pixel-perfect |
| Used by | `/compset`, `/report/competitive-set` | `/report/market-overview` |
| Reusable across routes | Partially (via `ReportMap` primitive) | Yes (via `SharedMapCard`) |
| State store | `useCompset` (per-mount; future: provider) | None (data passed as props) |

---

## 4. Future considerations

| Item | Owner | Phase |
|---|---|---|
| `<CompsetProvider>` to share `useCompset` state across routes | Frontend | 7 |
| Mapbox pin clustering (>50 pins) | Frontend | 7 |
| Heatmap numeric legend | Frontend | 7 |
| Mapbox attribution / TOS audit | Frontend | 6 |
| Configure `images.remotePatterns` for Stitch CDN + S3 | Frontend | 9 |
| Replace `<img>` with `next/image` for hotel photos | Frontend | 9 |

---

## See Also

- `docs/architecture.md` — system topology.
- `docs/report-system.md` — how the report shell hosts the maps.
- `docs/print-pdf.md` — print canvas math + behaviour for embedded maps.
- `REPORT_PAGES.md` — per-page composition (Competitive Set + Market Overview map usage).
