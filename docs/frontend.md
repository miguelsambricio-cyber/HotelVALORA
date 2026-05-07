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
│   ├── page.tsx                  Landing page
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
│   ├── layout/
│   │   ├── sidebar.tsx           Navigation sidebar
│   │   └── header.tsx            Top bar with user menu
│   ├── dashboard/                KPI cards, portfolio map, RevPAR chart, recent transactions
│   ├── hotels/                   Hotel data table
│   ├── valuations/               Valuation results table
│   ├── transactions/             Transaction table
│   ├── market/                   Market analysis dashboard
│   ├── underwriting/             Underwriting workbench UI
│   ├── review/
│   │   ├── summary-cards.tsx     4 KPI cards (conflicts, low-conf, pending merges, threshold)
│   │   ├── conflict-queue.tsx    Alias conflicts tab
│   │   ├── low-confidence-queue.tsx  Low-confidence aliases tab
│   │   └── merge-queue.tsx       Merge recommendations tab (ScoreBar, DetailDialog, etc.)
│   ├── providers.tsx             QueryClient, theme
│   └── ui/                       Radix-based primitives (Button, Card, Badge, Dialog, …)
├── lib/
│   ├── api/
│   │   ├── client.ts             Axios instance — auth interceptors, 401 redirect
│   │   ├── review.ts             useReviewSummary, useConflicts, useLowConfidence hooks
│   │   └── dedup.ts              useDedupSummary, useMergeRecommendations, useRunScan, etc.
│   └── utils.ts                  cn() and general utilities
└── types/
    ├── hotel.ts
    ├── valuation.ts
    ├── review.ts                 ReviewSummary, AliasConflict, LowConfidenceAlias, PagedResponse, SingleResponse
    └── dedup.ts                  MergeRecommendationListItem, MergeRecommendationDetail, DedupSummary, etc.
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
