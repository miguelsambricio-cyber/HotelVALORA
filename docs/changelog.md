# Changelog

One entry per completed feature or significant task. Most recent first.

---

## 2026-05-12 — Documentation stabilization wave (debt cleanup · admin surface · enforcement · legacy archive)

Four-phase synchronization pass after the documentation audit revealed that the discipline relied on human memory and fell behind the platform work shipped on 2026-05-11. No new doc surface added — only catch-up, admin coverage, automation, and structural cleanup.

**Phase 1 — Debt cleanup**
Caught up `docs/changelog.md` (+3 entries for the production redirect fix, the Hobby cron unblock, and the institutional Admin UI bundle), repaired `docs/roadmap/current-sprint.md` (duplicate entries removed, "Up Next" sequentialised, "Just Shipped" backfilled), refreshed `docs/HOTELVALORA_MASTER_SYSTEM.md` (modules · runtime reality · next priorities), updated `docs/ai-agents/ai-agent-roadmap.md` registry counts (Tier 0 CEO + 9 operational + 1 hidden + 1 legacy = 12), documented the AI-Ops env var surface in `docs/infrastructure/environment-variables.md` (`CRON_SECRET` · `INGESTION_AUDIT_TOKEN` · `INTERNAL_ALERT_RECIPIENTS` with activation recipes).

**Phase 2 — Admin UI documentation**
Added `docs/features/admin.md` (11-section feature dossier — routes · navigation · 5-section Executive Control Room · AI Ops Center · component tree · mock data · status mapping) and `docs/architecture/admin-ui-architecture.md` (11-section technical architecture — goals · route+layout · mock data swap-target · component architecture · interaction state · light vs dark canvas · Phase 3 realtime path · build characteristics · edge cases · anti-patterns rejected · file map). Extended `docs/routing.md` with the three `/user/admin/*` routes plus the HTTP redirect table, and `docs/design-system/components.md` with the **Admin / Operations Center** primitive family + `signal-tints` contract + Bloomberg-terminal patterns + updated selection guide.

**Phase 3 — Documentation enforcement (`scripts/docs-audit.mjs`)**
Standalone Node script (no deps) that detects synchronization drift on every run. Four checks: (1) changelog drift — every commit on main since the last entry must appear in `docs/changelog.md`; (2) size caps — `ENTRYPOINTS.md` ≤ 200 lines · `AI_CONTEXT.md` / `RULES.md` ≤ 300 lines; (3) master docs freshness — `Last refreshed: YYYY-MM-DD` ≤ 1 day behind the latest commit on main; (4) sprint freshness — `current-sprint.md` `Updated YYYY-MM-DD` ≤ 1 day behind. Modes: human report (default), `--json`, `--strict` (CI). Critical failures exit 1. Uses `execFileSync` with arg arrays to survive Windows cmd.exe `%ad` interpretation.

**Phase 3.5 — Surfaced debt cleared**
First green-light run after Phase 3 surfaced three pre-existing items: catch-up consolidation for the 13 pre-stabilization commits (this entry), missing "Last refreshed" stamp on `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md`, and `ENTRYPOINTS.md` size bloat (357 lines vs 200 cap — filed as a backlog item, not in scope for this wave).

**Phase 4 — Legacy root docs archive**
Moved 10 superseded top-level `.md` files into `docs/legacy/` (frozen archive): `ARCHITECTURE.md` · `ARCHITECTURE_SCORECARD.md` · `CHANGELOG.md` · `COMPONENTS.md` · `NEXT_PHASE_PLAN.md` · `REPORT_PAGES.md` · `ROADMAP.md` · `TECH_AUDIT.md` · `TODO.md` · `UI_COMPONENTS.md`. Each maps cleanly to a current source-of-truth (mapping table in `docs/legacy/README.md`). Root surface now consolidates to five active AI-facing files: `AI_CONTEXT.md` · `CLAUDE.md` · `ENTRYPOINTS.md` · `README.md` · `RULES.md`. Updated `README.md` and `ENTRYPOINTS.md` to drop legacy references.

Operating principle locked in by this wave: **the documentation surface is already strong enough — the problem is synchronization and enforcement, not coverage**. Future PRs should not expand the surface; they should keep it green.

### Pre-stabilization platform commits formally referenced

This wave consolidates documentation for the platform work shipped on 2026-05-11 that was not previously cross-referenced in the changelog header. Audit closure (each SHA is the canonical reference; full feature commentary lives in the dedicated entries further down this file):

- `9001c84` — feat(ai-ops): separate market warehouse ingestion from underwriting compset operations
- `fe00f6a` — feat(costar): initialize institutional hospitality market intelligence workspace
- `fdda651` — feat(audit): unify Data Ingestion audit chain (CLI <-> cloud)
- `f705c70` — feat(data): build Data Ingestion Agent for workspace (Phase 2.3.b)
- `6529cfe` — feat(data): initialize institutional transactions ingestion workspace
- `ecd70ad` — feat(ai-ops+intel): Phase 2 · Tier 1 agent runtime + Intelligence ingestion pipeline
- `e490e98` — feat(analytics): wire Vercel Analytics in the root layout
- `e6ec45c` — docs(ai): add CEO / Orchestration Agent (Tier 0) to AI Operations Layer
- `7b841c5` — docs(ai): initialize HOTELVALORA intelligence + AI operations layer architecture
- `3158615` — feat(intelligence): initialize HOTELVALORA hospitality intelligence engine architecture
- `8d6f078` — feat(email): Resend leaves sandbox · verified domain delivery
- `32b1cd2` — fix(auth): silence /api/auth/session 500s · remove dead SessionProvider
- `23139bd` — docs(infra): record Resend audit findings (2026-05-11)

---

## 2026-05-12 — Production redirect fix for /admin · /settings/admin · /user

App Router page-level `redirect()` from `next/navigation` packs the redirect into an RSC error digest (`NEXT_REDIRECT;replace;<target>;307`). Works for client-side router navigation; **fails cold browser GETs and external links** because it does NOT emit an HTTP Location header. Verified in production: `/settings/admin` returned 307 with no Location, browsers showed a blank `__next_error__` page.

Migrated the three defensive redirects to `next.config.mjs` `redirects()` rules — proper HTTP-level 308/307 with Location headers, universally followable by browsers / curl / crawlers / bookmarks.

| Source | Target | HTTP |
|---|---|---|
| `/admin` + `/admin/<path>` | `/user/admin[/path]` | **308 Permanent** |
| `/settings/admin` + `/settings/admin/<path>` | `/user/admin[/path]` | **308 Permanent** |
| `/user` | `/user/admin` | **307 Temporary** |

Deleted the three page-level stubs that were producing the broken RSC redirect:
- `apps/web/src/app/admin/page.tsx`
- `apps/web/src/app/settings/admin/page.tsx`
- `apps/web/src/app/user/page.tsx`

Verified in production via curl: 308 status + `Location: /user/admin` + chain follow lands at HTTP 200. (Commit `ebe5504`.)

---

## 2026-05-12 — Hobby plan cron limitation unblocked production deploys

Diagnosed a 3-hour deploy stall: **no commit since `df23107` (Speed Insights) had reached production**. All Admin UI work, the costar workspace, the compset workspace, and the market-vs-underwriting split sat unpublished.

Root cause: `vercel.json` added a `0 * * * *` (hourly) cron for the QA Monitoring agent. Vercel's Hobby plan only permits **daily** crons, so every subsequent build silently failed at the deploy step with `Hobby accounts are limited to daily cron jobs`.

Fix: changed the QA cron to `30 9 * * *` (daily 09:30 UTC, no collision with the existing two crons). Trade-off: QA probes drop from hourly to daily until the project moves to Pro — agent code unchanged, only the schedule. (Commit `e93b573`.)

---

## 2026-05-12 — Institutional Administrator section + AI Operations Center UI

The visual layer for the AI Operations Layer plus a defensive entry-point lattice. Four commits land this end-to-end.

### Routes shipped (Next.js App Router, SSG where possible)

```
/user/admin                          Executive Control Room (5-section dashboard)
/user/admin/agents                   AI Operations Center (orbital + directory)
/user/admin/agents/[agentId]         Per-agent dashboard (11 paths SSG · CRM kept hidden)
```

Plus three defensive redirects to absorb the natural URLs operators type:
`/admin`, `/settings/admin`, `/user` — all route to `/user/admin`.

### Executive Control Room (`/user/admin`)

Five institutional sections, Bloomberg-terminal aesthetic on a dark forest-900 / slate-950 canvas with lime-300 accents and tracked-out micro-labels:

| # | Section | Contents |
|---|---|---|
| 01 | Executive Overview | 10 KPI tiles (Platform Status · Agents Active · Last Deploy · Last Cron · Data Freshness · New Tx · New Projects · UW Jobs · Error Alerts · Infra Health) |
| 02 | AI Operations Center | Featured card · mini orbital glyph · CTA into /user/admin/agents |
| 03 | Data Pipeline Center | 6 cards (CoStar · Transactions · Projects · Market Intel · CompSet · Reports) |
| 04 | Infrastructure Monitoring | 6 services (Vercel · Supabase · Resend · Cron · Storage · API) with subtle operational pulse |
| 05 | Recent Operational Activity | Timeline with channel labels (AGENT / INGEST / CRON / DEPLOY / AUDIT / INFRA) |

### AI Operations Center (`/user/admin/agents`)

Orbital architecture: CEO Agent at the centre (Tier 0 · supervisory · never an executor); 9 operational agents in orbit (Market Intelligence · Data Ingestion · COSTAR Admin · CompSet Builder · QA Monitoring · CFO · CMO · Customer Support · Underwriting); supervisory threads back to the CEO with stroke colour mirroring agent status; 4-light readout per node (**ACTIVE · IDLE · WARNING · ERROR**); click → right-side `AgentDetailPanel` slides in (640px · ESC closes · scroll-lock) with mission / operational state / responsibilities / linked systems / operational metrics / latest events / current blockers / future integrations / references.

COSTAR Admin + CompSet Builder render as **WARNING** with `statusLabel: "Configured · Manual"` and explicit currentMode text per user specification — "Configured but not operational yet".

### Component tree

```
apps/web/src/components/admin/
├── admin-sidebar.tsx                Brand block · primary nav · planned nav · sign-out
├── agents/
│   ├── agent-orbit.tsx              Radial SVG layout · 9 positions · supervisory threads
│   ├── agent-node.tsx               Round chip · 4-light readout · onSelect OR Link
│   ├── agent-detail-panel.tsx       Right-side slide-out · sectioned content
│   ├── agent-dashboard.tsx          Per-agent full page composition
│   ├── agent-status-badge.tsx       Pill with light-canvas tints
│   ├── agent-health-ring.tsx        SVG ring · stroke-dasharray progress
│   ├── agent-logs-panel.tsx         Bloomberg log feed (monospace)
│   └── agent-metrics-panel.tsx      KPI grid 2/4-col responsive
└── dashboard/
    ├── signal-tints.ts              OK / WARN / ERROR / NEUTRAL contract
    ├── kpi-card.tsx                 Dark-canvas KPI tile + side rail
    ├── ai-ops-feature-card.tsx      Featured CTA + mini orbital glyph
    ├── pipeline-card.tsx            Pipeline status card
    ├── infra-indicator.tsx          Operational pulse indicator
    └── activity-timeline.tsx        Channel-labelled timeline
```

### Mock data layer

```
apps/web/src/lib/admin/
├── agents/                          11-agent registry (CEO + orbital + hidden CRM)
└── dashboard/                       10 KPIs + 6 pipelines + 6 infra + 8 activity
```

### Navigation integration

- AppHeader gains an `ADMIN` pill (lime accent when active) next to BIBLIOTECA + USUARIO
- Settings sidebar gains a featured `Administrator · Operations Center` CTA card at the bottom — visible on every `/settings/*` page
- All entry points route to real Next.js URLs (no hash navigation)

### Build/lint

`pnpm typecheck` clean · `pnpm build` clean — 50 routes generated · `/user/admin` 117 KB First Load · `/user/admin/agents/[agentId]` SSG with 11 pre-rendered paths.

### Future realtime strategy (Phase 3)

Mock data layer is a swap-target. Agent statuses become a Supabase Realtime subscription on `ai_agents` + `ai_agent_runs`. Executive KPIs become aggregations over `ai_agent_runs` + per-workspace `INGESTION_LOG`. Recent activity becomes an `ai_events` stream. Components do not change.

Commits in this entry: `80b8462` (initialize) · `3e326eb` (real routing fix) · `037bd4c` (institutional ops center) · `f9d385a` (featured CTA + redirects).

---

## 2026-05-11 — Market warehouse vs underwriting operations: formal separation

Architectural decision that splits the previously-monolithic CoStar workspace into two distinct operational layers owned by two distinct agents. The split is load-bearing for scalability, auditability, operational clarity, and cost containment — see `docs/architecture/market-vs-underwriting-separation.md` for the full rationale.

### Workspace restructuring

**`services/costar/`** (market warehouse, owned by CoStar Market Data Agent):
- `COMPSET/` directory + `COSTAR_MASTER_COMPSETS.xlsx` removed
- `CLASS/{INPUT,old.class}/` added — chain-scale aggregates at country OR market level
- `COSTAR_MASTER_CLASS.xlsx` generated (41 cols: 27 domain + 14 ingestion-meta)
- `costar_class_import_template.csv` added
- `scripts/build_masters.py` bumped to normalisation **v1.1**
- `.gitignore` + templates README + workspace README updated to reflect new granularities

**`services/compset/`** (operational underwriting workspace, NEW — owned by CompSet Underwriting Agent):
- Full scaffold: `MASTER/`, `INPUT/`, `old/`, `staging/{failed,review,temp}/`, `templates/`, `logs/`, `docs/`, `scripts/`
- Two canonical XLSX masters:
  - `COMPSET_MASTER.xlsx` (48 cols: 34 domain + 14 meta) — subject + compset KPIs + MPI/ARI/RGI time series. Schema unchanged from the previous costar location.
  - `HOTEL_POSITIONING_MASTER.xlsx` (55 cols: 41 domain + 14 meta) — NEW — per-hotel underwriting positioning snapshots with forward assumptions (ADR / occupancy / RevPAR / valuation anchor / cap rate / confidence / risks).
- `.gitignore`, `.gitkeep` markers, `scripts/build_masters.py`, 2 csv operator templates, workspace README, templates README

### DB migrations applied

- `market_vs_underwriting_split_enum_extend` — adds `costar_market_data` + `compset_underwriting` to the `ai_agent_id` enum
- `market_vs_underwriting_split_seed_agents` — seeds 2 registry rows in `public.ai_agents` with full charters (responsibilities, workflows, KPIs, escalation rules, config including tier + cost caps + workspace + escalation channel) in jsonb. Both ship as `status='planned' / enabled=false` — they activate when their Phase 2.x deliverables land.

Agent registry is now 12 rows. Active operational ecosystem stays at 3 Tier-1 agents in beta (Market Intelligence + Data Ingestion + QA / Monitoring).

### New documentation

- `docs/architecture/market-vs-underwriting-separation.md` — the load-bearing architectural decision
- `docs/agents/costar-market-data-agent.md` — agent charter (Tier 1, owns `services/costar/`)
- `docs/agents/compset-underwriting-agent.md` — agent charter (Tier 2, owns `services/compset/`)
- `docs/agents/ceo-agent-supervision-layer.md` — expanded CEO charter for the two-workspace supervision model
- `docs/intelligence/costar-class-schema.md` — full column reference for COSTAR_MASTER_CLASS
- `docs/intelligence/hotel-positioning-schema.md` — full column reference for HOTEL_POSITIONING_MASTER
- `docs/intelligence/compset-schema.md` — renamed from `costar-compset-schema.md`, content updated for new workspace home

### CEO Agent charter expansion

The CEO / Orchestration Agent (still `planned`) gains explicit supervisory responsibilities for both new agents per `docs/agents/ceo-agent-supervision-layer.md`:
- Hourly health probes on both `services/*/MASTER/INGESTION_LOG` sheets
- Cascading refresh coordination (Q1 market refresh → triggers downstream positioning refreshes)
- Market freshness escalations (CoStar warehouse > 60d stale → warning)
- Positioning freshness escalations (active hotel snapshot > 120d → warning)
- Circuit-breaker pattern (Phase 4) — temporarily pause misbehaving agents via `ai_agents.enabled=false`

### Updates to existing docs

- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — now lists FOUR ingestion branches with explicit agent ownership
- `docs/intelligence/ingestion-pipeline.md` — four-branch header (A: news / B: transactions / C: costar warehouse / D: compset operational)
- `docs/intelligence/costar-master-dataset-architecture.md` — four-workbook decision rewritten with CLASS replacing COMPSET
- `docs/intelligence/costar-ingestion-workflow.md` — four pipelines updated, CoStar Market Data Agent named as owner
- `docs/intelligence/costar-normalization-rules.md` — bumped to v1.1, compset section moved out, class section added
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — 12-agent roster table added; supervision split between 3 operational ingestion agents
- `docs/ai-agents/ai-agent-architecture.md` — supervision layering section added (runtime + CEO are separate concerns)
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.d.0 marked done, Phase 2.3.d.1 + 2.4.0 + 2.4.1 added

### Scaling implications

Per `docs/architecture/market-vs-underwriting-separation.md` §7: the separation supports geographic expansion (Spain → Europe → US → LatAm → MEA → APAC) without redesigning the agent roster. New countries add ROWS to the warehouse; new hotels add ROWS to compset. Neither expansion adds new agents or new workspaces.

### Build/lint

No application code touched. `pnpm typecheck` clean. Two new directory trees live entirely outside `apps/web` — Next.js build unaffected.

### Files added (~38 files + ~2400 LOC of architectural docs)

- `services/costar/CLASS/{INPUT,old.class}/.gitkeep` (×2)
- `services/costar/MASTER/COSTAR_MASTER_CLASS.xlsx`
- `services/costar/templates/costar_class_import_template.csv`
- `services/compset/` workspace tree (2 MASTER xlsx + 6 .gitkeep + .gitignore + scripts/build_masters.py + 2 csv templates + 2 READMEs)
- `docs/agents/{costar-market-data-agent,compset-underwriting-agent,ceo-agent-supervision-layer}.md`
- `docs/architecture/market-vs-underwriting-separation.md`
- `docs/intelligence/{costar-class-schema,hotel-positioning-schema}.md`

### Files renamed
- `docs/intelligence/costar-compset-schema.md` → `docs/intelligence/compset-schema.md`

### Files deleted
- `services/costar/COMPSET/INPUT/.gitkeep` + `services/costar/COMPSET/old.compset/.gitkeep`
- `services/costar/MASTER/COSTAR_MASTER_COMPSETS.xlsx`
- `services/costar/templates/costar_compset_import_template.csv`

### Files updated
- `services/costar/{.gitignore, README.md, scripts/build_masters.py, templates/README.md, MASTER/*.xlsx}`
- `docs/intelligence/{HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM, ingestion-pipeline, costar-master-dataset-architecture, costar-ingestion-workflow, costar-normalization-rules, compset-schema}.md`
- `docs/ai-agents/{AI_OPERATIONS_LAYER_MASTER_SYSTEM, ai-agent-architecture, ai-agent-roadmap}.md`
- `docs/roadmap/current-sprint.md`
- `docs/infrastructure/service-status.md`
- `ENTRYPOINTS.md`

---

## 2026-05-11 — Institutional CoStar hospitality market intelligence workspace (Phase 2.3.d.0)

Scaffolded the second institutional ingestion workspace at `services/costar/`. This is **not a document repository** — it is the normalized hospitality intelligence warehouse + benchmark database layer + underwriting market intelligence substrate. Parallel to `services/transactions/`, sharing the same primitives (ingestion-meta block, append-only discipline, .gitignore posture).

### Directory created (Phase 1 scope — no automation yet)

```
services/costar/
├── MASTER/                              ← 4 canonical XLSX corpora (tracked in git)
├── PAIS/INPUT/ + PAIS/old.pais/         ← country-level operator drops · not tracked
├── MERCADO/INPUT/ + MERCADO/old.mercado/         ← market-level · not tracked
├── SUBMERCADO/INPUT/ + SUBMERCADO/old.submercado/  ← submarket-level · not tracked
├── COMPSET/INPUT/ + COMPSET/old.compset/         ← compset-level · not tracked
├── staging/{failed,review,temp}/        ← operational artefacts · not tracked
├── templates/                           ← 4 operator CSV templates + README · tracked
├── logs/                                ← per-ingestion jsonl · not tracked
├── docs/                                ← workspace-specific notes · tracked
└── scripts/build_masters.py             ← reproducible master generator · tracked
```

### Four MASTER workbooks (generated by `scripts/build_masters.py`)

| Master | Granularity | Domain cols | Total cols | KPI signature |
|---|---|---|---|---|
| `COSTAR_MASTER_PAIS.xlsx` | Country | 25 | 39 | Occupancy + ADR + RevPAR + macro (GDP, inflation, tourism arrivals) |
| `COSTAR_MASTER_MERCADOS.xlsx` | Market | 26 | 40 | Same + revpar_index_vs_country + seasonality_index |
| `COSTAR_MASTER_SUBMERCADOS.xlsx` | Submarket | 27 | 41 | Same + chain_scale + segment_type breakdowns + revpar_index_vs_market |
| `COSTAR_MASTER_COMPSETS.xlsx` | Compset (per target hotel) | 34 | 48 | Subject KPIs + compset KPIs + MPI / ARI / RGI indices + fair_share + RevPAR premium |

All four reuse the **identical 14-column ingestion-meta block** from `transactions/` — the Data Ingestion Agent treats both workspaces with the same routing + dedup + audit shape. Same 5-sheet layout (DATA · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README).

### Strict separation: four parallel pipelines, no merged dataset

Country, market, submarket, compset have different schemas, granularity, KPIs, aggregation logic, and underwriting relevance. They share infrastructure but never share a DATA sheet. Mixing them once would force endless filters on every analyst query.

### SOURCES_REGISTRY (CoStar-specific vocab)

| source_kind | Tier | Notes |
|---|---|---|
| `costar` | A | Authoritative — institutional, paid product. The canonical source. |
| `str` | A | STR (CoStar subsidiary) — same provenance; preserve attribution. |
| `kalibri` | B | Operator analytics — useful for cross-validation. |
| `curated` | A | Hand-maintained HOTELVALORA spreadsheets — ground-truth. |
| `manual` | C | Operator-typed row. |

### Documentation — 7 new architecture docs in `docs/intelligence/`

- `costar-ingestion-workflow.md` — operator + agent workflow, four parallel pipelines, 13-stage lifecycle, failure modes
- `costar-master-dataset-architecture.md` — why XLSX now · why four masters · 5-sheet layout · cross-workspace consistency with `transactions/` · XLSX → Supabase Phase 5 plan
- `costar-normalization-rules.md` — field-by-field canonicalisation, period-form parsing, currency rule (Phase 1 refuses silent FX), index sanity ranges, restatement detection
- `costar-country-schema.md` — 25 domain + 14 meta cols, macro context columns
- `costar-market-schema.md` — 26 domain + 14 meta cols, positioning + seasonality
- `costar-submarket-schema.md` — 27 domain + 14 meta cols, chain_scale + segment_type axes
- `costar-compset-schema.md` — 34 domain + 14 meta cols, full subject + compset + MPI/ARI/RGI contract, compset composition change handling

### Updates to existing docs

- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — now lists three ingestion branches (automated news + transactions/projects masters + costar warehouse)
- `docs/intelligence/ingestion-pipeline.md` — three-branch header (A: news / B: transactions / C: costar)
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — Data Ingestion Agent supervises both institutional workspaces with the same primitives
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.d.0 (workspace scaffold) flipped ✅, Phase 2.3.d.1 (CLI pipeline) added as next deliverable

### Cross-workspace architectural consistency

The decision to share primitives between `transactions/` and `costar/` is deliberate:

| Primitive | Same across both workspaces? |
|---|---|
| 14-column ingestion-meta block | ✅ identical |
| 5-sheet workbook layout | ✅ identical |
| `.gitignore` posture (track contract, not data) | ✅ identical |
| `scripts/build_masters.py` pattern | ✅ identical |
| Data Ingestion Agent routing logic | ✅ shared (Phase 2.3.d wires costar with the same primitives as 2.3.b wired transactions) |
| Audit-chain unification via `/api/agents/data-ingestion-summary` | ✅ shared cloud endpoint |
| SOURCES_REGISTRY vocab | ⚪ different per domain |

This consistency means a Phase 5 Postgres migration migrates **both** workspaces at once with shared infrastructure (`public.market_periods` + `public.compset_periods` for costar, `public.hotel_transactions` + `public.hotel_projects` for transactions).

### Strategic role

The CoStar corpus feeds four downstream consumers:

- **Underwriting Engine** — country/market/submarket KPIs become the macro substrate behind every valuation
- **Compset Benchmarking** — MPI / ARI / RGI per target hotel underpin institutional reporting and Library positioning
- **Market Observatory** — submarket time-series fuels the Market Overview report section
- **AI-assisted Underwriting (Phase 4+)** — Market Intelligence Agent reads the masters for cross-asset enrichment

### Initial datasets ready to ingest

Per the strategic plan, the corpus seeds with:

- Spain hospitality market data (PAIS row for ES)
- Madrid hospitality market data (MERCADOS row)
- Madrid submarket data (SUBMERCADOS rows for Salamanca, Centro, Aeropuerto, etc.)
- Compset data for the 5 portfolio hotels (one COMPSETS row per period per hotel)

Once Phase 2.3.d.1 ships the CLI, this enables HOTELVALORA to generate complete institutional hotel reports, market benchmarking, compset benchmarking, underwriting-ready intelligence, and market positioning analysis for any of the 5 compset hotels.

### Build/lint

No application code touched. `pnpm typecheck` clean. The new directory tree lives entirely outside `apps/web` — Next.js build is unaffected.

### Files added (~30 new files + ~2200 LOC of architectural docs)

- `services/costar/` workspace tree (4 MASTER xlsx + 12 .gitkeep + .gitignore + scripts/build_masters.py + 4 csv templates + 2 READMEs)
- `docs/intelligence/costar-{ingestion-workflow,master-dataset-architecture,normalization-rules,country-schema,market-schema,submarket-schema,compset-schema}.md`

### Files updated
- `docs/intelligence/{HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM,ingestion-pipeline}.md`
- `docs/ai-agents/{AI_OPERATIONS_LAYER_MASTER_SYSTEM,ai-agent-roadmap}.md`
- `docs/roadmap/current-sprint.md`
- `docs/infrastructure/service-status.md`
- `ENTRYPOINTS.md`

---

## 2026-05-11 — Data Ingestion audit-chain unification (Phase 2.3.c)

The Python CLI and the cloud-runtime TS agent now both record their runs in the same `ai_agent_runs` table. `public.ai_agent_runs` is the single audit lens across both halves of the Data Ingestion Agent.

### Cloud endpoint — `POST /api/agents/data-ingestion-summary`

- **Auth:** `Authorization: Bearer $INGESTION_AUDIT_TOKEN` (shared secret, same posture as the cron routes). Denies in production when the env var is unset.
- **Body:** `{ python_ingestion_runs: FileOutcome[] }` — zod-validated array of 1–100 per-file summaries (target, source_file, outcome, row counts, review_reasons, failed_reasons, normalization_version, operator_email, python_ingestion_id).
- **Side effects per file:**
  - Insert one `ai_agent_runs` row with `agent_id='data_ingestion'`, `trigger_kind='manual'`, `status=outcome`, `metadata.python_ingestion_id` for cross-reference, `metadata.source='cli_audit_sync'`.
  - Emit one `ai_events` row, `kind='custom'`, `payload.kind='data_ingestion_staged'`, source=`agent:data_ingestion:cli`, carrying the run_id + python_ingestion_id so QA / Monitoring can react.
- **Response:** `{ ok, cloud_runs: [{ python_ingestion_id, ai_agent_run_id, ai_event_id }], failures }`. HTTP 200 (all ok) / 207 (partial) / 500 (none recorded).

### CLI side — `audit_sync.py`

- Pure-stdlib (`urllib`), no extra dep on the operator's machine.
- `build_file_outcome()` builds one payload element; `sync_outcomes()` POSTs the batch.
- One retry on transient network/timeout; no retry on 4xx (auth/payload bugs).
- 12s timeout per request, TLS validated.
- Reads `INGESTION_AUDIT_URL` + `INGESTION_AUDIT_TOKEN` from env; CLI flags override.

### Wiring in `ingest.py`

After every successful `run_target()` (post-archive), the CLI builds the outcomes payload from the in-memory results and calls `audit_sync.sync_outcomes()`. New CLI flags:

- `--no-audit` — skip the unification step entirely
- `--audit-url` — override env var
- `--audit-token` — override env var

`--dry-run` implicitly disables audit-sync (there's nothing to sync — MASTER was not committed).

### Soft-fail philosophy

The cloud is a **downstream mirror**. If the POST fails (network, auth, payload validation):

1. The CLI prints a clear soft-fail message naming the problem.
2. The CLI prints a recovery hint (set the token, or pass `--no-audit`).
3. **The local run is not rolled back.** MASTER + INGESTION_LOG + local jsonl remain the source of truth.
4. The CLI still exits 0 unless the local run itself was catastrophic.

Verified smoke paths:
- `--no-audit` → audit-sync skipped, local run completes cleanly.
- Audit enabled, `INGESTION_AUDIT_TOKEN` unset → soft-fail message printed, exit 0.

### Operator action required

Set `INGESTION_AUDIT_TOKEN` on Vercel and locally **before** the next CLI run. Until then, every CLI run will print the soft-fail hint (and the cloud `ai_agent_runs` table will not reflect operator-side runs).

```bash
TOKEN="$(openssl rand -hex 32)"
echo "$TOKEN" | vercel env add INGESTION_AUDIT_TOKEN production
export INGESTION_AUDIT_TOKEN="$TOKEN"  # add to ~/.bashrc or ~/.zshrc
```

### Docs touched
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3.c flipped ⏸ → ✅
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — ai_agent_runs called out as the single audit lens
- `services/transactions/scripts/README.md` — env vars + new CLI flags + Vercel setup
- `ENTRYPOINTS.md` — new task → file mappings
- `docs/roadmap/current-sprint.md` — Just shipped + Up next bumped
- `docs/infrastructure/service-status.md` — Phase 2.3.c added to the audit lens row

### Files added
- `apps/web/src/app/api/agents/data-ingestion-summary/route.ts` (~135 LOC)
- `services/transactions/scripts/audit_sync.py` (~165 LOC)

### Files updated
- `services/transactions/scripts/ingest.py` — `--no-audit`, `--audit-url`, `--audit-token` + audit-sync call in `run_target`

### Build/lint
`pnpm typecheck` clean. No new app-bundle weight (server-only route).

---

## 2026-05-11 — Data Ingestion Agent — operator pipeline (Phase 2.3.b)

Built the Python CLI that owns the operational side of the Data Ingestion Agent: sweeps `services/transactions/INPUT_*/`, parses operator-supplied XLSX + CSV files, normalises per the rules, deduplicates against the canonical MASTER, routes valid rows to MASTER + borderline rows to `staging/review/` + broken rows to `staging/failed/`, archives processed source files to `old.*/`, writes per-run jsonl traces to `logs/`, and appends to each master's `INGESTION_LOG` sheet.

### Architectural decision — Python CLI, not Vercel Function

The cloud-runtime agent at `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` cannot touch the local filesystem (Vercel Functions are ephemeral). The workspace's INPUT_* / staging / old.*/ / MASTER xlsx all live on disk. The correct split:

- **Cloud-runtime half** (`apps/web/...`): Supabase-Storage-backed uploads, multi-user web flow (Phase 5)
- **Operator-side half** (`services/transactions/scripts/`): local filesystem operations, the workhorse today

Both share the same normalisation rules and ingestion-meta contract. A Phase 4 audit-chain unification will have the CLI POST a run summary to the cloud agent so `ai_agent_runs` becomes the single audit lens.

### Module map (services/transactions/scripts/)

| Module | Lines | Role |
|---|---|---|
| `ingest.py` | ~340 | CLI entry — sweep, parse, route, archive, log |
| `normalization.py` | ~420 | Field-by-field rules + 60+ header aliases per master |
| `master_io.py` | ~95 | Batch-in-memory MASTER append, atomic .tmp+rename save |
| `staging_io.py` | ~85 | Failed + review jsonl routing, source-file archive |
| `source_readers.py` | ~95 | Lenient XLSX + CSV readers with header folding |
| `dedup.py` | ~80 | sha256 dedup_key + content_hash helpers |
| `build_masters.py` | (pre-existing) | Reproducible MASTER generator |

Test fixture at `scripts/tests/fixtures/smoke_transactions.csv`. `requirements.txt` pins openpyxl==3.1.5.

### Smoke test verified

A 9-row fixture covering all routing decisions:
- 5 rows → MASTER (clean acquisitions, sales, JV)
- 1 row → silently skipped (same-file exact duplicate)
- 2 rows → `staging/review/` (non-EUR currency, out-of-range price)
- 1 row → `staging/failed/` (missing required `asset_name`)
- 1 source file → archived to `old.transacciones/20260511T185854Z_<short-id>_smoke_test.csv`
- 1 row → `INGESTION_LOG` sheet (outcome='partial')
- 1 file → `logs/2026-05/<ingestion_id>.jsonl` (full per-row trace)

### CLI

```bash
python services/transactions/scripts/ingest.py --target transactions
python services/transactions/scripts/ingest.py --target projects --dry-run
python services/transactions/scripts/ingest.py --target both --verbose
```

Exit codes: 0 (success/partial), 1 (catastrophic), 2 (bad args).

### Safety design

- **Batch-in-memory MASTER writes** — load → accumulate → single save at end. Crash mid-run → MASTER unchanged on disk → safe retry.
- **Atomic-ish save** — write to `.tmp`, then rename. POSIX-atomic; Windows best-effort.
- **Per-file isolation** — one file's catastrophic failure doesn't block the others.
- **Append-only contract** — never DELETE or UPDATE canonical rows. The one allowed in-place update is flipping `ingestion_status='superseded'` when a later row carries `supersedes_id`.
- **Archive collision-free** — `<YYYYMMDDTHHMMSSZ>_<short-id>_<originalname>` prefix.

### Build/lint
No application code touched. `pnpm typecheck` clean.

### New files
- `services/transactions/scripts/{__init__,dedup,normalization,master_io,staging_io,source_readers,ingest}.py`
- `services/transactions/scripts/{requirements.txt,README.md}`
- `services/transactions/scripts/tests/fixtures/smoke_transactions.csv`

### Updated files
- `services/transactions/README.md` (CLI usage, workflow flipped to live)
- `services/transactions/.gitignore` (add __pycache__)
- `docs/ai-agents/ai-agent-roadmap.md` (Phase 2.3.b flipped ⏸→✅)
- `docs/roadmap/current-sprint.md` (Just shipped + Up next bumped)
- `docs/infrastructure/service-status.md` (workspace pipeline live)

---

## 2026-05-11 — Institutional transactions + projects ingestion workspace

Scaffolded the operational substrate for HOTELVALORA's institutional transaction + project intelligence. This is NOT a simple upload folder — it is the ingest layer of a hospitality data warehouse, designed to scale into centralised transaction intelligence + underwriting enrichment + AI-assisted institutional datasets.

### Directory created (Phase 1 scope — no automation yet)
```
services/transactions/
├── MASTER/                  ← canonical XLSX corpora (tracked in git)
├── INPUT_TRANSACCIONES/     ← operator drops · not tracked
│   └── old.transacciones/   ← processed archive · not tracked
├── INPUT_PROYECTOS/         ← operator drops · not tracked
│   └── old.proyectos/       ← processed archive · not tracked
├── staging/{failed,review,temp}/  ← operational artefacts · not tracked
├── templates/               ← operator CSV templates · tracked
├── logs/                    ← per-ingestion jsonl · not tracked
├── docs/                    ← workspace-specific notes · tracked
└── scripts/build_masters.py ← reproducible master generator · tracked
```

### MASTER workbooks
- `HOTEL_TRANSACCIONES_MASTER.xlsx` — 59 cols (45 domain + 14 ingestion-meta), 5 sheets (TRANSACTIONS · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README)
- `HOTEL_PROYECTOS_MASTER.xlsx` — 50 cols (36 domain + 14 ingestion-meta), 5 sheets (PROJECTS · DICTIONARY · INGESTION_LOG · SOURCES_REGISTRY · README)
- Both generated by `services/transactions/scripts/build_masters.py` (openpyxl). Reproducible: `python services/transactions/scripts/build_masters.py` rebuilds them identically.
- Append-only contract: never overwrite; supersede via `supersedes_id` pointing at the prior canonical row.
- 14-column ingestion-meta block (canonical_id · ingestion_id · source_file · source_kind · source_url · ingested_at · ingested_by · normalization_version · dedup_key · review_required · review_reason · ingestion_status · supersedes_id · notes) is the institutional audit contract — identical across both masters.

### Strict separation: transactions ↔ projects
Two parallel pipelines that never mix. Different schemas, lifecycles, underwriting logic, KPIs, categorisation systems. The `category` enum, primary key (`*_uid`), and dedup key all differ. Mixing them once would force splitting them every quarter thereafter.

### Documentation — 5 new architecture docs in `docs/intelligence/`
- `transaction-ingestion-workflow.md` — operator + agent workflow, 12-stage lifecycle, failure modes, rollback policy
- `master-dataset-architecture.md` — why XLSX now · why two masters · 5-sheet layout · XLSX → Supabase Phase 5 migration plan
- `data-normalization-rules.md` — field-by-field canonicalisation contract (geography, dates, prices, entities, URLs), dedup-key construction, sanity-range filter
- `transaction-schema.md` — full 59-column reference for the transactions master
- `project-schema.md` — full 50-column reference for the projects master + lifecycle-stage supersedence

### Updates to existing docs
- `docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — adds operational ingestion workspace section (Branch B alongside automated news Branch A)
- `docs/intelligence/ingestion-pipeline.md` — header notes Branch A live; introduces Branch B (XLSX masters) reference
- `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` — adds Data Ingestion Agent workspace supervision contract
- `docs/ai-agents/ai-agent-roadmap.md` — Phase 2.3 split: 2.3.a (manual trigger live) · 2.3.b (workspace supervision deferred)

### Git inclusion strategy
`services/transactions/.gitignore` tracks the **contract** (directory structure, MASTER xlsx, templates, scripts, schema docs) and ignores the **data** (operator-supplied imports, processed archives, staging artefacts, run logs). Operators can `git pull` to get the latest canonical and `git push` schema evolutions without committing any deal data.

### Build + lint
No application code touched. `pnpm typecheck` clean. The new directory tree lives entirely outside `apps/web` — Next.js build is unaffected.

### Future evolution
- **Phase 2.3.b**: Data Ingestion Agent reads from `INPUT_*`, runs the parser, writes to MASTER, archives to `old.*/`, writes per-row trace to `logs/`
- **Phase 5**: XLSX → Supabase migration — `public.hotel_transactions` + `public.hotel_projects` become the runtime read path; XLSX stays as operator-editable canonical
- **Phase 6**: Underwriting Agent reads MASTER + market_news to seed valuations

---

## 2026-05-11 — Phase 2 shipped: Hospitality Intelligence pipeline + Tier 1 AI agents

Bundled delivery of the two tracks that depend on each other. The Intelligence Engine produces the substrate; the Tier 1 agents operate on top of it through a deterministic runtime that becomes the foundation for all future AI systems.

### Migration applied
`phase2_tier1_runtime_and_permissions` (via Supabase MCP):
- New tool `monitoring.escalate.email` (Resend-backed internal alerts, env-pinned recipients, no per-send approval)
- Operational config written to `ai_agents.config` for `market_intelligence` ($0.20 daily cap), `data_ingestion` ($0.10), `qa_monitoring` ($0.05) — escalation_channel='resend', retention windows, approval_required_for lists
- Status flipped `planned` → `beta` + `enabled=true` on the three Tier 1 agents (CEO Agent intentionally left `planned`)
- 43 default-deny permission rows across the three agents (market: 18, data: 6, qa: 19)

### Track A — Hospitality Intelligence ingestion pipeline
- `apps/web/src/lib/intelligence/{types,fetchers,normalise,categorise,ingest}.ts` — RSS fetcher (regex XML parser, no new dep), URL canonicalisation + sha256 dedup, regex categoriser (13 news categories + tag taxonomy), per-source orchestrator with writes to `news_ingestion_runs` + `market_news` + `news_tags`
- `apps/web/src/app/api/cron/hospitality-intel/route.ts` — Bearer CRON_SECRET, runs all enabled sources, 300s budget
- `apps/web/vercel.json` — three cron entries: `48 7 * * *` (intel), `20 8 * * *` (market-intelligence agent), `0 * * * *` (qa-monitoring)
- `apps/web/src/app/dev/intelligence-test/page.tsx` — env probe + sources catalogue + last 10 runs + corpus-by-category (30d)
- Scrape + API sources stubbed: alimarket, costar-news, hotelnewsnow, thp-news report `status=success / items_seen=0 / metadata.note='scrape_not_implemented_phase2'` so QA Agent can surface them

### Track B — Tier 1 AI agents (runtime + 3 agents)
- `apps/web/src/lib/ai-agents/core/` — 9 files: types · audit · permissions · budget · events · memory · approval · escalation · runtime · index
- `apps/web/src/lib/ai-agents/agents/market-intelligence.ts` — cursor-driven daily window read, aggregates by category/region/source/tag, writes summary to `ai_memory`, emits `custom` event
- `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` — manual-trigger zod-validated payload, inserts `uploaded_excels`, routes parser execution through `approvalGate` when requested
- `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` — hourly read-only probes (ingestion failures, agent failures, stuck approvals, cost-cap headroom), Resend escalation with 15-min cooldown, severity ladder (info/warning/critical)
- `apps/web/src/app/api/cron/market-intelligence/route.ts` + `apps/web/src/app/api/cron/qa-monitoring/route.ts` + `apps/web/src/app/api/agents/data-ingestion/route.ts`
- `apps/web/src/app/dev/ai-ops/page.tsx` — operator probe page: agent registry with today's cost vs cap, last 15 runs, last 15 events, pending approvals, last-24h escalations

### Architectural primitives (live but partially dormant)
- **Manual approval architecture** — `approval.ts` gate is wired; only `data_ingestion` + `costar.exports.parse` actively use it. Pattern proven, ready for Tier 2 destructive surfaces.
- **AI cost guardrails** — `budget.ts` preflight + account; daily caps in `ai_agents.config`; QA Agent escalates at 80% / 100%. No LLM use in Phase 2 so spend is ~0 — guardrails ship ahead of need.
- **Execution auditability** — `ai_agent_runs` records input + steps + output + cost + tokens + duration per invocation; `ai_events` captures every emission; `ai_memory` checkpoints state. Full replay surface in DB; the `/dev/ai-ops` page makes it queryable.

### CEO / Orchestration Agent — NOT activated
Status stays `planned` / `enabled=false`. Activates in Phase 3 once Tier 1 has generated 30+ days of telemetry. Documented in `docs/ai-agents/ai-agent-roadmap.md` Phase 3.

### New docs
- `docs/ai-agents/ai-agent-cost-guardrails.md` — load-bearing reference for the cost-cap layer
- `docs/ai-agents/ai-agent-approval-flow.md` — load-bearing reference for the human-review flow

### Bundle + build
- New cron routes (3), new agent route (1), new dev pages (2). All `ƒ Dynamic` — server-only.
- Library bundle unchanged at 214 kB. Middleware unchanged at 81.8 kB. No client-bundle regressions.
- `pnpm typecheck` clean; `pnpm build` clean (37 pages generated).

### Env vars
- `CRON_SECRET` — required in production (cron route guard, denies on missing)
- `INTERNAL_ALERT_RECIPIENTS` — comma-separated emails for QA escalations; falls back to `miguel.sambricio@metcub.com`

### Exit criteria for Phase 2 (per roadmap)
- 7+ consecutive days of all sources reaching `status=success` ☐
- ≥10 new `market_news` rows / day on average ☐
- Zero `news_ingestion_runs.status=failed` for sources we mean to keep enabled ☐
- 14 days of Tier 1 agent runs with ≥95% success rate ☐
- Zero permission denial spikes ☐
- Operator dashboard shows live KPIs ✅

The first 5 are observation criteria — auto-deploy fires, the next 24h decide.

---

## 2026-05-11 — Vercel Speed Insights enabled

Installed `@vercel/speed-insights` 2.0.0 in `apps/web` and mounted `<SpeedInsights />` next to `<Analytics />` in the root layout. Adds Real User Monitoring of Core Web Vitals (LCP, FID, CLS, INP, TTFB) per page to the existing page-view + custom-event tracking. Same cookie-free, GDPR-compliant posture. Same auto-enable on Vercel production — no env vars.

### Bundle delta
Library route First Load JS stayed at 214 kB (the Speed Insights script is also <1 KB gzip and lives in the shared chunk). Middleware unchanged at 81.8 kB.

### Where to see it
After this auto-deploy lands, Core Web Vitals appear at `https://vercel.com/miguel-sambricio-s-projects/hotelvalora/speed-insights` with the same ~30s ingest delay as Analytics. The dashboard breaks down by page, device, and geography.

---

## 2026-05-11 — Vercel Analytics enabled

Installed `@vercel/analytics` 2.0.1 in `apps/web` and mounted `<Analytics />` in the root layout. Cookie-free, GDPR-compliant page-view + custom-event tracking. Auto-enabled on production deploys via the Vercel platform — no env vars to configure.

### What changed
- `apps/web/package.json`: + `@vercel/analytics` ^2.0.1
- `apps/web/src/app/layout.tsx`: imports `Analytics` from `@vercel/analytics/next`, renders inside `<body>` (after `<Providers>` so Suspense boundaries don't interfere)

### Bundle delta
Library route `First Load JS` stayed at 214 kB (the Analytics script is < 1 KB gzipped and lives in the shared chunk). Middleware unchanged at 81.8 kB. No measurable regression.

### Behaviour
- **On Vercel production**: pings `/insights/event` on navigation; visible in the Vercel Dashboard → Analytics tab within ~30 s of the next deploy
- **On Vercel preview**: no-op (Vercel only counts production traffic on the Hobby plan)
- **On localhost (`pnpm dev`)**: no-op (production-only mode by default)

### Documentation
- `HOTELVALORA_TECH_STACK_MASTER.md`: row flipped 🔴 → 🟢 with version + mount location
- `service-status.md`: moved out of `🔵 Planned`, added to `🟢 Working` (26 → 27)
- `INFRASTRUCTURE_MASTER_TRACKER.md`: health score recomputed
- `deployment-status.md`: observability gap closed

---

## 2026-05-11 — CEO / Orchestration Agent — Tier 0 added to the AI Operations Layer

Adds the **10th and supervisory agent** — the CEO / Orchestration Agent — to the AI Operations Layer. The CEO Agent sits ABOVE the 9 operational agents in a new **Tier 0** position. It is **NOT a chatbot. NOT customer-facing.** It is the operations command center, AI chief-of-staff, and escalation router for the entire platform.

### Schema changes (migration `0008` applied)

- `alter type ai_agent_id add value 'ceo'` — extends the agent enum
- `alter type ai_event_kind add value 'strategic_review_completed'` — daily strategic summary event
- `alter type ai_event_kind add value 'agent_anomaly_detected'` — CEO Agent anomaly signal
- `alter type ai_event_kind add value 'cost_cap_warning'` — pre-breach cost signal
- Insert CEO Agent row into `public.ai_agents` (`status='planned'`)
- Insert 10 supervisory tools into `public.ai_tools`: `ai_ops.health_check`, `ai_ops.runs.select`, `ai_ops.events.select`, `ai_ops.human_review.select`, `ai_ops.cost.aggregate`, `ai_ops.invoke_agent`, `supabase.advisors.check`, `supabase.audit_logs.select`, `github.commits.list`, `intelligence.runs.summary`. All read-only.

### What the CEO Agent does

| Cycle | Cadence | Purpose |
|---|---|---|
| Hourly health review | `0 * * * *` UTC | Aggregate last-hour runs · probe Vercel + Supabase + GitHub · emit anomaly events |
| Daily strategic review | `0 6 * * *` UTC (~07:00–08:00 Madrid) | 24h KPI aggregation · cost cap audit · recommend agent status flips via `ai_human_review` |
| Reactive supervision | event-driven | Subscribe to `human_approval_needed`, `health_check_failed` · re-probe + escalate |

### What the CEO Agent must NEVER do

- ❌ Execute destructive tools (no permission, by design)
- ❌ Disable other agents directly — only propose via `ai_human_review`
- ❌ Grant itself or another agent permissions
- ❌ Modify any application data — read-only
- ❌ Decide strategic priorities autonomously — only surfaces options

### Documentation updates

| Doc | Change |
|---|---|
| `AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` | Reorganised agents into 4 tiers (Tier 0 CEO + Tiers 1–3); added detailed § 2.1 covering CEO core responsibilities + must-never-do + supervision model + hourly + daily workflow cycles |
| `ai-agent-orchestration.md` | Added § 1 "Two layers of orchestration" (mechanical + supervisory); added § 10 "CEO / Orchestration Agent — supervisory loops" with detailed hourly + daily + reactive workflows |
| `ai-event-system.md` | Added 3 new event kinds to the taxonomy table + payload conventions |
| `ai-agent-roadmap.md` | Phase 3 rewritten with 4 sub-phases — CEO Agent (Tier 0) lands in Phase 3.3. Dependency graph updated to show CEO supervising Tiers 2+3 going forward |
| `ai-agent-kpis.md` | Added CEO Agent KPI row (MTTD platform · escalation precision · agent coverage · review quality) + €0.50/day cost cap rationale |
| Trackers (`HOTELVALORA_TECH_STACK_MASTER`, `INFRASTRUCTURE_MASTER_TRACKER`, `service-status`, `HOTELVALORA_MASTER_SYSTEM`, `database/README`) | Counts updated 9→10 agents, 20→30 tools; CEO agent + tier structure highlighted |
| `current-sprint.md` | New entry in Just Shipped |
| Memory `project_ai_operations_layer.md` | Updated to reflect Tier 0 + 10 agents |

### Strategic significance

The CEO / Orchestration Agent is the future operational orchestration layer of the entire HotelVALORA platform. When the platform has 9 operational agents producing thousands of run rows per day, the CEO Agent is the single pane of glass that turns that signal into actionable intelligence — health snapshots, strategic recommendations, anomaly detection, escalation routing. Phase 3 ships it; Phase 2 prepares the data substrate it will read.

---

## 2026-05-11 — AI Operations Layer — Phase 1 (foundation)

Initialises HotelVALORA's AI Operations Layer — 9 future operational AI systems with permissions, memory, audit trails, and human escalation paths. **NOT chatbots. NOT a side feature.** This is a future CORE operating layer of the platform — the institutional muscle that turns HotelVALORA from "calculator with UI" into an autonomous, auditable, hospitality investment operating system.

Phase 1 ships the foundation only. **No agent runtime, no LLM calls, no autonomy.** Phase 2+ implements agents tier by tier per `docs/ai-agents/ai-agent-roadmap.md`.

### Schema (migration `0007` applied to Supabase production)

- 7 new tables: `ai_agents`, `ai_agent_runs`, `ai_events`, `ai_agent_permissions`, `ai_memory`, `ai_tools`, `ai_human_review`
- 6 new enums: `ai_agent_id`, `ai_agent_status`, `ai_agent_run_status`, `ai_event_kind`, `ai_permission_action`, `ai_memory_scope`
- RLS: public-read on `ai_agents` + `ai_tools` (transparency); service-role only on operational tables
- `ai_human_review` queue gates every destructive action

### Agents declared (9 — all `status='planned'`, `enabled=false`)

| Tier | Agent | Phase | Strategic role |
|---|---|---|---|
| 1 | Market Intelligence | 2 — next | Consumer of the Hospitality Intelligence Engine corpus |
| 1 | Data Ingestion | 2 — next | Excel + CoStar parsing, normalisation, validation |
| 1 | QA / Monitoring | 2 — next | Deploys, advisors, uptime, health checks |
| 2 | Underwriting | 4 | **Strategic moat** — DCF, sensitivity, memo generation |
| 2 | Report Generation | 4 | Institutional PDFs from underwriting + intelligence |
| 3 | CRM / Dealflow | 5 | Investor + operator dossiers, pipeline |
| 3 | Customer Success | 6 | WhatsApp / chat, onboarding |
| 3 | CMO | 6 | LinkedIn / X / newsletters (all human-reviewed) |
| 3 | CFO | 6+ | Reconciliation, cost monitoring, runway (all destructive actions human-approved) |

### Tools catalogued (20)

Supabase queries · Resend send · LinkedIn / X / WhatsApp publish · Stripe charges/refunds · Vercel deployments / rollback · CoStar parse · PDF render · CRM upsert · monitoring escalate · arbitrary SQL.

Every tool declares `is_destructive` + `requires_human_approval` flags. Destructive tools cannot be invoked without an `ai_human_review` approval. There is no override.

### Documentation (8 docs in `docs/ai-agents/`)

| Doc | Purpose |
|---|---|
| `AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` | Strategic master doc — why this is core, the 9 agents, operating philosophy, governance principles, monetisation, long-term vision |
| `ai-agent-architecture.md` | Runtime model, components, where LLMs live, failure modes, cost model, security posture |
| `ai-agent-orchestration.md` | Queue + router (NOT an LLM), triggers, agent-to-agent calls, concurrency, cost cap enforcement |
| `ai-memory-strategy.md` | Working vs long-term memory, scope dimensions, importance scoring, pgvector Phase 3 plan, hygiene rules |
| `ai-agent-permissions.md` | RBAC matrix, default-deny, destructive-action policy, RLS interaction, operator workflows |
| `ai-event-system.md` | `ai_events` taxonomy + routing rules, polling vs realtime, idempotency, full traces |
| `ai-agent-kpis.md` | Universal + per-agent KPIs, daily cost caps, quality scoring, anti-patterns, reporting cadence |
| `ai-agent-roadmap.md` | Phases 1–7+ with deliverables, exit criteria, anti-goals, dependency graph |

### Governance commitments encoded in code + docs

1. **Deterministic shell, non-deterministic core** — LLM calls are one step of a deterministic state machine. LLMs never control orchestration.
2. **Audit everything** — every invocation is a row in `ai_agent_runs` with steps, tokens, cost.
3. **Permissions are declarative** — agents have no blanket access. Default-deny.
4. **Destructive actions queue for humans** — every `is_destructive` or `requires_human_approval` tool goes through `ai_human_review` before execution.
5. **Memory is scoped, expiring, importance-weighted** — never raw history dumps into LLM context.
6. **The orchestrator is a queue + a router** — Phase 2-3 use Postgres + cron + static rules. No LLM-controlled router.
7. **Cost ceilings are non-negotiable** — every agent has a daily cap declared in `ai_agents.config.daily_cost_usd_cap`.

### Tracker updates

- `HOTELVALORA_MASTER_SYSTEM.md` — paragraph on the new layer
- `HOTELVALORA_TECH_STACK_MASTER.md` — new "AI Operations Layer" section (12 rows)
- `INFRASTRUCTURE_MASTER_TRACKER.md` — new entry; health score 84% (foundation 🟢 + planned agents 🔵)
- `service-status.md` — 25→26 🟢; Tier 1 agents in `🔵 Planned`
- `docs/database/README.md` — migration 0007 entry
- `ENTRYPOINTS.md` — 9 new rows for the ai-agents docs + migration
- `CLAUDE.md` — `docs/ai-agents/` registered in docs map + mandatory maintenance table
- `current-sprint.md` — Phase 2 (combined Intelligence + AI Ops Tier 1) added as #1 in "Up next"

### What's next (Phase 2)

Combined Phase 2 for both the Intelligence Engine and the AI Operations Layer:
- Agent runtime core (`apps/web/src/lib/ai-agents/core/`)
- Market Intelligence Agent (consumes the Intelligence Engine cron output)
- Data Ingestion Agent (Excel + CoStar parsing)
- QA / Monitoring Agent (deploys, advisors, uptime)
- LLM client wrapper (Vercel AI SDK + OpenAI/Anthropic)
- First Phase 2 permissions migration per agent

Exit criteria: 14 consecutive days of all 3 Tier 1 agents with success rate ≥ 95%.

---

## 2026-05-11 — Hospitality Intelligence Engine — Phase 1 (foundation)

Initialises HotelVALORA's hospitality intelligence layer — the daily institutional news + transactions + projects corpus that will power Library cross-links, market dashboards, underwriting comps, future investor/operator dossiers, future alerts, and future monetised B2B data feeds. This is **NOT a side feature**: it's the dataset advantage that compounds every other capability.

Phase 1 ships the foundation only. **No ingestion code, no AI, no scrapers.** Pipeline implementation lands in Phase 2.

### What ships in Phase 1

- **Migration `0006_hospitality_intelligence_schema.sql`** applied to Supabase production.
  - 9 new tables: `sources`, `investors`, `operators`, `market_news`, `hotel_transactions`, `hotel_projects`, `news_entities`, `news_tags`, `news_ingestion_runs`
  - 5 new enums: `news_category`, `hotel_segment`, `entity_role`, `ingestion_source_kind`, `ingestion_status`
  - RLS public-read on all corpus tables (anonymous showcase); service-role-only writes
  - `url_hash` unique constraint on `market_news` for atomic deduplication
  - `enriched_meta` jsonb on `market_news` for future AI enrichment (no migration needed when LLM lands)
- **10 sources seeded** with reliability scores: hosteltur, alimarket, expansion (ES) · hospitalitynet, hotelnewsnow, costar-news, thp-news, hvs, skift-hospitality, reuters-hospitality (EU + GLOBAL)
- **6 documentation files** in `docs/intelligence/`:
  - `HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md` — strategic master doc explaining why this is core, not a side feature, written for future engineers + AI agents
  - `intelligence-architecture.md` — system architecture, component responsibilities, integration points
  - `news-data-schema.md` — full schema reference + dedup hash design
  - `ingestion-pipeline.md` — fetch / parse / normalise / categorise / dedupe pipeline design
  - `scheduler-strategy.md` — Vercel Cron vs Supabase pg_cron decision (chose Vercel Cron at `48 7 * * *` UTC = 08:48 Europe/Madrid in winter, 09:48 in summer)
  - `hospitality-intelligence-roadmap.md` — phases 1–6 with deliverables + exit criteria
- **Tracker updates**:
  - `HOTELVALORA_TECH_STACK_MASTER.md` — new "Hospitality Intelligence Engine" section
  - `INFRASTRUCTURE_MASTER_TRACKER.md` — new entry; health score recomputed (84%)
  - `service-status.md` — 24→25 🟢; planned phases listed in 🔵
  - `HOTELVALORA_MASTER_SYSTEM.md` — paragraph updated mentioning the new module
  - `docs/database/README.md` — migration 0006 entry
  - `ENTRYPOINTS.md` — 6 new rows for the intelligence docs + the migration
  - `CLAUDE.md` — `docs/intelligence/` registered in the documentation map + mandatory-maintenance table

### Phase 2 — what's next

| Deliverable | File |
|---|---|
| Cron route handler | `apps/web/src/app/api/cron/hospitality-intel/route.ts` |
| Vercel cron config | `apps/web/vercel.json` |
| Fetchers (rss/scrape/api) | `apps/web/src/lib/intelligence/fetchers.ts` |
| Normaliser + canonicaliser | `apps/web/src/lib/intelligence/normalise.ts` |
| Regex categoriser | `apps/web/src/lib/intelligence/categorise.ts` |
| Ingest orchestrator | `apps/web/src/lib/intelligence/ingest.ts` |
| Unit + integration tests | `apps/web/src/lib/intelligence/__tests__/` |

Exit criterion for Phase 2: 7 consecutive days of all-source `status=success` ingestion runs.

### Strategic context (why this matters)

The master doc covers this in depth, but the 3-line version:
- Underwriting is only as good as the comparables it can pull — building a self-hosted transaction corpus = decoupling from CoStar/STR seat licences (€30k–150k/year saved per seat).
- Deal sourcing happens before broker books open — daily ingestion of operator interviews, planning permissions, JV announcements = a deal radar.
- Institutional clients expect a Bloomberg-of-hospitality — the intelligence layer is what turns the calculator into a decision surface.

The schema is intentionally future-proof (jsonb columns for AI enrichment, polymorphic entity links, source reliability scores, public-read RLS). Phase 2+ doesn't migrate the schema — it just writes code that reads the existing tables.

---

## 2026-05-11 — Resend leaves the sandbox (verified domain · production delivery)

`hotelvalora.com` verified at https://resend.com/domains (DKIM + SPF added in Namecheap DNS). `RESEND_FROM_EMAIL` on Vercel switched from the sandbox sender (`onboarding@resend.dev`) to `HotelVALORA <noreply@hotelvalora.com>`. The full email path now delivers to any recipient — no more "only to miguel.sambricio@metcub.com" sandbox restriction.

### What changed

| Concern | Before | After |
|---|---|---|
| Sender | `HotelVALORA <onboarding@resend.dev>` (Resend sandbox) | `HotelVALORA <noreply@hotelvalora.com>` (verified domain) |
| Delivery surface | Resend account owner only | Any recipient inbox |
| DKIM / SPF on `hotelvalora.com` | Not set | Set in Namecheap → verified by Resend |
| Code path | Unchanged — `sendTourRequestAction` + `getDefaultFromAddress()` | Same |

### Verification

- `vercel env ls production` shows `RESEND_FROM_EMAIL` (Encrypted) updated.
- Resend domains panel shows `hotelvalora.com` as verified.
- Auto-deploy triggered by this commit's push to `main`.

### What stays unchanged

- The Resend API key is unchanged (same `RESEND_API_KEY`).
- The server action `sendTourRequestAction`, the `getResend()` singleton, and the `tour-request` template are all unmodified.
- `replyTo` logic + analytics tags untouched.

### Re-test plan

After the auto-deploy lands, clicking "Schedule a Tour" on a top-promoted report (e.g. Mandarin Oriental Ritz with account manager `sara.smith@mandarinoriental.com`) should result in:

- HTTP 200 from the server action
- Resend send-id returned cleanly
- The email arriving at `sara.smith@mandarinoriental.com` (no sandbox bounce)

---

## 2026-05-11 — Auth log noise fix (`/api/auth/session` 500s)

Removes the legacy `<SessionProvider>` from `apps/web/src/components/providers.tsx`. The provider was a leftover from the Auth.js v5 scaffold; nothing in the codebase calls `useSession()` from `next-auth/react` (verified by grep). Its only behaviour was polling `/api/auth/session` on every page load → the endpoint threw `MissingSecret` (because `AUTH_SECRET` is not set on Vercel; we run on Supabase Auth, not Auth.js) → Vercel logs flooded with 500s.

### What changed

- `<SessionProvider>` removed from `Providers`. The component tree is now `QueryClientProvider > ThemeProvider > children`.
- Component comment block updated explaining why `SessionProvider` is intentionally absent + the one-line restore path if Auth.js ever reactivates.

### What stays

- Auth.js v5 scaffold (`auth.ts`, `auth.config.ts`, `app/api/auth/[...nextauth]/route.ts`) untouched — kept parked for future non-OAuth flows per `docs/auth.md` § "Why Supabase Auth and not Auth.js v5".
- The route handler still exists, so direct probes to `/api/auth/session` (bots, scanners) will still 500 — but no internal traffic hits that endpoint anymore. Volume goes from "every page load × every visitor" to "occasional external probe".

### Verification

- `pnpm typecheck` ✅
- Vercel runtime logs after deploy: zero `/api/auth/session` 500s from internal traffic
- No UX impact — `useAuth()` continues to read from Supabase Auth (or Zustand mock fallback)

---

## 2026-05-11 — GitHub → Vercel auto-deploy enabled

Connected the GitHub repo to the Vercel project via `vercel git connect`. From here forward:

- **Push to `main`** → auto-deploys to production, aliased to `https://www.hotelvalora.com`.
- **Push to any other ref** → auto-deploys to a preview at `https://hotelvalora-<sha-prefix>-miguel-sambricio-s-projects.vercel.app`.
- **Commit status checks** post back on every push (Vercel-GitHub native integration).
- **`vercel deploy --prod --yes`** still works as an escape hatch (eg. emergency rollback where pushing a fix-up commit is undesirable).

The two auth flags (`AUTH_ENABLED`, `NEXT_PUBLIC_AUTH_ENABLED`) are scoped Production-only, so preview deploys fall back to the Zustand mock auth — preview reviewers can navigate the entire app without needing Google OAuth.

### Why now

We had six commits sitting in `main` that were pushed to GitHub but had never reached production — auto-deploy off meant every release required a manual `vercel deploy --prod --yes` from the operator. Auto-deploy closes that gap and makes the CLI path the exception, not the rule.

### Verification

The commit that introduces this change is itself the test: the push triggers the first auto-deploy. Confirmed via Vercel API after the push (latest production deploy SHA matches `HEAD` of `main`).

### Files

- `docs/infrastructure/deployment-status.md` — promotion-workflow diagram updated; "Auto-deploy on push" flipped to Yes; preview environments section refreshed; CI/CD bullets refreshed
- `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` — Deployment + CI/CD table updated; GitHub Actions row moved to 🔵 (Vercel build is the gate)
- `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` — GitHub-safe row updated; health score 82% → 83%
- `docs/infrastructure/service-status.md` — Vercel-GitHub auto-deploy added to 🟢 inventory; health score recomputed
- `docs/HOTELVALORA_MASTER_SYSTEM.md` — paragraph on production deployment refreshed
- `docs/roadmap/current-sprint.md` — Just shipped entry added

---

## 2026-05-11 — Public Beta / Showcase Mode (auth wired, never blocking)

Activated Google OAuth end-to-end through Supabase Auth, then immediately reconfigured the middleware so route protection is dormant platform-wide while HotelVALORA is being validated by partners. Auth still works, sessions still persist, RLS still resolves via `auth.uid()` — but no anonymous visitor is ever redirected.

### What changed in code

```ts
// apps/web/src/middleware.ts
const PROTECTED_PREFIXES: readonly string[] = [];
```

Previously `["/settings", "/library", "/report", "/dashboard"]`. The Supabase-session-refresh branch of the middleware still runs unconditionally so that signed-in users keep their session warm; the redirect branch evaluates `false && …` and never fires. When private-user surfaces land later (saved-report management, CRM, billing, admin), the operator adds the relevant prefix back to that array — no other code change needed.

### Why

HotelVALORA is in **Public Beta / Institutional Showcase Mode**. Partners, prospects and the underwriting team need to navigate the entire platform — financial engine, underwriting workflows, report rendering, Library, infrastructure — without forced login. There are no private-user features in production yet. Auth gating exists in code (Public Beta is the toggle position), not in deletion.

### Operator activation completed in this session

End-to-end activation per `docs/auth.md`:

1. **Google Cloud Console** — created project HotelVALORA, OAuth consent screen (External, Testing), OAuth client ID `1023396989060-…apps.googleusercontent.com` with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`.
2. **Supabase Dashboard** → Authentication → Providers → Google enabled with the OAuth client credentials. URL Configuration → Site URL = `https://www.hotelvalora.com`; Redirect URLs include prod, www, localhost and `https://*.vercel.app/auth/callback`.
3. **Vercel env** — `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` on production.
4. **Production deploy** — `dpl_GcD2jM47icS8KzWDRNdYcyZY6iZF` (commit `5c3ef91`), then current commit ships the empty `PROTECTED_PREFIXES`.

Verification:
- `GET https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/settings` returns `"external.google": true`.
- `GET /auth/callback` returns 307 to `/login?error=Missing+OAuth+code` (route handler live).
- `GET /library/favorites-map` returns 200 (anonymous browsing restored after empty PROTECTED_PREFIXES deploy).
- `GET /report/executive-summary` returns 200.

### Rollback episode (kept for the record)

The first deploy with `AUTH_ENABLED=true` AND the original `PROTECTED_PREFIXES` list locked anonymous viewers out of `/library` and `/report` because Zustand-mock sessions don't satisfy the Supabase middleware. Recovery: removed both env vars + redeployed (~90s), then introduced the empty `PROTECTED_PREFIXES` as the canonical Public Beta posture. Documented in `docs/auth.md` § "Public Beta / Showcase Mode" so the trap doesn't get re-set.

### Files

- `apps/web/src/middleware.ts` — `PROTECTED_PREFIXES = []` + extensive comment block listing future prefixes to add when private surfaces ship
- `docs/auth.md` — new § "Public Beta / Institutional Showcase Mode" section; TL;DR row updated; activation checklist preamble revised
- `docs/HOTELVALORA_MASTER_SYSTEM.md` — auth status reframed as "wired and operational, non-blocking by design"
- `docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md` — Supabase Auth + Google OAuth flipped to 🟢 with Public Beta annotation
- `docs/infrastructure/INFRASTRUCTURE_MASTER_TRACKER.md` — health score recomputed to 82%; per-service rows updated
- `docs/infrastructure/service-status.md` — 19 → 21 🟢; auth + OAuth out of 🟡 bucket
- `docs/infrastructure/deployment-status.md` — recent-deploys table refreshed; env inventory bumped 6 → 8 vars
- `docs/roadmap/current-sprint.md` — Public Beta entry in "Just shipped"
- Vercel production env: `AUTH_ENABLED=true`, `NEXT_PUBLIC_AUTH_ENABLED=true`
- Supabase Dashboard: Google provider enabled; URL allowlist populated

### What stays unchanged

- RLS on every public table — `auth.uid()` resolves naturally for signed-in users, anonymous users get the public-read policy on `valuations.visibility ∈ ('public','top-promote')`.
- `useAuth()` surface — every consumer (`AuthCard`, `AppHeader`, `SettingsSidebar`, `useTier`, `LinkedInstitutionalAccounts`, etc.) keeps reading the same shape.
- `handle_new_user` trigger on `auth.users` — fires for any Google sign-in and provisions `public.users` + `public.profiles` automatically.
- Storage buckets + signed-URL helpers — untouched.

---

## 2026-05-11 — Production auth via Supabase Auth (Google OAuth-ready)

Replaces the Zustand mock auth on the production path with **Supabase Auth**. The Auth.js v5 scaffold stays in the repo (inert) for future non-OAuth flows; the swap was a `useAuth()` rewrite, not a scaffold change.

### Architecture decision

The HotelVALORA schema was designed around Supabase Auth — `public.users.id → auth.users.id` FK, `handle_new_user` trigger auto-provisioning `public.users` + `public.profiles`, every RLS policy using `auth.uid()`. Auth.js v5 + `@auth/supabase-adapter` would have fought that schema (separate `next_auth.*` tables, manual Supabase JWT minting, dual cookie schemes). We picked the cleaner side. Full reasoning in `docs/auth.md` § "Why Supabase Auth and not Auth.js v5".

### What ships

- **`useAuth()` rewritten as a dual-source picker** — `apps/web/src/lib/auth/use-auth.ts`. Returns the same `{user, signIn, signOut, isAuthenticated}` shape every consumer already imports. Source is chosen at build time via `NEXT_PUBLIC_AUTH_ENABLED`:
  - `"true"` → `useSupabaseAuth()` (real session, hydrated from `public.users` + `public.profiles`)
  - default → existing Zustand mock (preserves dev + preview UX)
- **OAuth callback route** — `apps/web/src/app/auth/callback/route.ts`. Exchanges the OAuth `code` for an HttpOnly session cookie via `supabase.auth.exchangeCodeForSession`, then redirects to a sanitised `?next=` path (defaults to `/settings/profile`).
- **OAuth hook rewired** — `apps/web/src/lib/auth/use-oauth.ts`. When `AUTH_ENABLED=true`, `signInWithProvider("google" | "linkedin" | "apple" | "microsoft")` calls `supabase.auth.signInWithOAuth({ provider, options: { redirectTo: "${origin}/auth/callback?next=…" }})`. Otherwise falls through to the parked Auth.js handler.
- **Middleware** — `apps/web/src/middleware.ts` now refreshes the Supabase session via `@supabase/ssr` on every request and, when `AUTH_ENABLED=true`, redirects unauthenticated requests on `/settings`, `/library`, `/report`, `/dashboard` to `/login?next=<original>`. The Auth.js middleware wrapper was removed (middleware bundle dropped ~50 kB).
- **Email/password sign-in** (`AuthCard`) now flows through `supabase.auth.signInWithPassword` when active. The legacy mock keeps working when the flag is off.
- **`auth-mode.ts`** — small helpers (`isAuthEnabledServer`, `isAuthEnabledClient`, `isSupabaseAuthConfigured`) so the build-time switch lives in one place.

### Cookie strategy

`@supabase/ssr` handles everything — `__Secure-` prefixed in production, `httpOnly`, `sameSite: lax`, path `/`, refreshed on every middleware pass. No app code touches cookies directly.

### Activation is a manual two-step

Code ships off-by-default (`AUTH_ENABLED` unset → Zustand mock continues to drive the app). Operator activation:

1. Google Cloud Console → create OAuth client with redirect URI `https://twebgqutuqgonabvhzjk.supabase.co/auth/v1/callback`.
2. Supabase Dashboard → Authentication → Providers → Google → paste credentials.
3. Supabase Dashboard → Authentication → URL Configuration → add `https://www.hotelvalora.com/auth/callback` (+ localhost + Vercel preview wildcard).
4. Vercel → `AUTH_ENABLED=true` + `NEXT_PUBLIC_AUTH_ENABLED=true` (both production).
5. `vercel deploy --prod`.

Full checklist with copy-paste-ready URLs at `docs/auth.md`.

### What's still mock

| Surface | Status |
|---|---|
| OAuth dance | ✅ Supabase Auth (Google ready · LinkedIn + Apple require Supabase Dashboard wiring) |
| Sign-out | ✅ Supabase Auth |
| Protected-route middleware | ✅ Supabase session check |
| User row hydration into `useAuth()` | ✅ `public.users` + `public.profiles` join |
| **Sign-up surface** | ❌ Google OAuth is the only path to create an account today |
| **Password reset** | ❌ Link still loops back to `/login` |
| **Linked accounts unlink** | ⚠️ Soft sign-out only |
| **Workspace switcher** | ❌ `user.organization` carries the current org id but no UI exposes a switcher |
| **`AUTH_ENABLED=false` (default)** | ✅ Zustand mock — kept on purpose |

### Files

- `apps/web/src/lib/auth/use-auth.ts` — new (unified hook)
- `apps/web/src/lib/auth/use-supabase-auth.ts` — new (Supabase adapter + tier hydration)
- `apps/web/src/lib/auth/auth-mode.ts` — new (build-time flags)
- `apps/web/src/app/auth/callback/route.ts` — new (OAuth callback handler)
- `apps/web/src/lib/auth/use-oauth.ts` — rewired through Supabase Auth
- `apps/web/src/lib/auth/store.ts` — `useAuth` renamed to `useMockAuth` (the unified hook supersedes it)
- `apps/web/src/lib/auth/index.ts` — barrel updated; exports the new hook + flag helpers
- `apps/web/src/middleware.ts` — rewritten on top of `@supabase/ssr`; Auth.js wrapper removed
- `docs/auth.md` — full activation checklist (Google Cloud Console + Supabase Dashboard + Vercel env)
- `docs/infrastructure/environment-variables.md` — Auth flag matrix + Supabase-Auth notes; Auth.js placeholders re-labelled "parked"
- `ENTRYPOINTS.md` — new auth file rows
- Trackers + master system + sprint refreshed

---

## 2026-05-11 — Library surfaces wired to Supabase (TanStack Query)

All four Library routes (`/library/favorites-map`, `/library/favorites-list`, `/library/top-map`, `/library/top-list`) now read from the live database. The legacy `apps/web/src/lib/library/mock-reports.ts` has been removed; the six institutional showcases live in `public.valuations` with `visibility = 'public'` and are visible to anonymous viewers through the existing public-read RLS policy.

### Query architecture

- **`useLibraryReports(options?)`** — single source of truth. Reads `valuations` filtered to `visibility ∈ ('public','top-promote')` + left-joins `top_promote_reports`. Five-minute `staleTime`. Same hook powers the map and the list — TanStack Query dedupes across routes, so map↔list navigation never re-fetches.
- **`useFavoriteValuationIds()`** — per-user favourites. RLS-scoped to `auth.uid()`. Anonymous callers get an empty set + `isAnonymous=true`; the adapter treats that as "render every public row as starred" to preserve the demo UX.
- **`useToggleFavorite()`** — optimistic mutation against `favorite_reports`. Rollback on error, authoritative invalidate `onSettled`. Caller shows "sign in to save" when `isAnonymous`.
- **`adaptValuationToLibraryReport()`** — pure adapter, DB row + joins + favourite-id set → existing `LibraryReport` shape. Category derived from active promotion + favourited flags; `tierBadge` / `visibilityTier` from `indicators` JSONB.

### States

Loading / error / empty / filtered-empty rendered inline in both `HotelMap` (pill overlay) and `FavoritesTable` (full-width row). Retry button on error states. Background image + chrome stay rendered so the route shell never collapses.

### Migrations

- `0005_seed_library_demo_data.sql` — seeds 1 demo `auth.users` row (UUID `…010001`) + 6 valuations (UUIDs `…020001`–`…020006`) + 2 active `top_promote_reports` (Ritz-Carlton Madrid until 2026-12-31, Mandarin Oriental Ritz until 2026-09-30) + 6 demo favourites. Fully idempotent (deterministic UUIDs + ON CONFLICT updates).

### Bundle architecture

The Supabase barrel `apps/web/src/lib/supabase/index.ts` previously re-exported every module — including server-only ones (`./server`, `./admin`, `./auth-helpers`). Webpack traces the whole graph before tree-shaking, so client components importing `createBrowserSupabaseClient` via the barrel pulled `import "server-only"` modules into client bundles and broke the build. The barrel now only exports browser-safe surfaces. Server-only modules must be imported directly:

```ts
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseAdmin }           from "@/lib/supabase/admin";
import { getSupabaseUser }            from "@/lib/supabase/auth-helpers";
```

### Removed

- `apps/web/src/lib/library/mock-reports.ts` — superseded by migration `0005`. The 6-hotel dataset is now SQL-seeded; the mock helpers (`MOCK_LIBRARY_REPORTS`, `getDefaultSelectedReport`, `getMockReportById`) had no consumers post-wire.

### Files

- `apps/web/src/lib/library/queries/{keys,use-library-reports,use-favorite-valuation-ids,use-toggle-favorite,index}.ts` — new
- `apps/web/src/lib/library/adapters/valuation-to-report.ts` — new
- `apps/web/src/components/library/hotel-map.tsx` — consumes hook, loading/error/empty states
- `apps/web/src/components/library/favorites-table.tsx` — consumes hook, optimistic ⭐ toggle, loading/error/empty states
- `apps/web/src/lib/supabase/index.ts` — barrel split (browser-only)
- `apps/web/src/app/dev/supabase-test/page.tsx` — direct import from `./auth-helpers`
- `docs/database/migrations/0005_seed_library_demo_data.sql` — new
- `docs/features/library.md` — production data-flow + states + future realtime hooks
- `ENTRYPOINTS.md` — query hooks + adapter + seed entries; mock-reports row removed

### Production-backed surfaces (this commit)

| Surface | Backed by |
|---|---|
| `/library/favorites-map` | `public.valuations` + `top_promote_reports` (anonymous: public-read RLS) |
| `/library/favorites-list` | same dataset, same TanStack cache |
| `/library/top-map` | same dataset |
| `/library/top-list` | same dataset |
| ⭐ favourite toggle | `public.favorite_reports` (RLS-scoped, optimistic) |

### Still mock

- Identity / tier inference — Zustand mock at `lib/auth/store.ts` (`hv-auth-v1` localStorage). Supabase Auth swap deferred to Phase 3.
- Static grayscale map background — Stitch CDN image (Mapbox swap planned in Phase 4).
- "View full valuation" CTA — toast only.
- CRM / investment requirements / valuation preferences — tables exist, no UI yet.

---

## 2026-05-11 — Supabase Storage buckets + typed helpers + regenerated TS types

Closed the entire post-schema gap on the Supabase side: types regenerated from the live database, the five canonical Storage buckets provisioned via migration with per-bucket RLS, and typed frontend helpers wired through the existing `lib/supabase/*` barrel.

### Migrations applied

- `0003_storage_buckets_and_policies.sql` — provisions `reports` / `pdfs` / `excel-uploads` / `renders` / `avatars` with explicit `public` flag, MIME allowlists, size caps, and 19 own-namespace RLS policies on `storage.objects`.
- `0004_restrict_avatar_listing.sql` — fixes the `0025_public_bucket_allows_listing` advisor: drops the broad `avatars: public read` policy (CDN-served objects don't need one) and replaces it with own-namespace listing.

### TypeScript types

Generated from the live schema via `mcp__claude_ai_Supabase__generate_typescript_types` and written to `apps/web/src/lib/supabase/types.ts`. The hand-rolled shim is gone — every table, enum, FK relationship and `Database["public"]["Tables"][T]["Row"|"Insert"|"Update"]` shape is now authoritative. `pnpm typecheck` still passes.

### Frontend storage layer

- `apps/web/src/lib/supabase/storage.ts` — browser-safe primitives: `BUCKETS` catalog, `ownPath`, `timestampedName`, `validateForBucket`, `uploadOwnFile`, `deleteOwnFiles`, `listOwnFiles`, `getPublicUrl` (narrowed to `avatars`).
- `apps/web/src/lib/supabase/storage-server.ts` — service-role helpers: `createStorageSignedUrl` / `createStorageSignedUrls` (5-minute default TTL, optional `downloadAs`), `moveStorageObject`, `deleteStorageObjectsAsAdmin`. Server-only enforced by `import "server-only"`.
- Barrel `apps/web/src/lib/supabase/index.ts` re-exports the browser surface; the server module must be imported directly so client bundles can't pick it up.

### Bucket policy summary

| Bucket | Public? | MIME allowlist | Size cap |
|---|---|---|---|
| `reports` | private | any | 50 MB |
| `pdfs` | private | `application/pdf` | 100 MB |
| `excel-uploads` | private | `xlsx`, `xls` | 25 MB |
| `renders` | private | `png`/`jpeg`/`webp` | 10 MB |
| `avatars` | public | `png`/`jpeg`/`webp` | 5 MB |

Path convention everywhere: `{bucket}/{auth.uid()}/{rest…}` so a single RLS template `(storage.foldername(name))[1] = auth.uid()::text` enforces ownership.

### Files

- `apps/web/src/lib/supabase/types.ts` — regenerated
- `apps/web/src/lib/supabase/storage.ts` — new
- `apps/web/src/lib/supabase/storage-server.ts` — new
- `apps/web/src/lib/supabase/index.ts` — barrel updated
- `docs/database/migrations/0003_storage_buckets_and_policies.sql` — new
- `docs/database/migrations/0004_restrict_avatar_listing.sql` — new
- `docs/database/README.md` — Storage section rewritten
- Infra trackers + master system doc + sprint refreshed; ENTRYPOINTS.md gained the storage entries

### What's still mock vs Supabase-backed

Schema and storage are fully live. The frontend has not yet started consuming them — every Library / report / favorites / top-promote surface still renders from `apps/web/src/lib/library/mock-reports.ts`, and auth is still the in-memory Zustand mock at `apps/web/src/lib/auth/store.ts`. Wiring those reads (and replacing the mock auth with Supabase Auth or Auth.js + adapter) is the next milestone.

---

## 2026-05-11 — Supabase initial schema applied to production project

Applied `0001_initial_schema.sql` to project `twebgqutuqgonabvhzjk` via the Supabase MCP server (`apply_migration`). 32 tables created, all with RLS enabled. Registered as migration `20260511015418_initial_schema`.

Two Postgres-driven edits to the drafted SQL were required (now reflected in the source file):

- `top_promote_reports.is_active` — removed; was a stored generated column using `now()`, which Postgres rejects (`generation expression is not immutable`). Derive in queries as `promoted_until > now()`.
- `top_promote_active_idx` / `top_promote_priority_idx` — dropped the `where promoted_until > now()` predicate; Postgres rejects mutable functions in index predicates. They are now plain b-tree indexes.

Follow-up migration `0002_harden_security_definer_functions.sql` applied to close every WARN-level lint surfaced by `get_advisors`:

- Pinned `search_path = public, pg_temp` on `set_updated_at()` and `handle_new_user()`.
- Revoked `EXECUTE` on `handle_new_user()` from `public` / `anon` / `authenticated` (trigger-only; should not be RPC-callable).

The only remaining advisory is the **intentional** `payment_events: rls_enabled_no_policy` (INFO) — service-role-only writes from the Stripe webhook handler.

### Files

- `docs/database/migrations/0001_initial_schema.sql` — patched, applied
- `docs/database/migrations/0002_harden_security_definer_functions.sql` — new, applied
- `docs/database/README.md` — status flipped to ✅ applied
- `.mcp.json` — added so Claude Code auto-loads the Supabase MCP server next session

---

## 2026-05-11 — Comprehensive Supabase schema drafted (30 tables, 6 domains)

Expanded the v1 schema proposal from 7 tables to a production-grade 30-table surface across six domains. Migration file ready to apply via the SQL editor; hand-rolled `Database` type already in repo so frontend queries compile against the future shape.

### Domains shipped in the migration

| Domain | Tables |
|---|---|
| ① Auth + users | `users` · `profiles` · `organizations` · `user_roles` · `sessions` · `oauth_accounts` |
| ② Library | `valuations` · `saved_reports` · `favorite_reports` · `top_promote_reports` · `report_visibility` · `report_shares` |
| ③ Investment engine | `investment_requirements` · `market_preferences` · `valuation_preferences` · `revpar_scenarios` · `hotel_filters` |
| ④ CRM | `companies` · `contacts` · `leads` · `notes` · `activity_log` |
| ⑤ Files (Storage metadata) | `report_files` · `generated_pdfs` · `uploaded_excels` · `renders` · `avatars` |
| ⑥ System | `audit_logs` · `notifications` · `feature_flags` · `subscriptions` · `payment_events` |

### Files

- `docs/database/migrations/0001_initial_schema.sql` — single-file migration (~720 lines)
- `docs/database/README.md` — ER summary, ready-vs-placeholder map, apply instructions
- `docs/database/schema.sql` — deprecation pointer (replaced by migrations folder)
- `apps/web/src/lib/supabase/types.ts` — hand-rolled `Database` type matching all 30 tables + 15 enums

### Schema features

- **15 enums** (`user_tier`, `org_role`, `oauth_provider`, `report_visibility_t`, `report_type_badge`, `report_status`, `report_role`, `report_objective`, `share_permission`, `lead_status`, `pdf_status`, `excel_status`, `subscription_status`, `notification_kind`, `user_role`)
- **30 RLS policies** — every table enabled with own-only / public-read / parent-derived / org-scoped patterns
- **Triggers**:
  - `handle_new_user()` — auto-creates `public.users` + `public.profiles` on Supabase auth signup
  - `set_updated_at()` — bumped on update across 13 mutable tables
- **Indexes** on every FK + common query paths (`visibility`, `city`, `status`, partial indexes for active rows)
- **Generated column** `top_promote_reports.is_active` (boolean derived from `promoted_until > now()`)
- **Polymorphic notes + activity log** via `(entity_type, entity_id)` index pattern

### Architecture decisions

- `public.users` is split from `public.profiles` — auth-adjacent fields (tier, current_org) live separately from display fluff (avatar, locale, bio). Cuts churn surface on tier reads.
- `public.organizations` carries the multi-tenant boundary. `user_roles` is the N:M junction.
- `report_visibility` is an **audit log of transitions**, not a column duplication (`valuations.visibility` is the current state).
- `report_shares` supports both link-shares (anonymous, token-based) and per-user grants.
- `payment_events` has NO authenticated RLS policy by design — only the service-role Stripe webhook writes there.
- `feature_flags` is scoped to EITHER a user OR an organization (XOR check constraint).

### Apply path

The migration is not yet applied — DDL execution needs either the database password or a personal access token, neither of which is in the env today. The user will paste the file into the Supabase SQL editor manually. Once applied:

```bash
pnpm dlx supabase gen types typescript \
  --project-id twebgqutuqgonabvhzjk    \
  --schema public                       \
  > apps/web/src/lib/supabase/types.ts
```

regenerates the type surface; until then the hand-rolled types in `types.ts` match the migration 1:1.

### Build

Typecheck clean. No runtime change (no frontend code consumes Supabase tables yet — Phase 3 wiring is the next milestone).

---

## 2026-05-11 — Supabase architecture initialized

Production-grade scaffold for the Supabase layer: Postgres + Storage + (future) Auth.js adapter. Architecture lands today; project provisioning + credential paste-in lands on the user's next action.

### SDKs
- `@supabase/supabase-js@2.105.4`
- `@supabase/ssr@0.10.3`

### Files (`apps/web/src/lib/supabase/*`)
- `client.ts` · `createBrowserSupabaseClient()` — for `"use client"` components
- `server.ts` · `createServerSupabaseClient()` — RSC / actions / route handlers (Next 14 sync cookies)
- `middleware.ts` · `updateSupabaseSession()` — Edge middleware session refresh; no-op when env missing
- `admin.ts` · `getSupabaseAdmin()` — service-role, `import "server-only"` guard
- `auth-helpers.ts` · `getSupabaseUser`, `requireSupabaseUser`, `isSupabaseConfigured`, `isSupabaseAdminConfigured`
- `types.ts` · `Database` stub (regenerated after migrations)
- `index.ts` · barrel

### Middleware composition
`apps/web/src/middleware.ts` now composes `updateSupabaseSession(request)` → `auth()` (Auth.js). Both gated by their own env; the file is a pure pass-through until credentials are provisioned.

### Schema proposal
`docs/database/schema.sql` — NOT yet applied. Contains:
- 7 tables: `user_profiles`, `valuations`, `valuation_reports`, `favorites`, `top_promote`, `subscriptions` (six populated, ready for one more domain)
- 7 enums: `user_tier`, `user_role`, `report_visibility`, `report_type_badge`, `report_status`, `report_role`, `report_objective`
- Two triggers: `handle_new_user()` (auto-profile on auth signup), `set_updated_at()`
- Row Level Security policies on every table (own-read / public-read / owner-write)
- Documented storage buckets (`reports`, `pdfs`, `excel-uploads`, `renders`, `avatars`) — configured via dashboard, not SQL

### Connection probe
`/dev/supabase-test` — server-rendered checklist:
- Env vars present?
- Server client constructable?
- Service-role admin configured?
- Current session (anonymous expected today)
- "Where to find credentials" panel when env is empty

### Env placeholders (apps/web/.env.example)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### Build
- 34 routes (33 static + `/dev/supabase-test` dynamic + Auth.js handler).
- Middleware bundle 79.4 kB → **134 kB** (+55 kB for `@supabase/ssr` on Edge).
- First Load JS on protected routes: 138 kB (+1 kB).
- Typecheck + production build clean.

### Activation steps (next action — user)
1. Provision Supabase project — `https://supabase.com/dashboard` (Region: EU-West Ireland recommended)
2. Settings → API → copy `Project URL`, `anon key`, `service_role key`
3. Paste into `apps/web/.env.local` + `vercel env add … production` for each
4. Run `docs/database/schema.sql` via Supabase SQL editor
5. Configure storage buckets per the dossier
6. Regenerate types: `pnpm dlx supabase gen types typescript --project-id <REF> > apps/web/src/lib/supabase/types.ts`
7. Visit `/dev/supabase-test` — every row should turn green

### Out of scope (deferred)
- No `@auth/supabase-adapter` wire-up (Phase 3)
- No Stripe integration (Phase 5)
- No OAuth provider configuration on Supabase side (Auth.js handles OAuth today)
- No migration applied / no real DB queries from the app surface yet

---

## 2026-05-11 — Resend wired for tour-request CTA

The Library "Schedule a Tour" button on top-promoted contact-card popovers now sends a real institutional email via Resend.

### Files
- `apps/web/src/lib/email/client.ts` — singleton Resend client + `import "server-only"` guard
- `apps/web/src/lib/email/templates/tour-request.ts` — typed `renderTourRequest()` returning `{ subject, html, text }` (forest-900 header, slate body, escaped interpolation)
- `apps/web/src/lib/email/actions.ts` — server action `sendTourRequestAction` with zod payload validation, replyTo wiring, Resend tags
- `apps/web/src/components/library/contact-cell.tsx` — button now calls the action via `useTransition`, shows `Loader2` spinner while sending, toasts success / error
- `docs/integrations/resend.md` — full integration dossier

### Env
- `RESEND_API_KEY` — required. Set in `apps/web/.env.local` (dev) and Vercel project env (prod)
- `RESEND_FROM_EMAIL` — optional. Defaults to Resend sandbox (`HotelVALORA <onboarding@resend.dev>`)

### Sandbox note
While the from address is the Resend sandbox, deliveries only land in the Resend account owner's verified inbox. To deliver to arbitrary recipients (e.g., the account manager on each report), verify a custom domain in Resend and set `RESEND_FROM_EMAIL=HotelVALORA <noreply@hotelvalora.com>`.

### Build
33 routes static. /library/{favorites,top}-list 158 B / 137 kB (+1 B for the contact-cell delta). Typecheck + production build clean.

---

## 2026-05-11 — Auth.js v5 institutional scaffold

Wires Auth.js v5 (`next-auth@5.0.0-beta.31`) into Next.js 14 App Router with the production-ready split-config pattern. Google + LinkedIn + Apple providers configured (env-driven; placeholders today). Route-protection middleware ships behind an `AUTH_ENABLED` env flag — no behavioural change today, single env flip activates `/settings`, `/library`, `/report`, `/dashboard` gating once OAuth credentials land.

### Files
- `apps/web/src/auth.config.ts` — edge-safe config (providers, callbacks, JWT session, cookies, `authorized()` route gate, `PROTECTED_PREFIXES` constant)
- `apps/web/src/auth.ts` — `NextAuth(authConfig)` instance; exports `handlers` / `auth` / `signIn` / `signOut`
- `apps/web/src/app/api/auth/[...nextauth]/route.ts` — `{ GET, POST } = handlers`
- `apps/web/src/middleware.ts` — re-exports `auth` as middleware; matcher excludes `api/auth`, Next internals, static assets
- `apps/web/src/types/next-auth.d.ts` — module augmentation: `Session.user.{tier,role}` and `JWT.{tier,role,provider}`

### Tier system extension
- `UserTier`: dropped `institutional`, added `team` + `enterprise`. The legacy `institutional@…` email handle still infers `enterprise` for back-compat demos.
- New `UserRole = "user" | "admin" | "owner"`.
- `AppHeader` `TIER_LABELS` + `TIER_STYLES` extended (indigo for team, amber for enterprise).
- `lib/report/financials/types.ts` `Tier` alias updated to match.
- `useTier` + `canEditAssumptions` updated for the new tier set.

### UI wire-up
- `Providers` wraps the app in `<SessionProvider>` from `next-auth/react`.
- `useOAuth.signInWithProvider` body now calls `signIn(provider.nextAuthId, { callbackUrl, redirect: true })`.
- `OAUTH_PROVIDERS.{google,linkedin,apple}.enabled = true`; `microsoft` remains disabled (deferred to enterprise SSO surface).
- `LinkedInstitutionalAccounts` (rendered under the login card) and any future Settings → Credentials surface now routes to real Auth.js handshake.

### Env placeholders (apps/web/.env.example)
```
AUTH_SECRET=
AUTH_URL=
AUTH_ENABLED=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
APPLE_CLIENT_ID=
APPLE_CLIENT_SECRET=
```

### Build
- Production build clean. 33 routes static; `+ ƒ Middleware  79.4 kB` (Auth.js edge bundle). First Load JS on protected routes: ~137 kB (+5 kB for SessionProvider context).
- Two `jose` CompressionStream warnings on Edge — Auth.js Core dependency, harmless when JWE encryption is unused (we use JWS / signed JWTs only).

### Phase 3 swap (not in this commit)
- Add `@auth/supabase-adapter` to `auth.ts` (single line — `adapter: SupabaseAdapter(...)`)
- Mint OAuth apps and populate the env placeholders
- Set `AUTH_ENABLED=true` in Vercel
- Drop the Zustand mock auth store; bind `useTier()` to `useSession().data?.user.tier`

---

## 2026-05-10 — Library: contact card popover for top-promoted reports

The Contact column in both `/library/favorites-list` and `/library/top-list` now exposes an institutional contact card on hover — but only for rows whose `indicators.topPromote` flag is true AND which carry `contactInfo`. Everywhere else the icon stays grey and no popover renders.

### Component
- `apps/web/src/components/library/contact-cell.tsx` — `<ContactCell report />`.
- Renders the Mail glyph (forest-700 when active, slate-300 when inactive).
- Hover triggers a popover rendered via `React.createPortal` into `document.body`, pinned with `position: fixed` at coordinates captured from the icon's `getBoundingClientRect()`. The portal escapes the table's `overflow:auto` clip rect — without it, the popover would be cropped at the table's right edge.
- Layout matches Stitch: forest-900 header with "Account Manager" eyebrow / name / ID — listing.role, body with Asunto (computed from hotel name + stars + rooms + city), 2-col Objective / Role from listing data, mail + phone rows, and a "Schedule a Tour" pill CTA.
- Hover-leave clears the coords (popover unmounts). Re-entering the popover itself keeps it open.

### Data model
- `types/library.ts` — new `ReportContactInfo` (accountManager / accountManagerId / email / phone). `LibraryReport.contactInfo: ReportContactInfo | null`.
- Mock dataset: only the two top-promoted hotels carry contact info today: Ritz-Carlton Madrid (Carlos Velasco) and Mandarin Oriental Ritz (Marina López). The other four report `contactInfo: null`.

### Build
33 routes static. /library/favorites-list and /library/top-list 154 B / 133 kB First Load (+1 kB for the portal + popover). Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-list` (Top Reports institutional list)

Sibling list view of `/library/top-map`. Reuses the same `FavoritesTable` introduced for `/library/favorites-list` with one new toggle: `showReferenceColumn` inserts a REF column (HV-2024-NNN) just before the Report Type chip. Header copy swaps to "TOP REPORTS".

### Page
- `apps/web/src/app/library/top-list/page.tsx` — `LibrarySidebar` (Top Reports copy) + new `TopReportsListContent`.
- Header: "INSTITUTIONAL GRADE" badge, "Top Reports" title, "Promoted institutional hotel opportunities and underwriting intelligence." subtitle, three action icons (Map → /library/top-map, Filters, Settings).

### Table reuse
- `FavoritesTable` learned an optional `showReferenceColumn` prop. When set, renders an additional REF column header (`rowSpan=2`) and a monospace REF cell per row between IRR Equity and Report Type. Empty-state colSpan adapts (36 vs 37). No duplication, single canonical institutional table.

### Map ↔ list toggle generalized
- `HotelMap` now accepts an explicit `listViewHref` prop. /library/favorites-map passes `/library/favorites-list`; /library/top-map passes `/library/top-list`. The list-view button in `InstitutionalMapControls` only renders when an href is provided.
- TOP segmented tab is route-aware for both `/top-map` and `/top-list` (`activePaths`).

### Data model
- `LibraryReport` extended with `referenceCode` ("HV-2024-001" through "HV-2024-006") and `visibilityTier` (existing `VisibilityTier` union: promoted/institutional/community/verified — distinct from the Report Type chip; positions each hotel for the future Top Promote ranking engine).

### Build
32 → 33 routes static. /library/top-list 155 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/favorites-list` (institutional list view)

Bloomberg-grade table sibling of `/library/favorites-map`. Same `LibraryShell` and `LibrarySidebar`, swap the map for a 39-column technical terminal table over the same six mock reports.

### Page
- `apps/web/src/app/library/favorites-list/page.tsx` (LibraryShell + sidebar + new content column).
- Header bar: lime-on-forest "Institutional Grade" chip, "Favoritos" headline, subtitle, three-icon action group (map view link → `/library/favorites-map`, filters and settings as toast mocks today).
- Pagination footer: "SHOWING N OF M HOTELS".

### Table architecture (`favorites-table.tsx`)
- 39 visible cells per row (sticky-left "Hotel Name" + Category stars + Rooms + Market + 8 amenities + 9 listing/location columns + CAPEX + Total Invest 3-col group + Cap Rate + Market Value TTM 3-col group + Exit Year + Exit Price 3-col group + Yield + IRR Project + IRR Equity + Report Type chip + Contact + Star + PDF).
- `min-w-[4500px]` horizontal scroll; sticky `<thead>` survives both axis scroll; sticky first column with subtle right shadow.
- Accent column tints: blue for CAPEX / IRR Equity, emerald for Cap Rate / Market Value TTM.
- Locked-cell pattern: `LockedCell` renders a small blue lock pill for any null financial value (tier-gated).
- Memoized `<FavoritesRow>` (React.memo) so future virtualization drops in without prop reshuffles.
- Filters wired to the existing library store: search + legend toggles drive `visible` rows. Hover row highlight + cursor pointer + onSelect action (today: toast, future: open report detail).

### Cell primitives
- `AmenityIconCell` — single amenity, `forest-700` active / `slate-300` inactive. Lucide map: Bar→Coffee, Restaurant→UtensilsCrossed, Rooftop→Wine, Meet→Users, Gym→Dumbbell, Spa→Sparkles, Pool→Waves, Parking→Car.
- `ReportTypeChip` — Premium / PRO / Public / Private chip plus optional indicators row (Flame for top-promote, Edit3 for user-modified, EyeOff for private).
- `LockedCell` — small lock pill for tier-gated cells.

### Map ↔ list toggle on /library/favorites-map
- `InstitutionalMapControls` learned an optional `listViewHref` prop that renders a `LayoutList` link button between zoom-out and layers. `HotelMap` passes `/library/favorites-list`. The list page mirrors the toggle via the Map icon in its header.

### Sidebar tab routing
- `LibraryFilterTabs` now uses `activePaths[]` per tab, so the FAVORITOS pill stays active on both `/library/favorites-map` and `/library/favorites-list`.

### Data model (types/library.ts)
- New shapes: `ReportAmenities` (8 keys), `ReportLocation` (address/zip/subMarket/locationScore), `ReportListing` (role/objective/openYear/classLabel), `ReportPriceBlock` (total/perRoom/perM2), `ReportFinancials` (capex/totalInvest/capRate/marketValueTtm/exitYear/exitPrice/yield/irrProject/irrEquity — all nullable except capRate + marketValueTtm to express tier-gated cells), `ReportTypeBadge`, `ReportIndicators` (topPromote/userModified/private).
- `LibraryReport` extended with `amenities`, `location`, `listing`, `financials`, `reportType`, `indicators`, `hasContact`, `favorited`, `hasPdf`. The legacy `estValueEur` and top-level `capRate` stay for the favorites-map floating card.
- All six mock reports populated with realistic financial blocks per tier (Premium = full data, PRO = capex+irrEquity locked, Public/Private = most premium fields locked).

### Build
30 → 32 routes static. `/library/favorites-list` 154 B / 132 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library: `/library/top-map` (Top Reports map)

Sibling page to `/library/favorites-map`. Same institutional language (LibraryShell + LibrarySidebar + HotelMap + FloatingHotelCard) — no duplicated chrome, no parallel components. Visual deltas vs favorites-map are limited to title, subtitle, search placeholder.

### Architecture
- `LibrarySidebar` accepts `title` / `subtitle` / `searchPlaceholder` props with defaults that preserve favorites-map behaviour byte-for-byte.
- `LibraryFilterTabs` becomes route-aware: `<Link>`-based segmented control (FAVORITOS → `/library/favorites-map`, TOP → `/library/top-map`); active state from `usePathname()`. Clicking either tab now navigates between the two pages.
- Removed `filterTab` slice from the library Zustand store (replaced by URL truth). `LibraryFilterTab` type retired.
- Forward-compat types added to `types/library.ts` for the future Top Promote marketplace + ranking engine: `VisibilityTier` (`promoted` / `institutional` / `community` / `verified`), `MapMarkerType`, `AssetType`, `AccessTier`, `InvestmentBand`, `ReportRanking`, `TopReport`, `PromotedReport`, `TopReportsLegendState`, `TopReportsFilters`, `TopReportsViewMode`. No render touches today — purely the typed surface.

### Page
- `apps/web/src/app/library/top-map/page.tsx` — composes `LibrarySidebar` (top-map copy) + the existing `HotelMap`. Mock dataset and store are shared with favorites-map: legend toggles, search, layer overlays and selection persist across the FAVORITOS/TOP swap (institutional UX).

### Build
30 → 31 routes static. `/library/top-map` 155 B / 126 kB First Load. Typecheck + production build clean.

---

## 2026-05-10 — Library v1: `/library/favorites-map` (Favoritos map)

First page of the institutional Library surface. Saved-reports + community + TOP PROMOTE markers over a mock institutional grayscale map of Madrid. No backend, no Mapbox — fully mock.

### Route + shell
- `/library/favorites-map` — `apps/web/src/app/library/favorites-map/page.tsx`
- `app/library/layout.tsx` wraps every `/library/*` page in a new `LibraryShell` (AppHeader + `h-screen` body row + slim institutional footer).
- `AppHeader.libraryHref` default updated from `/library` → `/library/favorites-map`. New active-state logic: when `usePathname()` starts with `/library`, BIBLIOTECA renders as a black-fill button and USUARIO inverts to a white-with-border button — matches the Stitch reference.
- Extracted the previously-private `SettingsFooter` into `components/layout/institutional-footer.tsx` (`variant: "default" | "slim"`); `SettingsLayout` now imports it. Single source of truth for the institutional bottom chrome.

### Components shipped (`components/library/`)
- `LibraryShell` — outer kiosk shell
- `LibrarySidebar` — 300 px, FAVORITOS title + subtitle, legend card, search input, segmented filter, bottom CTA
- `MapLegendCard` — 3 category toggles (Saved / Comunidad / Top Promote) + 3 layer toggles (Heatmap / Líneas de Metro / Centro Histórico)
- `MapLayerToggle` — 32×18 institutional rail switch (slate-300 → blue-700 on)
- `LibraryFilterTabs` — FAVORITOS / TOP segmented control
- `HotelMap` — provider-agnostic mock map (grayscale aerial bg, percentage markers, optional overlays for heatmap / metro / historic centre); ready for Mapbox swap (records carry real `lat/lng`)
- `HotelMapMarker` — category-coloured dot + hover tip; TOP PROMOTE pulses
- `InstitutionalMapControls` — top-right zoom +/- + layers stack
- `FloatingHotelCard` — bottom-right glass preview (hotel name, classification, room count, TOP PROMOTE / tier badges, EST. VALUE + CAP. RATE tiles, "View Full Valuation" CTA)

### State & data
- `lib/library/store.ts` — Zustand UI state (legend, layers, filterTab, search, selectedReportId). In-memory by design.
- `lib/library/mock-reports.ts` — 6 institutional reports with real coordinates: Ritz-Carlton Madrid, Mandarin Oriental Ritz, Four Seasons Madrid, The Madrid EDITION, Hard Rock Marbella, W Barcelona. Each carries `category`, `visibility`, valuation, cap rate, rooms, owner, full `ReportPromotion` block (`promoted`, `promotedUntil`, `boostScore`, `featuredRegion`, `impressions`, `clicks`).
- `types/library.ts` — `LibraryReport`, `ReportCategory`, `ReportVisibility`, `ReportStatus`, `ReportPromotion`, `LibraryLegendState`, `LibraryLayerState`, `LibraryFilterTab`, `MapBounds`, `MapProviderHandles`.

### Architecture notes
- Future-ready map abstraction: real `lat/lng` already on every record; `mockPosition` (top%/left%) is the temporary projection layer the Mapbox swap drops.
- Bottom CTA + map controls + "View Full Valuation" emit sonner toasts today (mock actions).
- Search filters in-memory by hotel name; legend toggles hide/show markers by category live.
- Report taxonomy supports `private` / `team` / `public` / `top-promote` visibility ready for the future sharing & marketplace flows.

### Build
Typecheck clean. No backend / no DB / no Mapbox added.

---

## 2026-05-10 — Investment Requirements / Hotel Value: investor financial criteria

Replaced the `/settings/investment/value` placeholder with the full Hotel Value criteria engine — third tab in the Investment Requirements surface. Captures investor underwriting preferences across 5 sections that feed the future DCF / IRR / debt sizing / exit yield pipeline.

### Sections (5)
- **Site Acquisition** — Asking Price slider (€/$ currency selector + Total/Per Room/Per m² display), Acquisition Cost (Basic/Premium gate; Premium reveals editable 5-line table: Notary & Registry, AJD Stamp Duty, ITP Property Tax, Acquisition Fee, Key Money Operator), Total Investment slider with `Guardar` action, collapsible Saved Scenarios list with delete
- **Exit Investment** — Exit Price slider with `Guardar`, Saved Scenarios, Cap Rate Scenario (flat segmented Conservador/Mercado/Optimista — distinct from RevPAR Scenario card style per Stitch), Yield Target / IRR Project / IRR Equity sliders
- **Rent Factor** — `enabled=false` by default. € Rent input, % Fixed Rent + % Variable Rent each with slider + numeric input + basis select (% Revenue / % GOP / % EBITDAR)
- **Finance Structure** — 8 institutional sliders in 2-col grid (Acquisition Debt, Capex Debt, Interest Rate, Amortization Asset, Grace Period, Amortization Capex, Bullet Payment, Opening Fee) — each with range hint
- **P&L Forecast** — TTM slider, Management Fee Basic/Premium gate (Premium reveals Base + Incentive fee with basis segmented), Marketing — Royalty %, FF&E Reserve Y1-Y4 grid

### Right sidebar
- `PremiumSubscriptionCard` — dark-forest gradient + yellow accents, 8 features (Hotel Personalizado, CompSET Premium, CAPEX & Renders, P&L Forecast, Financial Strategy, Underwriting & IRR Equity, AI Imágenes, Chatbot P&L Premium), "Valora Prime" footer, ACTIVATE CTA
- `ProSubscriptionCard` — white card, 7 PRO features (Hotel Asset Info, CompSET PRO, Market Overview, Hotel Transactions Comparable, Local Hotel Projects, IRR Project, Informe Privado), disabled INCLUDED CTA

### Store extension (`lib/investment/store.ts`)
- New `ValueAssumptions` slice with 5 sub-blocks; persist version bumped to v3 with chained migration (v1 → market hydrate, v2 → value hydrate)
- 30+ granular mutations for all field types
- Saved scenarios — `addSiteScenario` / `addExitScenario` capture the current slider value + mode and append to the scenarios list

### Reusable architecture
- New shared `InstitutionalToggle` extracted from market's inline `MasterToggle` — now the canonical ON/OFF switch across both market + value surfaces; `forecast-growth-card` refactored to import it
- New `ACQUISITION_COST_LINES` taxonomy (`lib/investment/value-acquisition.ts`) — Excel-mappable line ids for future workbook ingestion
- `CapRatePicker` is a new primitive (the spec said reuse RevPAR style but Stitch shows a flatter segmented pill — built per Stitch)

### Components shipped
14 new files in `components/settings/investment/value/`: 7 primitives (DisplayModeToggle, UnderwritingSlider, LabeledSlider, BasicPremiumPicker, CapRatePicker, SavedScenarioList, AcquisitionCostTable, FfeReserveYears), 5 sections (Site/Exit/Rent/Finance/PL), 2 sidebar cards.

### Build
`/settings/investment/value` 8.12 kB / 130 kB First Load. 28 routes total. Typecheck clean.

---

## 2026-05-10 — Investment Requirements / Hotel Market: ADR + OCC growth, RevPAR scenario, target

New authenticated route `/settings/investment/market` — second tab inside the criteria engine. Captures market-level assumptions that feed the future P&L / DCF / IRR re-projection pipeline.

### Routing refactor
- `InvestmentTabs` converted from Zustand `activeTab` state to real Next.js routes (`/settings/investment` = Asset · `/settings/investment/market` · `/settings/investment/value`). Active state derived from `usePathname()` so analysts can deep-link / refresh into any tab and the back button works.
- Removed `activeTab` + `setTab` from `useInvestmentStore`; `partialize` and store version bumped to v2 with a `migrate` function that hydrates the new `market` slice on existing v1 localStorage.
- `/settings/investment/value` shipped as a minimal placeholder page so the third tab doesn't 404.

### Sections (Hotel Market)
- **ADR Forecast Growth** — master ON/OFF + CONSTANT (slider 0–10%) / CUSTOM (Year 1–4 inputs) modes
- **OCC Forecast Growth** — same pattern
- **RevPAR Scenario** — reuses the canonical 3-button selector from `@/components/report/financials` (DOWN/BASE/UP, decorative top labels Conservador/Mercado/Optimista)
- **RevPAR Target** — €/room thesis hurdle

### Scenario KPI tables (`lib/investment/market-scenarios.ts`)
Hand-curated mock keyed by `UnderwritingScenario`. Distinct from the P&L's own scenarios — these capture *market-level* growth assumptions:
- DOWN: OCC +2/+1/+0/+0 pp · ADR +1.5/+1.0/+1.0/+1.5%
- BASE: OCC +3/+2/+1/+0 pp · ADR +3.6/+2.9/+1.5/+2.4%
- UP:   OCC same as BASE · ADR +5.0/+4.0/+3.5/+5.0%

Tables intentionally NOT rendered in the segmented selector — used internally for downstream re-projection. v2 hydrates from CoStar / STR exports.

### Right sidebar
Four cards: `MarketCoverageCard` (compact country pills — distinct from the asset-tab tree variant), `MarketPrimeCard` (dark forest premium tier with PRIME badge + ACTIVATE), `MarketOverviewCard` (white feature gate with INCLUDED CTA), `ExtraPackagesCard` (yellow add-on stacker with auto-recomputing total).

### Components
- `components/settings/investment/market/` — 6 new files (ForecastGrowthCard, RevparTargetCard, MarketCoverageCard, MarketPrimeCard, MarketOverviewCard, ExtraPackagesCard) + barrel
- `SectionHeader` extended with optional `rightSlot` for the inline ON/OFF toggle on Market sections
- `RevparScenarioCard` reused from `@/components/report/financials` per spec — no new component

### Store
- `MarketAssumptions` type added to `InvestmentCriteria` (adrGrowth, occGrowth, revparScenario, revparTargetEur)
- New mutations: `setAdrGrowth`, `setOccGrowth`, `setRevparScenario`, `setRevparTarget`, `resetMarket`

---

## 2026-05-10 — Investment Requirements: criteria engine + match-engine architecture

New authenticated page `/settings/investment` — the canonical engine that defines what hotels the user wants to acquire. Drives the future GREEN / YELLOW / RED match indicator that will surface on every analytical surface (Executive Summary, CompSet, Underwriting, Deal Screening, IC reports).

### Page composition (3-col layout)
- Top sub-tabs: Hotel Asset (active, shipped) / Hotel Market / Hotel Value (registered, no-op v1)
- Main column (editorial card): 6 sections — MyProperty Parameters · Capacity & Operation · Location Targets · Property Specs · CAPEX Settings · Renders/AI Image
- Right sidebar (sticky `lg:top-24`): MyProperty Facilities · CompSet Facilities · Global Coverage tree
- Bottom centered SAVE PREFERENCES CTA

### Data layer — `lib/investment/`
- `types.ts` — `InvestmentCriteria`, `MatchTier`, `MatchResult`, `CapexUnit`, `FacilityId`, `CoverageNode`
- `capex.ts` — `CAPEX_TREE` (Hard/Soft/Project Costs) Excel-mappable by line `id`
- `facilities.ts` — 8 canonical facility ids (bar/restaurant/rooftop/meetings/parking/gym/spa/pool)
- `coverage.ts` — Spain (Madrid + Barcelona) + Italy (Rome/Milan) hand-curated tree
- `match-engine.ts` — `evaluateHotel(hotel, criteria)` stub returning hardcoded "strong" result; `tierFromScore()` thresholds (≥0.75 strong / ≥0.50 partial / <0.50 weak)
- `store.ts` — Zustand persist (key `hv-investment-v1`) — every input survives reload
- `index.ts` — public surface

### Components — `components/settings/investment/`
- 14 files: `InvestmentTabs`, `SectionHeader`, 6 section cards, `CapexTable` (collapsible Hard/Soft/Project + per-line value+unit selectors), `FacilitiesCard` (reusable for MyProperty + CompSet via `bottomSlot`), `CoverageCard` + `CoverageTree`, `DualRangeSlider` (custom thumb styling via styled-jsx), `SliderField`, `MatchIndicator` (🟢🟡🔴 placeholder primitive for downstream surfaces)

### Architecture notes
- Match engine is a stub today; v2 wires per-category scoring (location, size, facilities, financials, capex, strategy)
- CAPEX line ids align with the future Excel underwriting workbook for 1:1 hydration
- `MatchIndicator` ships unused on the page itself — it's the primitive every downstream report will render

---

## 2026-05-09 — 5-Year P&L Forecast: Year 1 monthly expansion + seasonality engine

The Year 1 column in the USALI table is now expandable. Clicking `▸ Year 1` in the header replaces the single column with 12 month sub-columns (Jan–Dec) inline within the same table; chevron flips to `▾`.

### Seasonality engine
New module `lib/report/financials/seasonality.ts`:
- `SeasonalityProfile` contract — 12 occupancy + 12 ADR multipliers + source id
- `MADRID_UPSCALE_SEASONALITY` default (Q2/Q3 strong, Aug weak, Jan/Feb soft)
- `getSeasonalityProfile(market, class)` lookup — returns Madrid default in v1
- `expandYear1ToMonthly(assumptions, computed, profile)` — pure monthly pipeline
- `adapterFromCoStarMonthlyRows` — adapter stub for future Excel ingestion

### Mathematical guarantees
Sum of monthly = annual Year-1 value, exactly:
- Variable lines: ratio × monthly revenue (sums to ratio × annual)
- Inflated lines: annual amount × days[m] / 365
- Hybrid dept fixed payroll portion: same pro-rata by days

EBITDA % margin varies month-to-month (low-occupancy months bear same fixed costs against lower revenue).

### UI / table layout
- `FinancialTable` renders 1-row header when collapsed (current), 2-row header when expanded:
  - Row 1: Label / Assump / `▾ Year 1` (colSpan=12) / Year 2 / Year 3 / Year 4 / Year 5
  - Row 2: 12 month abbreviations under the Year-1 span; Y2-Y5 carry rowSpan=2
- `getTableColCount(expanded)` → 7 collapsed, 18 expanded
- `PLRow` accepts optional `year1Monthly: number[]` — when provided, replaces the single Y1 cell with 12 read-only monthly cells
- `FinancialResultRow` same pattern (incl. EBITDA `% Margin` sub-row)
- Monthly cells render compact (smaller padding + font) so 12 columns fit reasonably; horizontal scroll in narrow viewports

### Architecture for future CoStar Excel ingestion
Adapter pattern in place — `getSeasonalityProfile` is the swap point. Replace the body with a CoStar query / Excel adapter when the dataset ships.

### Print
Expansion state survives print — analyst's choice respected. No auto-collapse for PDF. With 18 columns the table may overflow A4 portrait (acceptable trade-off).

### Files
- `NEW`  `apps/web/src/lib/report/financials/seasonality.ts`
- `EDIT` `apps/web/src/lib/report/financials/index.ts` (exports)
- `EDIT` `apps/web/src/components/report/financials/financial-table.tsx` (header variants, toggle)
- `EDIT` `apps/web/src/components/report/financials/pl-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/financial-result-row.tsx` (monthly cells branch)
- `EDIT` `apps/web/src/components/report/financials/pl-section.tsx` (forwarding)
- `EDIT` `apps/web/src/components/report/financials/pl-table.tsx` (state owner + memo)

---

## 2026-05-09 — 5-Year P&L Forecast: hybrid departmental + payroll inflation activated

Fixed a residual rounding artifact: at 1 decimal place, EBITDA margin Y3-Y5 displayed identically (~31.4%) because the year-to-year deltas were sub-0.1pp. Root cause: departmental expenses were 100% variable (ratio × revenue), so they captured no payroll cost pressure independent of revenue growth.

### What changed in `computePL`
Departmental expenses (Rooms / F&B / Other Dept) refactored to hybrid 70 / 30 split:
- 70% variable: ratio × dept revenue (labour productivity scales with the business)
- 30% fixed-inflating: Y1 base × `payroll inflation` compounded

`DEPT_PAYROLL_FIXED_SHARE = 0.3` hard-coded in `calculations.ts` (institutional default for full-service hotels). The `payroll` field on `expenseInflation` now drives the model — previously decorative.

### Effect on BASE preset (default 4.5% payroll, 2.5%/3.5% other/utilities)
Year-by-year EBITDA margin trajectory (visible variation at 1 decimal):
- Y1 ~29.6% (no inflation compounded yet)
- Y2 ~31.2%
- Y3 ~32.0% ← peak (operating leverage maximises at stabilization)
- Y4 ~31.9%
- Y5 ~31.6% (revenue growth Y5 +2.4% < payroll 4.5% → mild compression)

Y3 ≠ Y4 ≠ Y5 ✓. Pattern matches the canonical institutional hotel model (peak at stabilization, gentle plateau / late-cycle compression).

### Scenario sensitivity
- DOWN: revenue grows ~3%/year < payroll 4.5% → margin contracts from Y2 onwards
- BASE: revenue ~5%/year ≈ payroll → peak then mild contraction
- UP: revenue ~7-8%/year > payroll → sustained expansion

---

## 2026-05-09 — 5-Year P&L Forecast: operating leverage (margin expansion)

Fixed a model bug where every USALI expense line was modelled as `ratio × revenue` (variable). Result: EBITDA margin was identical across all 5 years — no operating leverage at all.

### What changed in `computePL`
Undistributed lines (Admin, S&M, Property maint, Utilities) + Property tax & insurance now compound from their Year-1 base by the `expenseInflation` rates from the second top card:
- Admin / S&M / Property maint / Property tax → `other` (2.5%)
- Utilities → `utilities` (3.5%)

Departmental expenses + Mgmt fee + FF&E reserve stay variable (ratio × revenue) — labour-driven and contract-priced lines respectively.

### Effect
Year 1 EBITDA margin unchanged (no inflation has compounded yet). Year 2-5 margin expands when scenario RevPAR growth > inflation rate. For BASE preset: Year 1 30.6% → Year 5 ~32% (institutional operating leverage realism).

The `expenseInflation` card values now drive the model — previously they were captured on `PLAssumptions` but had no effect.

---

## 2026-05-09 — 5-Year P&L Forecast: scenario presets (Down/Base/Up)

Replaced the single-rate scenario model with three full underwriting presets. Each preset is a complete (occupancy pp-deltas + ADR YoY growth) tuple per year — switching the active scenario re-projects ADR, RevPAR, Revenue, GOP, EBITDA, and EBITDA margin in one `computePL` pass.

### Preset table (committee spec)
| Scenario | Y2 Occ Δ | Y3 Occ Δ | Y4 Occ Δ | Y5 Occ Δ | Y2 ADR | Y3 ADR | Y4 ADR | Y5 ADR |
|---|---|---|---|---|---|---|---|---|
| DOWN | +1.0pp | +1.0pp | +0.5pp | +0.5pp | +1.5% | +2.0% | +2.0% | +2.5% |
| BASE | +3.0pp | +2.0pp | +1.0pp | 0pp | +3.6% | +2.9% | +1.5% | +2.4% |
| UP   | +3.0pp | +2.0pp | +1.0pp | 0pp | +5.0% | +4.5% | +4.0% | +3.5% |

BASE preset reproduces the Stitch table figures (Year 5 RevPAR ≈ €137.68 vs €138.69, within rounding).

### UI
RevparScenarioCard is now a 3-button preset selector (Down / Base / Up) styled as institutional input-tiles. Active button = forest-900 + white. Inactive = white + slate. PRO renders disabled, PREMIUM clickable.

### Data layer
- `PLAssumptions.scenarioGrowth` and `occupancyGrowth` removed.
- `PLAssumptions.activeScenario: UnderwritingScenario` added.
- `SCENARIO_PRESETS: Record<UnderwritingScenario, { occDeltas[4]; adrGrowth[4] }>` lives in `lib/report/financials/assumptions.ts`.
- `SCENARIO_LABELS` updated to short institutional form: `Down / Base / Up`.

---

## 2026-05-09 — 5-Year P&L Forecast: Lectura A scenario architecture

Refactored `/report/financials/pl` so each underwriting scenario is an independent committee growth parameter instead of a globally-selected lens. Removed the global `ScenarioToggle` from the report header and the Zustand store under `lib/underwriting/scenario.ts` (kept the type + display labels for reuse).

### Changes
- **Sidebar**: `Financials → P&L` → `Financials → 5-Year P&L`.
- **RevparScenarioCard**: 3-tile readout → 3 editable inputs (Conservador / Mercado / Optimista). Each one a constant RevPAR growth rate.
- **EbitdaStabilizedCard**: assumption value `50.5%` → derived from `computed.results.ebitdaMargin[2]` (Year 3 % margin). Auto-tracks edits.
- **Header**: `ScenarioToggle` removed from header actions.
- **Calc model change**: `computePL(a, scenario)` → `computePL(a)`. Uses `a.scenarioGrowth.base` as a constant year-over-year multiplier (no more yr2/yr3/yr4-5 differentiation). Year 5 RevPAR ≈ €143.59 (vs prior €138.69 from differentiated growth).

### Data layer
- `PLAssumptions.revparGrowth { yr2; yr3; yr4to5 }` and `PLAssumptions.revparScenario` removed.
- New: `PLAssumptions.scenarioGrowth: Record<UnderwritingScenario, number>` — 3 independent constant growth rates.
- Defaults: `{ downside: 0.085, base: 0.060, upside: 0.030 }` (preserves Stitch reference values).

### Tier behaviour (unchanged)
FREE → page-level upgrade gate. PRO → all inputs (including the 3 scenario rates) render `readOnly`. PREMIUM → editable.

### Files
- `EDIT` `apps/web/src/lib/report/financials/{types,assumptions,calculations,index}.ts`
- `EDIT` `apps/web/src/lib/underwriting/scenario.ts` (drop store, keep type + labels)
- `EDIT` `apps/web/src/components/report/financials/pl-top-cards.tsx`
- `EDIT` `apps/web/src/app/report/financials/pl/{page,pl-content}.tsx`
- `EDIT` `apps/web/src/lib/report/sections.ts`
- `DELETE` `apps/web/src/components/report/scenario-toggle.tsx`

---

## 2026-05-09 — Projects page (sub-route under Market Overview)

Second sub-route under Market Overview. Mirrors Transactions structure with project-specific extensions.

### New page — `/report/market-overview/projects`
- Sub-route, sidebar two-pass detection picks it via Pass 1.
- Same shell pattern as Transactions: `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → KPI row + projects table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview: `Projects` switched from `#projects` hash anchor → `/report/market-overview/projects` real sub-route.

### Reuse — no duplicate components built
- `TransactionsKpiCard` (cross-folder import) — same dual-metric shape; renders projects pipeline KPIs.
- `TransactionHotelCard` (cross-folder import) — same gallery card.
- `DualMetric`, `TransactionClass`, `TransactionHotelGalleryItem` types — re-imported.

### New section family — `components/report/market-overview/projects/`
- `ProjectsTable` — 19-column institutional table (one more than Transactions: STATUS pill column). Renames `Buyer→Owner`, `Seller→Developer`, `CAPEX→Construction Type`.
- `StatusBadge` — emerald (Complete) / blue (Under Construction) pill.

### Data layer — `lib/report/projects-data.ts`
- `ProjectRow` adds `status: ProjectStatus` and `constructionType: ConstructionType` discriminated unions.
- 5 mock projects (same Madrid hotels for cross-page consistency).
- 4 gallery items using real Stitch CDN URLs.

### Side-effect
- `TransactionsKpiCardData.scope` widened from union literal to `string` so `ProjectsKpiCardData.scope` (`"market" | "category"`) flows through the same component without TypeScript variance complaints. Component only uses `scope` as a DOM id key.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/projects` and on every other report route.
- SSR confirms: 2 KPI titles, 5 status badges (3 Complete + 2 Under Construction), 5 construction types (3 Conversion + 2 New Development), all owner/developer fields. Sidebar Projects active.

---

## 2026-05-09 — Transactions page (sub-route under Market Overview)

New report sub-section integrated. Web layout + responsive shipped per priority order; print compaction will be the next pass.

### New page — `/report/market-overview/transactions`
- Sub-route under Market Overview (sidebar two-pass detection picks it via Pass 1 — sub-route match).
- `<ReportShell>` (default portrait) → `<ReportPaper closed headerLayout="stacked" actions={<HotelLabel + HotelToggle>}>` → KPI row + comp-set table + gallery → `<ActionBar>`.

### Sidebar
- `sections.ts` Market Overview sub-items updated:
  - `Market overview` → `/report/market-overview` (sub-route, was `#overview` hash anchor)
  - **`Transactions` → `/report/market-overview/transactions`** (NEW sub-route, was `#transactions` hash anchor)
  - `Projects` and `Market dynamics` remain hash-anchor placeholders.

### New section family — `components/report/market-overview/transactions/` (4 components)
- `TransactionsKpiCard` — header + `InsightBadge` + 2×2 dual-metric grid. Same chrome as Market Overview insight cards.
- `DualMetricCell` — twin label+value pair via `flex justify-between` (replaces Stitch's whitespace-padding hack).
- `TransactionsTable` — institutional 18-column comp-set table with sticky-style header bar, "Add" placeholder CTA, divide-y rows, soft hover, asset-name highlight on row hover, local checkbox state for the Inc. column.
- `TransactionHotelCard` — 4:3 image card with dark gradient, white headline caption (bottom-left) + glass arrow button (bottom-right).

### Data layer — `lib/report/transactions-data.ts`
- 2 KPI cards × 4 dual metrics, 5 table rows (Madrid luxury hotels), 4 gallery items.
- Discriminated union `TransactionClass`. Numeric values pre-formatted strings (`€130,000,000`, `€849,673`).

### Reuse
- `ReportShell`, `ReportPaper`, `HotelToggle`, `InsightBadge`, `ActionBar` — all canonical, no changes.
- Print canvas portrait by default (no orientation prop on this page).

### Web priority — done
- ✅ Layout web: KPI row 2-col + table + gallery 4-col.
- ✅ Responsive: KPI `grid-cols-1 md:grid-cols-2`, gallery `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`, table `overflow-x-auto whitespace-nowrap`.
- ✅ Visual integration: same badge styling, same card chrome, sub-route under Market Overview.

### Print — basic only (next-pass focus)
- `print:break-inside-avoid` on KPI cards and table rows; `print:hidden` on Inc. checkbox column, "Add" CTA, gallery arrow button.
- Pending: column subset for portrait OR landscape opt-in, thead repeat (`display: table-header-group`), font-size compaction.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview/transactions` and all other report routes.
- SSR: 2 KPI cards · 2 badges · table title · 5 table rows · 4 gallery cards. Sidebar `Transactions` active (`text-emerald-900 font-bold`), `Market overview` inactive (`text-slate-500`).

---

## 2026-05-08 — Documentation pass (state-of-the-system refresh)

Full sweep refreshing every architecture / report / print / map doc to reflect the post-Phase-0 + 4-section-integration state. No code changes.

### Updated
- `TECH_AUDIT.md` — status banner at the top with per-finding resolution markers; original audit body preserved as snapshot.
- `NEXT_PHASE_PLAN.md` — per-phase status table (Phases 0, 1, 2, 3, 5, 8 ✅ Done; 6 / 10 🟡 Partial; 4, 7, 9 ⏸ Outstanding); updated next-step recommendations.
- `ARCHITECTURE_SCORECARD.md` — full re-score with delta column. Composite **6.42 → 7.42 / 10**. Heaviest movement: frontend architecture (6.3 → 7.8), report system (6.0 → 8.0), documentation (7.3 → 8.7).
- `docs/architecture.md` — application flow updated with all 5 implemented routes and 2 planned.
- `docs/report-system.md` — full rewrite covering canonical shell, registry, sub-anchor href contract, two-pass active-detection, page composition patterns (standard / stacked / carousel), per-page orientation.
- `docs/print-pdf.md` — extended with portrait + landscape canvases, named-page rules, carousel ↔ static-grid print logic, per-page print profiles, interactive-control print policy.
- `AI_CONTEXT.md` — Report Module section refreshed (5 of 6 sections, primitives barrel + section families, two-pass sidebar, carousel pattern, both canvas variants, all current mock files).
- `ENTRYPOINTS.md` — added page entries for Asset Analysis × 2 + Market Overview, all section family folders, `maps.md` doc reference, root-level `REPORT_PAGES.md` / `UI_COMPONENTS.md` references.
- `CLAUDE.md` — `docs/` tree updated with `maps.md`; doc-update mandate table extended with maps.md trigger.

### Created
- `docs/maps.md` — canonical doc covering both map systems: Mapbox CompSet map (`/compset` + `/report/competitive-set`) and stylised pin map (`SharedMapCard` for Market Overview demand generators), with reuse pattern, data shapes, print behaviour, and outstanding items.

### Decisions captured

| Decision | Source iteration | Rationale |
|---|---|---|
| Single canonical report shell (no parametric `[reportId]`) | Phase 0 | Eliminate dual-architecture risk identified in audit |
| `sections.ts` is the only registry | Phase 0 | One source of truth for sidebar + page-break + status |
| Sub-item href: absolute path OR hash anchor | Asset Analysis ports | Real sub-routes coexist with in-page anchors |
| Two-pass sidebar active detection | Market Overview | Prevent "all hash-anchors active" bug |
| Stacked header layout for Asset Analysis / CAPEX / Market Overview | Stitch ports | Matches Stitch reference (PDF button on its own row) |
| `closed` paper variant | Stitch ports | Fully bordered card for sections without trailing ActionBar attachment |
| `printOrientation` prop on ReportShell | Market Overview iteration | Two A4 canvases; default portrait; landscape opt-in |
| `@page { margin: 10mm }` (was `8mm 10mm`) | Market Overview iteration | Institutional symmetric margin |
| Market Overview portrait (was landscape) | Market Overview revision | Institutional report standard; landscape variant remains wired but unused |
| Carousel: paged desktop + free swipe mobile + static grid print | Market Overview integration | Three modes, one DOM render, media-query driven |
| Stitch-verbatim Submarket / Class investment metrics | Second Stitch screen | Honour source of truth even when Stitch reuses Country/Market labels |
| Population footer as vertical KPI tile in column 3 | Footer revision | Future-proofing for 2 additional metrics in cols 1+2 |

### Problems detected and resolution adopted

| Problem | Solution |
|---|---|
| Audit identified two parallel report shells | Phase 0 deleted `layout/`, `report-context.tsx`, `[reportId]` route tree |
| `report-nav.ts` (6 items) + `sections.ts` (15 items) both alive | Phase 0 deleted `report-nav.ts`; rewrote `sections.ts` to match the canonical 6-section visible structure |
| `pdf-export-button.tsx` (window.print()) + `export-button.tsx` (full API) + `pdf-export.ts` (named function) | Consolidated into `lib/report/pdf-export.ts` (`exportReport(metadata?)`) and a single `PdfExportButton` primitive |
| Repo-root Vite cruft (`index.html`, `vite.config.js`, root `src/`, root `node_modules`) | Phase 0 cleanup: `git rm` tracked + `rm` untracked + `git mv backup.ps1 scripts/` |
| Sidebar showed all 4 hash-anchors as active on Market Overview | Replaced per-sub-item check with section-level two-pass selection |
| Population footer spanning the full row blocked future metrics | Switched to `grid grid-cols-3` with `col-start-3`; cols 1+2 reserved |
| Stitch reference uses different content for Submarket / Class | Updated `lib/report/market-overview-data.ts` to match second Stitch HTML byte-for-byte (Spain / Madrid investment context labels) |
| Print canvas was Chromium-only (`zoom: 0.74`) | Added `@-moz-document` Firefox fallback using `transform: scale()` for both portrait and landscape |
| First Market Overview attempt rendered in landscape A4 | Reverted to portrait; landscape canvas variant remains wired in shell + globals.css |
| Per-card content too tall for 2 × 2 print grid | Aggressive `print:` compaction across MarketInsightCard + nested primitives (paddings, gaps, chart heights, font sizes) |

### Recommended next steps

1. **Phase 4 — Data layer.** `lib/api/reports.ts` with TanStack Query hooks; backend stub at `apps/api/app/api/v1/reports/router.py`.
2. **Section 5 — Financials page.** Compose from existing primitives; reuse SVG chart pattern from Market Overview / CAPEX.
3. **Section 6 — Methodology page.** Lighter — typography + locked tiers list. Reuse `MethodologicalNote`.
4. **Phase 6 — Cross-browser print matrix.** Capture Chromium / Firefox / Safari PDF screenshots; store under `docs/_screenshots/print/`.
5. **Phase 7 — Mapbox state sharing.** Lift `useCompset` into `<CompsetProvider>` so layer toggles persist across `/compset` ↔ `/report/competitive-set`.
6. **Phase 9 — Bundle audit.** Drop `recharts` and `numeral` if unused; replace `<img>` with `next/image` for hotel photos.
7. **Auth gating** on report routes once role enforcement is wired.

### Verification

- `pnpm typecheck` passes (verified earlier in this session).
- All 5 implemented report routes return HTTP 200.
- Doc set: every file referenced by `ENTRYPOINTS.md` exists and is current.

---

## 2026-05-08 — Market Overview footer KPI → vertical 3-col tile

The card footer (Población / Premium Inventory) was a horizontal strip (label left, value right). It now renders as a vertical KPI tile inside a 3-column grid so future metrics can fill the left and centre columns without a layout change.

### Change
- Footer container: `flex items-center justify-between` → `grid grid-cols-3 gap-4`.
- Población / Premium Inventory tile placed in **column 3** via `col-start-3`. Adding new metrics before this block in JSX will auto-flow into columns 1 and 2.
- Tile styling now matches the investment metric tiles (label `text-[9px] font-bold uppercase tracking-wider`, value `text-sm font-bold text-slate-800`, print sizes `print:text-[7px]` / `print:text-[9px]`).

### Preserved
- Web layout proportions (carousel, card size, charts, spacing).
- PDF behavior — same card height budget; the only footer change is the internal label / value stacking.
- All 4 cards render the change uniformly: España (47.4M), Madrid (6.7M), Madrid Centro (1.4M) all show **Población** vertically; Luxury (18.5%) shows **Premium Inventory** vertically.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms 8× `grid grid-cols-3` + `col-start-3` (4 cards × 2 RSC payload), 0× old horizontal layout, 3× Población + 1× Premium Inventory still rendered.

---

## 2026-05-08 — Market Overview print → A4 portrait, single page

Print mode reverted from landscape to portrait per the institutional report standard. The 4 insight cards now compact aggressively in print so the 2 × 2 grid lives on one A4 portrait page. Web / mobile layouts are untouched — the changes are entirely behind `print:` modifiers.

### Page-level
- `<ReportShell>` no longer carries `printOrientation="landscape"` — falls back to canonical portrait canvas.
- Page padding tightened in print: `print:px-3 print:py-2 print:space-y-2`.

### Carousel
- `.market-carousel-track` in print now carries `break-inside: avoid` so the 2 × 2 grid stays on one A4 page.
- Print grid gap tightened to **6 px** (was 16 px).

### Per-card compaction (web unchanged)
- Outer container: `p-6 → print:p-2`, `gap-6 → print:gap-1.5`, `print:rounded-md`.
- Title: `text-2xl → print:text-sm`.
- `MetricGrid`: `py-4 → print:py-1`, `gap-y-4 → print:gap-y-1`, value `text-sm → print:text-[9px]`.
- `MiniBarChart`: `p-3 → print:p-1`, bar area `h-16 → print:h-7`.
- `TrendBars`: `p-3 → print:p-1`, bar area `h-12 → print:h-6`.
- `InvestmentChart`: `h-24 → print:h-9`.
- `InsightBadge`: `text-[10px] → print:text-[6px]`, `px-2 py-1 → print:px-1 print:py-0.5`.
- `SplitBar`: bar height `h-1.5 → print:h-1`.
- Investment metric grid: `gap-4 → print:gap-x-2 print:gap-y-0.5`. Footer: `pt-4 → print:pt-1`.

### Global @page
- Margin updated to `10mm` uniform (was `8mm 10mm`) per spec.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/market-overview` and every other report page (no regression).
- SSR: 0 instances of `report-print-canvas-landscape` (reverted to portrait), portrait `report-print-canvas` applied on `<main>`. Carousel still 4 slides + 2 arrows on web. Print compaction classes (`print:p-2 print:gap-1.5`, `print:py-1`, `print:h-7`, `print:h-9`, …) all in DOM.

---

## 2026-05-08 — Market Overview integration

New report section consolidating the previous two Stitch pages (Country/Market and Submarket/Class) into a single horizontal-scroll experience that collapses to a 2 × 2 print grid for A4 export.

### New page — `/report/market-overview`
- One canvas, 4 insight cards in a horizontal snap-scroller (web) → static 2 × 2 grid (print).
- `sections.ts` entry flipped to `implemented: true`; sub-anchors updated to `#country / #market / #submarket / #class`.
- `ActionBar` rendered below the paper.

### New section family — `components/report/market-overview/` (13 components)
- `HorizontalInsightScroller`, `MarketInsightCard`.
- Visual primitives: `MetricGrid`, `SplitBar`, `MiniBarChart`, `TrendBars`, `InvestmentChart`, `InsightBadge`.
- Shared modules: `CorporateSportsCard`, `SharedMapCard`, `DemandGeneratorsBlock`, `DemandGeneratorCard`, `DemandGeneratorsGallery`.

### Data layer — `lib/report/market-overview-data.ts`
- Fully data-driven. `getMockMarketOverview()` populated from both Stitch pages.
- Discriminated unions `InsightScope` and `DemandGeneratorCategory`.

### Global utility
- `.scrollbar-hide` added to `globals.css` — consumed by the horizontal scroller.

### Verification
- `pnpm typecheck` passes. HTTP 200 on `/report/market-overview`.
- SSR confirms: page title, all 4 insight titles + badges, scroller class chain, print 2 × 2 fallback, 4-col gallery, 16 map pins, Corporate & Sport block.

---

## 2026-05-08 — Top-grid rebalance (~68 / 32) for A4 vertical alignment

Adjusted the CAPEX & Renders top-grid proportions so the Property Gallery's last tile (Spa) lands close to the bottom of the CAPEX Schedule block on the A4 page.

- Top grid right column: **250 px** (was 316 px). Roughly a 68 / 32 split with the CAPEX content on lg+.
- Property Gallery card padding: **14 px** (was 12 px).
- Tile height: **92 px** (was 115 px), fixed via inline style.
- Tile width: 100 % of card content area (no fixed pixel width — `tileWidth` prop removed; the gallery's column controls the tile width).
- Tile radius: `rounded-[10px]` (was `rounded-[12px]`).
- Tile gap: **10 px** (`gap-2.5`, was `gap-3` = 12 px).
- Caption unchanged (`text-[14px] font-semibold`, white, drop-shadow, bottom-left).
- All 8 tiles render identical dimensions in SSR (`style="height:92px"` × 8).

CAPEX Schedule card unchanged — already a symmetric 6-cell grid with paired sliders, paired tick labels, and the visible "¿Hotel abierto…?" / "Porcentaje operativo…" labels removed in the previous pass.

`pnpm typecheck` passes. SSR confirms: top grid `grid-cols-[minmax(0,1fr)_250px]`, 8× `height:92px`, card `padding:14px`, schedule grid still `grid-cols-1 lg:grid-cols-2 ... gap-x-12 gap-y-4 items-center`.

---

## 2026-05-08 — Property Gallery fixed-size tiles

Per spec, every gallery tile is now strictly the same dimensions — no responsive variation, no auto-height.

- Tile width: **290 px** (explicit `style={{ width: "290px" }}`).
- Tile height: **115 px** (explicit `style={{ height: "115px" }}`).
- Border radius: `rounded-[12px]` (was `rounded-[8px]`).
- Tile gap: **12 px** (`gap-3`, was `gap-2.5`).
- Caption: **14 px / 600** (was 12 px / 600).
- Tile carries `shrink-0` so it never shrinks under flex/grid constraints.
- Top grid right column: **316 px** (was 220 px) to fit 290 px tiles + 12 px card padding + 1 px borders without overflow.

`pnpm typecheck` passes. SSR confirms 8× `height:115px;width:290px` + caption at `text-[14px]`. All 8 captions still render in order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

---

## 2026-05-08 — CAPEX Schedule symmetric paired-slider rebuild

The CAPEX Schedule card is now a perfectly symmetric 2-column control with paired sliders sitting on the same grid row.

### Layout
- Card body padding bumped to **32 px** (`p-8`).
- Inner row rebuilt as a 6-cell CSS grid (2 cols × 3 rows, `gap-x-12 gap-y-4 items-center`).
  - Row 1: LEFT label + emerald pill / RIGHT Abierto-Cerrado toggle.
  - Row 2: LEFT months `RangeTrack [0, 36]` / RIGHT percent `RangeTrack [0, 100]`. Both sit on the same grid row → identical Y-position.
  - Row 3: LEFT "0 MESES / 36 MESES" / RIGHT "0% / 100%" tick labels.

### Component changes
- New `RangeTrack` primitive — bare slider track + fill + thumb + invisible `<input type="range">` overlay. Used twice in the schedule row to guarantee both sliders share the exact same row geometry.
- `CapexScheduleRow` rebuilt as a 6-cell grid that owns `months`, `mode`, `pct` state. Toggle ↔ % wiring: Cerrado → 0 %; Abierto → 100 %. Manual slider drag is independent.
- `CapexScheduleCard` body padding `px-5 py-4` → `p-8` (32 px); title margin `mb-4` → `mb-6`.

### Removed UI text per spec
- Eliminated visible label "¿Hotel abierto o cerrado durante el CAPEX?".
- Eliminated visible label "Porcentaje operativo durante CAPEX" + `OperationalPercentInput` numeric component (deleted file). The percentage is now controlled exclusively by the right-column slider; "Porcentaje operativo durante CAPEX" remains only as the slider's `aria-label` for screen readers.

### Verification
- `pnpm typecheck` passes.
- HTTP 200 on `/report/asset-analysis/capex`.
- SSR confirms: 6-cell grid `grid-cols-2 gap-x-12 gap-y-4 items-center`, card `p-8`, both `RangeTrack` instances with `aria-label="Duración del CAPEX"` + `aria-label="Porcentaje operativo durante CAPEX"`, all 4 tick labels (`0 MESES`, `36 MESES`, `0%`, `100%`), no visible "Hotel abierto" / "Porcentaje operativo" labels.

---

## 2026-05-08 — CAPEX Schedule structural rebuild + operational %

The schedule card now reads as a compact operational-assumptions module: both column titles align on the same top line, the duration badge tracks the slider thumb, and a new operational-percentage field is wired in.

### Data
- `CapexSchedule.operationalPercentage: number` — added to the contract; mock value 100. Designed to feed the future financial engine's revenue / GOP / EBITDA scaling during CAPEX (UI-local state for now).

### Component additions
- `OperationalPercentInput` — labelled numeric % field (0–100 clamp). Same border / sizing as the financial inputs in `CostInputRow`. Local React state.

### Component changes
- `CapexTimeline` gained a `floatingBadge` mode: the emerald pill is positioned absolutely above the slider thumb and follows it (transition-[left]) instead of sitting in the header row. `showBadge` and `floatingBadge` are now mutually exclusive (floating wins).
- `CapexScheduleRow` rebuilt as a 2-column grid `1.2fr 1fr` (`align-items: start`, gap 48 px). LEFT carries title + slider with floating badge + min/max ticks. RIGHT carries title + Abierto/Cerrado toggle + operational % field.

### Visual contract
- Both internal titles ("Duración del CAPEX" and "¿Hotel abierto o cerrado durante el CAPEX?") sit on the same top line.
- Card itself unchanged — same chrome, padding, and the "CAPEX Schedule" h4 title remain.
- Renders block, gallery, page header, shell — untouched.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: schedule grid `grid-cols-[1.2fr_1fr]` (×2 lg + print), all 3 labels rendered, floating-badge selector present, operational % input rendered with `value="100"` and matching `aria-label`.

---

## 2026-05-08 — CAPEX Schedule moved into the left CAPEX stack

CAPEX Schedule is no longer a standalone full-width section below the grid — it now sits as the 5th card in the LEFT column, sharing the same chrome as Hard / Soft / Project Costs. This naturally balances the left stack height with the Property Gallery height.

### Component additions
- `CapexScheduleCard` — card wrapper that renders `CapexScheduleRow` inside the same `bg-white border-slate-200 rounded-xl shadow-sm` chrome used by `CapexCategory`. Accepts `id`, `title`, `className`. `print:break-inside-avoid` baked in.

### Component changes
- `CapexScheduleRow` inner grid gap tightened to 24 px (`gap-6`) per spec.

### Page restructure (`app/report/asset-analysis/capex/page.tsx`)
- Removed the standalone `<section id="schedule">` block.
- Added `<CapexScheduleCard schedule={...} />` as a sibling of `<CapexTable>` inside the LEFT column, wrapped in `space-y-4` so the gap matches the inter-category rhythm.
- Renders block stays full-width below the 2-column grid (`mt-8 pt-6 border-t`).

### Vertical balance check
- Left stack ≈ 933 px (TOTAL + 3 categories + Schedule card).
- Right gallery ≈ 927 px (8 × 92 px tiles + gaps + chrome).
- Bottom edges now align within ~6 px.

### Verification
- `pnpm typecheck` passes.
- SSR confirms: 1× `id="schedule"`, 1× h4 "CAPEX Schedule" inside the card, schedule grid at `gap-6`, renders block still rendered below.

---

## 2026-05-08 — Property Gallery vertical balance

Single proportional adjustment to balance the gallery's bottom edge with the bottom of CAPEX Schedule.

- Tile height: **92 px** (was 72 px).
- Tile gap: **10 px** (was 8 px).
- Card padding unchanged at 12 px; column width unchanged at 220 px; tile radius / overlay / caption / order unchanged.

`pnpm typecheck` passes. SSR confirms `height:92px` × 8 tiles and `gap-2.5` on the tile stack.

---

## 2026-05-08 — CAPEX & Renders strict alignment pass

Tight institutional proportions across the page. No component redesign — only dimension, spacing and alignment changes.

### Property Gallery Sidebar — compact 220 px column
- Top grid right column: **220 px** (was 240 px). Top grid gap: **20 px** (was 24 px).
- Tile height: **72 px** (was 86 px). Tile radius: **8 px** (was 10 px).
- Tile gap: **8 px** (was 12 px). Card padding: **12 px** (was 16 px).
- Caption: **12 px / 600** (was 14 px / 600).
- Title text-sm; "8 items" badge text-[10px]; "View All Photos" footer text-xs.

### Top grid + tables
- Top grid: `grid-cols-[minmax(0,1fr)_220px] gap-5 items-start`.
- TOTAL CAPEX: `px-5 py-3`, inputs `h-8`, label `text-base` — total ≈ 64 px row.
- Category header: `md:h-11 px-5` — 44 px row, 20 px horizontal padding.
- Line items inside categories: `h-11` (44 px) with `pl-8` indent.

### CAPEX Schedule row — 3-column grid
- Switched outer container from flex to **grid**: `grid-cols-[1.4fr_120px_1fr] items-center gap-8`.
- Slider max-width tightened to **360 px** (was 420 px).
- Operational toggle buttons: **38 px tall × 100 px wide**, strictly equal width.

### Vertical rhythm
- Section dividers tightened to `mt-8 pt-6` (was `mt-10 pt-8`) — schedule sits closer to Project Costs; renders block starts higher.
- H3 bottom margin: `mb-6` (was `mb-8`).

### Verification
- `pnpm typecheck` passes.
- All four routes return 200.
- SSR confirms: top grid `minmax(0,1fr)_220px` (×2), 8 tiles at `height:72px` + `rounded-[8px]`, all 8 captions at `text-[12px]`, schedule grid `1.4fr_120px_1fr`, 12 cost rows at `h-11`, both toggle buttons at `h-[38px] w-[100px]`.

---

## 2026-05-08 — CAPEX & Renders layout polish

### Property Gallery — fixed-width institutional sidebar
- Top grid switched from `lg:grid-cols-3` to `grid-cols-[minmax(0,1fr)_240px]` with `gap-6` and `items-start`. Gallery column is exactly 240 px on `lg+`; on narrower widths it wraps below the table.
- Tiles now stack vertically (1 per row) with a fixed 86 px height and `rounded-[10px]`. Dark gradient + bottom-left white caption (14 px / 600).
- "View All Photos" CTA pinned to the card's bottom edge via `mt-auto`.
- 8 captions render in the institutional order: Lobby · Room · Bar · Restaurant · Exterior · Meeting Room · Pool · Spa.

### CAPEX Schedule — three-block horizontal row
- New `CapexScheduleRow` (client) composes the row and owns the duration state — keeps the slider and the badge in sync.
- LEFT block (`flex: 1.2`) hosts a re-used `CapexTimeline` with `showBadge={false}` and `sliderMaxWidth={420}`.
- CENTER block (`width: 110px`) renders the new `CapexDurationBadge` atom — same emerald pill as the inline badge, lifted to a standalone column.
- RIGHT block (`flex: 1`, `justify-end`, `gap-4`) hosts the question text + `ToggleSelector size="lg"`.
- `ToggleSelector` lg variant updated to `h-10 min-w-[92px] px-6` so the operational buttons hit the spec exactly.

### Section rhythm
- Project Costs → CAPEX Schedule and CAPEX Schedule → Renders gaps standardised to 40 px (`mt-10` + `border-t` + `pt-8`).

### Component additions
- `CapexDurationBadge` — emerald pill atom.
- `CapexScheduleRow` — schedule composite owning duration state.
- `CapexTimeline` extended with `value` / `onChange` / `showLabel` / `showBadge` / `sliderMaxWidth` (all backward compatible).

### Verification
- `pnpm typecheck` passes.
- All four routes (executive-summary, competitive-set, asset-analysis, asset-analysis/capex) return 200.
- SSR output confirmed: `grid-cols-[minmax(0,1fr)_240px]` on the top row, `height:86px` + `rounded-[10px]` on every gallery tile, `flex-[1.2]` + `w-[110px]` + `h-10 min-w-[92px]` in the schedule row.

---

## 2026-05-08 — Asset Analysis · CAPEX & Renders integration

### New page — `/report/asset-analysis/capex`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Combines CAPEX breakdown + property gallery + CAPEX schedule + AI render configurator on a single canvas; the renders block carries `id="renders"` so the sidebar's `Renders` sub-anchor lands correctly.
- Page does not use `ActionBar` — its terminal CTA is the in-section "Generar Variación IA" button.

### New section family — `components/report/asset-analysis/capex/`
Eleven components, all consumed through one barrel `index.ts`:
- `CapexTable` — composes `CapexTotalRow` + per-category breakdown.
- `CapexTotalRow` — headline TOTAL CAPEX band with editable amount + unit selector.
- `CapexCategory` — collapsible category block with editable category total + line items.
- `CostInputRow` — single label/value/unit row used inside categories.
- `CapexTimeline` — slider + duration badge with an accessible `<input type="range">` overlay (so the visual track + dragging both work).
- `ToggleSelector<T>` — generic segmented control (`size: "md" | "lg"`) reused for both CAPEX BÁSICO/PERSONALIZADO and Abierto/Cerrado.
- `PropertyGallerySidebar` — right-rail gallery with item-count badge + "View All Photos" CTA.
- `RenderConfigurator` — wraps preview + tag groups + final CTA row; whole block is `print:hidden`.
- `RenderPreviewCard` — hero render image with caption overlay.
- `RenderTagGroup` — one labelled row of pill buttons with single-select state.

### Data layer — `lib/report/capex-renders-data.ts`
- Fully data-driven: every CAPEX category, line item, render tag group, gallery item, and operational mode lives in the data file.
- Discriminated unions for future engine integration: `CapexUnit`, `CapexMode`, `OperationalMode`.
- `formatCapexAmount(n)` is the single Intl-based formatter for monetary display.
- `getMockCapexRenders()` mirrors Stitch reference values exactly.

### Sidebar sub-item migration — `hash` → `href`
- `ReportSubItem.hash: string` replaced by `ReportSubItem.href: string`. Sub-items can now point at full routes (`/report/asset-analysis/capex`) or page-relative anchors (`#renders`); the sidebar resolves either form.
- `sections.ts` updated for all sections; Asset Analysis now points its sub-anchors at the new sub-routes.
- `components/report/shell/report-sidebar.tsx` resolves sub-item href and adds an active-highlight rule (matches the Stitch bold-emerald sub-anchor when on a sub-route).

### Architecture invariants preserved
- Reused: `ReportShell`, `ReportPaper` (with `closed` + `headerLayout="stacked"`), `HotelToggle`, primitives barrel, print canvas, PDF pipeline.
- No edits to existing pages (`/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`).

### Documentation
- Updated: `REPORT_PAGES.md` (added Page 2a layout block + sidebar wiring + future-proofing notes).
- Updated: `UI_COMPONENTS.md` (added CAPEX & Renders family table).
- Updated: `docs/print-pdf.md` (interactive-control print policy + the new `print:break-inside-avoid` schedule rule).
- This entry.

### Verification
- `pnpm typecheck` passes.
- All four routes return 200 on the dev server: `/report/executive-summary`, `/report/competitive-set`, `/report/asset-analysis`, `/report/asset-analysis/capex`.
- 26 canonical Stitch strings render in the new page's SSR output.

---

## 2026-05-08 — Asset Analysis (Hotel personalizado) integration

### New page — `/report/asset-analysis`
- Stitch design replicated inside the canonical architecture (no shell, sidebar, print, or PDF changes).
- Page composes `<ReportShell>` → `<ReportPaper closed headerLayout="stacked">` → 60/40 grid → `<ActionBar>`.
- `sections.ts` entry flipped to `implemented: true`; sidebar updates automatically.

### New section family — `components/report/asset-analysis/`
- `AssetMetricsTable` — left-column 12-row metrics with fixed-height label/value pairs.
- `FacilitiesCard` — 2-column availability checklist (Lucide `Check` / `Minus`).
- `RoomMixCard` — Type/Units/Size table with bolded totals row + thin spacer.
- `GuestInsightsCard` — slate-50 card with `tone: "positive" | "negative"` (Lucide `ThumbsUp` / `ThumbsDown`, filled).
- `PropertyImageCard` — square hero image + caption tabs (Catastro / Planos), client-side active-tab state.
- `PropertyGallery` — vertical labelled gallery with arrow-button `altSrc` swap (replaces Stitch inline `onclick`).
- `MethodologyNote` — compact inline variant of the methodology block, fits inside column layouts.
- Single barrel `index.ts` for the import surface.

### Page-local — `app/report/asset-analysis/`
- `page.tsx` — server component wiring data + composition.
- `hotel-toggle.tsx` — client toggle next to "Hotel personalizado" label (decoupled from `PrimeToggle` to avoid changing the Competitive Set toggle visual).

### Data layer
- `lib/report/asset-analysis-data.ts` — types (`AssetAnalysisData`, `AssetMetricsRow`, `FacilityItem`, `RoomMixRow`, `GalleryImage`, `PropertyMedia`, `GuestInsights`) + `getMockAssetAnalysis()` matching Stitch values.

### Canonical primitive extensions (backward-compatible)
- `ReportHeader` gains `layout?: "inline" | "stacked"` — `stacked` puts the PDF button on its own row above the section label / title row, matching Stitch. Default `inline` preserves Executive Summary + Competitive Set visuals unchanged.
- `ReportPaper` and `ReportSection` gain `closed?: boolean` — when `true`, the paper has full `border + rounded-xl` (Stitch Asset Analysis); default `false` preserves the rounded-top-only paper used by other pages.
- `ReportPaper` and `ReportSection` also gain pass-through `headerLayout?` and `hideExportButton?` for symmetry.

### Documentation
- New: `REPORT_PAGES.md` (root) — page-level reference for every report page (route, status, file path, component composition).
- New: `UI_COMPONENTS.md` (root) — catalog grouped by import surface (primitives → section families → shell).
- This entry.

### Verification
- `pnpm typecheck` passes.
- Existing `/report/executive-summary` and `/report/competitive-set` visuals unchanged (canonical defaults preserved).

---

## 2026-05-08 — Phase 0 architecture stabilization

### Canonical report architecture
- One shell, one sidebar, one paper, one PDF pipeline, one section registry.
- `lib/report/sections.ts` rewritten as the single canonical registry (6 sections, sub-anchors, `printPageBreak`, `implemented`).
- `types/report/index.ts` reworked to match the new section taxonomy.
- `shell/report-sidebar.tsx` refactored to consume `sections.ts` (Stitch visual preserved).
- `shell/report-paper.tsx` refactored to compose `ReportHeader` from primitives (eliminated internal duplicate).

### Canonical primitives — `components/report/primitives/`
- `MetricRow`, `MetricTable` — atomic table units for sections 4-15.
- `ReportSection` — page-level wrapper with section-metadata-driven page-breaks.
- `ReportHeader` — header bar primitive (extracted from internal `PaperHeader`).
- `StatCard` / `StatGrid` — re-exports `KPICard` / `KPIGrid` under canonical names.
- `UpgradeGate` / `UpgradeCard` — re-exports `LockedGate` / `LockedUpgradeCard`.
- `ImageGallery` / `ImageGalleryCard` — re-exports `HotelGalleryGrid` / `HotelGalleryCard`.
- `ReportMap` — re-exports from `ui/report-map.tsx`.
- `PrintPage` — declarative wrapper for inside-section page-break control.
- `PdfExportButton` — routes through canonical `exportReport()`.
- Barrel `primitives/index.ts` is the single import surface for new section pages.

### Print / PDF system
- `globals.css` print rules consolidated into a single block: `@page`, `.report-print-canvas`, generic utilities (`.print-break-before`, `.print-break-after`, `.print-keep`).
- Firefox fallback: `@-moz-document url-prefix() { @media print { transform: scale(0.74) } }` for older Firefox where `zoom` is a no-op.
- `lib/report/pdf-export.ts` simplified to a single `exportReport(metadata?)` entry; legacy `exportReportToPDF` aliased and marked deprecated.

### Deletions
- `components/report/layout/` (3 files — duplicate shell, replaced by `shell/`).
- `components/report/sections/` (3 files — only used by deleted parametric routes).
- `components/report/report-context.tsx` (only used by deleted layout).
- `components/report/ui/export-button.tsx` (dead code).
- `components/report/ui/pdf-export-button.tsx` (replaced by canonical primitive).
- `app/report/[reportId]/` (entire parametric tree — 4 files; will return under a single canonical pattern when multi-tenant data layer ships).
- `lib/report/mock-data.ts` (only used by deleted parametric layout).
- `lib/report/report-nav.ts` (replaced by canonical `sections.ts`).
- Repo root: `index.html`, `vite.config.js`, `vite.err.log`, `vite.out.log`, `src/` (Vite app leftovers), root `node_modules/`, `function hotelvalora {.txt`.
- `backup.ps1` moved to `scripts/backup.ps1` via `git mv`.

### Documentation
- New: `docs/print-pdf.md` — canonical print/PDF system reference.
- New: `docs/component-library.md` — canonical primitives catalog.
- Rewritten: `docs/report-system.md` — single-architecture reference, no parametric mentions.
- Updated: `docs/architecture.md` — registry pointer + primitives reference.
- Updated: `ENTRYPOINTS.md` — primitives table + canonical files.
- Updated: `AI_CONTEXT.md` — Phase 0 report module description.
- Audit artefacts: `TECH_AUDIT.md`, `NEXT_PHASE_PLAN.md`, `ARCHITECTURE_SCORECARD.md` (root).

### Verification
- `pnpm typecheck` passes (after clearing stale `.next/` types from deleted parametric routes).
- Visible pages (`/report/executive-summary`, `/report/competitive-set`) render unchanged.

---

## 2026-05-07 (continued)

### Navigation link — Sidebar item 3 "CompSET" → `/report/competitive-set`
- `report-nav.ts` item 3 `href` changed from `/report/compset` to `/report/competitive-set`
- `ReportSidebar` active-state highlight now lands correctly on the Competitive Set page

### Competitive Set — Distance column in comparison table
- Added `distance: string | null` to `CompetitorProperty` interface; `null` for the subject property itself (renders as `—`)
- Added **Distance** column to `CompetitiveSetTable` (rightmost, after Location Score); displays `"400 m"`, `"1.1 km"`, etc.
- Mock distances: Ritz-Carlton 650 m, Four Seasons 400 m, Rosewood Villa Magna 1.1 km, Westin Palace 320 m

### Competitive Set — gallery layout update
- `HotelGalleryGrid` restructured: top block = 2×2 images (left, `col-span-5`) + full CompSet map (right, `col-span-7`); bottom block = remaining 16 images in 4-per-row grid
- `HotelGalleryCard` updated: added optional `className` prop (`twMerge` handles conflict with `aspect-[4/3]`); top-4 images pass `h-full aspect-auto` to fill 2×2 cells; bottom images unchanged
- Parent block uses `min-h-[460px]` to satisfy map's `min-height: 450px` CSS constraint; `print:min-h-0 print:h-80` for PDF
- `ReportMap` reused exactly — same hooks (`useCompset`, `useMapViewport`), same overlays (`MapControls`, `MapLegend`), same layer toggles (heatmap/metro/histórico)

### Competitive Set report page — `/report/competitive-set`
- Created `src/app/report/competitive-set/page.tsx` — ReportShell + ReportPaper + ActionBar
- Created `CompetitiveSetTable` — 6-col table: property name (dot + name), stars, keys, submarket, facility icons, location score bar. Subject property row: emerald. Competitors: amber stars + slate bars
- Created `HotelGalleryGrid` — 4-col `aspect-[4/3]` image grid, `print:grid-cols-4`
- Created `HotelGalleryCard` — image with hover scale + frosted-glass arrow button bottom-right
- Created `PrimeToggle` — client component toggle switch (emerald-700 when on), `print:hidden`
- Updated `ReportPaper` — added `titleSize?: "2xl"|"4xl"` and `headerRight?: ReactNode` props; backward compatible
- Created `src/lib/report/competitive-set-data.ts` — `CompetitorProperty`, `GalleryImage`, `getMockCompetitiveSet()`
- Facility icons via Lucide: `Wine`, `UtensilsCrossed`, `Sun`, `Users`, `Dumbbell`, `Leaf`; unavailable = `opacity-30`

---

## 2026-05-07

### Navigation wiring — Landing ↔ CompSet ↔ Executive Summary
- `ReportTopNav`: "HotelVALORA" logo is now `<Link href="/">` (was inert `<div>`)
- `CompetitorPanel`: "Confirmar CompSet →" is now `<Link href="/report/executive-summary">` (was inert `<button>`)
- Establishes full 3-step flow: `/` → `/compset` → `/report/executive-summary`

### Mandatory documentation system
- Expanded `CLAUDE.md` with full docs maintenance rule (triggers, file list, process)
- Created 8 new `/docs` files: `routing.md`, `report-system.md`, `print-system.md`, `design-system.md`, `components.md`, `business-rules.md`, `financial.md`, `workflows.md`, `changelog.md`
- Updated `docs/frontend.md` and `ENTRYPOINTS.md` with report module + print system entries

---

## 2026-05-06 (prior session)

### Executive Summary — Professional A4 print system
- `globals.css`: `@page { size: A4 portrait; margin: 8mm 10mm }`, `.report-print-canvas { width: 960px; zoom: 0.74 }`, `compset-map-container { min-height: 0 }` in print
- `ReportShell`: added `report-print-canvas` class to `<main>`
- All 3 sections (`AssetSection`, `MarketSection`, `ValuationSection`): added `print:grid-cols-12`, `print:col-span-7`, `print:col-span-5` — fixes Chrome print grid collapse below 768px viewport
- `LockedGate` + `LockedUpgradeCard`: added `print:hidden`
- `MarketSection` map: `print:aspect-auto print:h-36` to cap height

### Hotel photo carousel
- Created `HotelPhotoCarousel` (client component) — `aspect-[4/3]`, 5 photos, prev/next arrows bottom-right, `1/5` counter
- Replaced static photo in `AssetSection`

### Full CompSet map in Market Overview
- Created `ReportMap` (`components/report/ui/report-map.tsx`) — uses `useCompset` + `useMapViewport`, renders `CompsetMapGL` + `MapControls` + `MapLegend`, no competitor panel
- Embedded in `MarketSection` right column

### Report shell infrastructure
- Created `ReportShell`, `ReportPaper`, `ReportTopNav`, `ReportSidebar`, `ReportFooter`, `ActionBar`
- Created `/report/executive-summary` standalone route
- `ActionBar`: 3 text-only buttons (FAVORITOS, GUARDAR, UPGRADE), positioned below ReportPaper

### Map size revert
- Map in MarketSection reverted to `aspect-video` (16:9) after carousel was added — user preferred original map proportions

---

## 2026-05-05 (initial build)

### Monorepo scaffold
- Next.js 14 + FastAPI monorepo initialized
- PostgreSQL domain schema established
- Core models: HotelAsset CRUD routes, service, schemas

### Executive Summary data layer
- `executive-summary-data.ts`: types (`AssetData`, `MarketMetricsData`, `ValuationData`, `ChartSeriesData`), formatters, mock data
- `SparklineBar`, `SparklineLine` SVG chart components
- `AssetSection`, `MarketSection`, `ValuationSection`, `SparklineGroup` components
- `LockedGate`, `LockedUpgradeCard`, `SubSectionHeading`, `MethodologicalNote` UI primitives

### CompSet map
- Mapbox GL integration with `react-map-gl` v8
- `CompsetMapGL`, `CompetitorPanel`, `CompetitorCard`, `MapControls`, `MapLegend`
- `useCompset`, `useMapViewport` hooks
- `/compset` route with full competitor selection flow

### Report navigation
- `report-nav.ts`: 6-section registry, 15 items
- `ReportSidebar` renders section links
