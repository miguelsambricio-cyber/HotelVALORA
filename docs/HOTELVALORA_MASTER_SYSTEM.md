# HOTELVALORA — Master System

> Single executive entry point for the HotelVALORA institutional platform.
> Cross-references every other doc in `/docs/*` and the four AI-context files at
> repo root (`AI_CONTEXT.md`, `RULES.md`, `ENTRYPOINTS.md`, `README.md`).

**Last refreshed:** 2026-05-20 — keep this date current after structural updates.

> **2026-05-20 · Dedup consolidation layer (non-destructive · 9 marks live).** New `public.hotel_dedup_mark` table seeds the 9 known dup pairs as `duplicate_marked` with `hidden_from_admin=true`, `hidden_from_reports=true`, `canonical_survivor_snapshot_id` pointing to the kept row, and a `match_evidence` jsonb for audit. Admin Search view filters dup rows at render time; an amber caption surfaces the hidden count. Per operator direction: NO auto-delete, NO destructive merge — survivor pointers + display flags only, full audit trail preserved. Identity resolution evolves toward multi-factor (geo · postal · normalized_address · operator/brand · phone · place_id · fuzzy name) — current marks layer is the audit-friendly home for those future automated decisions. Files: `apps/web/src/lib/admin/hotels/dedup-marks.ts` (NEW · 60s-cached loader) · `apps/web/src/app/user/admin/hotels/page.tsx` (filter wired).

> **2026-05-20 · Snapshot dedup audit + BLESS / Palladium brand fix.** 3-axis fuzzy audit on 530 snapshot hotels found 9 confirmed duplicate pairs (18 hotels) · 498 unique confirmed · 14 hotels in false-positive groups (real siblings). Pattern: Booking-truncated short-name row vs Supabase-canonical long-name row of the same property (BLESS · Crowne Plaza · Mandarin Oriental Ritz · Hotel Único · etc.). Root cause: synthetic `hotel_id = sha256(country|market|name)` differs when ingest passes use different name strings. BLESS canonical row corrected in Supabase (brand BLESS · brand_family Palladium Hotel Group · operator_id Palladium · chain_scale luxury · operator_type managed). Brand registry extended with 3 Palladium entries (BLESS · Ushuaïa · TRS Hotels). Full audit report at `docs/hotel-intelligence/snapshot-dedup-audit-2026-05-20.md`.

> **2026-05-20 · Hotel detail · admin direct-edit drawer (Supabase-persisted).** New "Edit hotel" button at the top of the `/user/admin/hotels/[hotelId]` sidebar (above "Open underwriting view") opens a right-side drawer with all 27 editable fields grouped by section. Writes directly to Supabase `public.hotel_canonical` via `applyDirectHotelEditAction` server action — bypasses the operator-correction queue (which stays in place for end-user feedback). Render-time overlay (`applySupabaseOverlay`) merges Supabase canonical values on top of the snapshot.json baseline at page render so admin edits are visible immediately. Drawer pre-fills current values · dirty fields highlighted amber · submit disabled until proposed differs from current · unmappable fields (score_costar/owner/total_floors/etc.) reported back so operator knows to use the correction queue for those. Disabled for hotels without `canonical_id_supabase` (legacy CoStar-only entries) — tooltip points to correction queue. Both edit paths live side-by-side: drawer (direct · admin · instant) at top of sidebar · Submit correction (queue · review · feedback) at bottom.

> **2026-05-20 · Hotel detail correction form · expanded to 27 fields + current-value prefill.** Operator reported lack of manual-edit capability on `/user/admin/hotels/[hotelId]`. CorrectionForm now covers 27 fields (was 13) — adds postal_code · latitude/longitude · meeting_rooms_count · meeting_space_sqm · parking_spaces · total_floors · gross_building_sqm · phone · website_url · google_place_id · wikidata_qid · data_quality_tier · notes. UX upgrade: selecting a field auto-loads its current value into the proposed input (in-place edit pattern) + read-only "Current value" panel renders above. Submit button disabled until proposed differs from current. Pipeline unchanged · still writes to `services/costar/corrections/<YYYY-MM>.jsonl` · next ingest.py consumes via supersede with full provenance trail.

> **2026-05-20 · `HotelRow` inline enrichment — in-place integration.** Per operator request: integrate Supabase enrichment data into the existing HotelRow component (no new sections). Header line now carries a small `gold/silver/bronze/quarantined` data-quality pill (Supabase canonical) after the NEW badge. Metadata line surfaces phone + website host + wikidata QID + Google Places id as inline icons/pills alongside the existing rooms/year/confidence. `HotelReferenceRecord` type extended with 8 optional passthrough fields (phone · website_url · google_place_id · wikidata_qid · canonical_id_supabase · data_quality_tier · enrichment_sources · last_scraped_at) — already populated in snapshot.json from the v1.4 ingest run. Zero new queries, zero performance cost.

> **2026-05-20 · Reverted dense EnrichmentPanel + fixed submarket taxonomy to CoStar canonical 8.** Operator feedback: panel too dense + submarket distribution used Madrid administrative districts instead of CoStar institutional submarkets. EnrichmentPanel files deleted (`enrichment-panel.tsx` + `enrichment-stats.ts`); `/user/admin/hotels` reverts to prior shape (KPI strip · tabs · Search · reconciliation · transactions · projects · corrections · analytics) PLUS the Phase 1 Type filter default. Submarket table reseeded with CoStar canonical 8: **Madrid Centre · Chamartin & Plaza de Castilla · Salamanca · Arguelles & Chamberi · Retiro · Barajas/Hortaleza/San Blas · Madrid Surrounding · Madrid Province Regional**. 224 hotels re-backfilled: Madrid Centre 96 · Barajas/Hortaleza/San Blas 36 · Salamanca 27 · Chamartin & Plaza de Castilla 19 · Arguelles & Chamberi 18 · Retiro 16 · Madrid Surrounding 12. Master xlsx regenerated. DB readiness views + provenance + operator_type derivation + master xlsx schema enrichment all PRESERVED — only the dense UI panel was reverted.

> **2026-05-20 · `/user/admin/hotels` Search · Phase 1 default = hotels only.** Type filter now defaults to `hotel` when no `?type=` query param is set — hostels + tourist_apartments hidden in the preview table until operator explicitly switches via the Type dropdown. Visual caption surfaces the hidden count so the default is transparent. No DB / canonical / ingest changes — purely a view default. KPI strip totals still reflect the full inventory.

> **2026-05-20 · COSTAR_MASTER_HOTELESperMARKET refreshed with Supabase enrichment (224 Madrid hotels).** Master xlsx now 530 rows × 159 columns, up from 364 × 153. Six new columns added end-to-end through the ingest pipeline (HOTEL_HEADER_ALIASES + normalise_hotel_row + HOTELS_BY_MARKET_COLUMNS + _hotel_to_row): `phone` (209/224) · `website_url` (216) · `google_place_id` (218) · `wikidata_qid` (66) · `canonical_id_supabase` (224, bridges to Supabase canonical) · `data_quality_tier` (224, gold/silver/bronze). New CLI `services/costar/scripts/dump_canonical_to_master_csv.py` produces the input CSV from any MCP `execute_sql` JSON dump. env-parser bug in `build_masters.py` fixed (literal empty quoted strings now treated as absent — previously aborted HOTELESperMARKET writes). 12 fuzzy duplicates surfaced as `suspected_duplicate` reconciliation entries between our 224 Phase-D rows and pre-existing 364 CoStar entries — operator review queue working as designed.

> **2026-05-20 · Phase E · readiness v2 live + markets/submarkets schema.** Autonomous-mode execution. New `public.market` + `public.submarket` tables seeded (1 market + 20 submarkets · institutional_tier 1/2/3). 224/224 Madrid hotels backfilled with `market_id` + `submarket_id` (neighborhood alias match → postal_prefix fallback). Submarket distribution: 162 T1 institutional core (Centro/Salamanca/Chamberí/Retiro/Chamartín/Barajas) · 31 T2 · 31 T3. operator_type deterministically derived: 111 branded → `'managed'` (conf 0.70) · 113 indies remain `'unknown'`. New `documented_independent` boolean column added (operator-set premium-indie flag). Four readiness views live: `hotel_underwriting_ready_v` (8 cap-rate inputs · full 8/8 + partial 6/8 flags) · `hotel_library_ready_v` · `hotel_premium_report_ready_v` · aggregated `hotel_readiness_market_v`. Madrid headline: 0 underwriting_ready (blocked on total_rooms + year_opened) · **111 underwriting_partial (49.5%) — all branded qualify** · 33 library_partial. Admin panel rewritten to surface readiness v2 above the fold + submarket tier grid + cohort split. Preview redeploying on feature branch.

> **2026-05-20 · `/user/admin/hotels` panel v1.1 — semantic/UX fixes pre-merge.** 6 operator-approved fixes applied to clarify that T2 v1 equal-weight metric is deprecated and pending v2 replacement: (1) "T2 goal" amber badge replaced by slate "T2 v1 spec · LEGACY · v2 readiness pending"; (2) audit/transition banner under header; (3) T2 v1 stats collapsed into `<details>` block; (4) operator_id branded-vs-indie by-design split (no longer framed as a defect); (5) scope filter hides hostels/apartments/serviced/flex from panel (~16/224 hidden · kept in DB); (6) "institutional-ready" wording removed from main UI per operator direction — uses "underwriting coverage" / "core underwriting fields" / "data completeness" instead. New stat above the fold: "Core underwriting fields · X/8 avg" (cap-rate engine's 8 inputs). Preview redeployed on feature branch; main untouched.

> **2026-05-20 · `/user/admin/hotels` wired with Phase D Madrid enrichment panel.** New section between KPI strip and tab bar reads Supabase `hotel_canonical` + `hotel_coverage_madrid_v` + `hotel_source_record` + `hotel_field_provenance` + `hotel_duplicate_candidate` via service-role client. Surfaces: tier distribution (109 gold / 2 silver / 113 bronze · 0 quarantined), operator-priority field coverage with red-flag bars on the structurally-blocked fields (`total_rooms` 0 % · `year_opened` <1 %), T1 passing (57 / 224 · avg 85.4 %), T2 passing (0 — under the equal-weight spec under audit), source-record + field-provenance counts (508 / 5176), dedup queue counts, T2-goal badge (0 % / 70 % target). Built as additive section — existing CoStar snapshot flow (loadHotelsSnapshot) untouched. Files: `apps/web/src/lib/admin/hotels/enrichment-stats.ts` (server-only Supabase loader) · `apps/web/src/components/admin/hotels/enrichment-panel.tsx`. Service-role envs already wired on Vercel.

> **2026-05-20 · Phase D-1 provenance backfill + dedup sweep + D-8 design + strategic audit landed on `feature/hotel-enrichment-pipeline`.** Commits `eb7aeaf` (D-2/D-4/D-6/D-7) + `338ab97` (D-1 + dedup + D-8 design) + `3feb9a1` (strategic model audit v1). Three new institutional docs: `phase-d-enrichment-completion-report-v1.md` · `phase-d8-hotel-website-design-v1.md` · `strategic-model-audit-v1.md`. **Critical finding** in audit: the equal-weight T2 spec gives identical coverage to UI-cosmetic fields (amenities/hero/phone/website/place_id/address) and underwriting-critical fields (chain_scale/market_id/submarket_id/total_rooms/year_opened/operator_type). The branded/indie cohort axis I initially proposed is the wrong one — recommendation is three orthogonal readiness scores (`underwriting_ready` / `library_ready` / `premium_report_ready`). 6 open questions queued for operator. Re-anchored 70 % goal to `underwriting_ready` is ~80 %+ achievable on the 224 corpus with PostGIS markets + deterministic chain_scale/operator_type derivation — no D-8 dependency for the institutional gate; D-8 stays scoped to 7-chain allowlist for premium_report_ready uplift on the 55 branded subset.

> **2026-05-15 · Contactos Phase C COMPLETE + sentinel lifted.** UI switch shipped (commit `6eeb7cf` · `apps/web/src/lib/admin/contacts/live.ts` reads `contact_category_v2` directly via `.eq()` against indexed column · backward compat fallback for raw `?investor_type=Lender` URL bookmarks · `RELATIONSHIP_TYPE_GROUPS` retained as documentation). Vercel deploy `dpl_6yMZ7Ert1QGRtKmcQypRgsWzLu2t` READY in 62s · live at `hotelvalora.com`. Sentinel `.phase_b_repair_in_progress.lock` lifted at 03:21:36Z · `classify_master.py` and `promote_to_supabase.py` both operational. Phase B-Repair / Phase C governance period closed. Total exposure during repair + Phase C: ~14 hours sentinel active · 54s of write-window across 3 sentinel-cycled promotes (Step 2 baseline · iter3 FINANCIADORES- fix · iter3.5 Fernández Molina + iTrust). 4 Master backups preserved on disk. `relationship_type` column exists with 0/4547 populated · ready for Phase D (operator-set CRM dim editing UI · separate scope).

> **2026-05-15 · Contactos Phase C · canonical taxonomy live in Supabase.** Migration `0023_relationship_contacts_v2_taxonomy.sql` applied (additive · 4 cols + 1 index): `contact_category_v2` (operational source-of-truth · 8 buckets · indexed btree) · `relationship_type` (CRM dim · operator-set · NEVER touched by promote upsert) · `original_category_raw` + `original_category_source` (provenance audit · NULL when source has no real value · NEVER inferred-backfilled). `promote_to_supabase.py` propagated 4 398 of 4 547 rows (149 are Supabase-only without Master backing). Three sentinel-cycled promotes today (54s total exposure window): Step 2 baseline · iter3 (FINANCIADORES- substring fix · 13 rows reclassified) · iter3.5 (Fernández Molina jfcanete → Developer · iTrust → IA Supply). Final distribution: Principal 1804 · Broker 906 · Operator 711 · Developer 505 · Lender 341 · Hotel Supply 92 · IA Supply 21 · Uncategorized 18. IA Supply 100% defendible (0 false positives) · Operator clean rate 99.6% · Hotel Supply catchall accepted per operator policy. `relationship_type` integrity contract honored: 0/4547 populated post-promote. Sentinel still active · `BLOCK: promote_to_supabase.py` · UI switch (Step 4) pending separate commit.

> **2026-05-15 · Contactos Phase B · classifier v2 (canonical operational taxonomy) shipped.** `scripts/contactos/classify_master.py` extended with `--scheme={v1,v2}` flag. v2 introduces 8-bucket canonical taxonomy aligned with admin/contacts Phase A UI filter: Principal · Broker · Lender · **Operator** (NEW · split from Principal) · Developer · **Hotel Supply** (rename of Proveedor + default for `investor_type ∈ {Service Provider, Media}`) · **IA Supply** (rename of IA aplicaciones · expanded conservatively to PMS/RMS/channel managers/data intelligence/SaaS hospitality) · Uncategorized. Master schema 64 → 67 cols (additive: `contact_category_v2` · `original_category_raw` · `original_category_source`). v1 column `contact_category` UNTOUCHED — legacy compat only. **Uncategorized dropped from 29.7% to 0.4%** (4398 rows · 18 residuals all `investor_type='Unknown'`). Operator split: 700 of 2736 v1=Principal correctly moved · plus tuning iteration D ensures `investor_type='Investor'` rows stay Principal even when company name has hospitality keywords. `original_category_raw` + `original_category_source` NULL in all 4398 rows (no inference backfill · provenance integrity). Sentinel re-created with selective `BLOCK: promote_to_supabase.py` (classifier allowed through). Phase C (DB schema migration adding `contact_category_v2` column to `relationship_contacts` + CRM `relationship_type`) pending operator review of Phase B classification report.

> **2026-05-15 · Admin / Financials reference page live + Admin / Contacts UX iteration session.** New `/user/admin/financials` ships with three operator-editable cards backed by `useDraftedOverrides` + `SaveBar` (CAPEX matrix · Financial structure · P&L Forecast COSTAR). CAPEX has 9-cell matrix per line (3 key tiers × 3* / 4* / 5*) with per-row unit dropdown (€ total · € per key · € per m² · % total) + compact format display (`200k` · `12,6k`). P&L has 4 reactive Room Stats boxes (Occ% + ADR per filter dim) + assumptions-only USALI table. Financial structure has 12 baseline parameters editable. localStorage persistence per card · explicit Save button · Discard / Reset all controls. Phase D moves storage to `admin_financial_settings` Supabase table. Sidebar entry between Hotels and Integrations. Admin/Contacts UX iteration: bulk Delete (soft via Trash icon · single confirm · hard delete server action retained for future per-row drawer use) · table weight reduction (3 cols dropped · page_size 50→10 · skip labels join · -85% DOM · -80% payload) · NEXT_REDIRECT swallowed-banner root fix in 11 catch blocks of bulk.ts + page-level filter defense · Manual contact creation `+ New contact` button + drawer with `createContactAction` (8-bucket canonical Type dropdown · idempotent on email_lower · audit log).

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
