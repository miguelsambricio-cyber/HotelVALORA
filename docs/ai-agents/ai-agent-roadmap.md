# AI Agent Roadmap

Phased rollout of the 9 operational AI systems.

**Last refreshed:** 2026-05-11
**Current phase:** 🟢 **Phase 1** complete

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

## Phase 2 — Tier 1 agents implementation (next sprint candidate)

**Goal:** Market Intelligence + Data Ingestion + QA / Monitoring agents go from `planned` → `beta`. Lowest-risk, highest-leverage — they work on existing data with no destructive surface.

### Phase 2.1 — Agent runtime core

| Deliverable | File |
|---|---|
| Runtime `invoke()` | `apps/web/src/lib/ai-agents/core/runtime.ts` |
| Permission checker | `apps/web/src/lib/ai-agents/core/permissions.ts` |
| Memory loader | `apps/web/src/lib/ai-agents/core/memory.ts` |
| Event bus emit | `apps/web/src/lib/ai-agents/core/events.ts` |
| Escalation helpers | `apps/web/src/lib/ai-agents/core/escalation.ts` |
| Tool registry | `apps/web/src/lib/ai-agents/core/tools.ts` |
| LLM client wrapper | `apps/web/src/lib/ai-agents/llm-client.ts` |

### Phase 2.2 — Market Intelligence Agent

| Deliverable |
|---|
| Permissions migration `0008_market_intelligence_agent_permissions.sql` |
| Agent implementation at `apps/web/src/lib/ai-agents/agents/market-intelligence.ts` |
| Cron route handler at `apps/web/src/app/api/cron/market-intelligence/route.ts` |
| Integration with the existing Hospitality Intelligence Engine ingestion cron (Phase 2 of `docs/intelligence/`) |
| Unit + integration tests |

### Phase 2.3 — Data Ingestion Agent

| Deliverable |
|---|
| Permissions migration `0009_data_ingestion_agent_permissions.sql` |
| Agent implementation |
| Manual-trigger surface at `apps/web/src/app/api/agents/data-ingestion/route.ts` (file upload) |
| Reuses `services/data_pipeline` Python parsers via HTTP — or ports them to TS |

### Phase 2.4 — QA / Monitoring Agent

| Deliverable |
|---|
| Permissions migration `0010_qa_monitoring_agent_permissions.sql` |
| Agent implementation |
| Cron route handler at `apps/web/src/app/api/cron/qa-monitoring/route.ts` (hourly probes) |
| Slack webhook integration for escalations |

**Exit criteria for Phase 2:**
- 14 consecutive days of all 3 agents with `success rate ≥ 95%`
- Zero permission denial spikes
- Daily cost cap respected
- Operator dashboard shows live KPIs

## Phase 3 — Memory + orchestrator + event-reactive infrastructure

**Goal:** make agents react to events in addition to crons; enable `pgvector`; build the orchestrator router.

| Deliverable |
|---|
| Migration `0011_pgvector_enable.sql` — `create extension vector; alter table ai_memory add column embedding vector(1536);` |
| Embedding backfill cron for existing `ai_memory` rows |
| Realtime fan-out: Supabase Edge Function subscribes to `ai_events` inserts |
| Static orchestrator router (rules table) at `apps/web/src/lib/ai-agents/core/router.ts` |
| Permission enforcement at the runtime layer (audit row added for every check, denial or pass) |
| Phase 3 admin dashboard MVP at `/admin/ai-ops` showing runs, events, memory, KPIs |

**Exit criteria:**
- Tier 1 agents reactive on events (e.g., Market Intelligence reacts within 60s of `news_ingested` insertion)
- Memory queries use embedding similarity ranking
- Admin dashboard live for operator use

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
Phase 3 — pgvector + reactive orchestrator + admin dashboard
      │  (this is where the system stops being batch-only)
      ▼
Phase 4 — Underwriting + Report Generation (the moat)
      │  (requires Phase 2 corpus + Phase 3 memory)
      ▼
Phase 5 — CRM + Alerts
      │  (uses corpus + reactive events + tier gating)
      ▼
Phase 6 — Customer Success + CMO + CFO
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
