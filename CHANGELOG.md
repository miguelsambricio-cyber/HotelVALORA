# Changelog

Recent shipped work, most recent first. The canonical full changelog with implementation detail per task lives at [`docs/changelog.md`](docs/changelog.md).

---

## 2026-05-10 — Hotel Value criteria engine
Replaced the `/settings/investment/value` placeholder with the production Hotel Value criteria engine. 5 sections (Site Acquisition, Exit Investment, Rent Factor, Finance Structure, P&L Forecast), 14 new components, store schema bumped to v3 with chained migration. Architecture prepped for future DCF / IRR / debt sizing engine.

→ Detail: [`docs/changelog.md`](docs/changelog.md)

## 2026-05-10 — Hotel Market criteria engine
New `/settings/investment/market` route. ADR + OCC forecast growth (constant / per-year custom), RevPAR scenario (reuses the canonical 3-button selector from the P&L page), RevPAR target. Routing refactor: `InvestmentTabs` converted from Zustand state to real `usePathname()`-driven routes; `/value` placeholder added so links don't 404. Market scenario KPI tables (`lib/investment/market-scenarios.ts`) ready for CoStar / STR hydration.

## 2026-05-10 — Investment Requirements / Hotel Asset
Initial criteria-engine surface. 3-col layout (sidebar 240 + main 6 sections + right sidebar 320). Sections: MyProperty Parameters, Capacity & Operation, Location Targets, Property Specs, CAPEX Settings (Hard / Soft / Project Costs collapsible table), Renders / AI Image. Right sidebar: MyProperty Facilities, CompSet Facilities, Global Coverage tree. Match engine architecture prepped (`lib/investment/match-engine.ts` returns `"strong"` stub today).

## 2026-05-10 — Settings shell + Profile + Credentials
Authenticated `/settings/*` shell with sticky sidebar (white-pill / yellow-rail active state). User Profile page (form + completion card). Credentials & Security page (change password, 4 linked accounts, 2FA dark forest card, active sessions).

## 2026-05-10 — Login + auth
`/login` institutional page with hero + AuthCard + Linked Institutional Accounts (LinkedIn / Google / Apple / Microsoft). Zustand auth store with `persist` middleware. NextAuth-shaped provider registry (no real OAuth runtime yet).

## 2026-05-10 — Unified institutional header
`AppHeader` shared across every page (sticky, replaces 3 legacy headers via re-export). USUARIO button always links to `/settings/profile`.

## 2026-05-09 — 5-Year P&L Forecast
`/report/financials/pl` shipped. Editable USALI assumptions, scenario presets (Down / Base / Up) with full per-year occupancy + ADR profiles, hybrid 70/30 departmental cost model for visible operating leverage Y3≠Y4≠Y5. Year 1 monthly expansion (12-column inline expand) via deterministic seasonality engine. Compact k/M currency formatting.

## Earlier
- `/report/market-overview/dynamics` with 8 per-chart filtered line charts
- Repo cleanup + 6 themed commits + Vercel production deploy
- Map system (Mapbox CompSet + stylised pin map)
- Report shell + 5 implemented sections + canonical primitives library
