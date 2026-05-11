# Roadmap

Status snapshot. The canonical, detailed roadmap with technical-debt items lives at [`docs/roadmap.md`](docs/roadmap.md).

---

## Completed (2026-05-09 / 2026-05-10 sprint)

- ✅ **Authentication UI** — institutional `/login` with hero + AuthCard + Linked Institutional Accounts (LinkedIn / Google / Apple / Microsoft via NextAuth-shaped provider registry); Zustand auth store with `persist`
- ✅ **Unified institutional header** (`AppHeader`) sticky across every page; auto-marks USUARIO link to `/settings/profile`
- ✅ **Financials P&L** (`/report/financials/pl`) — 5-Year Forecast, editable USALI assumptions, hybrid 70/30 departmental cost model for operating leverage, scenario presets (Down / Base / Up), Year 1 monthly expansion via seasonality engine, compact k/M currency formatting
- ✅ **RevPAR Scenario** primitive (3-button segmented with Conservador/Mercado/Optimista decorative labels) — now reused on Investment Market tab
- ✅ **Settings shell** — `SettingsLayout` + sticky `SettingsSidebar` with white-pill yellow-rail active state + `SettingsHeader`
- ✅ **`/settings/profile`** — User Profile (ProfileForm, ProfileCompletionCard)
- ✅ **`/settings/credentials`** — ChangePassword, LinkedAccount grid (4 providers), TwoFactor (dark forest), ActiveSessions
- ✅ **Investment Requirements engine** (`/settings/investment`) — 3 real routes (Asset / Market / Value); criteria persistence (Zustand v3 with chained migration); future match engine architecture (🟢🟡🔴 primitive shipped, scoring stubbed)
- ✅ **Institutional design system** — forest-900 / yellow-300 palette, rounded-2xl cards, soft shadows, Manrope headlines, Inter body; reusable `InstitutionalToggle`, `SectionHeader`, `UnderwritingSlider`, `LabeledSlider`, `BasicPremiumPicker`

---

## Next priorities (in order)

### 1. Library / Saved Reports — **next implementation target**
User dashboard for managing generated reports.
- View all saved reports (cards + table view)
- Folder organization
- Search by asset / market / submarket
- Filter by status / date / tier
- Open · Duplicate · Export PDF · Share
- Tag system + favorites

### 2. PDF generation
A4 portrait + landscape templates per report type. Reuses existing `print:break-inside-avoid` + `print:hidden` patterns.

### 3. CoStar / STR / CBRE ingestion
- Excel COSTAR import → hydrate `criteria` + market scenarios + financial assumptions
- STR feed → market RevPAR / OCC / ADR baselines
- CBRE / MSCI transaction comps

### 4. Underwriting engine (real)
- DCF + NOI + cap rate
- Levered + unlevered IRR
- Debt sizing (uses `criteria.value.financeStructure`)
- Equity waterfall
- Monte Carlo sensitivity

### 5. Match engine (real)
Replace `evaluateHotel()` stub with per-category scoring: location proximity, size band, facility intersection, IRR floor, CAPEX bracket, strategy fit. Surface 🟢/🟡/🔴 indicator next to every candidate hotel on Executive Summary, CompSet, Deal Screening.

### 6. AI-generated reports
Investment Committee narratives, market commentary, sensitivity callouts.

### 7. Team / collaboration
Multi-user organizations, shared portfolios, deal pipeline (CRM-lite), notifications.

---

## Future / parking lot

- Real OAuth (NextAuth runtime — providers already registered)
- Tier gating extended beyond Investment Requirements (FREE/PRO/PREMIUM enforcement on every page)
- Dark mode
- Mobile-responsive (parts already done; full pass needed)
- i18n (Spanish / English UI strings)
- Workflow automation (auto-flag deal opportunities matching criteria)

---

## Detailed backlog

Backend / data pipeline / financial engine / observability / infrastructure items live in [`docs/roadmap.md`](docs/roadmap.md).
