# HOTELVALORA — Master System

> Single executive entry point for the HotelVALORA institutional platform.
> Cross-references every other doc in `/docs/*` and the four AI-context files at
> repo root (`AI_CONTEXT.md`, `RULES.md`, `ENTRYPOINTS.md`, `README.md`).

**Last refreshed:** 2026-05-15 — keep this date current after structural updates.

> **2026-05-15 · Contactos Phase C COMPLETE + sentinel lifted.** UI switch shipped (commit `6eeb7cf` · `apps/web/src/lib/admin/contacts/live.ts` reads `contact_category_v2` directly via `.eq()` against indexed column · backward compat fallback for raw `?investor_type=Lender` URL bookmarks · `RELATIONSHIP_TYPE_GROUPS` retained as documentation). Vercel deploy `dpl_6yMZ7Ert1QGRtKmcQypRgsWzLu2t` READY in 62s · live at `hotelvalora.com`. Sentinel `.phase_b_repair_in_progress.lock` lifted at 03:21:36Z · `classify_master.py` and `promote_to_supabase.py` both operational. Phase B-Repair / Phase C governance period closed. Total exposure during repair + Phase C: ~14 hours sentinel active · 54s of write-window across 3 sentinel-cycled promotes (Step 2 baseline · iter3 FINANCIADORES- fix · iter3.5 Fernández Molina + iTrust). 4 Master backups preserved on disk. `relationship_type` column exists with 0/4547 populated · ready for Phase D (operator-set CRM dim editing UI · separate scope).

> **2026-05-15 · Contactos Phase C · canonical taxonomy live in Supabase.** Migration `0023_relationship_contacts_v2_taxonomy.sql` applied (additive · 4 cols + 1 index): `contact_category_v2` (operational source-of-truth · 8 buckets · indexed btree) · `relationship_type` (CRM dim · operator-set · NEVER touched by promote upsert) · `original_category_raw` + `original_category_source` (provenance audit · NULL when source has no real value · NEVER inferred-backfilled). `promote_to_supabase.py` propagated 4 398 of 4 547 rows (149 are Supabase-only without Master backing). Three sentinel-cycled promotes today (54s total exposure window): Step 2 baseline · iter3 (FINANCIADORES- substring fix · 13 rows reclassified) · iter3.5 (Fernández Molina jfcanete → Developer · iTrust → IA Supply). Final distribution: Principal 1804 · Broker 906 · Operator 711 · Developer 505 · Lender 341 · Hotel Supply 92 · IA Supply 21 · Uncategorized 18. IA Supply 100% defendible (0 false positives) · Operator clean rate 99.6% · Hotel Supply catchall accepted per operator policy. `relationship_type` integrity contract honored: 0/4547 populated post-promote. Sentinel still active · `BLOCK: promote_to_supabase.py` · UI switch (Step 4) pending separate commit.

> **2026-05-15 · Contactos Phase B · classifier v2 (canonical operational taxonomy) shipped.** `scripts/contactos/classify_master.py` extended with `--scheme={v1,v2}` flag. v2 introduces 8-bucket canonical taxonomy aligned with admin/contacts Phase A UI filter: Principal · Broker · Lender · **Operator** (NEW · split from Principal) · Developer · **Hotel Supply** (rename of Proveedor + default for `investor_type ∈ {Service Provider, Media}`) · **IA Supply** (rename of IA aplicaciones · expanded conservatively to PMS/RMS/channel managers/data intelligence/SaaS hospitality) · Uncategorized. Master schema 64 → 67 cols (additive: `contact_category_v2` · `original_category_raw` · `original_category_source`). v1 column `contact_category` UNTOUCHED — legacy compat only. **Uncategorized dropped from 29.7% to 0.4%** (4398 rows · 18 residuals all `investor_type='Unknown'`). Operator split: 700 of 2736 v1=Principal correctly moved · plus tuning iteration D ensures `investor_type='Investor'` rows stay Principal even when company name has hospitality keywords. `original_category_raw` + `original_category_source` NULL in all 4398 rows (no inference backfill · provenance integrity). Sentinel re-created with selective `BLOCK: promote_to_supabase.py` (classifier allowed through). Phase C (DB schema migration adding `contact_category_v2` column to `relationship_contacts` + CRM `relationship_type`) pending operator review of Phase B classification report.

> **2026-05-15 · Phase 2.B.3-correction · Master alignment repair complete.** During Phase B prep, audit discovered Master xlsx had been silently corrupted by Phase 2.B.3 --apply: data shifted RIGHT by 1 column relative to header (4 382/4 398 = 99.6% match against Supabase under shift=-1 hypothesis). Concurrent silent failure: the 2 approved replacements (crocher→prietose · rodera→gestiondeactivos2) were never actually written to disk despite the changelog claiming applied. Recovery (operator-approved Option A): backup → `audit_master_alignment.py` (Supabase cross-check · HIGH confidence) → freeze locks on classify_master + promote_to_supabase via sentinel file → `fix_master_alignment.py` (shift-left-by-1 atomic rebuild · 0 cells dropped · 64-col canonical schema) → atomic swap → `apply_phase_2b3_replacements_v2.py` (correct write + audit trail) → `final_repair_validation.py` (5 random samples + Phase 2.B.3 rows · all match Supabase). 3 backups preserved (BACKUP-pre-cleanup · broken-2026-05-15 · broken-postswap). Sentinel file remains active until operator green-lights promotion to Supabase + Phase B classifier v2.

> **2026-05-15 · Admin / Contacts Relationship Type 8-group filter (Phase A · UI layer).** `/user/admin/contacts` chip strip rebuilt around 8 institutional buckets (ALL · PRINCIPALS · BROKER · LENDER · OPERATOR · DEVELOPER · HOTEL SUPPLY · IA SUPPLY) under the renamed "Relationship type" label. Mapping layer in `apps/web/src/lib/admin/contacts/live.ts` (`RELATIONSHIP_TYPE_GROUPS`) explodes each group key to a `.in("investor_type", [...])` query — same arrays drive the KPI totem row so filter ↔ counts cannot drift. Backward compat preserved: raw legacy `investor_type=Lender` URLs still resolve via `.eq`; URL param key unchanged until Phase C. IA SUPPLY chip wired but resolves to 0 today (waiting on Phase B promotion of Master's `contact_category` column). Phases B (Master classifier v2 with split Operator + `original_category_raw`) and C (DB migration adding `company_type_canonical` + CRM `relationship_type` + backfill) pending operator green-light.

> **2026-05-15 · Contactos Phase 2.B.3 complete.** Applied 2 approved replacement suggestions (crocher→prietose · rodera→gestiondeactivos2) with full audit trail (original_email preserved, replaced_by_master_id recorded, replaced_at timestamped). Master schema expanded to 67 columns (63 canonical + 4 audit). Downstream surfaces regenerated: Gmail signals re-extracted (8857 unique emails), institutional inbox candidates refreshed (104 campaign-ready), health metrics revalidated (strategic + active = 108). Decontamination filters operational (9 bounce-flagged emails skipped during harvest). Two FLAG replacements pending manual LinkedIn verification. Outreach layer clean and actionable.

> **2026-05-14 · COSTAR ingestion architecture shift.** Two distinct datasets now flow through `services/costar/`: **Market Performance** (PAIS/MERCADO/SUBMERCADO KPIs) and **Hotel-by-Market Inventory** (HOTELESperMARKET — replaces the retired CLASS granularity). Madrid + Madrid Centro drops landed alongside private transactions + COMPSET. New admin surface `/user/admin/hotels` scaffolds the hotel registry; COSTAR Admin Agent renamed to **COSTAR & Hotel Reference Agent** with reconciliation-queue duties. See `docs/intelligence/costar-hotels-by-market-schema.md` for the new schema and `services/costar/README.md` for the workspace contract.

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
admin         /user/admin + /user/admin/{agents[/id],   Institutional Operations Center
              integrations[/id], hotels, contacts,     (7 surfaces · 1 scaffold)
              users, campaigns, subscriptions}
              ↑ Executive Control Room · AI Operations Center · Integrations Console
              ↑ **Hotels** (reference data backbone · scaffold) — owned by COSTAR & Hotel Reference Agent
              ↑ Contacts (growth funnel) · Users (real users) · Campaigns (activation) · Subscriptions
              ↑ Conversion arc: contact → invited → onboarded user → active subscriber → premium
              ↑ See `docs/features/admin.md` + `docs/integrations/datasite-contacts.md` § Phase 2.D
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
- **Operational growth layer is live** (Phase 2.D.1) — `/user/admin/contacts` (4,547 contacts) · `/user/admin/users` (real users on the platform) · `/user/admin/campaigns` (activation scaffold) · `/user/admin/subscriptions` (monetization scaffold). The contacts base is a **growth engine**, NOT a CRM: the system relation is `contact → invited → onboarded user → active subscriber → premium client`. Migration `0015` extends `users` with `linked_contact_id` + `invitation_status` + `promo_code` + `relationship_owner_email`, adds `campaigns` + `contact_invitations` tables, and adds the reverse FK on contacts. Mutation workflows + bulk actions land in Phase 2.D.2-2.D.4. The previous "relationship intelligence OS" framing was a drift — corrected on 2026-05-12.

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
