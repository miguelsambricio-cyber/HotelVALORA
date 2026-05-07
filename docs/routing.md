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
