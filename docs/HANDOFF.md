# HotelVALORA · Session Handoff · 2026-05-25

**Purpose:** any future session (Claude or human) should be able to resume the project from this doc alone. Read this first.

---

## 1 · What's done · in production

### 1.1 Canonical layer · stable
- `public.hotel_canonical` · 224 Madrid hotels · joined with `market` + `submarket` + `operators`
- Public-read RLS (migration 0025 · `0025_public_read_rls_catalog.sql`)
- Anon-server client reads · service-role reserved for writes/admin/cron

### 1.2 Cap-rate engine 5-layer · stable
- `apps/web/src/lib/underwriting/cap-rate-engine/`
- `runForHotel(canonical_hotel)` adapter in `apps/web/src/lib/report/underwriting-runner.ts`
- Chain-scale-tiered €/key: luxury 800k · upper_upscale 500k · upscale 340k · upper_midscale 250k · midscale 200k · economy 155k · unknown 285k
- SEEDED_HOTEL_COMPS (12 Madrid/Barcelona/Marbella comps) · canonical taxonomy aligned (Madrid Centre · Arguelles & Chamberi)

### 1.3 6-level KPI resolver · stable
- `resolveBestAvailableMarketKpis(market, submarket, ctx)` in `apps/web/src/lib/report/canonical-reader.ts`
- Compset → submarket → market → country → MADRID_2024_INSTITUTIONAL_BASELINE
- Reads `snap.market_snapshots` (69 rows · 3 granularities)
- `MarketKpiBundle.source` provenance propagates to UI

### 1.4 Unified Report Object · NEW · 2026-05-25
- `apps/web/src/lib/report/report-object/` · single source of truth for every `/report/*`
- `buildReportObject(canonical_id, { tier })` orchestrator
- Section slices: `financials` · `underwriting` · `capex`
- Tier matrix: FREE/PRO/PREMIUM with 9 section helpers in `use-tier.ts`

### 1.5 `/report/*` canonical-coupling · 10/10 surfaces
All accept `canonical_id` + `hotel_id` (snapshot fallback):
- `/report/executive-summary` (`fa20d9a6-…` etc.)
- `/report/asset-analysis`
- `/report/competitive-set`
- `/report/market-overview`
- `/report/asset-analysis/capex` (admin CAPEX matrix indexed by hotel)
- `/report/market-overview/dynamics` (header only · charts market-level)
- `/report/market-overview/projects` (header only · pipeline market-level)
- `/report/market-overview/transactions` (header only · transactions market-level)
- `/report/financials/pl` (PLAssumptions derived from canonical)
- `/report/financials/underwriting` (UnderwritingInputs derived · engine re-runs · IRR/MOIC unique per hotel)

### 1.6 Library 5-layer · stable
- `hotel_report_library` table · migration 0026 + 0027 applied
- 8 showcase rows · `report_origin='showcase'` · 3 top-promoted (Eurostars Madrid Tower · Hotel Indigo Gran Vía · VP Plaza España Design)
- 223 bulk_seed + 1 manual_seed honestly classified
- `/library/favorites-list` · `/library/favorites-map` · `/library/top-list` · `/library/top-map` operational
- Persistence helper · `upsertHotelReportLibrary(hotel, snapshot, { origin })`

### 1.7 Admin financials defaults · master · stable
- `apps/web/src/lib/admin/financials/defaults.ts` (130+ values across 3 domains)
- CAPEX_DEFAULTS matrix (room_tier × star_category · 9 cells × N items)
- FINANCIAL_STRUCTURE_DEFAULTS (LTV/LTC/DSCR/IRR target/MOIC etc.)
- PNL_BENCHMARKS · PNL_ROOM_STATS · PNL_GEO_FILTERS
- Source-of-truth for CAPEX + debt + benchmarks per operator directive 2026-05-25

### 1.8 Maps · AVUXI integration · stable
- Phase 2 SHIPPED feature-flagged behind `NEXT_PUBLIC_AVUXI_ENABLED`
- `<HVMap>` · `<AvuxiOverlay>` · CAPAS panel as single control surface
- Manual layers (`<MapHeatmapLayer>` · `<MapMetroLayer>`) preserved as fallback
- `<MapPolygonLayer>` (Centro Histórico) renders independently · unaffected by flag

---

## 2 · What's in feature branches

**None active.** All recent work merged to `main`. The `feature/hotel-enrichment-pipeline` branch was merged on 2026-05-20 (commit `07e7ae3`).

---

## 3 · Architectural decisions of record

| Decision | Doc | Date |
|---|---|---|
| Compset-first underwriting · hotel KPIs resolved via compset → submarket → market → class → country → baseline ladder | `docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md` | 2026-05-20 |
| Madrid 2024 institutional baseline as final fallback (CoStar 12m + CBRE/JLL/Cushman) · ADR 218 · Occ 0.74 · RevPAR 161.32 · yield 6.5% · per_room 285k | `apps/web/src/lib/report/canonical-reader.ts` | 2026-05-20 |
| Chain_scale-tiered €/key (luxury 800k → economy 155k) supersedes flat 285k baseline · CoStar market_sale_price_per_room overrides when populated (never today) | `apps/web/src/lib/report/canonical-mappers/executive-summary.ts` | 2026-05-20 |
| Migration 0025 · public-read RLS on hotel_canonical/market/submarket · service-role reserved for writes | `docs/database/migrations/0025_public_read_rls_catalog.sql` | 2026-05-20 |
| 5-layer library architecture · Showcase · Community · Top Promote · Favorites · Institutional Library | `docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md` | 2026-05-21 |
| Migration 0026/0027 · `hotel_report_library` + `report_origin/tier_badge/is_top_promote/contact_visible/contact_info/showcase_priority/last_operator_render_at` | `docs/database/migrations/0026_hotel_report_library.sql` + `0027_library_origin_tier_promote.sql` | 2026-05-21 |
| 8 showcase Madrid hotels selected · Eurostars Tower (TP) · Mandarin Ritz · Four Seasons · Hotel Indigo (TP) · EDITION · Petit Palace Plaza Mayor · VP Plaza España Design (TP) · Meliá Madrid Barajas | `docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md` | 2026-05-25 |
| AVUXI Phase 2 feature-flagged · CAPAS panel as single control surface · manual layers preserved as fallback | `docs/maps/avuxi-integration-architecture.md` | 2026-05-22 |
| **Unified Report Object** · single canonical_id flows through every /report/* · admin financials defaults are master · canonical hotel is auxiliary input · tier matrix codified in `use-tier.ts` | `docs/hotel-intelligence/report-integrity-phase-e-verdict-2026-05-25.md` | 2026-05-25 |

---

## 4 · Open risks · known limitations

1. **`HotelToggle` is a visual no-op** · `useState` local · doesn't switch any data source. Either wire to a real preference store or remove. Severity: low (cosmetic).
2. **CAPEX gallery + renders remain mock** · per-hotel curation requires graphic assets · `getMockCapexRenders().gallery` is shared. Severity: low (Phase F if desired).
3. **Market sub-pages chart presets are Madrid-wide** · per operator spec (§3 MARKET-LEVEL scope is correct) · but future submarket-level CoStar data would refine. Severity: low.
4. **224 bulk_seed rows preserve in DB** · hidden from public surfaces via origin filter · admin can still see them. Future cleanup is a Phase F janitorial migration (30-day deprecation window). Severity: none (audit history).
5. **Free tier `LockedGate` not yet UI-wired** · `use-tier.ts` exports `canSeeX()` helpers but pages don't yet wrap content in LockedGate based on them. Severity: medium · Free tier currently can navigate to all pages (the gate enforcement is pending UI work).
6. **Phase B Underwriting drivers still use SCENARIO_BASE shape** · capex/financing/pl_drivers/tax blocks retain base shape · they ALREADY run on canonical-derived inputs (rooms × ADR × occupancy etc) but the per-line driver values themselves haven't been switched to `PNL_BENCHMARKS` lookup. The engine produces unique numbers per hotel (verified) · but the operator may want even finer per-hotel customisation later. Severity: low (Phase G optional refinement).
7. **`canEditAssumptions` returns true for Premium · operator-edit UI in P&L works · but Underwriting overrides only apply at the in-memory level** (not persisted yet). Severity: medium · operator-persistent overrides require a `hotel_underwriting_overrides` table (Phase G).

---

## 5 · Next workstreams · candidates

Listed in suggested priority order. Each is independent and operator-approval-gated.

### A · Favorites (per-user persistent collection)
- Schema: new `report_favourites (user_id, library_id, created_at)` table with RLS-per-user policies
- Migration 0028 · ready in proposal at `docs/hotel-intelligence/library-architecture-audit-2026-05-21.md` §2.4
- UI: star toggle on FavoritesTable rows · writes to `report_favourites` for authenticated users
- Effort: ~2 h

### B · Community reports
- Allow authenticated users to publish their generated reports publicly
- Schema: `hotel_report_library.report_origin = 'community'` already enum-supported
- UI: "Publish to community" CTA in Premium tier · validation gate (operator review)
- Effort: ~3-4 h

### C · Top Promote · monetisation
- Operator-set `is_top_promote = true` exists today
- Missing: Stripe integration · billing · invoicing · sponsor priority editor in admin
- Effort: ~6-8 h plus Stripe setup

### D · Institutional Library admin view
- New admin route `/user/admin/library` showing all 224 rows (including bulk_seed) with origin filter
- Surfaces audit · QA · operator-set classification flips
- Effort: ~2-3 h

### E · Heatmaps (operator-introduced 2026-05-22)
- AVUXI Phase 2 SHIPPED feature-flagged · Demanda Turística + Gastronomía heatmaps
- 4 new categories reserved (Seguridad · Walkability · Demanda Corporativa · Mercado Hotelero) · §11.3.5 of `docs/maps/avuxi-integration-architecture.md`
- Effort: 2-line additive extension per new category
- Subject to AVUXI plan upgrade for premium tiers

### F · AVUXI deeper integration
- Currently feature-flagged OFF in production by default
- Operator decides flip · monitor metrics · graduated rollout
- Plus optional: AVUXI heatmap caching · custom layer styling · CAPAS panel UX refinements

### G · Advanced maps
- Real PostGIS polygon geometry for markets/submarkets (deferred per Task #32)
- Multi-factor identity resolution post-name-hash (deferred per Task #31)
- Heatmap of canonical hotel density per submarket
- Per-hotel competitive intelligence overlay
- Effort: each ~4-8 h depending on scope

### H · Per-hotel CAPEX gallery
- Currently `capex-renders-data.ts` gallery is shared mock
- Per-hotel curation requires graphic asset upload + Supabase Storage integration
- Storage buckets already provisioned (`renders` bucket · migration 0003)
- UI: upload + crop + tag · admin Premium feature
- Effort: ~4-6 h

### I · LockedGate UI wiring
- Tier helpers exist in `use-tier.ts` · pages don't yet enforce them
- Free tier users today can navigate to all pages · should redirect to upgrade CTA
- Effort: ~2-3 h (per-page wrap)

### J · Underwriting operator-persistent overrides
- `apps/web/src/lib/underwriting/types.ts` has `UnderwritingInputOverrides` type
- Currently in-memory only · operator changes lost on page reload
- Schema: `hotel_underwriting_overrides (canonical_id, user_id, overrides jsonb)`
- Effort: ~3-4 h

---

## 6 · Operational state · pre-shutdown checklist

| Item | State |
|---|---|
| `git status` | ✅ Clean (0 uncommitted changes) |
| Branch | ✅ `main` |
| `main` synced with `origin/main` | ✅ Yes |
| Last commit | `358be42` · Phase E verdict |
| Background processes | ✅ None pending (background timers all completed and acknowledged) |
| Pending migrations | ✅ None (0025, 0026, 0027 all applied to staging Supabase) |
| Undeployed changes | ✅ None (everything pushed to main; Vercel production auto-deploys from main) |
| Risk if computer powers off now | ✅ None (all work persisted in git + Supabase) |

---

## 7 · Quick links · canonical entry points

| Task | Doc |
|---|---|
| Resume any /report/* work | Read `docs/hotel-intelligence/report-integrity-phase-e-verdict-2026-05-25.md` first |
| Resume library/showcase work | Read `docs/hotel-intelligence/library-showcase-architecture-2026-05-21.md` |
| Resume cap-rate engine work | Read `docs/underwriting/dynamic-cap-rate-engine.md` |
| Resume AVUXI/maps work | Read `docs/maps/avuxi-integration-architecture.md` (Phase 2 SHIPPED section) |
| Find any subsystem entry | `ENTRYPOINTS.md` (task → file map) |
| Architecture overview | `AI_CONTEXT.md` |
| Coding rules | `RULES.md` |

---

## 8 · Resume in next session

To pick up productively in a future session, the new agent should:
1. Read this `HANDOFF.md` (top-to-bottom · 5 min)
2. Read `ENTRYPOINTS.md` (3 min · find the right files for the task)
3. Read `docs/changelog.md` top entry (1 min · understand most recent context)
4. Confirm `git status` is clean and `main` is current
5. Ask operator for the workstream to resume

Total ramp-up: ≤10 minutes.

---

**Last updated:** 2026-05-25 · post-Phase E milestone close.
