# Architecture · System Overview

Companion to **`docs/architecture.md`** — that doc has the canonical service-topology + port + Docker reality. This file adds the *why* and surface-by-surface integration view.

## Monorepo

```
apps/
  web/          Next.js 14 (App Router, TS, Tailwind). Hosts every UI route.
  api/          FastAPI 0.x + asyncpg + SQLAlchemy 2.0 async. Auth, review,
                dedup, valuations, imports.
services/
  data_pipeline/    Standalone Python package — ETL, multilingual cleaning,
                    name dedup keys, Excel + CoStar normalisers.
                    NOT importable from apps/api by design.
  financial_engine/ Standalone Python package — DCF projections, RevPAR, NOI.
                    NOT importable from apps/api by design.
infrastructure/
  docker/       docker-compose.{dev,prod}.yml
  nginx/        Production reverse-proxy config.
```

Production deployment: Vercel (apps/web only — personal scope, project `hotelvalora`, root `apps/web`, custom domain `hotelvalora.com`).

## Layer map

```
                    ┌───────────────────────────────────────┐
                    │             USER (browser)             │
                    └───────────────────────────────────────┘
                                       ▼
   ┌────────────────────────────────────────────────────────┐
   │  Next.js 14 — App Router (apps/web)                    │
   │  ─────────────────────────────────────────             │
   │  Routes:  /, /compset, /report/*, /(dashboard)/*,      │
   │           /library/*, /settings/*, /login              │
   │  Shells:  LibraryShell, SettingsLayout, ReportShell,   │
   │           Dashboard layout, Landing                    │
   │  State:   TanStack Query v5 (server),                  │
   │           Zustand stores (auth, investment, library)   │
   │  Data:    Mock files everywhere EXCEPT review queue    │
   └────────────────────────────────────────────────────────┘
                                       ▼
   ┌────────────────────────────────────────────────────────┐
   │  FastAPI (apps/api)  — partial wiring today            │
   │  ────────────────────────────────────────              │
   │  /api/v1/auth/*            ← Zustand auth uses mock    │
   │  /api/v1/review/*          ← LIVE (only real surface)  │
   │  /api/v1/dedup/*           ← LIVE (used by review)     │
   │  /api/v1/aliases/*         ← LIVE                       │
   │  /api/v1/audit/*           ← LIVE                       │
   │  /api/v1/valuations/*      ← Built, not consumed yet   │
   │  /api/v1/imports/{excel,costar} ← Built, not consumed  │
   └────────────────────────────────────────────────────────┘
                                       ▼
   ┌────────────────────────────────────────────────────────┐
   │  PostgreSQL (asyncpg)                                  │
   │  Migrations: apps/api/alembic/versions/0001-0005       │
   └────────────────────────────────────────────────────────┘
```

## What's mock vs real today

| Surface | Source |
|---|---|
| Landing, Login, Dashboard, Compset | UI only, no real data |
| Report (6 sections) | `apps/web/src/lib/report/*-data.ts` files |
| Library (4 routes) | `apps/web/src/lib/library/mock-reports.ts` (6 hotels) |
| Settings (Profile / Credentials / Investment) | Zustand local + mock |
| Review queue | **Real** — `apps/web/src/lib/api/review.ts` against FastAPI |

Phase 3 of the master roadmap is the swap from mock files to TanStack Query hooks against the real API.

## Cross-references

| Topic | Doc |
|---|---|
| Routes + layout shells | `docs/routing.md` |
| Frontend deep dive | `docs/frontend.md` + `docs/architecture/frontend-architecture.md` |
| Backend deep dive | `docs/backend.md` + `docs/architecture/backend-architecture.md` |
| DB schema | `docs/database.md` |
| API contracts | `docs/api.md` |
| Auth / JWT | `docs/auth.md` |
| Data pipeline ETL | `docs/data-pipeline.md` |
| Financial engine | `docs/financial-engine.md` |
| Deployment | `docs/deployment.md` |
