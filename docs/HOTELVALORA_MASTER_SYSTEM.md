# HOTELVALORA — Master System

> Single executive entry point for the HotelVALORA institutional platform.
> Cross-references every other doc in `/docs/*` and the four AI-context files at
> repo root (`AI_CONTEXT.md`, `RULES.md`, `ENTRYPOINTS.md`, `README.md`).

**Last refreshed:** 2026-05-12 — keep this date current after structural updates.

> 📍 **For the institutional baseline state of the platform** — what's live, placeholder, planned — read `docs/SNAPSHOT_2026_05_12.md` first. That document is the single canonical answer for cross-cutting status questions. This file points at it for anything that would otherwise drift.

---

## 1 · Vision

HotelVALORA is an institutional SaaS for hotel-asset intelligence: underwriting-grade valuations (DCF / IRR / cap rate), competitive-set benchmarking, market analytics, a public + private report library, and a marketplace for "Top Promote" hotel opportunities.

Three audiences:

| Tier | Who | What they get |
|---|---|---|
| FREE | Casual operators | Landing, single self-served valuation, public reports |
| PRO | Independent advisors | Hotel asset info, CompSET, market overview, IRR project |
| PREMIUM / INSTITUTIONAL | Funds, REITs, banks, brokers | CAPEX modelling, Underwriting & IRR Equity, AI imagery, full financial strategy, Top Promote marketplace publishing |

The product feel target: **Bloomberg Terminal × CoStar × MSCI Real Assets × luxury hospitality**.

---

## 2 · Modules

```
landing       /                                       public marketing
auth          /login + /auth/callback                 Supabase Auth (Google OAuth)
dashboard     /(dashboard)/{assets,valuations,…}      KPI + portfolio map (mock)
compset       /compset                                Mapbox CompSet selection (real)
report        /report/{6 sections}                    PDF-ready institutional report
settings      /settings/{profile,credentials,…}       3 user-settings sub-tabs
library       /library/{favorites,top}/{map,list}     map + table views, contact card
review        /(dashboard)/review                     data-quality queues (real API)
admin         /user/admin + /user/admin/agents[/id]   Institutional Operations Center
              ↑ Executive Control Room + AI Operations Center (orbital · CEO + 9 agents)
              ↑ See `docs/features/admin.md` + `docs/architecture/admin-ui-architecture.md`
```

See **`docs/routing.md`** for the full route map and active-state rules.

---

## 3 · Architecture (snapshot)

Monorepo: `apps/web` (Next.js 14) + `apps/api` (FastAPI) + `services/{data_pipeline,financial_engine}` + `infrastructure/{docker,nginx}`.

| Concern | Source-of-truth doc |
|---|---|
| **Full tech stack registry** (every service, status, env, next action) | `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` |
| **Per-service detail + tracking fields** | `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` |
| Quick-scan health dashboard | `docs/infrastructure/service-status.md` |
| Every env variable + safety | `docs/infrastructure/environment-variables.md` |
| Deploy state (Vercel + GitHub) | `docs/infrastructure/deployment-status.md` |
| Per-service activation recipes | `docs/infrastructure/integration-checklist.md` |
| Security audit + rotation log | `docs/infrastructure/security-audit.md` |
| System topology, ports, app flow | `docs/architecture.md` |
| Frontend app router + components | `docs/frontend.md` + `docs/architecture/frontend-architecture.md` |
| Backend FastAPI + services | `docs/backend.md` + `docs/architecture/backend-architecture.md` |
| Map engine (mock today, Mapbox future) | `docs/maps.md` + `docs/architecture/map-engine.md` |
| Report engine (shell + sections + print) | `docs/report-system.md` + `docs/architecture/report-engine.md` |
| Database schema | `docs/database.md` |
| Auth / JWT | `docs/auth.md` |
| Print / PDF pipeline | `docs/print-pdf.md` |
| Design system | `docs/design-system.md` + `docs/design-system/*.md` |

Today's runtime reality:
- The frontend is **fully mock-data** for everything except the review-queue surface.
- The FastAPI backend exists with auth + review + dedup + valuations + imports endpoints but isn't yet driving the report / library / dashboard surfaces.
- Mock data lives in `apps/web/src/lib/{report,library,…}/*-data.ts` and `apps/web/src/lib/library/mock-reports.ts`.
- **Auth.js v5 is wired** (Google + LinkedIn + Apple providers, JWT sessions, gated middleware) but currently inert — `AUTH_ENABLED=false` until OAuth credentials are minted. The mock Zustand auth store coexists for demos.
- **Supabase is live in production** — project `twebgqutuqgonabvhzjk` (eu-central · Postgres 17). 48-table schema + 5 Storage buckets + Library seed + Intelligence Engine + AI Operations Layer foundations applied (migrations `0001`–`0007`); every table and `storage.objects` namespace has RLS; env wired on Vercel. **Library surfaces are production-backed**. **Supabase Auth wired**. **Public Beta / Showcase Mode** (no route protection during validation). **GitHub → Vercel auto-deploy enabled**. **Hospitality Intelligence Engine foundation in place** — `docs/intelligence/`. **AI Operations Layer foundation in place** — 7 tables, **10 operational AI systems declared** organised in 4 tiers (Tier 0: CEO / Orchestration · Tier 1: Market Intelligence + Data Ingestion + QA/Monitoring · Tier 2: Underwriting + Report Generation · Tier 3: CRM/Dealflow + Customer Success + CMO + CFO), 30 tools catalogued. **These are NOT chatbots and NOT a side feature — they are a future core operating layer.** The CEO / Orchestration Agent is the supervisor that sits above the other nine — operations command center, AI chief-of-staff, escalation router — landing in Phase 3 once Tier 1 agents produce enough audit data to supervise. Phase 2 next-sprint candidate: Tier 1 agents + agent runtime core.
- **Resend transactional email is live** in production (`RESEND_API_KEY` + verified `hotelvalora.com` sender). The Library "Schedule a Tour" CTA on top-promoted reports sends real emails.
- **AI Operations Layer registry is at 12 agents** (CEO + 9 in the institutional orbital roster + `crm_dealflow` hidden + legacy `report_generation` retained for backward compat). Per-agent charters live under `docs/agents/*` (CEO · CoStar Market Data · CompSet Underwriting). The market-vs-underwriting separation is the load-bearing architectural decision — see `docs/architecture/market-vs-underwriting-separation.md`.
- **Three institutional ingestion workspaces** live under `services/`: `transactions/` (deals + projects, CLI live), `costar/` (country / market / submarket / class warehouse, scaffold + masters live, CLI Phase 2.3.d.1), `compset/` (per-hotel COMPSET + HOTEL_POSITIONING, scaffold + masters live, agent Phase 2.4.1).
- **Administrator surface is live** at `/user/admin` (Executive Control Room) and `/user/admin/agents` (AI Operations Center — orbital layout with `AgentDetailPanel` slide-out). Bloomberg-terminal aesthetic, mock data today; Phase 3 swaps in realtime reads from `ai_agent_runs` + `INGESTION_LOG` sheets.

---

## 4 · State (Library surface)

| Sub-surface | Route | Status |
|---|---|---|
| Favoritos map | `/library/favorites-map` | ✅ Live |
| Favoritos list | `/library/favorites-list` | ✅ Live (Bloomberg-grade 39-col table) |
| Top Reports map | `/library/top-map` | ✅ Live |
| Top Reports list | `/library/top-list` | ✅ Live (40-col with REF) |
| Contact card popover (top-promoted) | both lists | ✅ Live (portal-based, hover) |
| FAVORITOS ⇄ TOP segmented nav | sidebar | ✅ Route-driven (`activePaths`) |
| Map ⇄ List toggle per branch | controls + header | ✅ Wired (`listViewHref`) |

Full per-feature dossier: **`docs/features/library.md`**.

---

## 5 · Roadmap pointer

| Doc | Use it for |
|---|---|
| `docs/roadmap/master-roadmap.md` | Phase view: scaffold → library → backend wiring → marketplace |
| `docs/roadmap/current-sprint.md` | What shipped this week + what's in flight + what's next |
| `docs/roadmap/backlog.md` | Future ideas, blocked items, technical debt |
| `docs/changelog.md` | One entry per shipped feature (chronological) |

---

## 6 · Next priorities (snapshot)

Full prioritised matrix lives in `docs/SNAPSHOT_2026_05_12.md` § 6. Compressed view:

1. **Set `ADMIN_OPERATOR_EMAILS` on Vercel** (5 min · closes the admin allow-list gap)
2. **Phase 2.5b — Real Playwright integration** — replace placeholder T2 sessions with authenticated captures for Hosteltur + Alimarket · paywall body fetch · Refresh-Session button on integration detail
3. **Phase 2.6 — Cron-driven daily ingestion** — wire `/api/cron/hospitality-intel` to run real authenticated fetches across all 7 sources
4. **Phase 2.3.d.1 — CoStar Market Data Agent CLI** — mirror the transactions ingest pipeline · flips `costar_market_data` → `beta`
5. **Phase 2.4.1 — CompSet Underwriting Agent** — TS agent + cloud route + operator CLI · flips `compset_underwriting` → `beta`
6. **Phase 3 prep** — pgvector enable + reactive orchestrator + CEO Agent runtime activation
7. **Mapbox swap** for the static grayscale library map

Open backlog: see `docs/roadmap/backlog.md`.

---

## 7 · How to use these docs

- **Building a new feature?** Start in `docs/roadmap/current-sprint.md` + the relevant `docs/features/<surface>.md`.
- **Touching a data shape?** Update `docs/data-models/<model>.md` AND the actual type in `apps/web/src/types/`.
- **Adding a new business rule (tier, visibility, promotion)?** Update `docs/business-rules/<area>.md`.
- **Adding a new integration (CoStar, STR, …)?** Update `docs/integrations/<source>.md`.
- **Every shipped task** → `docs/changelog.md` + bump the relevant `docs/roadmap/current-sprint.md`.

The full mandatory-update matrix lives in `CLAUDE.md`.
