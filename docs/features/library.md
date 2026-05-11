# Feature · Library

The Library is the central institutional surface — every saved + community + Top-promoted hotel asset is reachable here.

## Four routes, one shell

| Route | View | Purpose |
|---|---|---|
| `/library/favorites-map` | Map | User's saved hotels + community + Top Promote markers |
| `/library/favorites-list` | Table | Same 6 hotels, Bloomberg-grade 39-column technical view |
| `/library/top-map` | Map | Marketplace surface — Top Promote first |
| `/library/top-list` | Table | Same 6 hotels, 40-column (adds REF column) |

All four share:
- `LibraryShell` (AppHeader sticky + `h-screen` body row + slim institutional footer)
- `LibrarySidebar` (props: `title` / `subtitle` / `searchPlaceholder`)
- The same live dataset from Supabase via `useLibraryReports()` — TanStack Query dedupes across map ↔ list navigation
- The same in-memory Zustand store (legend, layers, search, selectedReportId)

## Navigation

- **FAVORITOS ⇄ TOP** — segmented buttons inside the sidebar Quick Filter section. Route-driven (`activePaths`):
  - FAVORITOS active for `/favorites-map` AND `/favorites-list`
  - TOP active for `/top-map` AND `/top-list`
- **Map ⇄ List** — per-branch:
  - Map → List: `LayoutList` icon between zoom-out and layers in `InstitutionalMapControls`
  - List → Map: `Map` icon top-right of the list page header

The `HotelMap` component accepts `listViewHref` — `/library/favorites-map` passes `/library/favorites-list`, `/library/top-map` passes `/library/top-list`.

## Sidebar contents

Same composition on every route:
1. Title + subtitle (page-specific)
2. Legend card: 3 categories (Saved / Comunidad / Top Promote) + 3 layers (Heatmap / Líneas de Metro / Centro Histórico)
3. Quick Filter: search input + FAVORITOS / TOP segmented nav
4. Bottom CTA: "+ Create New Valuation" (mock action — sonner toast)

## Map view

`HotelMap`:
- Static institutional grayscale aerial of Madrid (Stitch CDN)
- 6 markers placed via `mockPosition` (percentage on the image — drops when Mapbox lands)
- Categorical colors: forest-900 (saved), blue-700 (community), lime-300 (top-promote)
- Hover shows the hotel name in a coloured tip; selected scales 125% with thicker ring
- TOP PROMOTE markers pulse (`animate-pulse`)
- Optional overlays: heatmap radial gradients · stylised Madrid Metro SVG · Centro Histórico dashed ring
- `InstitutionalMapControls`: zoom +/- · list-view link · layers toggle
- `FloatingHotelCard`: bottom-right preview of the selected report

## List view

`FavoritesTable`:
- 39 columns base, +1 (REF) when `showReferenceColumn` is on
- Sticky `<thead>` survives both axes
- Sticky `<td>` on Hotel Name (column 1) with right-edge shadow
- `min-w-[4500px]` → horizontal scroll inside the card; outer page never scrolls
- Accent column tints: blue for CAPEX / IRR Equity, emerald for Cap Rate / Market Value TTM
- Locked-cell pattern: `<LockedCell />` for any `null` financial value (tier-gated)
- Memoized `<FavoritesRow>` (`React.memo`) so future virtualization drops in cleanly
- Pagination footer: "SHOWING N OF M HOTELS"

## Contact card popover

When `report.indicators.topPromote === true` AND `report.contactInfo !== null`:
- The Mail icon in the Contact column goes forest-700
- Hovering it shows the institutional contact card via React Portal to `document.body`
- The card escapes the table's `overflow:auto` clip rect; pinned with `position: fixed`
- Header (forest-900): "Account Manager" eyebrow + name + ID — role
- Body: Subject (computed from report data) + 2-col Objective + Role + mail + phone + "Schedule a Tour" CTA

See `apps/web/src/components/library/contact-cell.tsx`.

## Data flow (production)

```
Supabase
  public.valuations             ← public-read RLS (visibility ∈ 'public','top-promote')
    JSONB: financials · amenities · indicators · contact_info
  public.top_promote_reports    ← left-joined inline
  public.favorite_reports       ← read separately, RLS scoped to auth.uid()
        │
        ▼  createBrowserSupabaseClient (anon key)
apps/web/src/lib/library/queries/
  useLibraryReports()            ← TanStack Query, 5-min staleTime
  useFavoriteValuationIds()      ← per-user favourites
  useToggleFavorite()            ← optimistic mutation + invalidate
apps/web/src/lib/library/adapters/valuation-to-report.ts
        │
        ▼  LibraryReport[]
components/library/{HotelMap,FavoritesTable,...}
```

Both map and list call `useLibraryReports()` directly — TanStack Query dedupes, so navigating /favorites-map → /favorites-list reuses the cache.

### Query keys

```ts
libraryKeys.all                   // ["library"]
libraryKeys.reports()             // ["library","reports"]
libraryKeys.reportsList(filter)   // ["library","reports","list", filter]
libraryKeys.favoriteIds(userId)   // ["library","favorites", userId|"anon"]
```

Future realtime subscribers fire `queryClient.invalidateQueries({ queryKey: libraryKeys.all })` on any `postgres_changes` event in `valuations` / `top_promote_reports` / `favorite_reports`.

### State handling

| State | Map | List |
|---|---|---|
| Loading | Pill "Loading library…" (background stays) | Single row with spinner |
| Error | Rose pill + Retry button | Rose row + Retry button |
| Empty | "No public reports in the library yet." | Same message in tbody |
| Filtered-empty | "No reports match the current filters." | Same message in tbody |

### Anonymous fallback

Unauthenticated visitors (the demo state today) see the same six valuations but with every row rendered as starred (`treatAllAsFavorited` in the adapter). Once Supabase Auth wires, the favourites surface becomes truthful per user.

### Optimistic favourite toggle

`useToggleFavorite()` updates `libraryKeys.favoriteIds(userId)` immediately, rolls back on error, and runs an authoritative re-read `onSettled`. Caller surfaces "sign in to save" toast when anonymous; the mutation itself rejects so RLS stays honest.

## Files

| Concern | File |
|---|---|
| Shell + sidebar + tabs | `components/library/{library-shell,library-sidebar,library-filter-tabs,map-legend-card,map-layer-toggle}.tsx` |
| Map | `components/library/{hotel-map,hotel-map-marker,institutional-map-controls,floating-hotel-card}.tsx` |
| List | `components/library/{favorites-list-content,top-reports-list-content,favorites-table}.tsx` |
| Table sub-cells | `components/library/{amenity-icon-cell,report-type-chip,locked-cell,contact-cell}.tsx` |
| Query hooks | `lib/library/queries/{keys,use-library-reports,use-favorite-valuation-ids,use-toggle-favorite,index}.ts` |
| Adapter | `lib/library/adapters/valuation-to-report.ts` |
| UI store (legend / layers / search / selection) | `lib/library/store.ts` |
| Seed (live in DB) | `docs/database/migrations/0005_seed_library_demo_data.sql` |
| Types | `types/library.ts` |
| Pages | `app/library/{favorites-map,favorites-list,top-map,top-list}/page.tsx` + `app/library/{layout,page}.tsx` |

## Cross-references

| Topic | Doc |
|---|---|
| Library data shape | `docs/data-models/report-models.md` + `docs/data-models/library-models.md` |
| Visibility rules | `docs/business-rules/report-visibility.md` |
| Promoted reports | `docs/business-rules/promoted-reports.md` |
| Map engine | `docs/architecture/map-engine.md` |
| Design density | `docs/design-system/ui-principles.md` |
