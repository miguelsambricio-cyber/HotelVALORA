# Routing

**Framework:** Next.js 14 App Router  
**Location:** `apps/web/src/app/`

---

## Route Map

| Route | File | Layout Shell | Notes |
|---|---|---|---|
| `/` | `app/page.tsx` | None (full-page) | Landing page — public |
| `/compset` | `app/compset/page.tsx` | `LandingHeader` + `LandingFooter` | Step 2 of valuation workflow |
| `/report/executive-summary` | `app/report/executive-summary/page.tsx` | `ReportShell` | Step 3 — standalone report, no dashboard |
| `/report/competitive-set` | `app/report/competitive-set/page.tsx` | `ReportShell` | CompSet comparison table + photo gallery |
| `/report/[reportId]` | `app/report/[reportId]/page.tsx` | — | Dynamic report root |
| `/report/[reportId]/[section]` | `app/report/[reportId]/[section]/page.tsx` | — | Dynamic report section |
| `/report/[reportId]/executive-summary` | `app/report/[reportId]/executive-summary/page.tsx` | — | Report section (parametric) |
| `/(dashboard)` | `app/(dashboard)/page.tsx` | `Sidebar` + `Header` | Dashboard overview |
| `/(dashboard)/assets/hotels` | `app/(dashboard)/assets/hotels/page.tsx` | Dashboard shell | Hotel asset management |
| `/(dashboard)/valuations` | `app/(dashboard)/valuations/page.tsx` | Dashboard shell | DCF results |
| `/(dashboard)/underwriting` | `app/(dashboard)/underwriting/page.tsx` | Dashboard shell | Underwriting workbench |
| `/(dashboard)/transactions` | `app/(dashboard)/transactions/page.tsx` | Dashboard shell | Transaction history |
| `/(dashboard)/market` | `app/(dashboard)/market/page.tsx` | Dashboard shell | Market intelligence |
| `/(dashboard)/review` | `app/(dashboard)/review/page.tsx` | Dashboard shell | Data quality queue |
| `/login` | `app/login/page.tsx` | None (institutional shell) | Auth landing — public |
| `/settings/profile` | `app/settings/profile/page.tsx` | `SettingsLayout` | User Profile |
| `/settings/credentials` | `app/settings/credentials/page.tsx` | `SettingsLayout` | Credentials & Security |
| `/settings/investment` | `app/settings/investment/page.tsx` | `SettingsLayout` | Investment Requirements — Hotel Asset (criteria engine) |
| `/settings/investment/market` | `app/settings/investment/market/page.tsx` | `SettingsLayout` | Investment Requirements — Hotel Market (ADR/OCC growth, RevPAR scenario, target) |
| `/settings/investment/value` | `app/settings/investment/value/page.tsx` | `SettingsLayout` | Investment Requirements — Hotel Value (5 sections: Site Acquisition, Exit, Rent, Finance, P&L Forecast) |
| `/library/favorites-map` | `app/library/favorites-map/page.tsx` | `LibraryShell` | Library — Favoritos map (saved / community / TOP PROMOTE markers, mock institutional grayscale map) |
| `/library/top-map` | `app/library/top-map/page.tsx` | `LibraryShell` | Library — Top Reports map (sibling of favorites-map; route-driven FAVORITOS/TOP segmented nav) |
| `/library/favorites-list` | `app/library/favorites-list/page.tsx` | `LibraryShell` | Library — Favorites institutional list (Bloomberg-grade table: 8 amenities + financials + indicators + locked-cell pattern, sticky thead + sticky first column, h-scroll) |
| `/library/top-list` | `app/library/top-list/page.tsx` | `LibraryShell` | Library — Top Reports institutional list (same table, REF column added, "TOP REPORTS" header copy) |
| `/user/admin` | `app/user/admin/page.tsx` | `AdminLayout` | Executive Control Room — 6-section institutional dashboard (Executive Overview · AI Operations · Integrations · Data Pipeline · Infrastructure · Recent Activity) |
| `/user/admin/agents` | `app/user/admin/agents/page.tsx` | `AdminLayout` | AI Operations Center — orbital layout (CEO centre · 9 operational agents) + agent directory grouped by Tier |
| `/user/admin/agents/[agentId]` | `app/user/admin/agents/[agentId]/page.tsx` | `AdminLayout` | Per-agent dashboard · SSG · `market_intelligence` renders the institutional Intelligence Terminal (volume KPIs · alerts · extracted deals · category breakdown · entity mentions · source coverage · news feed) |
| `/user/admin/integrations` | `app/user/admin/integrations/page.tsx` | `AdminLayout` | Integrations directory — 10 hospitality intelligence sources grouped by category (Authenticated · Public EU/ES · Global · Deferred) with connection / auth / session / health / volume metrics |
| `/user/admin/integrations/[integrationId]` | `app/user/admin/integrations/[integrationId]/page.tsx` | `AdminLayout` | Per-integration detail · SSG with 10 pre-rendered paths · session-status panel (Real T2 vs placeholder badge · cookies/origins · post-login URL · re-auth banner ≤24h · premium-access verification table) · ingestion-health rollup · operator notes · external links |
| `/user/admin/contacts` | `app/user/admin/contacts/page.tsx` | `AdminLayout` | Institutional Relationship Console — 14 KPI totems + 10-column institutional table (Contact · Company · Type · Band · Strength · Collab · Last email · Gmail labels · Email health · Strategic signal) · URL-driven band + investor-type + quality + sort filters · 50/page server pagination · reads from `relationship_contacts` + labels join |

### HTTP redirects (`next.config.mjs`)

These three URLs absorb the natural paths operators type / bookmark. Real HTTP 308/307 with `Location` header — universally followable by browsers, curl, crawlers.

| Source | Destination | HTTP |
|---|---|---|
| `/admin` + `/admin/<path>` | `/user/admin[/<path>]` | 308 Permanent |
| `/settings/admin` + `/settings/admin/<path>` | `/user/admin[/<path>]` | 308 Permanent |
| `/user` | `/user/admin` | 307 Temporary |

Note: page-level `redirect()` from `next/navigation` only works inside Next.js client routing (RSC payload). For cold browser GETs / external links, **always** use `next.config.mjs` `redirects()`.

---

## Layout Shells

### LandingHeader + LandingFooter
Used by: `/` and `/compset`  
Components: `components/landing/landing-header.tsx`, `components/landing/landing-footer.tsx`  
Characteristics: Full-width, no auth requirement, marketing-style.

### ReportShell
Used by: `/report/executive-summary`  
File: `components/report/shell/report-shell.tsx`  
Layers:
1. `ReportTopNav` — fixed top bar, `print:hidden`; "HotelVALORA" logo links to `/`
2. `ReportSidebar` — sticky left sidebar, `print:hidden`
3. `<main>` — has `report-print-canvas` class for A4 print scaling
4. `ReportFooter` — dark footer, `print:hidden`

### Dashboard Shell
Used by: all `/(dashboard)/*` routes  
File: `app/(dashboard)/layout.tsx`  
Characteristics: Fixed sidebar (`Sidebar`) + top header (`Header`) + scrollable main area.

### LibraryShell
Used by: `/library/*`  
File: `components/library/library-shell.tsx` (referenced from `app/library/layout.tsx`)  
Characteristics: `AppHeader` (sticky, BIBLIOTECA active when route starts with `/library`) + `h-screen` body row hosting sidebar + content + `InstitutionalFooter` (slim variant). The `AppHeader` `libraryHref` default now points at `/library/favorites-map`.

---

## User Flow (primary path)

```
/ (Landing)
  → /compset (CompSet map — select competitors)
      → "Confirmar CompSet" button
          → /report/executive-summary (Executive Summary)
```

**Navigation wiring:**
- `LandingHeader` CTA → `/compset`
- `CompetitorPanel` "Confirmar CompSet →" → `/report/executive-summary` (Link)
- `ReportTopNav` "HotelVALORA" logo → `/` (Link)
- Report section nav (sidebar) → other report sections (to be wired)

---

## Report Section Registry

Defined in `src/lib/report/report-nav.ts` (6 sections, 15 items):

| # | Section | Sub-items |
|---|---|---|
| 1 | Executive Summary | — |
| 2 | Asset Analysis | Hotel Overview, CAPEX & Renders, Floor Plans |
| 3 | CompSET | — |
| 4 | Market Overview | Market Dynamics, Transactions, Benchmarks, Pipeline |
| 5 | Financials | P&L, Underwriting & IRR, Sensitivity |
| 6 | Methodology | — |
