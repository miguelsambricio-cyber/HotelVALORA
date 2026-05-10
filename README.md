# HotelVALORA

AI-powered institutional hotel valuation platform — DCF modeling, market analytics, and investment underwriting for hotel and flex-living assets.

Live: **[hotelvalora.com](https://hotelvalora.com)**

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router, TypeScript) deployed on Vercel |
| State | Zustand (persisted slices for auth + investment criteria) |
| UI | Tailwind CSS, lucide-react, Mapbox GL |
| API | FastAPI + Uvicorn (Python 3.12) |
| Database | PostgreSQL 16 + Alembic |
| Cache / Queue | Redis 7 + Celery |
| Storage | S3 / MinIO |
| Financial Engine | Python, NumPy, SciPy |
| Infra | Docker Compose (dev), Vercel (web prod) |

---

## Quick Start

**Prerequisites:** Docker, Docker Compose, Node 18+, pnpm.

```bash
# Backend (Docker)
cp .env.example .env
docker compose -f infrastructure/docker/docker-compose.dev.yml up -d
bash infrastructure/scripts/migrate.sh

# Frontend (local)
cd apps/web
pnpm install
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| API | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |
| MinIO Console | http://localhost:9001 |

---

## Architecture

```
Browser
  └── Next.js (Vercel)         ── institutional shell, settings, reports
        └── FastAPI /api/v1    ── auth, criteria, valuations, market data
              ├── PostgreSQL   ── primary store
              ├── Redis        ── cache + Celery broker
              └── Celery       ── financial engine + ETL workers
                    ├── DCF / NOI / IRR
                    └── CoStar / STR / CBRE ingestion
```

Monorepo:
```
apps/
  api/              FastAPI backend
  web/              Next.js frontend (Vercel)
services/
  financial_engine/ DCF & metrics engine
  data_pipeline/    Excel + CoStar + STR ETL
infrastructure/
  docker/  nginx/  scripts/
```

---

## Frontend surfaces (shipped)

| Area | Routes |
|---|---|
| Public | `/`, `/login`, `/compset` |
| Reports | `/report/executive-summary`, `/report/asset-analysis`, `/report/asset-analysis/capex`, `/report/competitive-set`, `/report/financials/pl`, `/report/market-overview/{dynamics,projects,transactions}` |
| Settings | `/settings/profile`, `/settings/credentials`, `/settings/investment` (Asset · Market · Value) |
| Dashboard | `/dashboard`, `/assets/hotels`, `/valuations`, `/underwriting`, `/transactions`, `/market`, `/review` |

---

## Tier system

Four tiers, applied across every analytical surface:
- **FREE** — minimal access, gated previews
- **PRO** — full reports, market overview, transactions, IRR Project
- **PREMIUM** — Investment Requirements full editing, P&L Forecast, Underwriting + IRR Equity, AI imagery, ChatGPT P&L
- **INSTITUTIONAL** — multi-tenant, team collaboration (planned)

Auth is Zustand-persisted today (no real OAuth wired). NextAuth-shaped provider registry (`lib/auth/providers.ts`) ready for LinkedIn / Google / Apple / Microsoft when backend lands.

---

## Investment Requirements engine

The criteria engine (`/settings/investment`) is the single source of truth for what the user wants to acquire. Three tabs:

- **Hotel Asset** — asset type, capacity, location, property specs, CAPEX (Hard/Soft/Project), facilities, AI renders
- **Hotel Market** — ADR + OCC forecast growth (constant or per-year custom), RevPAR scenario (DOWN/BASE/UP), RevPAR target
- **Hotel Value** — site acquisition (asking price + 5-line cost table), exit (price + cap rate + IRR/yield targets), rent factor, finance structure (8-slider grid), P&L forecast (TTM, mgmt fee, marketing, FF&E)

All inputs persist to localStorage via Zustand (`hv-investment-v1`, schema v3). Every downstream surface (Executive Summary, CompSet, Underwriting, Deal Screening, IC reports) will consume from this store via the future match engine (🟢/🟡/🔴 tier indicator — primitive shipped, scoring stubbed).

---

## Future integrations (architecture prepared)

| Integration | Status | Hook |
|---|---|---|
| CoStar Excel ingestion | Architecture ready | `lib/investment/market-scenarios.ts`, `lib/report/financials/seasonality.ts` |
| STR market exports | Architecture ready | Same hooks as CoStar |
| CBRE / MSCI datasets | Planned | New adapter module |
| DCF / IRR engine | Stub | `services/financial_engine` (Python) |
| Debt sizing / refinance | Stub | Drives off `lib/investment` value slice |
| Match engine (🟢🟡🔴) | Stub returns `strong` | `lib/investment/match-engine.ts` |
| AI report generation | Planned | `services/ai_orchestration` (future) |
| OAuth (NextAuth) | Provider registry shipped | Real runtime pending |

---

## Documentation

| Document | Description |
|---|---|
| [AI_CONTEXT.md](AI_CONTEXT.md) | Compressed AI mental model |
| [RULES.md](RULES.md) | Coding conventions for AI agents |
| [ENTRYPOINTS.md](ENTRYPOINTS.md) | Task → file map |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture summary (full: `docs/architecture.md`) |
| [COMPONENTS.md](COMPONENTS.md) | Canonical component catalog |
| [ROADMAP.md](ROADMAP.md) | Roadmap summary (full: `docs/roadmap.md`) |
| [CHANGELOG.md](CHANGELOG.md) | Recent changes (full: `docs/changelog.md`) |
| [TODO.md](TODO.md) | Concrete pending items |
| [docs/](docs/) | All canonical domain docs |

---

## Repository

GitHub: [miguelsambricio-cyber/HotelVALORA](https://github.com/miguelsambricio-cyber/HotelVALORA)
