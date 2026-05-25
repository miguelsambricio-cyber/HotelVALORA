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
| **Madrid bootstrap plan v1 (6 phases A–F · entry conditions · success criteria · rollback · operator touch points)** | `docs/hotel-intelligence/madrid-bootstrap-plan-v1.md` |
| **Booking RapidAPI provider scaffold v1 (dry-run mode · NO HTTP calls · NO live mode)** | `apps/web/src/lib/enrichment/providers/booking-rapidapi/` |
| RapidAPI response shapes (E0/E1/E2/E3) — typed | `apps/web/src/lib/enrichment/providers/booking-rapidapi/types.ts` |
| Env contract + tier helpers (`loadConfig`, `tierMonthlyQuota`) | `apps/web/src/lib/enrichment/providers/booking-rapidapi/config.ts` |
| Mode-aware client (live / dry-run / recorded-fixture) — live throws Phase 1 | `apps/web/src/lib/enrichment/providers/booking-rapidapi/client.ts` |
| Typed endpoint wrappers (searchLocations · searchHotels · getHotelData · getHotelFacilities) | `apps/web/src/lib/enrichment/providers/booking-rapidapi/endpoints.ts` |
| Defensive payload parser with validation gates | `apps/web/src/lib/enrichment/providers/booking-rapidapi/parse.ts` |
| Parsed → CanonicalHotelDraft + ProvenanceEntry[] mapper (uses registries) | `apps/web/src/lib/enrichment/providers/booking-rapidapi/map-to-canonical.ts` |
| `runDryRun()` orchestrator with TIER-0/1/2 counts | `apps/web/src/lib/enrichment/providers/booking-rapidapi/dry-run.ts` |
| Provider barrel + README | `apps/web/src/lib/enrichment/providers/booking-rapidapi/{index.ts,README.md}` |
| 3 Madrid fixture payloads (Ritz luxury · NH Collection upscale · Ibis economy ES-only) + sample outputs + aggregate | `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/` |
| Dry-run runner (TypeScript script — runnable via tsx once dev-dep added) | `apps/web/scripts/enrichment-booking-dry-run.ts` |
| **Live smoke test runner** (Node ESM · 3 calls E0+E1+E2 · saves raw responses to fixtures) | `apps/web/scripts/smoke-test-booking-live.mjs` |
| **Branded validation smoke** (E0+E2 against NH Collection Eurobuilding · confirms structural absence of chain in E2) | `apps/web/scripts/smoke-test-booking-branded.mjs` |
| **Phase C 50-hotel Madrid live pilot** (E1 class_descending paginated + E2 fetch + parse + map + SQL emit) | `apps/web/scripts/phase-c-madrid-smoke-pilot.mjs` |
| **Phase C pilot report v1** (50 institutional hotels live in Supabase · 29 branded · 16 families · readiness for Phase D) | `docs/hotel-intelligence/phase-c-pilot-report-v1.md` |
| **Phase D-7 Wikidata SPARQL enrichment** (111 branded Madrid hotels · mwapi:EntitySearch + geo-score · 1.1 req/s · embedded input) | `apps/web/scripts/phase-d7-wikidata-enrichment.mjs` |
| **Phase D completion report v1** (D-2 + D-4 + D-6 + D-7 metrics · structural blockers · open items) | `docs/hotel-intelligence/phase-d-enrichment-completion-report-v1.md` |
| **Hotel coverage views** (per-hotel · scored · market · Madrid headline) applied to staging Supabase | DB views: `hotel_coverage_v` · `hotel_coverage_scored_v` · `hotel_coverage_market_v` · `hotel_coverage_madrid_v` |
| **Phase D-1 provenance backfill** (508 source records + 5176 field provenance rows for Madrid 224) | DB tables: `hotel_source_record` · `hotel_field_provenance` (populated for booking/google/wikidata sources) |
| **Admin direct-edit drawer** (Edit button at top of `/user/admin/hotels/[hotelId]` sidebar · writes to Supabase canonical · render-time overlay merges latest values · disabled for non-linked hotels · sits next to but separate from operator-correction queue) | `apps/web/src/lib/admin/hotels/direct-edit.ts` + `apps/web/src/components/admin/hotels/edit-hotel-drawer.tsx` + `apps/web/src/app/user/admin/hotels/[hotelId]/page.tsx` (`applySupabaseOverlay`) |
| **Dedup consolidation layer** (`hotel_dedup_mark` table · non-destructive · canonical_survivor + hidden_from_admin/reports flags · match_evidence jsonb · 9 known dup pairs seeded · admin Search filter applied) | DB table: `public.hotel_dedup_mark` · loader at `apps/web/src/lib/admin/hotels/dedup-marks.ts` · applied in `apps/web/src/app/user/admin/hotels/page.tsx` |
| **Phase 4 canonical-backed reports** (4 of 7 sections live · Executive Summary + Asset Analysis + Competitive Set + Market Overview · canonical-reader joins hotel_canonical + market + submarket + operator + market_timeseries · per-section mappers · `?canonical_id=` AND `?hotel_id=h_<hex>` route resolution · mock fallback preserved) | `apps/web/src/lib/report/canonical-reader.ts` + `apps/web/src/lib/report/canonical-mappers/{executive-summary,asset-analysis,competitive-set,market-overview}.ts` + `apps/web/src/app/report/{executive-summary,asset-analysis,competitive-set,market-overview}/page.tsx` |
| **Cap-rate engine ↔ reports bridge** (`runForHotel(canonical_hotel)` builds AssetBasics from hotel_canonical with chain_scale heuristic fallbacks · runs `runDynamicCapRate` · returns capRate + assetBasics + heuristic_fields audit · Executive Summary mapper consumes engine for cap-rate / valuation range / GOP / €/sqm) | `apps/web/src/lib/report/underwriting-runner.ts` + `apps/web/src/lib/report/canonical-mappers/executive-summary.ts` |
| **Unified Report Object** (single canonical_id flows through every `/report/*` surface · `buildReportObject(canonical_id, { tier })` server-only orchestrator · ReportObject carries hotel + marketKpi + engineRun + financials + underwriting + capex slices + tier access matrix · admin financials defaults master · canonical hotel auxiliary · all 10 surfaces validated 80/80 PASS 2026-05-25) | `apps/web/src/lib/report/report-object/{types,build,index}.ts` + `apps/web/src/lib/report/report-object/sections/{financials,underwriting,capex}.ts` + `apps/web/src/lib/report/report-object/adapters/capex-to-breakdown.ts` |
| **Tier matrix · section-level gating** (FREE → Executive Summary only · PRO → all main sections read-only · PREMIUM → all + editable · 9 section helpers: `canSeeAssetAnalysis/CompetitiveSet/MarketOverview/FinancialsPL/Underwriting/CapexDetail/FinancialStructure/ExitScenarios/Renders` + `isFreeTier`) | `apps/web/src/lib/report/use-tier.ts` |
| **Report integrity QA harness** (8 showcases × 10 surfaces · vercel curl bypasses BotID · re-runnable · last result 80/80 PASS) | `apps/web/scripts/showcase-phase-de-qa.mjs` |
| **Report integrity audit + Phase E verdict** (8×8 matrix · canonical-coupling map · root-cause analysis · 5-phase remediation plan · final verdict 80/80 PASS post-fix) | `docs/hotel-intelligence/report-integrity-audit-2026-05-25.md` + `docs/hotel-intelligence/report-integrity-phase-e-verdict-2026-05-25.md` |
| **Library 5-layer architecture · showcase seed** (8 Madrid showcases · 3 top-promoted · `report_origin` classifier in `hotel_report_library` · migration 0027 applied · tier_badge + is_top_promote + contact_visible columns · adapter swap for favorites-list/map and top-list/map · 1 manual_seed + 223 bulk_seed honestly classified) | `docs/database/migrations/0027_library_origin_tier_promote.sql` + `apps/web/src/lib/library/adapters/report-library-to-report.ts` + `apps/web/src/lib/report/library-persistence.ts` |
| **Library architecture audit + 5-layer separation proposal** (Showcase · Community · Top Promote · Favorites · Institutional Library) | `docs/hotel-intelligence/library-architecture-audit-2026-05-21.md` + `docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md` + `docs/hotel-intelligence/library-integrity-audit-2026-05-21.md` |
| **D-8 bot-defense finding + manual-backfill pivot** (Hilton+Marriott smoke test blocked by enterprise WAF · operator policy rules out browser impersonation · pivot to Wikidata SPARQL + targeted manual operator backfill + CoStar Inmuebles re-ingest for the 224 corpus · D-8 design + scaffold kept for small-chain future) | `docs/hotel-intelligence/d8-bot-defense-finding-2026-05-20.md` |
| **Admin → reports bridge** ("View as report" sidebar buttons on `/user/admin/hotels/[hotelId]` linking to the 4 canonical-backed sections with `?canonical_id=<resolved-uuid>` · only renders when canonical resolves · amber callout otherwise) | `apps/web/src/app/user/admin/hotels/[hotelId]/page.tsx` |
| **Corpus sync audit** (253 target reconciliation · 224 canonical hotels · per-field coverage · acceptance criteria · 4 representative smoke-test IDs) | `docs/hotel-intelligence/corpus-sync-audit-2026-05-20.md` |
| **Phase D-8 hotel-website fallback — design v1** (allowlist Marriott/Hilton/Meliá/NH/Hyatt/IHG/Accor · 4 target fields · architecture · adapters · cost · T2 ROI math showing 70 % goal unreachable without spec revision) | `docs/hotel-intelligence/phase-d8-hotel-website-design-v1.md` |
| **Madrid dedup sweep** (pg_trgm composite scoring · no true duplicates · 2 known-distinct sister-property pairs flagged for review) | DB table: `hotel_duplicate_candidate` (2 likely_duplicate / pending_review rows) |
| **Strategic model audit v1** (cross-reference of strategic docs vs Phase D · validated/redefine parts · cohort axis decision · critical-vs-cosmetic field map · superseding equal-weight T2 with three readiness scores · operator decision queue) | `docs/hotel-intelligence/strategic-model-audit-v1.md` |
| **Admin/hotels Phase D panel** (Supabase-backed Madrid enrichment surface · tier distribution · priority-field coverage bars · provenance + dedup counts · T2-goal badge · structural blockers callout — additive to legacy CoStar snapshot section) | `apps/web/src/lib/admin/hotels/enrichment-stats.ts` + `apps/web/src/components/admin/hotels/enrichment-panel.tsx` + `apps/web/src/app/user/admin/hotels/page.tsx` |
| **Madrid markets + submarkets reference data** (1 market · 20 submarkets · institutional_tier 1/2/3 · postal_prefixes[] + neighborhood_aliases[] · geom column reserved for polygons) | DB tables: `public.market` · `public.submarket` |
| **Readiness v2 views** (underwriting_ready 8/8 + partial 6/8 · library_ready/partial · premium_report_ready · aggregated per market) | DB views: `hotel_underwriting_ready_v` · `hotel_library_ready_v` · `hotel_premium_report_ready_v` · `hotel_readiness_market_v` |
| **documented_independent flag** (operator-set boolean on hotel_canonical for premium-eligible indies) | `public.hotel_canonical.documented_independent` |
| **Migration 0024 applied** to staging Supabase (project `twebgqutuqgonabvhzjk`) — 8 tables · 10 enums · 48 indexes · PostGIS 3.3 · RLS posture confirmed | `docs/database/migrations/0024_hotel_enrichment_schema.sql` |
| **BookingRapidApiClient.executeLive** — real HTTP path with timeout · status mapping · JSON parse · classified errors | `apps/web/src/lib/enrichment/providers/booking-rapidapi/client.ts` |
| **Live smoke fixtures (E0+E1+E2 against booking-com15)** — captured 2026-05-19 · Madrid hotel_id 12269658 | `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-{e0,e1,e2,smoke-summary}-*.json` |
| **Wire-shape validation v1 (drift analysis · authoritative source-of-record · parser/mapper update plan)** | `docs/hotel-intelligence/booking-com15-wire-shape-validation-v1.md` |
| **Dedup engine (M3 · institutional moat #1)** — block-key + composite scoring + apartment override + identity-match override | `apps/web/src/lib/enrichment/dedup/` |
| Dedup primitives — Jaro-Winkler · Soundex · normalize · stopword strip | `apps/web/src/lib/enrichment/dedup/string-similarity.ts` |
| Dedup scoring — `blockKey` · haversine · proximity tiers · composite (35/30/20/10/5) | `apps/web/src/lib/enrichment/dedup/scoring.ts` |
| Dedup top-level — `evaluateCandidate(candidate, knownRows)` → tier decision + rationale | `apps/web/src/lib/enrichment/dedup/engine.ts` |
| **Confidence module (M3 · institutional moat #2)** — formula + conflict resolver + quality-tier compute | `apps/web/src/lib/enrichment/confidence/` |
| Source tier registry (11 tiers S/A/B/C/D/E/F/Z/OVERRIDE + per-field authority overrides) | `apps/web/src/lib/enrichment/confidence/tier-registry.ts` |
| Confidence calculator — `tier × freshness × validation + agreement_bonus` clamped | `apps/web/src/lib/enrichment/confidence/calculator.ts` |
| Conflict resolver — 6-case overwrite policy (ADOPT · PRESERVE · REINFORCE · AUTO_SUPERSEDE · ABSORB · CONFLICT) + `computeQualityTier` | `apps/web/src/lib/enrichment/confidence/conflict-resolver.ts` |
| **Orchestrator (M4)** — end-to-end runner + retry/DLQ + in-memory canonical store | `apps/web/src/lib/enrichment/orchestrator/` |
| Orchestrator types — `EnrichmentJob` · `JobExecutionResult` · `ExecutionContext` · `JobOutcome` · `ErrorClass` | `apps/web/src/lib/enrichment/orchestrator/types.ts` |
| Retry / DLQ policy — per-error-class table · exp backoff + jitter · circuit breaker per source | `apps/web/src/lib/enrichment/orchestrator/retry-policy.ts` |
| In-memory canonical store (dry-run) — same interface as the Supabase-backed store that replaces it Phase 3 | `apps/web/src/lib/enrichment/orchestrator/in-memory-store.ts` |
| Job runner — full pipeline: fetch → parse → map → dedup → conflict-resolve → coverage → outcome | `apps/web/src/lib/enrichment/orchestrator/runner.ts` |
| Orchestrator demo trace (4-job sequence demonstrating dedup auto_merge + per-field conflict review queue) | `apps/web/src/lib/enrichment/orchestrator/fixtures/demo-execution-trace.json` |
| Near-duplicate fixture (Ritz variant — exercises auto_merge tier + conflict-resolver review-queue routing) | `apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/madrid-ritz-near-duplicate.json` |
| **Writer module (M5)** — persistence layer · `DryRunWriter` (captures) + `SupabaseWriter` (executes) · shared `IntendedWrite[]` plan | `apps/web/src/lib/enrichment/writer/` |
| Writer types — IntendedWrite taxonomy · WriterReport · EnrichmentWriter | `apps/web/src/lib/enrichment/writer/types.ts` |
| Plan generator — `planIntendedWrites(result, ctx)` → 6-step ordered write plan | `apps/web/src/lib/enrichment/writer/intended-writes.ts` |
| Dry-run writer — captures plan + emits summary; no DB | `apps/web/src/lib/enrichment/writer/dry-run-writer.ts` |
| Supabase canonical store reader — `seedFromBlockKey` / `seedFromCandidate` / `loadByExternalId` (returns InMemoryCanonicalStore — preserves orchestrator sync interface) | `apps/web/src/lib/enrichment/writer/supabase-canonical-store.ts` |
| Supabase writer — ordered inserts via injected SupabaseClient (Phase A+) | `apps/web/src/lib/enrichment/writer/supabase-writer.ts` |
| **Migration 0024 patch** — adds `block_key text` column + partial index on `hotel_canonical` (still NOT applied) | `docs/database/migrations/0024_hotel_enrichment_schema.sql` |
| **Fallback dispatcher (M6 orchestrator extension)** — consumes `JobExecutionResult` → emits per-provider fallback `EnrichmentJob[]` | `apps/web/src/lib/enrichment/orchestrator/fallback-dispatcher.ts` |
| Fallback dispatch trace artifact — 3 fixtures × 2 providers per hotel + discipline notes | `apps/web/src/lib/enrichment/orchestrator/fixtures/fallback-dispatch-trace.json` |
| **Google Places provider (M6)** — Tier-C fallback for geo/contact/place_id · dry-run, live throws | `apps/web/src/lib/enrichment/providers/google-places/` |
| **Hotel-website provider (M6)** — Tier-B fallback · HEAD-only · robots.txt · per-domain authorisation · 4-8s jitter | `apps/web/src/lib/enrichment/providers/hotel-website/` |
| Robots.txt parser + per-domain compliance cache + `HOTELVALORA_USER_AGENT` constant | `apps/web/src/lib/enrichment/providers/hotel-website/robots.ts` |
| **Wikidata provider (M6)** — Tier-F fallback · 1 req/s · batched SPARQL · public endpoint | `apps/web/src/lib/enrichment/providers/wikidata/` |
| Provider hierarchy + cross-provider invariants documentation | `apps/web/src/lib/enrichment/providers/README.md` |
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
