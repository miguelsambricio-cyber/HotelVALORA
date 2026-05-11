# HOTELVALORA — Master System

> Single executive entry point for the HotelVALORA institutional platform.
> Cross-references every other doc in `/docs/*` and the four AI-context files at
> repo root (`AI_CONTEXT.md`, `RULES.md`, `ENTRYPOINTS.md`, `README.md`).

**Last refreshed:** 2026-05-11 — keep this date current after structural updates.

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
auth          /login                                  mock today, NextAuth-shaped store
dashboard     /(dashboard)/{assets,valuations,…}      KPI + portfolio map (mock)
compset       /compset                                Mapbox CompSet selection (real)
report        /report/{6 sections}                    PDF-ready institutional report
settings      /settings/{profile,credentials,…}       4 sub-tabs incl. Investment criteria
library       /library/{favorites,top}/{map,list}     map + table views, contact card
review        /(dashboard)/review                     data-quality queues (real API)
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
- **Supabase is live in production** — project `twebgqutuqgonabvhzjk` (eu-central · Postgres 17). 32-table schema + 5 Storage buckets + Library seed applied (migrations `0001`–`0005`); every table and `storage.objects` namespace has RLS; env wired on Vercel. **Library surfaces are production-backed** via TanStack Query hooks (`lib/library/queries/*`) with optimistic favourite toggle. **Supabase Auth is wired** (Google OAuth via Supabase Dashboard · `app/auth/callback/route.ts` exchanges code for HttpOnly cookies · middleware enforces protected routes · `useAuth()` rewritten as a dual-source hook that picks Supabase or the Zustand mock at build time via `NEXT_PUBLIC_AUTH_ENABLED`). The Auth.js v5 scaffold stays in the repo (inert) for future non-OAuth flows. Activation is a manual two-step (Google Cloud Console + Supabase Dashboard) — see `docs/auth.md`.
- **Resend transactional email is live** in production (`RESEND_API_KEY` + sandbox sender). The Library "Schedule a Tour" CTA on top-promoted reports sends real emails.

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

1. **Wire real backend** behind the report + library surfaces (replace mock files with TanStack Query hooks against `apps/api`).
2. **Mapbox swap** for the institutional map (the abstraction is in place — `types/library.ts MapProviderHandles`).
3. **Top Promote marketplace gating**: payment flow, `promotedUntil` expiration, impression / click telemetry.
4. **Auth real-world replacement**: NextAuth or Supabase swap for the in-memory mock store.
5. **Print / PDF**: server-side render via Puppeteer for institutional-grade exports (currently `window.print()`).

Open backlog: see `docs/roadmap/backlog.md`.

---

## 7 · How to use these docs

- **Building a new feature?** Start in `docs/roadmap/current-sprint.md` + the relevant `docs/features/<surface>.md`.
- **Touching a data shape?** Update `docs/data-models/<model>.md` AND the actual type in `apps/web/src/types/`.
- **Adding a new business rule (tier, visibility, promotion)?** Update `docs/business-rules/<area>.md`.
- **Adding a new integration (CoStar, STR, …)?** Update `docs/integrations/<source>.md`.
- **Every shipped task** → `docs/changelog.md` + bump the relevant `docs/roadmap/current-sprint.md`.

The full mandatory-update matrix lives in `CLAUDE.md`.
