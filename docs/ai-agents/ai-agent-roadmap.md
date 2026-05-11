# AI Agent Roadmap

Phased rollout of the AI Operations Layer.

**Last refreshed:** 2026-05-12
**Registry size:** 12 agents (Tier 0 CEO · 9 operational in the institutional orbital roster · `crm_dealflow` hidden from orbit until Phase 5 · legacy `report_generation` retained for DB enum backward compat)
**Current phase:** 🟢 **Phase 1** complete · 🟡 **Phase 2 partial** — runtime + 3 agents in beta (Market Intel · Data Ingestion · QA) · 2 agents registered awaiting Phase 2.3.d.1 / Phase 2.4.1 implementation (COSTAR Admin · CompSet Builder) · CEO still planned for Phase 3

---

## Phase 1 — Foundation (✅ done · 2026-05-11)

**Goal:** schema + 9 agents declared + 20 tools catalogued + strategic + technical docs. NO agent runtime yet.

| Deliverable | Status |
|---|---|
| Schema migration `0007` applied | ✅ |
| 9 agent registry rows in `public.ai_agents` (status='planned') | ✅ |
| 20 tool catalogue rows in `public.ai_tools` | ✅ |
| Master strategic doc | ✅ `docs/ai-agents/AI_OPERATIONS_LAYER_MASTER_SYSTEM.md` |
| Technical docs (7) | ✅ architecture · orchestration · memory · permissions · events · kpis · roadmap |
| Trackers updated | ✅ HOTELVALORA_TECH_STACK_MASTER + INFRASTRUCTURE_MASTER_TRACKER + service-status + changelog + sprint |

**Validates:**
- DB foundation tables compile + RLS posture is right
- Audit + permissions + memory + escalation tables ready for agent code
- Strategic clarity recorded so future engineers + AI sessions internalise the philosophy

## Phase 2 — Tier 1 agents implementation (🟡 partial — code shipped 2026-05-11)

**Goal:** Market Intelligence + Data Ingestion + QA / Monitoring agents go from `planned` → `beta`. Lowest-risk, highest-leverage — they work on existing data with no destructive surface.

### Phase 2.1 — Agent runtime core ✅

| Deliverable | File | Status |
|---|---|---|
| Runtime `invoke()` | `apps/web/src/lib/ai-agents/core/runtime.ts` | ✅ |
| Permission checker | `apps/web/src/lib/ai-agents/core/permissions.ts` | ✅ default-deny + per-run cache |
| Memory loader | `apps/web/src/lib/ai-agents/core/memory.ts` | ✅ load/persist + cursor helpers |
| Event bus emit | `apps/web/src/lib/ai-agents/core/events.ts` | ✅ emit + flush + selectSince (Phase 3 swaps to Realtime) |
| Audit shell | `apps/web/src/lib/ai-agents/core/audit.ts` | ✅ open/close/log/panic-close |
| Cost guardrails | `apps/web/src/lib/ai-agents/core/budget.ts` | ✅ preflight + account + snapshot · see `ai-agent-cost-guardrails.md` |
| Manual approval gate | `apps/web/src/lib/ai-agents/core/approval.ts` | ✅ live but dormant (no gated tools called yet) · see `ai-agent-approval-flow.md` |
| Escalation (Resend, NOT Slack) | `apps/web/src/lib/ai-agents/core/escalation.ts` | ✅ env-pinned recipients + 15-min cooldown |
| Tool registry | `apps/web/src/lib/ai-agents/core/tools.ts` | ⏸ deferred — agents call tools inline in Phase 2 |
| LLM client wrapper | `apps/web/src/lib/ai-agents/llm-client.ts` | ⏸ Phase 4 — no LLM use in Phase 2 |

### Phase 2.2 — Market Intelligence Agent ✅

| Deliverable | Status |
|---|---|
| Phase 2 permissions migration `phase2_tier1_runtime_and_permissions` | ✅ |
| Agent implementation at `apps/web/src/lib/ai-agents/agents/market-intelligence.ts` | ✅ regex-only, no LLM |
| Cron route handler at `apps/web/src/app/api/cron/market-intelligence/route.ts` (`20 8 * * *` UTC) | ✅ |
| Integration with the Intelligence Engine ingestion cron (cursor-based window read) | ✅ via `getCursor` / `setCursor` |
| Unit + integration tests | ☐ deferred |

### Phase 2.3 — Data Ingestion Agent ✅

| Deliverable | Status |
|---|---|
| Phase 2 permissions migration (same as 2.2 — single combined migration) | ✅ |
| Agent implementation at `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` (cloud-runtime half) | ✅ dry-run validator + approval gate for parser execution |
| Manual-trigger surface at `apps/web/src/app/api/agents/data-ingestion/route.ts` | ✅ requires Supabase auth |
| Cloud-runtime parser execution | ⏸ deferred — gated behind `costar.exports.parse` approval |
| **Institutional masters workspace at `services/transactions/`** | ✅ Phase 2.3.a — directory + canonical MASTER xlsx + templates + 5 architecture docs in `docs/intelligence/`. See `services/transactions/README.md`. |
| **Operator-side workspace pipeline (Python CLI)** at `services/transactions/scripts/ingest.py` | ✅ Phase 2.3.b — full sweep / parse / normalise / dedup / route / archive / log. Smoke-tested end-to-end (5 ingested + 1 skip + 2 review + 1 failed from 9-row fixture). |
| Pipeline modules: `dedup.py` · `normalization.py` · `master_io.py` · `staging_io.py` · `source_readers.py` · `build_masters.py` | ✅ Phase 2.3.b |
| Lenient XLSX + CSV readers with header alias folding (~60 aliases per master) | ✅ Phase 2.3.b |
| Field-by-field normalisation (geography · dates · prices · entities · URLs · enums) | ✅ Phase 2.3.b |
| Append-only MASTER writes + INGESTION_LOG · `old.*/` archive · `staging/{failed,review}/` · per-run jsonl logs | ✅ Phase 2.3.b |
| Audit-chain unification (Python CLI → POST → `ai_agent_runs`) | ✅ Phase 2.3.c — cloud handler `/api/agents/data-ingestion-summary` records one `ai_agent_runs` row per file with `metadata.python_ingestion_id` cross-reference + emits `data_ingestion_staged` event. CLI soft-fails on network/auth issues; local MASTER remains authoritative. Operator env vars: `INGESTION_AUDIT_TOKEN` + `INGESTION_AUDIT_URL`. |
| **Institutional CoStar warehouse at `services/costar/`** | ✅ Phase 2.3.d.0 (this commit, v1.1 — COMPSET moved out, CLASS added) — directory + 4 canonical MASTER xlsx (PAIS 39c · MERCADOS 40c · SUBMERCADOS 41c · CLASS 41c) + reproducible `scripts/build_masters.py` + 4 csv templates + 7 architecture docs. Owned by the new **CoStar Market Data Agent**. See `services/costar/README.md` + `docs/agents/costar-market-data-agent.md`. |
| **CoStar Market Data Agent CLI pipeline at `services/costar/scripts/`** | ⏸ Phase 2.3.d.1 — substrate ready, parser + CLI to mirror the transactions pipeline (per-granularity sweep, normalise, dedup, route, archive, audit-sync). Reuses the same cloud endpoint. Activation flips `costar_market_data` from `planned` → `beta`. |
| **Operational compset workspace at `services/compset/`** | ✅ Phase 2.4.0 (this commit) — directory + 2 canonical MASTER xlsx (COMPSET_MASTER 48c · HOTEL_POSITIONING_MASTER 55c) + reproducible `scripts/build_masters.py` + 2 csv templates + 2 schema docs. Owned by the new **CompSet Underwriting Agent**. See `services/compset/README.md` + `docs/agents/compset-underwriting-agent.md`. |
| **CompSet Underwriting Agent implementation** | ⏸ Phase 2.4.1 — TS agent (`apps/web/src/lib/ai-agents/agents/compset-underwriting.ts`) + cloud route + operator CLI. Reads `services/costar/MASTER/*` warehouse outputs and `public.valuations`; writes `services/compset/MASTER/*`. Activation flips `compset_underwriting` from `planned` → `beta`. |
| **Architectural separation: market warehouse vs underwriting operations** | ✅ (this commit) — `docs/architecture/market-vs-underwriting-separation.md` formalises the agent roster split. 2 new enum values added: `costar_market_data` (Tier 1) + `compset_underwriting` (Tier 2). |

### Phase 2.4 — QA / Monitoring Agent ✅

| Deliverable | Status |
|---|---|
| Phase 2 permissions migration (read-only across the platform) | ✅ 19 permission rows |
| Agent implementation at `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` | ✅ |
| Cron route handler at `apps/web/src/app/api/cron/qa-monitoring/route.ts` (hourly probes) | ✅ |
| ~~Slack webhook integration for escalations~~ → **Resend** internal alerts via `monitoring.escalate.email` tool | ✅ per Phase 2 directive |
| Internal observability page `/dev/ai-ops` | ✅ |

**Exit criteria for Phase 2:**
- 14 consecutive days of all 3 agents with `success rate ≥ 95%`
- Zero permission denial spikes
- Daily cost cap respected
- Operator dashboard shows live KPIs

## Phase 3 — Memory + orchestrator + **CEO Agent (Tier 0)** + event-reactive infrastructure

**Goal:** add the supervisory tier on top of Tier 1, enable embedding-based memory, wire reactive event fan-out, and ship the admin dashboard.

The **CEO / Orchestration Agent** lands here because: (a) it needs Tier 1 agent run data to be useful, (b) it's the natural completion of the orchestration story started by the mechanical router, (c) it should be live BEFORE Tier 2 strategic-moat agents ship so they never run unsupervised.

### Phase 3.1 — Memory + embeddings

| Deliverable |
|---|
| Migration `0009_pgvector_enable.sql` — `create extension vector; alter table ai_memory add column embedding vector(1536);` |
| Embedding backfill cron for existing `ai_memory` rows |
| Embedding-similarity ranking in `core/memory.ts` |

### Phase 3.2 — Event-reactive infrastructure

| Deliverable |
|---|
| Static orchestrator router (rules table + dispatcher) at `apps/web/src/lib/ai-agents/core/router.ts` |
| Realtime fan-out: Supabase Edge Function subscribes to `ai_events` inserts |
| Permission enforcement at the runtime layer (audit row added for every check, denial or pass) |

### Phase 3.3 — CEO / Orchestration Agent (Tier 0)

| Deliverable |
|---|
| Permissions migration `0010_ceo_agent_permissions.sql` — grants read-only access to ai_agent_runs, ai_events, ai_memory, ai_human_review, news_ingestion_runs, audit_logs, sources, market_news (counts only), Supabase advisor API, Vercel deployments API, GitHub commits API. Grants execute on all `ai_ops.*` tools. **No write permissions to any application table.** |
| CEO Agent implementation at `apps/web/src/lib/ai-agents/agents/ceo.ts` |
| Hourly cron `apps/web/src/app/api/cron/ceo-hourly/route.ts` (cron: `0 * * * *` UTC) |
| Daily cron `apps/web/src/app/api/cron/ceo-daily/route.ts` (cron: `0 6 * * *` UTC ≈ 07:00 / 08:00 Madrid before the Intelligence cron) |
| Health-snapshot writer (writes hourly snapshots to `ai_memory` scope='agent_global') |
| Strategic-review writer (writes daily summary + recommendations to `ai_memory`) |
| Reactive subscription on `human_approval_needed` events — escalates stale ones |
| Reactive subscription on `health_check_failed` events — confirms + escalates |
| Tools wired: `ai_ops.health_check`, `ai_ops.runs.select`, `ai_ops.events.select`, `ai_ops.human_review.select`, `ai_ops.cost.aggregate`, `ai_ops.invoke_agent`, `supabase.advisors.check`, `supabase.audit_logs.select`, `github.commits.list`, `intelligence.runs.summary` (all read-only) |
| Unit + integration tests with fixture data |

### Phase 3.4 — Admin dashboard

| Deliverable |
|---|
| Phase 3 admin dashboard MVP at `/admin/ai-ops` showing: runs (per-agent + cross-agent timeline), events (live feed), memory (top-N per agent), KPIs (per the kpis doc), CEO Agent's last hourly snapshot + last daily review, pending `ai_human_review` rows with approve/reject UI |

**Exit criteria for Phase 3:**
- Tier 1 agents reactive on events (Market Intelligence reacts within 60s of `news_ingested`)
- Memory queries use embedding similarity ranking
- CEO Agent hourly snapshots populating `ai_memory` for 7 consecutive days
- CEO Agent daily strategic reviews producing at least 1 actionable recommendation per week on average
- Admin dashboard live for operator use
- Zero false-positive escalations from the CEO Agent over a 30-day window (precision ≥90%)

## Phase 4 — Tier 2 agents: Underwriting + Report Generation (strategic moat)

**Pre-requisites:** Underwriting UX shell live (designed in Stitch, then built). Mapbox library swap. Cache Components Phase.

| Deliverable |
|---|
| Permissions migration for Underwriting + Report Generation |
| Underwriting Agent at `apps/web/src/lib/ai-agents/agents/underwriting.ts` |
| Report Generation Agent + Puppeteer-based PDF renderer at `apps/web/src/lib/ai-agents/agents/report-generation.ts` |
| Integration with `valuations` + `saved_reports` tables |
| Memo-quality manual audit framework (sample 50 memos/month, score 0–5) |

**Exit criteria:**
- 80% memo acceptance rate on first generation
- Manual correction rate ≤ 15%
- Report generation < 30s for a full institutional PDF
- Sign-off from 2 institutional partners on memo quality

## Phase 5 — CRM / Dealflow Agent + Alerts engine

**Pre-requisites:** CRM surface designed + populated with real data.

| Deliverable |
|---|
| Permissions migration |
| CRM Agent implementation |
| Alerts subscription table + UI |
| Alert dispatcher triggered by `hotel_transactions` insert → matches `subscriptions` → Resend dispatch |
| Tier gating: free (30d corpus) / pro (12m) / premium (full + alerts) |
| `/intelligence/investor/[slug]` and `/intelligence/operator/[slug]` dossier surfaces consume CRM Agent output |

**Exit criteria:**
- Alerts deliver < 5min from `hotel_transactions` insert
- Dossier freshness < 7d for top-50 investors
- Pipeline-stage transitions match operator expectations 95% of time

## Phase 6 — Tier 3 agents: Customer Success + CMO + CFO

**Pre-requisites:** Product-market fit signals. Paying customers. Volume justifies the operational overhead.

| Deliverable |
|---|
| Customer Success Agent + WhatsApp Business / Intercom integrations |
| CMO Agent + LinkedIn / X / Buffer / Notion integrations |
| CFO Agent + Stripe / Holded / Xero / banking integrations |
| Full human-approval flows for all destructive financial / outbound communication actions |
| Tier-aware capability per agent |

**Exit criteria:**
- CS resolution rate ≥ 70% without escalation
- CMO draft approval rate ≥ 85% on first review
- CFO reconciliation accuracy 100% (any error is a blocker for promoting to active)

## Phase 7+ — Open API + co-branded products + monetisation

| Deliverable |
|---|
| Authenticated read-only API for partner consumption |
| Per-partner co-branded daily briefs |
| Webhook dispatchers for partner systems |
| Stripe billing tied to agent usage (per-memo, per-alert, per-dossier-refresh) |
| Multi-tenant cost isolation |

## Dependency graph

```
Phase 1 — foundation (this commit)
      │
      ▼
Phase 2 — Market Intelligence + Data Ingestion + QA / Monitoring
      │  (these unlock data flow into ai_memory + ai_events)
      ▼
Phase 3 — pgvector + reactive orchestrator + CEO AGENT (TIER 0) + admin dashboard
      │  (CEO Agent lands HERE — supervises Tier 1 going forward,
      │   and supervises Tiers 2+3 as they come online)
      ▼
Phase 4 — Underwriting + Report Generation (the moat) — supervised by CEO
      │  (requires Phase 2 corpus + Phase 3 memory + CEO Agent eyes)
      ▼
Phase 5 — CRM + Alerts — supervised by CEO
      │  (uses corpus + reactive events + tier gating)
      ▼
Phase 6 — Customer Success + CMO + CFO — supervised by CEO
      │  (requires real users, real money flowing)
      ▼
Phase 7+ — open API + monetisation
```

## What NOT to build yet (anti-goals)

- ❌ Autonomous agents that act without human approval on destructive surfaces
- ❌ LLM-controlled orchestrator (static router stays for the foreseeable future)
- ❌ Multi-agent "swarms" — each agent has a single owner-job, not nested authority chains
- ❌ Agent-generated permissions (agents cannot grant themselves new permissions)
- ❌ Phase 6 agents before Phase 4 — CS / CMO / CFO without Underwriting + Report shipped is putting the cart before the horse
- ❌ Realtime everywhere — most events tolerate 5–60 min latency; pay the realtime cost only where it matters (alerts)
- ❌ Custom LLM training before product-market fit
- ❌ Voice / phone agents (out of scope until enterprise tier demands it)

## Highest-priority systems explained

**1. Market Intelligence Agent.** Highest priority because it has the largest pre-built substrate (Hospitality Intelligence Engine Phase 1). Smallest delta from "nothing" to "useful".

**2. Data Ingestion Agent.** High priority because manual Excel handling is the largest current ops tax. Even a 70%-accurate parser saves hours per CoStar export.

**3. QA / Monitoring Agent.** Priority because every minute of degraded Vercel/Supabase = lost user trust. MTTD < 5min is the difference between "we noticed" and "the customer noticed first".

**4. Underwriting Agent.** Priority but later — because the UX shell must exist first. This is the moat; rushing it without UI structure = building the engine before the dashboard.

## What should NOT be built yet (priority rationale)

- **CFO Agent**: useful only when there's revenue + multiple payment sources + cloud cost depth. Pre-PMF, an operator + spreadsheet is faster than building this. Phase 6+.
- **CS Agent**: useful only when there's customer volume to support. Pre-PMF, founders should be doing CS themselves to learn.
- **CMO Agent**: useful when brand voice is defined + content cadence proven. Pre-PMF, an operator's authentic voice > LLM-drafted content.

## Roadmap rule of thumb

For each future phase, ask: "What's the cheapest manual alternative for this agent's job, and at what scale does that break?" Build the agent only once the manual alternative is breaking. Until then, you're optimising the wrong thing.

The Intelligence + Ingestion + Monitoring agents (Phase 2) are at "manual breaks immediately" — those go. Underwriting (Phase 4) is at "manual scales to ~50 deals/year"; we need agent leverage before 50. CRM (Phase 5) breaks at ~20 active investor relationships. CS / CMO / CFO break at €10k+ MRR.

That rule, plus this roadmap, is the operational compass.
