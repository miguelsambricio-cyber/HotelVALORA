# Frontend

**Location:** `apps/web/`  
**Stack:** Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS  
**State:** TanStack Query v5 (server), Zustand (local), TanStack Table  
**Forms:** React Hook Form + Zod  
**UI:** Radix UI primitives, Lucide icons, sonner (toasts)

---

## App Structure

```
src/
├── app/
│   ├── layout.tsx                Root layout — fonts (Inter + Manrope), <Providers>, <Toaster>
│   ├── page.tsx                  Landing page (public)
│   ├── compset/
│   │   └── page.tsx              CompSet selection — step 2 of valuation workflow
│   ├── report/
│   │   ├── executive-summary/
│   │   │   └── page.tsx          Standalone Executive Summary — step 3 of workflow
│   │   └── [reportId]/           Dynamic report routes (parametric)
│   └── (dashboard)/
│       ├── layout.tsx            Authenticated shell — Sidebar + Header + main scroll area
│       ├── page.tsx              Dashboard overview
│       ├── assets/hotels/        Hotel asset management
│       ├── valuations/           DCF & valuation results
│       ├── underwriting/         Underwriting workbench
│       ├── transactions/         Transaction history
│       ├── market/               Market intelligence
│       └── review/               Data quality queue (3 tabs)
├── components/
│   ├── landing/                  LandingHeader, LandingFooter, HeroSection, PricingSection
│   ├── compset/                  CompsetMap, CompetitorPanel, CompetitorCard, MapControls, MapLegend
│   ├── library/                  LibraryShell, LibrarySidebar, MapLegendCard, MapLayerToggle,
│   │                              LibraryFilterTabs, HotelMap (mock grayscale), HotelMapMarker,
│   │                              InstitutionalMapControls, FloatingHotelCard
│   ├── maps/                     CompsetMapGL (Mapbox GL, dynamic import)
│   ├── report/
│   │   ├── shell/                ReportShell, ReportTopNav, ReportSidebar, ReportFooter, ReportPaper
│   │   ├── executive-summary/    AssetSection, MarketSection, ValuationSection, SparklineGroup,
│   │   │                         HotelPhotoCarousel, ActionBar, SubSectionHeading
│   │   ├── charts/               SparklineBar, SparklineLine
│   │   └── ui/                   LockedGate, LockedUpgradeCard, MethodologicalNote, ReportMap
│   ├── layout/
│   │   ├── sidebar.tsx           Navigation sidebar (dashboard)
│   │   ├── header.tsx            Top bar with user menu (dashboard)
│   │   ├── app-header.tsx        Global institutional header — BIBLIOTECA active when /library/*
│   │   └── institutional-footer.tsx  Shared dark footer — used by /settings and /library
│   ├── dashboard/                KPI cards, portfolio map, RevPAR chart, recent transactions
│   ├── review/
│   │   ├── summary-cards.tsx     4 KPI cards
│   │   ├── conflict-queue.tsx    Alias conflicts tab
│   │   ├── low-confidence-queue.tsx
│   │   └── merge-queue.tsx       ScoreBar, DetailDialog, etc.
│   ├── providers.tsx             QueryClient, theme
│   └── ui/                       Radix-based primitives (Button, Card, Badge, Dialog, …)
├── lib/
│   ├── api/
│   │   ├── client.ts             Axios instance — auth interceptors, 401 redirect
│   │   ├── review.ts             useReviewSummary, useConflicts, useLowConfidence hooks
│   │   └── dedup.ts              useDedupSummary, useMergeRecommendations, useRunScan, etc.
│   ├── hooks/
│   │   └── use-compset.ts        CompSet state — competitors, suggested, layers, panel
│   ├── library/
│   │   ├── store.ts              Zustand UI state — legend, layers, filterTab, search, selectedReportId
│   │   └── mock-reports.ts       6 institutional mock reports + helpers
│   ├── report/
│   │   ├── executive-summary-data.ts  Types, mock data, formatters
│   │   ├── report-nav.ts         6-section navigation registry (15 items)
│   │   └── pdf-export.ts         window.print() wrapper — swap for react-pdf/Puppeteer
│   └── utils.ts                  cn() and general utilities
├── hooks/
│   └── maps/
│       └── use-map-viewport.ts   Mapbox viewport state + zoomIn/zoomOut
└── types/
    ├── hotel.ts
    ├── valuation.ts
    ├── compset.ts                CompetitorHotel, CompsetLayer
    ├── review.ts                 ReviewSummary, AliasConflict, etc.
    ├── dedup.ts                  MergeRecommendationListItem, etc.
    └── library.ts                LibraryReport, ReportCategory, LibraryLegendState, LibraryLayerState
```

---

## API Client

`src/lib/api/client.ts` — Axios, base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:8000/api/v1`).

- Request interceptor: attaches `Authorization: Bearer <token>` from `localStorage.access_token`
- Response interceptor: on 401 clears both tokens and redirects to `/login`
- SSR-safe: all `window` access is guarded

---

## Data Fetching Pattern

Every domain gets its own hook file. Rules:
- Query keys: `["domain", "sub", ...params]` — partial invalidation cascades via `qc.invalidateQueries({ queryKey: ["domain"] })`
- Pagination: `page` (0-indexed) + `limit` in local `useState`; `offset = page * limit` passed to API
- Mutations call `qc.invalidateQueries` in `onSuccess`; never update the cache manually

---

## Review / Dedup Domain

`/review` page has three tabs driven by counts from `GET /review/summary`:

| Tab | Count field | Component |
|---|---|---|
| Alias Conflicts | `open_conflicts` | `conflict-queue.tsx` |
| Low Confidence | `low_confidence_aliases` | `low-confidence-queue.tsx` |
| Merge Recommendations | `pending_merge_recommendations` | `merge-queue.tsx` |

`merge-queue.tsx` internals:
- `ScoreBar` — colour-coded progress bar (emerald ≥85%, amber ≥65%, rose)
- `BreakdownTable` — 5-row table: name_exact, name_fuzzy, city, operator, address
- `AssetCard` — side-by-side asset snapshot display
- `DetailDialog` — rationale + cards + breakdown + FP signals + notes textarea + Accept/Dismiss

---

## Auth Flow

1. `POST /auth/login` → stores `access_token` + `refresh_token` in `localStorage`
2. Axios interceptor attaches token to every request
3. 401 response → tokens cleared → redirect `/login`
4. Token refresh not yet wired — handled manually if needed

---

## Dev

```bash
cd apps/web && pnpm dev      # http://localhost:3000
pnpm typecheck               # tsc --noEmit
pnpm lint                    # eslint
```
