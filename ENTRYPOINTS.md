# ENTRYPOINTS.md — HotelVALORA

Maps tasks to exact files. Start here before scanning.

---

## Backend

| Task | File(s) |
|---|---|
| New API route group | `apps/api/app/api/v1/<domain>/router.py` → register in `apps/api/app/api/v1/router.py` |
| New DB model | `apps/api/app/models/<name>.py` → `models/__init__.py` → `alembic/env.py` → migration |
| New Pydantic schema | `apps/api/app/schemas/<name>.py` (extend `ValoraBase`) |
| New service | `apps/api/app/services/<name>_service.py` |
| New migration | `apps/api/alembic/versions/NNNN_<desc>.py` — current head: `0004`, next: `0005` |
| Response / error contract | `apps/api/app/schemas/common.py` |
| Middleware or app factory | `apps/api/app/main.py` |
| DB connection / pooling | `apps/api/app/database.py` |
| Config / env vars | `apps/api/app/config.py` |
| Auth / JWT | `apps/api/app/core/security.py` |
| Exception types | `apps/api/app/core/exceptions.py` |

---

## Frontend

| Task | File(s) |
|---|---|
| New dashboard page | `apps/web/src/app/(dashboard)/<path>/page.tsx` |
| New API hook | `apps/web/src/lib/api/<domain>.ts` |
| New TS types | `apps/web/src/types/<domain>.ts` |
| Shared response wrappers | `apps/web/src/types/review.ts` (`SingleResponse`, `PagedResponse`) |
| Sidebar navigation | `apps/web/src/components/layout/sidebar.tsx` |
| Global providers / QueryClient | `apps/web/src/components/providers.tsx` |
| Root HTML / fonts / metadata | `apps/web/src/app/layout.tsx` |
| Dashboard shell | `apps/web/src/app/(dashboard)/layout.tsx` |
| Axios client / auth interceptors | `apps/web/src/lib/api/client.ts` |
| Global app header (sticky, all pages) | `apps/web/src/components/layout/app-header.tsx` |
| Settings shell + sidebar | `apps/web/src/components/settings/settings-layout.tsx` |
| Settings sidebar nav items | `apps/web/src/components/settings/settings-sidebar.tsx` |
| Unified auth hook (`useAuth()` — picks Supabase or mock at build time) | `apps/web/src/lib/auth/use-auth.ts` |
| Supabase auth adapter (session subscribe + tier hydrate) | `apps/web/src/lib/auth/use-supabase-auth.ts` |
| Build-time auth-mode flags | `apps/web/src/lib/auth/auth-mode.ts` |
| OAuth callback route (exchange code → cookies) | `apps/web/src/app/auth/callback/route.ts` |
| OAuth sign-in hook (Supabase Auth + Auth.js fallback) | `apps/web/src/lib/auth/use-oauth.ts` |
| Zustand mock auth (fallback when AUTH_ENABLED=false) | `apps/web/src/lib/auth/store.ts` |
| OAuth provider registry | `apps/web/src/lib/auth/providers.ts` |
| Provider brand marks (LinkedIn/Google/Apple/Microsoft) | `apps/web/src/components/auth/provider-marks.tsx` |
| Auth.js v5 scaffold (inert — kept for future non-OAuth flows) | `apps/web/src/auth.config.ts`, `apps/web/src/auth.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts` |
| Edge middleware (Supabase session refresh + protected-route redirect when AUTH_ENABLED=true) | `apps/web/src/middleware.ts` |
| Auth.js session/JWT module augmentation | `apps/web/src/types/next-auth.d.ts` |
| Investment criteria store (Zustand persist) | `apps/web/src/lib/investment/store.ts` |
| Investment match engine stub + tier thresholds | `apps/web/src/lib/investment/match-engine.ts` |
| CAPEX taxonomy (Excel-mappable line ids) | `apps/web/src/lib/investment/capex.ts` |
| Investment criteria types + facilities + coverage | `apps/web/src/lib/investment/{types,facilities,coverage}.ts` |
| Investment Requirements page (Asset / index) | `apps/web/src/app/settings/investment/page.tsx` |
| Investment Requirements — Hotel Market page | `apps/web/src/app/settings/investment/market/page.tsx` |
| Investment Requirements — Hotel Value page | `apps/web/src/app/settings/investment/value/page.tsx` |
| Investment section cards + primitives | `apps/web/src/components/settings/investment/` |
| Hotel Market section cards | `apps/web/src/components/settings/investment/market/` |
| Hotel Value section cards + primitives | `apps/web/src/components/settings/investment/value/` |
| Market scenario KPI tables (DOWN/BASE/UP — internal, not shown in UI) | `apps/web/src/lib/investment/market-scenarios.ts` |
| Acquisition cost taxonomy (Excel-mappable line ids) | `apps/web/src/lib/investment/value-acquisition.ts` |
| Investment sub-tabs (route-driven via usePathname) | `apps/web/src/components/settings/investment/investment-tabs.tsx` |
| Canonical institutional ON/OFF toggle | `apps/web/src/components/settings/investment/institutional-toggle.tsx` |

---

## Domain — Hotel Enrichment Pipeline (parallel workstream — `feature/hotel-enrichment-pipeline`)

| Task | File(s) |
|---|---|
| **Madrid hotel enrichment — architecture v1 (canonical · source-agnostic · NO code yet)** | `docs/hotel-intelligence/madrid-enrichment-architecture-v1.md` |
| Source hierarchy (per-field) · confidence model · duplicate detection · normalization · DAG · Supabase schema · rate limit · queue · DLQ · refresh | same file (sections 1–11) |
| **RapidAPI Booking provider layer v1 (sidecar · provider-specific · NO code yet)** | `docs/hotel-intelligence/madrid-enrichment-rapidapi-booking-v1.md` |
| Endpoint inventory · field mapping · rate-limit math · cost modeling · caching · error taxonomy · matching · image strategy · compliance | same file (sections 1–9) |
| **Institutional feature coverage targets v1 (defines the 80% Madrid goal · 4 tiers · per-surface field demand)** | `docs/hotel-intelligence/institutional-feature-coverage-targets-v1.md` |
| **Coverage measurement spec v1 (SQL views: per-hotel · per-market · Madrid headline `goal_reached` boolean)** | `docs/hotel-intelligence/coverage-measurement-spec-v1.md` |
| **Migration draft `0024_hotel_enrichment_schema.sql` (8 tables · 10 enums · 4 views · RLS · NOT yet applied)** | `docs/database/migrations/0024_hotel_enrichment_schema.sql` |
| Canonical registries (brands · amenities · Madrid municipios · hotel types) — pure data + helpers, no I/O | `apps/web/src/lib/enrichment/registries/` |
| Brand registry (~80 entries: NH · Meliá · Marriott · Hilton · Hyatt · IHG · Accor · Radisson · Barceló · Iberostar · …) | `apps/web/src/lib/enrichment/registries/brands.ts` |
| Multilingual amenity normalization (ES + EN → 14-key canonical bitmap) | `apps/web/src/lib/enrichment/registries/amenities.ts` |
| Madrid municipios alias table (19 metro entries fold to `city_normalized="Madrid"` + 4 separate-market entries) | `apps/web/src/lib/enrichment/registries/madrid-municipios.ts` |
| `accommodation_type_name` → `hotel_type` + segment derivation rules | `apps/web/src/lib/enrichment/registries/hotel-types.ts` |
| Registries barrel + conventions | `apps/web/src/lib/enrichment/registries/{index.ts,README.md}` |
| Migration draft (DDL only, NOT applied) | filename reserved: `0008_hotel_enrichment_schema.sql` (to live under `docs/database/migrations/` when phase 2 begins) |
| Positioning | runs inside existing Data Ingestion Agent (`apps/web/src/lib/ai-agents/agents/data-ingestion.ts`) as `enrich_hotel` tool |
| Reuse — composite dedup scoring (35/30/20/10/5) | `apps/api/app/services/dedup_service.py` (pattern only — inlined per project rule) |
| Reuse — multilingual normalization | `services/data_pipeline/pipeline/cleaning/multilingual.py` (pattern only — inlined) |
| Reuse — audit log + AuditService | existing infrastructure (no schema change; new event types added to dotted taxonomy) |
| Boundary | NO touch on underwriting · NO touch on report-system · NO touch on synchronization layer |

---

## Domain — Library (institutional reports)

| Task | File(s) |
|---|---|
| Library page — Favoritos map | `apps/web/src/app/library/favorites-map/page.tsx` |
| Library page — Top Reports map | `apps/web/src/app/library/top-map/page.tsx` |
| Library page — Favoritos list | `apps/web/src/app/library/favorites-list/page.tsx` |
| Library page — Top Reports list | `apps/web/src/app/library/top-list/page.tsx` |
| Favorites list content (header bar + actions) | `apps/web/src/components/library/favorites-list-content.tsx` |
| Top Reports list content (header bar + actions) | `apps/web/src/components/library/top-reports-list-content.tsx` |
| Institutional reports table (39/40 cols, REF column toggle, sticky thead + first col, locked-cell pattern) | `apps/web/src/components/library/favorites-table.tsx` |
| Amenity icon cell (Bar/Restaurant/Rooftop/Meet/Gym/Spa/Pool/Parking) | `apps/web/src/components/library/amenity-icon-cell.tsx` |
| Report type chip + indicators (top promote / user modified / private) | `apps/web/src/components/library/report-type-chip.tsx` |
| Locked-cell pill (tier-gated values) | `apps/web/src/components/library/locked-cell.tsx` |
| Contact card cell + hover popover (top-promoted reports only) | `apps/web/src/components/library/contact-cell.tsx` |
| Resend client singleton (server-only) | `apps/web/src/lib/email/client.ts` |
| Tour-request email template (HTML + text) | `apps/web/src/lib/email/templates/tour-request.ts` |
| Email server actions (`sendTourRequestAction`) | `apps/web/src/lib/email/actions.ts` |
| Supabase clients (browser / server / middleware / admin / auth-helpers / barrel) | `apps/web/src/lib/supabase/` |
| Supabase connection-test probe page | `apps/web/src/app/dev/supabase-test/page.tsx` |
| Supabase generated TypeScript types (from live schema) | `apps/web/src/lib/supabase/types.ts` |
| Supabase Storage — browser helpers (`BUCKETS`, `uploadOwnFile`, `getPublicUrl`, …) | `apps/web/src/lib/supabase/storage.ts` |
| Supabase Storage — server helpers (`createStorageSignedUrl`, `moveStorageObject`, …) | `apps/web/src/lib/supabase/storage-server.ts` |
| Supabase migrations (initial schema · hardening · storage buckets · intelligence) | `docs/database/migrations/` |
| Hospitality Intelligence — strategic master document | `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` |
| Hospitality Intelligence — technical architecture | `docs/intelligence/intelligence-architecture.md` |
| Hospitality Intelligence — schema reference | `docs/intelligence/news-data-schema.md` |
| Hospitality Intelligence — ingestion pipeline design | `docs/intelligence/ingestion-pipeline.md` |
| Hospitality Intelligence — scheduler decision (Vercel Cron vs pg_cron) | `docs/intelligence/scheduler-strategy.md` |
| Hospitality Intelligence — phased roadmap | `docs/intelligence/hospitality-intelligence-roadmap.md` |
| Hospitality Intelligence — schema migration (9 tables, 5 enums, 10 sources) | `docs/database/migrations/0006_hospitality_intelligence_schema.sql` |
| AI Operations Layer — strategic master document | `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` |
| AI Operations Layer — agent runtime architecture | `docs/ai-agents/ai-agent-architecture.md` |
| AI Operations Layer — orchestration / queue / router | `docs/ai-agents/ai-agent-orchestration.md` |
| AI Operations Layer — memory strategy (scopes · embeddings · expiration) | `docs/ai-agents/ai-memory-strategy.md` |
| AI Operations Layer — permissions matrix / destructive policy | `docs/ai-agents/ai-agent-permissions.md` |
| AI Operations Layer — event bus + reactive triggers | `docs/ai-agents/ai-event-system.md` |
| AI Operations Layer — KPI framework + cost caps | `docs/ai-agents/ai-agent-kpis.md` |
| AI Operations Layer — phased rollout roadmap (Phases 1–7+) | `docs/ai-agents/ai-agent-roadmap.md` |
| AI Operations Layer — schema migration (7 tables, 6 enums, 9 agents, 20 tools) | `docs/database/migrations/0007_ai_operations_layer_schema.sql` |
| AI Operations Layer — Phase 2 migration (Tier 1 runtime + 43 perms + escalation tool) | applied via Supabase MCP — name: `phase2_tier1_runtime_and_permissions` |
| AI Operations Layer — cost guardrails (caps · preflight · QA escalation thresholds) | `docs/ai-agents/ai-agent-cost-guardrails.md` |
| AI Operations Layer — manual approval flow (gate · review queue · operator workflow) | `docs/ai-agents/ai-agent-approval-flow.md` |
| AI agent runtime core — invoke / audit / permissions / budget / events / memory / approval / escalation | `apps/web/src/lib/ai-agents/core/` (10 files incl. `runtime.ts`, `audit.ts`, `permissions.ts`, `budget.ts`, `events.ts`, `memory.ts`, `approval.ts`, `escalation.ts`, `types.ts`, `index.ts`) |
| Market Intelligence Agent (Tier 1) | `apps/web/src/lib/ai-agents/agents/market-intelligence.ts` |
| Data Ingestion Agent (Tier 1) | `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` |
| QA / Monitoring Agent (Tier 1) | `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` |
| Intelligence ingestion pipeline (types · fetchers · normalise · categorise · ingest) | `apps/web/src/lib/intelligence/` |
| Hospitality Intelligence daily cron | `apps/web/src/app/api/cron/hospitality-intel/route.ts` |
| Market Intelligence daily cron | `apps/web/src/app/api/cron/market-intelligence/route.ts` |
| QA / Monitoring hourly cron | `apps/web/src/app/api/cron/qa-monitoring/route.ts` |
| Data Ingestion manual trigger (Supabase-auth gated) | `apps/web/src/app/api/agents/data-ingestion/route.ts` |
| Cron Bearer-token auth helper | `apps/web/src/lib/cron-auth.ts` |
| Intelligence probe page | `apps/web/src/app/dev/intelligence-test/page.tsx` |
| AI Ops probe page (agents · runs · events · approvals · escalations) | `apps/web/src/app/dev/ai-ops/page.tsx` |
| Vercel Cron schedule | `apps/web/vercel.json` (3 entries) |
| Institutional transactions + projects ingestion workspace | `services/transactions/` (README at root of the workspace) |
| Canonical transactions MASTER (59 cols, 5 sheets, append-only) | `services/transactions/MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx` |
| Canonical projects MASTER (50 cols, 5 sheets, append-only) | `services/transactions/MASTER/HOTEL_PROYECTOS_MASTER.xlsx` |
| Reproducible MASTER generator (openpyxl) | `services/transactions/scripts/build_masters.py` |
| **Data Ingestion Agent — operator pipeline CLI** | `services/transactions/scripts/ingest.py` (entry point) |
| Pipeline — normalisation rules + header aliases | `services/transactions/scripts/normalization.py` |
| Pipeline — dedup_key + content_hash | `services/transactions/scripts/dedup.py` |
| Pipeline — MASTER read/append/INGESTION_LOG | `services/transactions/scripts/master_io.py` |
| Pipeline — staging routing + source archive + per-run jsonl | `services/transactions/scripts/staging_io.py` |
| Pipeline — XLSX + CSV lenient readers | `services/transactions/scripts/source_readers.py` |
| Pipeline — pinned dependencies | `services/transactions/scripts/requirements.txt` |
| Pipeline — operator README (CLI ref + smoke procedure) | `services/transactions/scripts/README.md` |
| Smoke fixture | `services/transactions/scripts/tests/fixtures/smoke_transactions.csv` |
| **Audit-chain unification — cloud endpoint** | `apps/web/src/app/api/agents/data-ingestion-summary/route.ts` |
| **Audit-chain unification — Python module** | `services/transactions/scripts/audit_sync.py` |
| **Institutional CoStar hospitality market warehouse** | `services/costar/` (README at root of workspace) |
| CoStar MASTER — country (39c) | `services/costar/MASTER/COSTAR_MASTER_PAIS.xlsx` |
| CoStar MASTER — market (40c) | `services/costar/MASTER/COSTAR_MASTER_MERCADOS.xlsx` |
| CoStar MASTER — submarket (41c) | `services/costar/MASTER/COSTAR_MASTER_SUBMERCADOS.xlsx` |
| CoStar MASTER — class / chain scale (41c) | `services/costar/MASTER/COSTAR_MASTER_CLASS.xlsx` |
| CoStar reproducible MASTER generator (v1.1) | `services/costar/scripts/build_masters.py` |
| CoStar operator CSV templates × 4 | `services/costar/templates/costar_{pais,mercado,submercado,class}_import_template.csv` |
| CoStar ingestion workflow doc | `docs/intelligence/costar-ingestion-workflow.md` |
| CoStar master dataset architecture | `docs/intelligence/costar-master-dataset-architecture.md` |
| CoStar normalization rules | `docs/intelligence/costar-normalization-rules.md` |
| CoStar country schema (full reference) | `docs/intelligence/costar-country-schema.md` |
| CoStar market schema (full reference) | `docs/intelligence/costar-market-schema.md` |
| CoStar submarket schema (full reference) | `docs/intelligence/costar-submarket-schema.md` |
| CoStar class schema (chain-scale aggregates) | `docs/intelligence/costar-class-schema.md` |
| **CONTACTOS · institutional graph + Gmail signal pipeline** | `CONTACTOS DATASITE/` (gitignored data tree) + `scripts/contactos/` |
| Master xlsx (63 cols · 5 sheets · INVALID_ARCHIVE side-sheet for retired bounces) | `CONTACTOS DATASITE/master/metcub-contacts-master.xlsx` |
| Bounce + dead-domain blocklists (regenerated · honoured by extract + harvest) | `CONTACTOS DATASITE/master/blocklists/{gmail-bounce-blocklist,dead-domains-blocklist}.txt` |
| Datasite ingester (xlsm → Master · dedup · merge · provenance) | `scripts/contactos/ingest.py` |
| Gmail signal extractor (raw label JSONs → JSONL · honours blocklist) | `scripts/contactos/extract_gmail_signals.py` |
| Gmail signal merger (JSONL → Master rows · preserves bounce_count) | `scripts/contactos/ingest_gmail.py` |
| Untagged-inbox harvester (institutional candidate CSV · honours blocklist) | `scripts/contactos/harvest_untagged.py` |
| Master classifier (contact_category taxonomy: Principal · Broker · Lender · Developer · Proveedor · IA aplicaciones) | `scripts/contactos/classify_master.py` |
| Relationship-health report (11-section md + per-batch correction CSV) | `scripts/contactos/build_health_report.py` |
| **Replacement heuristics + INVALID_ARCHIVE mover (B)** | `scripts/contactos/build_replacement_suggestions.py` |
| **Bounce + dead-domain blocklist generator (D)** | `scripts/contactos/build_bounce_blocklist.py` |
| **Dead-domains review CSV with rebrand hints (E)** | `scripts/contactos/build_dead_domains_review.py` |
| Shared blocklist loader (used by extract + harvest) | `scripts/contactos/_blocklist.py` |
| Inbox organizer (per-thread label routing) | `scripts/contactos/inbox_organizer.py` |
| Supabase contact promoter (Master → contacts table) | `scripts/contactos/promote_to_supabase.py` |
| **Operational CompSet workspace** | `services/compset/` |
| CompSet MASTER (48c · subject+compset KPIs + MPI/ARI/RGI) | `services/compset/MASTER/COMPSET_MASTER.xlsx` |
| Hotel Positioning MASTER (55c · per-hotel underwriting snapshots) | `services/compset/MASTER/HOTEL_POSITIONING_MASTER.xlsx` |
| CompSet reproducible MASTER generator | `services/compset/scripts/build_masters.py` |
| CompSet operator CSV templates × 2 | `services/compset/templates/{compset,hotel_positioning}_import_template.csv` |
| CompSet schema (full reference) | `docs/intelligence/compset-schema.md` |
| Hotel Positioning schema (full reference) | `docs/intelligence/hotel-positioning-schema.md` |
| **Market-vs-Underwriting separation architectural decision** | `docs/architecture/market-vs-underwriting-separation.md` |
| **CoStar Market Data Agent charter** | `docs/agents/costar-market-data-agent.md` |
| **CompSet Underwriting Agent charter** | `docs/agents/compset-underwriting-agent.md` |
| **CEO / Orchestration Agent supervision charter** | `docs/agents/ceo-agent-supervision-layer.md` |
| Operator import templates (CSV) | `services/transactions/templates/{transaction,project}_import_template.csv` |
| Transactions ingestion workflow doc | `docs/intelligence/transaction-ingestion-workflow.md` |
| Master dataset architecture | `docs/intelligence/master-dataset-architecture.md` |
| Data normalization rules (field-by-field) | `docs/intelligence/data-normalization-rules.md` |
| Transaction schema (full 59-col reference) | `docs/intelligence/transaction-schema.md` |
| Project schema (full 50-col reference) | `docs/intelligence/project-schema.md` |
| Library route layout (LibraryShell wrapper) | `apps/web/src/app/library/layout.tsx` |
| Library types | `apps/web/src/types/library.ts` |
| Library seed (6 institutional showcases — live in DB) | `docs/database/migrations/0005_seed_library_demo_data.sql` |
| Library query hooks (TanStack Query — `useLibraryReports`, `useFavoriteValuationIds`, `useToggleFavorite`) | `apps/web/src/lib/library/queries/` |
| Library adapter (`valuation` DB row → `LibraryReport`) | `apps/web/src/lib/library/adapters/valuation-to-report.ts` |
| Library Zustand UI store (legend / layers / filter / search / selection) | `apps/web/src/lib/library/store.ts` |
| Library components surface (barrel) | `apps/web/src/components/library/index.ts` |
| Library shell (AppHeader + body + slim footer) | `apps/web/src/components/library/library-shell.tsx` |
| Library sidebar (title + legend + filter + CTA) | `apps/web/src/components/library/library-sidebar.tsx` |
| Map legend card + layer toggles | `apps/web/src/components/library/map-legend-card.tsx` |
| Tiny rail toggle (32×18) | `apps/web/src/components/library/map-layer-toggle.tsx` |
| FAVORITOS / TOP segmented filter | `apps/web/src/components/library/library-filter-tabs.tsx` |
| Mock institutional grayscale map | `apps/web/src/components/library/hotel-map.tsx` |
| Hotel map marker (category-coloured) | `apps/web/src/components/library/hotel-map-marker.tsx` |
| Floating zoom +/- + layers control | `apps/web/src/components/library/institutional-map-controls.tsx` |
| Floating preview card | `apps/web/src/components/library/floating-hotel-card.tsx` |
| Shared institutional dark footer | `apps/web/src/components/layout/institutional-footer.tsx` |

---

## Domain — Admin / Financials (institutional defaults)

| Task | File(s) |
|---|---|
| Admin financials page (CAPEX matrix · Financial structure · P&L Forecast COSTAR) | `apps/web/src/app/user/admin/financials/page.tsx` |
| Defaults source-of-truth · CAPEX_DEFAULTS · FINANCIAL_STRUCTURE_DEFAULTS · PNL_FORECAST_5Y · PNL_GEO_FILTERS · PNL_ROOM_STATS · ROOM_TIERS · STAR_CATEGORIES | `apps/web/src/lib/admin/financials/defaults.ts` |
| useOverrides + useDraftedOverrides + formatSavedAt (localStorage persistence with explicit Save flow) | `apps/web/src/lib/admin/financials/use-overrides.ts` |
| CAPEX defaults card (12 lines · 3 groups · 9-cell editable matrix · per-row unit dropdown · compact format) | `apps/web/src/components/admin/financials/capex-defaults-card.tsx` |
| Financial structure card (12 baseline parameters · value editable · label/unit/description read-only) | `apps/web/src/components/admin/financials/financial-structure-card.tsx` |
| P&L Forecast COSTAR card (geo filter chips · 4 reactive Room Stats boxes · USALI assumptions table) | `apps/web/src/components/admin/financials/pnl-benchmarks-card.tsx` |
| Save bar (3-state header control: hydrating · dirty · clean) | `apps/web/src/components/admin/financials/save-bar.tsx` |
| Admin sidebar nav (Financials between Hotels and Integrations) | `apps/web/src/components/admin/admin-sidebar.tsx` |

---

## Domain — Admin / Contacts (relationship console)

| Task | File(s) |
|---|---|
| Contacts page · Phase A 8-group filter + Phase C contact_category_v2 + bulk delete + manual create | `apps/web/src/app/user/admin/contacts/page.tsx` |
| Server-side aggregator · loadContacts (deleted_at filter) · loadContactKpis (liveCount helper) · loadContactDetail · GROUP_KEY_TO_V2_BUCKET · RELATIONSHIP_TYPE_GROUPS | `apps/web/src/lib/admin/contacts/live.ts` |
| Per-contact mutations · updateContact · markInvalid · tag · owner · status · createContactAction (manual entry · 8-bucket Type) · isNextRedirectError helper | `apps/web/src/lib/admin/contacts/mutations.ts` |
| Bulk operational workflows · 12 actions including bulkSoftDeleteAction + bulkHardDeleteAction · isNextRedirectError guard in 11 catches | `apps/web/src/lib/admin/contacts/bulk.ts` |
| Filter chip strip (8 Relationship Type groups · canonical taxonomy) | `apps/web/src/components/admin/contacts/contacts-filters.tsx` |
| Contacts table (8 visible cols post-perf-trim · sticky thead · drawer-driven detail) | `apps/web/src/components/admin/contacts/contacts-table.tsx` |
| Bulk action toolbar (sticky bottom bar · Trash icon delete · 12 action panels) | `apps/web/src/components/admin/contacts/bulk/bulk-action-toolbar.tsx` |
| Contact create drawer (Plus button → form · 8 fields · 8 canonical Type bucket dropdown) | `apps/web/src/components/admin/contacts/contact-create-drawer.tsx` |
| Contact detail drawer (view + edit) | `apps/web/src/components/admin/contacts/contact-detail-drawer.tsx` · `contact-detail-drawer-edit.tsx` |
| KPI strip (totals + by relationship type 8 buckets) | `apps/web/src/components/admin/contacts/contacts-kpis.tsx` |

---

## Domain — Report Module

| Task | File(s) |
|---|---|
| **Report system synchronization audit (v1 · institutional · no implementation)** | `docs/report/synchronization-audit-v1.md` |
| **Phase 1 · Token harmonization plan (gated · approval pending)** | `docs/report/phase-1-token-harmonization.md` |
| Section registry (canonical, 6 sections + sub-anchors + printPageBreak) | `apps/web/src/lib/report/sections.ts` |
| Section taxonomy types | `apps/web/src/types/report/index.ts` |
| Report shell (top-nav, sidebar, footer, main canvas) — `printOrientation: "portrait" \| "landscape"` | `apps/web/src/components/report/shell/report-shell.tsx` |
| Report paper card (`closed`, `headerLayout`, `actions`) | `apps/web/src/components/report/shell/report-paper.tsx` |
| Report sidebar (driven by sections.ts, two-pass active detection) | `apps/web/src/components/report/shell/report-sidebar.tsx` |
| Report top nav | `apps/web/src/components/report/shell/report-top-nav.tsx` |
| Report footer | `apps/web/src/components/report/shell/report-footer.tsx` |
| **Canonical primitives barrel** | `apps/web/src/components/report/primitives/index.ts` |
| Section page wrapper (preferred for new pages) | `apps/web/src/components/report/primitives/report-section.tsx` |
| Page header bar | `apps/web/src/components/report/primitives/report-header.tsx` |
| MetricRow / MetricTable | `apps/web/src/components/report/primitives/metric-row.tsx` / `metric-table.tsx` |
| StatCard / StatGrid | `apps/web/src/components/report/primitives/stat-card.tsx` |
| UpgradeGate / UpgradeCard | `apps/web/src/components/report/primitives/upgrade-gate.tsx` |
| ImageGallery | `apps/web/src/components/report/primitives/image-gallery.tsx` |
| ReportMap | `apps/web/src/components/report/primitives/report-map.tsx` (re-exports `ui/report-map.tsx`) |
| PrintPage | `apps/web/src/components/report/primitives/print-page.tsx` |
| PdfExportButton | `apps/web/src/components/report/primitives/pdf-export-button.tsx` |
| PDF export entry | `apps/web/src/lib/report/pdf-export.ts` (`exportReport`) |
| A4 print CSS (canvas, scaling, Firefox fallback, utilities) | `apps/web/src/app/globals.css` |
| Report page — Executive Summary | `apps/web/src/app/report/executive-summary/page.tsx` |
| Report page — Asset Analysis · Hotel personalizado | `apps/web/src/app/report/asset-analysis/page.tsx` |
| Report page — Asset Analysis · CAPEX & Renders | `apps/web/src/app/report/asset-analysis/capex/page.tsx` |
| Report page — Competitive Set | `apps/web/src/app/report/competitive-set/page.tsx` |
| Report page — Market Overview | `apps/web/src/app/report/market-overview/page.tsx` |
| Executive Summary data + locale formatters | `apps/web/src/lib/report/executive-summary-data.ts` |
| Competitive Set data + types | `apps/web/src/lib/report/competitive-set-data.ts` |
| Asset Analysis data | `apps/web/src/lib/report/asset-analysis-data.ts` |
| CAPEX & Renders data | `apps/web/src/lib/report/capex-renders-data.ts` |
| Market Overview data | `apps/web/src/lib/report/market-overview-data.ts` |
| Intl-based formatter library | `apps/web/src/lib/report/formatting.ts` |
| Executive Summary sub-components | `apps/web/src/components/report/executive-summary/` |
| Asset Analysis sub-components (Hotel personalizado) | `apps/web/src/components/report/asset-analysis/` |
| CAPEX & Renders sub-components | `apps/web/src/components/report/asset-analysis/capex/` |
| Competitive Set sub-components | `apps/web/src/components/report/competitive-set/` |
| Market Overview sub-components (insight card, charts, carousel, demand generators) | `apps/web/src/components/report/market-overview/` |
| KPICard / KPIGrid (used by StatCard primitive) | `apps/web/src/components/report/kpi/` |
| Sparkline bar / line charts | `apps/web/src/components/report/charts/` |
| Methodological note (full-width endcap) | `apps/web/src/components/report/ui/methodological-note.tsx` |
| Methodology note (inline column-fitted variant) | `apps/web/src/components/report/asset-analysis/methodology-note.tsx` |
| Locked gate / upgrade card (raw — prefer `UpgradeGate` primitive) | `apps/web/src/components/report/ui/locked-gate.tsx` / `locked-upgrade-card.tsx` |

---

## Domain — Review / Data Quality

| Task | File(s) |
|---|---|
| Review page (3 tabs) | `apps/web/src/app/(dashboard)/review/page.tsx` |
| KPI summary cards | `apps/web/src/components/review/summary-cards.tsx` |
| Merge recommendations UI | `apps/web/src/components/review/merge-queue.tsx` |
| Alias conflicts UI | `apps/web/src/components/review/conflict-queue.tsx` |
| Low-confidence UI | `apps/web/src/components/review/low-confidence-queue.tsx` |
| Review summary endpoint | `apps/api/app/api/v1/review/router.py` |

## Domain — Dedup / Merge Engine

| Task | File(s) |
|---|---|
| Scoring + scan logic | `apps/api/app/services/dedup_service.py` |
| Dedup API routes | `apps/api/app/api/v1/dedup/router.py` |
| MergeRecommendation model | `apps/api/app/models/merge_recommendation.py` |
| Dedup schemas | `apps/api/app/schemas/merge_recommendation.py` |
| Dedup TS types | `apps/web/src/types/dedup.ts` |
| Dedup hooks | `apps/web/src/lib/api/dedup.ts` |

## Domain — Alias Registry

| Task | File(s) |
|---|---|
| Alias models (4 tables) | `apps/api/app/models/alias.py` |
| Alias service | `apps/api/app/services/alias_service.py` |
| Hotel alias routes | `apps/api/app/api/v1/aliases/hotel_aliases.py` |
| Operator alias routes | `apps/api/app/api/v1/aliases/operator_aliases.py` |
| Conflict routes | `apps/api/app/api/v1/aliases/conflicts.py` |
| Merge history routes | `apps/api/app/api/v1/aliases/merges.py` |

## Domain — Audit Log

| Task | File(s) |
|---|---|
| Audit model | `apps/api/app/models/audit_log.py` |
| Audit schemas | `apps/api/app/schemas/audit_log.py` |
| Audit service (log, rollback, list) | `apps/api/app/services/audit_service.py` |
| Audit routes | `apps/api/app/api/v1/audit/router.py` |
| Optional actor dependency | `apps/api/app/core/security.py` → `get_optional_actor_id` |
| Migration | `apps/api/alembic/versions/0005_audit_log.py` |

## Domain — Valuations

| Task | File(s) |
|---|---|
| DCF + underwriting service | `apps/api/app/services/valuation_service.py` |
| DCF routes | `apps/api/app/api/v1/valuations/dcf.py` |
| Underwriting routes | `apps/api/app/api/v1/valuations/underwriting.py` |
| Standalone financial engine | `services/financial_engine/engine/dcf/projections.py` |

## Domain — Normalisation

| Task | File(s) |
|---|---|
| Full multilingual pipeline | `services/data_pipeline/pipeline/cleaning/multilingual.py` |
| Dedup key | `services/data_pipeline/pipeline/cleaning/names.py` |
| Geography | `services/data_pipeline/pipeline/cleaning/geography.py` |
| Inlined copy (dedup service) | `apps/api/app/services/dedup_service.py` (top section) |
| Inlined copy (alias service) | `apps/api/app/services/alias_service.py` (`_key()`) |

## Domain — Data Pipeline / Imports

| Task | File(s) |
|---|---|
| ETL base class | `services/data_pipeline/pipeline/etl/base.py` |
| Hotel ETL | `services/data_pipeline/pipeline/etl/hotels.py` |
| Excel parser / validator | `services/data_pipeline/pipeline/excel/parser.py` / `validator.py` |
| CoStar normaliser | `services/data_pipeline/pipeline/costar/normalizer.py` |
| CLI | `services/data_pipeline/pipeline/cli/main.py` |
| Import API routes | `apps/api/app/api/v1/imports/excel.py` / `costar.py` |

---

## Infrastructure

| Task | File(s) |
|---|---|
| Docker Compose (dev) | `infrastructure/docker/docker-compose.dev.yml` |
| Nginx (prod) | `infrastructure/nginx/nginx.conf` |
| Alembic migrations | `apps/api/alembic/versions/` |

---

## Documentation

| Doc | When to read |
|---|---|
| `docs/architecture.md` | Service topology, runtime infra, ports, app flow |
| `docs/routing.md` | All routes, layout shells, navigation wiring |
| `docs/frontend.md` | App Router, component map, auth flow |
| `docs/report-system.md` | Canonical report architecture: shell, sidebar, 5 implemented sections |
| `docs/print-pdf.md` | A4 portrait + landscape canvases, named-page rules, Firefox fallback, carousel ↔ static-grid logic |
| `docs/maps.md` | Mapbox CompSet map + stylised pin map (Market Overview) |
| `docs/design-system.md` | Color tokens, typography, spacing, Tailwind conventions |
| `docs/component-library.md` | Canonical primitives catalog (preferred for new pages) |
| `docs/business-rules/tier-system.md` | Premium tiers + Premium gates (canonical) |
| `docs/business-rules/report-visibility.md` | Visibility axes (private / public / top-promote) |
| `docs/business-rules/promoted-reports.md` | Top Promote marketplace logic |
| `docs/financial.md` | Valuation metrics, formatters, display rules |
| `docs/workflows.md` | User flows, CTA wiring, navigation state |
| `docs/changelog.md` | Feature history — one entry per task |
| `docs/database.md` | All table schemas and FK relationships |
| `docs/api.md` | All REST endpoints |
| `docs/backend.md` | FastAPI structure, service pattern, config |
| ~~`docs/financial-engine.md`~~ | ⚠️ deprecated · Python engine frozen · use `docs/underwriting/*` |
| ~~`docs/underwriting.md`~~ | ⚠️ deprecated · backend valuation model frozen · use `docs/underwriting/*` (TS engine) |
| `docs/underwriting/` (folder) | Canonical TS engine architecture · temporal-model · phase-model · IRR layers · dynamic-cap-rate-engine · divergences |
| `docs/data-pipeline.md` | ETL flow, import modes, staging tables |
| `docs/normalization.md` | Multilingual pipeline, `_key()`, geography |
| `docs/alias-registry.md` | Alias tables, conflict detection |
| `docs/merge-engine.md` | Dedup scoring, FP signals, recommendation tiers |
| `docs/imports.md` | Column mappings, validation rules, CLI |
| `docs/deployment.md` | Docker, env vars, dev quick-start |
| `docs/auth.md` | JWT flow, token lifetimes |
| `docs/testing.md` | pytest config, markers, fixtures |
| `docs/observability.md` | structlog, Sentry, middleware headers |
| `docs/roadmap/master-roadmap.md` | Visible product phases (canonical) |
| `docs/roadmap/current-sprint.md` | Just-shipped + up-next (canonical) |
| `docs/roadmap/backlog.md` | Future ideas · blocked · tech debt (canonical) |
