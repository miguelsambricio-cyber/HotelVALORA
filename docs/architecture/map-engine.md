# Architecture · Map Engine

Two map surfaces coexist in HOTELVALORA today, each with its own provider story:

## 1 · CompSet map (real)

- **Where:** `/compset` and the report-embedded CompSet view
- **Provider:** Mapbox GL via `react-map-gl` v8
- **File:** `apps/web/src/components/maps/compset-map-gl.tsx` (dynamic-imported — heavy bundle)
- **Style:** Custom Mapbox style, institutional pin SVGs with subtle ring
- **Data:** Real competitor data (today: mock list, but the wiring is provider-real)
- Env: `NEXT_PUBLIC_MAPBOX_TOKEN` is set in production (`hotelvalora.com`).

## 2 · Library institutional map (mock today)

- **Where:** `/library/favorites-map`, `/library/top-map`, and the Market Overview stylised pin map
- **Provider:** None — a static grayscale aerial photograph from Stitch's CDN with **percentage-positioned markers**
- **File:** `apps/web/src/components/library/hotel-map.tsx`
- **Style:** `grayscale opacity-40 brightness-110` over the image, optional overlays for heatmap / Madrid Metro / Centro Histórico, stylised "Madrid" text watermark
- **Markers:** Category-coloured dots with rings + tooltip; TOP PROMOTE pulses (`animate-pulse`). Selected marker scales 125%. Generic styling via `dotClassName` / `tipClassName` on `HotelMapMarker`.
- **Controls:** `InstitutionalMapControls` floating top-right — zoom +/-, optional list-view link (`listViewHref` prop drives map ↔ list nav per branch), layers toggle.
- **Data:** Real `lat/lng` AND a transient `mockPosition: { topPct, leftPct }` on every record — when the provider swap lands, drop `mockPosition` and the map renders from coordinates.

### Why two providers?

The CompSet map is a precise selection tool — needs real geocoding, real pan/zoom, real distance. The Library map is a *visualization surface* — institutional aesthetic, stylised, and the marker positions today are decorative. The two will likely converge on Mapbox after the Library backend wires up.

## Provider abstraction (forward-compat)

`apps/web/src/types/library.ts` already exposes the future-provider shape:

```ts
export interface MapBounds { north; south; east; west }
export interface MapProviderHandles {
  flyTo?: (reportId: string) => void;
  fitToVisible?: () => void;
}
```

When Mapbox/MapLibre lands, `HotelMap` becomes a wrapper around `<Map>` from react-map-gl and exposes a ref of type `MapProviderHandles` to the consumer.

## Stylised overlays in the Library map

Three optional overlays are wired today (toggle in the sidebar legend card):

| Layer | Rendering | Status |
|---|---|---|
| Heatmap | Two radial gradients (red + amber blobs) | Decorative placeholder |
| Líneas de Metro | SVG with 4 colored lines (L1 cyan, L2 red, L6 grey ring, L10 dark blue) + 6 station nodes | Decorative — institutional reference colors |
| Centro Histórico | Dashed forest-900 ring | Decorative placeholder |

All three are `pointer-events-none` so they never block markers.

## Floating preview card

`FloatingHotelCard` sits bottom-right of the map, reads `selectedReportId` from the library store, and falls back to "Ritz-Carlton Madrid" (default selection). It renders the hotel headline, TOP PROMOTE / tier badges, EST. VALUE + CAP. RATE tiles, and a "View Full Valuation" CTA.

## Cross-references

| Topic | Doc |
|---|---|
| Mapbox-specific quirks (CSS globals, popup styling) | `docs/maps.md` |
| Library feature dossier | `docs/features/library.md` |
| Report section embed (Market Overview) | `docs/report-system.md` |
