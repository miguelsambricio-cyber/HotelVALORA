# Architecture — Summary

High-level. Full architectural reference (services, ports, request flow, ETL) lives at [`docs/architecture.md`](docs/architecture.md). Frontend specifics at [`docs/frontend.md`](docs/frontend.md), report system at [`docs/report-system.md`](docs/report-system.md).

---

## Layout

```
HotelVALORA/
├── apps/
│   ├── api/                 FastAPI backend (Python 3.12)
│   └── web/                 Next.js 14 frontend (deployed: Vercel)
├── services/
│   ├── financial_engine/    DCF & NOI & IRR (Python)
│   └── data_pipeline/       Excel / CoStar / STR ETL
├── infrastructure/
│   ├── docker/              Dev + prod Compose
│   ├── nginx/               Reverse proxy
│   └── scripts/             Migration & setup
├── docs/                    Canonical domain docs
└── README.md, AI_CONTEXT.md, RULES.md, ENTRYPOINTS.md
```

---

## Runtime topology

```
Browser
  └── Next.js (Vercel)               institutional shell · routing · client state
        └── FastAPI /api/v1          auth · criteria · valuations · market data
              ├── PostgreSQL 16      primary store
              ├── Redis 7            cache + Celery broker
              └── Celery workers
                    ├── financial_engine    DCF / NOI / IRR / debt sizing
                    └── data_pipeline       Excel / CoStar / STR import → S3
```

Dev ports: `3000` (Next), `8000` (FastAPI), `5432` (Postgres), `6379` (Redis), `9000/9001` (MinIO).

---

## Frontend layers

```
app/                          Next 14 App Router
├── layout.tsx                root html + AppHeader
├── (public)                  /, /compset
├── /login                    institutional auth surface
├── /report/*                 ReportShell (5 sections shipped)
├── /settings/*               SettingsLayout
│   ├── /profile
│   ├── /credentials
│   └── /investment           InvestmentTabs (route-driven)
│       ├── /                 = Hotel Asset (default)
│       ├── /market
│       └── /value
└── /(dashboard)/*            Dashboard shell

components/
├── layout/                   AppHeader, ScenarioToggle
├── auth/                     AuthCard, LinkedAccountsCard, ProviderMarks
├── settings/                 SettingsLayout, SettingsSidebar, SettingsHeader
│   └── investment/           Investment criteria components
│       ├── /                 InvestmentTabs, SectionHeader, InstitutionalToggle, sections + sidebar cards (Asset)
│       ├── /market/          ADR/OCC growth + RevPAR + Coverage variants
│       └── /value/           5 sections + 7 primitives + 2 sidebar cards
└── report/                   ReportShell, primitives, financials, sections

lib/
├── auth/                     Zustand store + tier resolver + NextAuth provider registry
├── investment/               Criteria types + capex + facilities + coverage + scenarios + match engine + Zustand store (persist v3)
├── report/                   Sections registry + financials engine + seasonality
└── api/                      Axios client + per-domain hooks
```

---

## State management

| Concern | Mechanism | Persistence |
|---|---|---|
| Auth (user / tier) | Zustand `useAuthStore` | `localStorage` via `persist` |
| Investment criteria | Zustand `useInvestmentStore` | `localStorage` (`hv-investment-v1`, schema v3, chained `migrate()`) |
| Profile form | Zustand local | session-only |
| Report inputs (PL) | Zustand + URL params | URL-encoded for shareable scenarios |
| Map state (CompSet) | Local component | session |

---

## Key domain modules

### `lib/investment/` — criteria engine
- `types.ts` — `InvestmentCriteria` (Asset + Market + Value sub-slices)
- `capex.ts` — Hard / Soft / Project Costs taxonomy (Excel-mappable line ids)
- `value-acquisition.ts` — 5-line acquisition cost taxonomy (Excel-mappable)
- `facilities.ts` — 8 canonical facility ids
- `coverage.ts` — country / market / submarket tree
- `market-scenarios.ts` — DOWN/BASE/UP KPI tables (internal — not rendered in UI)
- `match-engine.ts` — `evaluateHotel(hotel, criteria)` stub returns `"strong"`; `tierFromScore()` thresholds (≥0.75 strong / ≥0.50 partial / <0.50 weak)
- `store.ts` — Zustand persist with `migrate()` (v1→market hydrate, v2→value hydrate)

### `lib/report/financials/` — P&L + scenarios
- `assumptions.ts` — `PLAssumptions`, scenario presets, parsing helpers
- `seasonality.ts` — `SeasonalityProfile` + `expandYear1ToMonthly` (annual=Σmonthly guarantee)
- `compute.ts` — pure DCF projection given assumptions

### `lib/auth/` — tier + OAuth registry
- `store.ts` — Zustand persist
- `tier.ts` — `useTier` (auth → URL override → default)
- `providers.ts` — NextAuth-shaped registry (no runtime yet)
- `types.ts` — `OAuthProvider`, tier discriminator (`free | pro | premium | institutional`)

---

## Future data ingestion layer (planned)

```
CoStar (Excel / API)  ─┐
STR (CSV)              ├─→ data_pipeline → normalization → criteria + market scenarios + comps
CBRE / MSCI            ─┘                                 ↓
                                                          PostgreSQL
                                                          ↑
                                            financial_engine ← reads criteria + market data
                                            ↓
                                            DCF / IRR / debt sizing → /api/v1/valuations
                                                                       ↑
                                                                       reports + IC packets
```

Hook points already in place:
- `lib/investment/market-scenarios.ts` — keyed by future country / market / submarket / class
- `lib/report/financials/seasonality.ts` — `getSeasonalityProfile(market, class)` swap point
- CAPEX taxonomy line ids align 1:1 with the underwriting workbook

---

## Future underwriting + AI orchestration (planned)

| Layer | Role | Reads | Writes |
|---|---|---|---|
| `services/financial_engine` | DCF / NOI / IRR / debt sizing / equity waterfall | `criteria.value.financeStructure`, market scenarios | `valuations` table |
| Match engine (real) | Per-category scoring (location, size, facilities, financials, capex, strategy) | `criteria` + hotel data | derived score |
| AI orchestration (planned) | Generate IC narratives + market commentary + sensitivity callouts | valuations + criteria + market data | `reports` PDFs / HTML |
