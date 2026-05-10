# Data Models · Library

The Library surface is fed by **one mock file** + **one in-memory UI store**.

## Mock dataset

`apps/web/src/lib/library/mock-reports.ts` exports:

```ts
export const MOCK_LIBRARY_REPORTS: LibraryReport[]   // 6 hotels, full rich shape
export function getMockReportById(id): LibraryReport | undefined
export function getDefaultSelectedReport(): LibraryReport   // returns Ritz-Carlton
```

Internal helpers (`A(…)`, `block(…)`, `finPremium(…)`, `finPro(…)`, `finPublic(…)`, `loc(…)`, `listing(…)`) keep the file readable — they're not exported.

## UI state store (Zustand, in-memory)

`apps/web/src/lib/library/store.ts`:

```ts
useLibraryStore({
  legend: { saved, community, topPromote },           // 3 booleans, all default true
  layers: { heatmap, metroLines, historicCenter },    // 3 booleans, all default false
  searchQuery: string,
  selectedReportId: string | null,

  toggleLegend(key): void,
  toggleLayer(key): void,
  setSearchQuery(q): void,
  setSelectedReportId(id): void,
})
```

The `filterTab` slice was removed on 2026-05-10 — the FAVORITOS / TOP segmented control is now route-driven via `usePathname()` in `LibraryFilterTabs`.

## How filters compose

The map (`HotelMap`) and the table (`FavoritesTable`) both apply the same two filters in `useMemo`:

```ts
const visible = MOCK_LIBRARY_REPORTS.filter(r => {
  if (!legend[CATEGORY_LEGEND_KEY[r.category]]) return false;
  if (q && !r.hotelName.toLowerCase().includes(q) && !r.city.…) return false;
  return true;
});
```

`CATEGORY_LEGEND_KEY` maps `ReportCategory` → store key:
- `saved` → `saved`
- `community` → `community`
- `top-promote` → `topPromote`

## Locked-cell logic

The list view renders `<LockedCell />` (small blue lock icon) when any of these conditions hold:

- `financials.capex === null` → CAPEX cell
- `financials.totalInvest === null` → Total Invest 3 cells
- `financials.exitYear === null` → Exit Year cell
- `financials.exitPrice === null` → Exit Price 3 cells
- `financials.yield === null` → Yield cell
- `financials.irrProject === null` → IRR Project cell
- `financials.irrEquity === null` → IRR Equity cell

`marketValueTtm` and `capRate` are **never** nullable — they remain the institutional baseline.

## Contact-cell logic

`<ContactCell report={report} />` renders:
- `<Mail size={16} className="text-slate-300" />` if `report.contactInfo === null`
- Active `<Mail className="text-forest-700" />` + hover popover (portal) otherwise

The popover is gated by the data, not the UI tier. Today, only the 2 top-promoted hotels carry `contactInfo`. Future: when `topPromote && publicAccess`, auto-populate contactInfo from the listing owner.

## Cross-references

| Topic | Doc |
|---|---|
| Report shape | `docs/data-models/report-models.md` |
| Library feature | `docs/features/library.md` |
| Map mechanics | `docs/architecture/map-engine.md` |
