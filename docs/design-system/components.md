# Design System · Components

Index of every canonical component grouped by import surface. Cross-reference: `docs/component-library.md` has the prop-level catalog; `UI_COMPONENTS.md` (root) is the full per-family map.

## Layout (cross-cutting)

| Component | File | Notes |
|---|---|---|
| `AppHeader` | `components/layout/app-header.tsx` | Sticky global header. Route-aware BIBLIOTECA active when `pathname.startsWith("/library")`. Inverts USUARIO button styling on library routes. |
| `InstitutionalFooter` | `components/layout/institutional-footer.tsx` | `variant: "default" \| "slim"`. Shared by `/settings/*` and `/library/*`. |
| `Sidebar` | `components/layout/sidebar.tsx` | Old dashboard sidebar — pre-Library era. |

## Library family

| Component | File | Notes |
|---|---|---|
| `LibraryShell` | `components/library/library-shell.tsx` | `h-screen` kiosk shell. Body row capped at `max-w-[1600px]`. |
| `LibrarySidebar` | `components/library/library-sidebar.tsx` | Props: `title` / `subtitle` / `searchPlaceholder`. Reused by all 4 library routes. |
| `MapLegendCard` | `components/library/map-legend-card.tsx` | Legend (3 categories) + layers (Heatmap / Metro / Centro Histórico). |
| `MapLayerToggle` | `components/library/map-layer-toggle.tsx` | 28×16 rail switch, slate-300 → blue-700 on. |
| `LibraryFilterTabs` | `components/library/library-filter-tabs.tsx` | Route-driven FAVORITOS ⇄ TOP (`activePaths[]`). |
| `HotelMap` | `components/library/hotel-map.tsx` | Mock institutional map. Takes `listViewHref`. |
| `HotelMapMarker` | `components/library/hotel-map-marker.tsx` | Generic — `dotClassName` / `tipClassName` / pulse. |
| `InstitutionalMapControls` | `components/library/institutional-map-controls.tsx` | Zoom +/-, optional list-view Link, layers. |
| `FloatingHotelCard` | `components/library/floating-hotel-card.tsx` | Bottom-right preview. Reads selected report. |
| `FavoritesListContent` | `components/library/favorites-list-content.tsx` | Header bar (badge / title / actions) + table. |
| `TopReportsListContent` | `components/library/top-reports-list-content.tsx` | Same as above with Top Reports copy and REF column on. |
| `FavoritesTable` | `components/library/favorites-table.tsx` | 39/40-column institutional table. Prop `showReferenceColumn`. |
| `AmenityIconCell` | `components/library/amenity-icon-cell.tsx` | One of 8 amenities. forest-700 active / slate-300 inactive. |
| `ReportTypeChip` | `components/library/report-type-chip.tsx` | Premium / PRO / Public / Private + flame / edit / private indicators. |
| `LockedCell` | `components/library/locked-cell.tsx` | Tier-gated cell pill (blue lock). |
| `ContactCell` | `components/library/contact-cell.tsx` | Mail icon + portal popover (top-promoted only). |

## Report family

| Component | File | Notes |
|---|---|---|
| `ReportShell` | `components/report/shell/report-shell.tsx` | `portrait` / `landscape` orientation. |
| `ReportPaper` | `components/report/shell/report-paper.tsx` | Institutional paper card. |
| `ReportSidebar` | `components/report/shell/report-sidebar.tsx` | Driven by `lib/report/sections.ts`. |
| `ReportTopNav`, `ReportFooter` | sibling files | Chrome. |
| `ReportSection`, `ReportHeader`, `MetricRow`, `MetricTable`, `StatCard`, `StatGrid`, `UpgradeGate`, `UpgradeCard`, `ImageGallery`, `ReportMap`, `PrintPage`, `PdfExportButton` | `components/report/primitives/*` | Canonical primitives. Prefer composing these over rebuilding. |

## Settings family

| Component | File |
|---|---|
| `SettingsLayout` | `components/settings/settings-layout.tsx` |
| `SettingsSidebar`, `SettingsHeader`, `ProfileForm`, `ProfileCompletionCard` | siblings |
| `InstitutionalToggle` | `components/settings/investment/institutional-toggle.tsx` — canonical ON/OFF switch |
| Investment cards: `MasterToggle`, `DisplayModeToggle`, `LabeledSlider`, `UnderwritingSlider`, `BasicPremiumPicker`, `CapRatePicker`, `SavedScenarioList`, `AcquisitionCostTable`, `FfeReserveYears` | `components/settings/investment/*` and `value/*` |

## UI primitives (Radix-based)

`components/ui/*.tsx` — `Button`, `Card`, `Badge`, `Dialog`, `Switch`, `Tabs`, `Tooltip`, `SearchBar`, `PricingCard`. Prefer these over rolling new primitives.

## Selection guide

When building a new surface:
1. **Reach for a `LibraryShell` / `SettingsLayout` / `ReportShell`** — never roll a shell yourself.
2. **Reach for `components/library/*` primitives** for any institutional table-like surface — they already enforce density.
3. **Reach for the report primitives barrel** for any data-rendering page that may ever print.
4. **Only add to `components/ui/`** if no existing Radix-based primitive fits.
