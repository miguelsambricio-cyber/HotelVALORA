# HOTELVALORA · AI Operations Layer — Master System

> **NOT chatbots. NOT a side feature. This is a future CORE operating layer of HOTELVALORA.**
>
> Read this once. The AI Operations Layer is the institutional muscle that turns the platform from "calculator with UI" into an autonomous, auditable, hospitality investment operating system. Future engineers and AI agents reading this should treat the architecture commitments as load-bearing — violating them turns the platform back into a script collection.

**Last refreshed:** 2026-05-11
**Phase status:** 🟢 Phase 1 foundation live · 🟡 Phase 2 Tier 1 agents shipped (Market Intelligence + Data Ingestion + QA / Monitoring) · 🟡 Two new specialised agents formally registered in this commit (CoStar Market Data Agent + CompSet Underwriting Agent). Runtime in `apps/web/src/lib/ai-agents/core/` is the deterministic shell every future agent inherits. CEO Agent intentionally still `planned` — activates in Phase 3.

## Agent roster (12 registered · 3 active beta · 9 planned)

| # | Agent | Tier | Status | Workspace owned | See |
|---|---|---|---|---|---|
| 0 | CEO / Orchestration Agent | 0 | planned | none (supervisory) | `docs/agents/ceo-agent-supervision-layer.md` |
| 1 | Market Intelligence Agent | 1 | **beta** | reads `public.market_news` | `docs/ai-agents/ai-agent-roadmap.md` |
| 2 | **CoStar Market Data Agent** | 1 | planned | `services/costar/` (warehouse) | `docs/agents/costar-market-data-agent.md` |
| 3 | **CompSet Underwriting Agent** | 2 | planned | `services/compset/` (operational) | `docs/agents/compset-underwriting-agent.md` |
| 4 | Data Ingestion Agent | 1 | **beta** | `services/transactions/` | `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` |
| 5 | QA / Monitoring Agent | 1 | **beta** | read-only across platform | `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` |
| 6 | CFO Agent | 3 | planned | Stripe / Holded / banking | `docs/ai-agents/ai-agent-roadmap.md` § Phase 6 |
| 7 | CMO Agent | 3 | planned | LinkedIn / X / content | same |
| 8 | Customer Success Agent | 3 | planned | WhatsApp / Intercom | same |
| 9 | CRM / Dealflow Agent | 2 | planned | `public.contacts` etc. | `docs/ai-agents/ai-agent-roadmap.md` § Phase 5 |
| 10 | Report Generation Agent (legacy) | 2 | planned | absorbed by Underwriting Engine; left in registry for backward-compat |  |
| 11 | Underwriting Agent (legacy) | 2 | planned | superseded by CompSet Underwriting + Underwriting Engine split |  |

**Active operational ecosystem today:** 3 Tier-1 agents in beta (Market Intelligence, Data Ingestion, QA / Monitoring) running on the deterministic runtime. The two newly registered specialised agents (CoStar Market Data + CompSet Underwriting) activate when their respective Phase 2.3.d.1 / Phase 2.4 implementations land.

## Three operational ingestion agents (formal separation)

Following the architectural decision in `docs/architecture/market-vs-underwriting-separation.md`, the operational ingestion surface is now split across THREE distinct agents:

| Agent | Owns | Cadence | Status |
|---|---|---|---|
| **Data Ingestion Agent** | `services/transactions/` (transactions + projects) | manual / weekly | beta (Phase 2.3.b) |
| **CoStar Market Data Agent** | `services/costar/` (warehouse — country / market / submarket / class) | monthly batch | planned (Phase 2.3.d.1) |
| **CompSet Underwriting Agent** | `services/compset/` (operational — per-hotel compset + positioning) | on-demand + quarterly | planned (Phase 2.4) |

All three share the same architectural primitives (14-column ingestion-meta block, append-only discipline, audit-chain unification via `/api/agents/data-ingestion-summary`, .gitignore that tracks contract not data) so Phase 5 migrates them to Supabase together. They differ on operational rhythm, risk profile, and what they read vs write — see `docs/architecture/market-vs-underwriting-separation.md` for the rationale.

Its supervision contract (applies to both workspaces):

- Reads files from `INPUT_TRANSACCIONES/` + `INPUT_PROYECTOS/`
- Parses · validates · normalises · deduplicates per `docs/intelligence/data-normalization-rules.md`
- Appends to `MASTER/HOTEL_TRANSACCIONES_MASTER.xlsx` + `MASTER/HOTEL_PROYECTOS_MASTER.xlsx` with full ingestion-meta (canonical_id, ingestion_id, dedup_key, ingestion_status, supersedes_id, …)
- Routes failures to `staging/failed/`, review-required rows to `staging/review/`, temp artefacts to `staging/temp/`
- Moves processed source files to `old.transacciones/` or `old.proyectos/`
- Writes a row to the workbook's `INGESTION_LOG` sheet and to `logs/<YYYY-MM>/<ingestion_id>.jsonl`
- Emits `data_ingestion_staged` event so QA / Monitoring can react

Today: Phase 1 of the workspace (directory + masters + schema + workflow docs) is live; Phase 2.3.b (operator-side Python CLI) is live; Phase 2.3.c (audit-chain unification) is live — every CLI run POSTs a per-file summary to `/api/agents/data-ingestion-summary` which writes a matching `ai_agent_runs` row + emits `data_ingestion_staged`. The XLSX masters are the canonical until Phase 5 migrates them into Supabase tables.

`public.ai_agent_runs` is the **single audit lens** across both halves of the Data Ingestion Agent. Operator-side runs carry `metadata.python_ingestion_id` for cross-reference with the CLI's local `INGESTION_LOG` sheet + `logs/<YYYY-MM>/*.jsonl`.

---

## 1. Definition

An **Operational AI System** ("agent" in shorthand) in HotelVALORA is a software actor that owns a job. Each agent has:

| Pillar | What it means |
|---|---|
| **Responsibilities** | The jobs the agent owns end-to-end (not a list of tasks — actual outcomes) |
| **Workflows** | Deterministic sequences the agent executes; deterministic shell wraps non-deterministic LLM calls |
| **Permissions** | Scoped access to tables, tools, external APIs — never blanket |
| **Memory** | Long-term + working memory in `ai_memory` (pgvector once enabled) |
| **Integrations** | External services the agent reaches via tools registered in `ai_tools` |
| **Auditability** | Every invocation is a row in `ai_agent_runs` with steps, tokens, cost |
| **Event triggers** | Cron · reactive (via `ai_events`) · manual · webhook · agent-to-agent |
| **KPIs** | Quantified success metrics declared in `ai_agents.kpis` |
| **Escalation** | Rules for handing decisions to humans via `ai_human_review` |
| **Orchestration** | How the agent composes with others — agent-to-agent calls are first-class |

An agent is NOT a chat surface. The chat surfaces (if any) are thin clients that submit work to agents. The agents themselves are background workers.

## 2. The ten planned agents — organised by tier

The agents are organised into four tiers. **Tier 0 (Orchestration)** is the supervisor that sits ABOVE everyone else. The other three tiers contain the operational agents the CEO Agent watches over.

### Tier 0 — Orchestration (the supervisor)

| # | Agent | Strategic role | Phase |
|---|---|---|---|
| 0 | **CEO / Orchestration** | **NOT a chatbot. NOT customer-facing.** Operations command center. AI chief-of-staff. Reviews platform health hourly, runs strategic review daily, supervises every other agent, routes critical anomalies to humans. Never executes destructive tools — coordinates and escalates | 3 |

### Tier 1 — Operational core

| # | Agent | Strategic role | Phase |
|---|---|---|---|
| 1 | **Market Intelligence** | Owns the daily news + transactions + projects corpus. The Hospitality Intelligence Engine (migration `0006`) is its data substrate | 2 — next |
| 2 | **Data Ingestion** | Parses Excel / CoStar / external feeds; validates; normalises columns; surfaces ingestion errors | 2 — next |
| 3 | **QA / Monitoring** | Watches deploys, Supabase advisors, Vercel cron failures, Resend delivery, uptime — pages humans on detected failures. Reports up to the CEO Agent once it ships | 2 — next |

### Tier 2 — Strategic moat

| # | Agent | Strategic role | Phase |
|---|---|---|---|
| 4 | **Underwriting** | **Strategic moat.** DCF, sensitivity, risk scoring, operator fit, highest-and-best-use, investment memo generation. Requires the underwriting UX shell first | 4 |
| 5 | **Report Generation** | Renders institutional PDFs from underwriting + intelligence inputs. Tier-aware formatting | 4 |

### Tier 3 — Customer / financial surface

| # | Agent | Strategic role | Phase |
|---|---|---|---|
| 6 | **CRM / Dealflow** | Maintains investor + operator dossiers, contacts, leads, tours, follow-ups, deal pipeline | 5 |
| 7 | **Customer Success** | WhatsApp / chat support, onboarding, FAQs, demo coordination | 6 |
| 8 | **CMO** | LinkedIn + X publishing, newsletters, market reports, campaign automation. Every outbound piece flows through `ai_human_review` | 6 |
| 9 | **CFO** | Reconciliation, cloud cost monitoring, burn rate, runway, invoice + tax prep. Every financial side-effect requires human approval | 6+ |

The order is the **build order**. We start where the platform already has data + low-risk surfaces (Intelligence, Data Ingestion, Monitoring) and work outward. The **CEO Agent lands in Phase 3** — after Tier 1 agents have produced enough audit data to supervise, but before Tier 2 strategic-moat agents go live. The CEO Agent needs at least the Tier 1 floor to be useful, but Tier 2+ should never run unsupervised.

## 2.1 · Tier 0 in detail — the CEO / Orchestration Agent

The CEO Agent is the one piece in the whole platform that is genuinely different in character. Treat it as:

- **An operations command center** — a single pane showing the state of every running agent, every queued event, every pending human review
- **An AI chief-of-staff** — the strategic layer that decides which problems are worth a human's time vs which the platform can absorb
- **An orchestration layer** — when two agents need to coordinate (e.g., the Underwriting Agent needs the Market Intelligence Agent's latest comp data), the CEO Agent is the mediator
- **An infrastructure supervisor** — Vercel deploys, Supabase advisors, GitHub commits, Stripe events, Resend bounces — all of it under one watchful eye

### Core responsibilities

1. **Hourly platform health review** — read last hour's `ai_agent_runs`, `ai_events`, `news_ingestion_runs`, Vercel deploys, Supabase advisors. Emit `system_alert` events for anomalies.
2. **Daily strategic review** (08:00 Madrid, before the Intelligence cron) — aggregate 24h KPIs, identify cost-cap breaches, flag chronically-failing agents, recommend status flips (which require human approval).
3. **Cross-agent coordination** — when Agent A needs Agent B's verification work, the CEO Agent receives the request and dispatches.
4. **Escalation routing** — every `ai_human_review` row stale > 4h triggers a CEO Agent visibility check.
5. **AI governance supervision** — verify every agent's permissions still match its declared responsibilities. Flag scope creep.
6. **Operational continuity** — when a tier-1 agent is `disabled`, the CEO Agent emits the `system_alert` so the operator knows.

### What the CEO Agent must NEVER do

- ❌ Execute destructive tools (no permission, by design)
- ❌ Disable other agents directly — only propose via `ai_human_review`
- ❌ Grant itself or another agent additional permissions — only humans grant
- ❌ Modify any application data (`valuations`, `market_news`, `contacts`, etc.) — read-only
- ❌ Decide which strategic priorities the platform pursues — only surfaces options; humans decide

### How the CEO Agent supervises the other 9

```
                        ┌─────────────────────────────────┐
                        │   CEO / Orchestration Agent     │
                        │   (Tier 0 — supervisor)         │
                        └─────────────────────────────────┘
                          │      ▲       ▲       ▲       ▲
            invokes (read)│      │ run   │ event │ event │ alert
            verifies      ▼      │ data  │       │       │
       ┌────────────┐  ┌─────────┴─────────┴───────┴───────┴────┐
       │  Tier 1    │  │  Tier 2          │  Tier 3            │
       │            │  │                  │                    │
       │  Market    │  │  Underwriting    │  CRM / Dealflow    │
       │  Intel     │  │  Report Gen      │  Customer Success  │
       │  Data Ing  │  │                  │  CMO  ·  CFO       │
       │  QA / Mon  │  │                  │                    │
       └────────────┘  └──────────────────┴────────────────────┘
```

The CEO Agent never INTERVENES in another agent's run — it OBSERVES. If it sees something wrong, it emits an event or inserts a human-review row. Humans decide whether to disable, restart, or reconfigure.

### Hourly + daily workflow cycles

```
Every hour (cron tick — Phase 3+):
   1. Read ai_agent_runs WHERE run_started_at > now() - interval '1 hour'
   2. Aggregate: count by status, sum cost_usd, list awaiting_approval > 4h
   3. Read ai_events WHERE occurred_at > now() - interval '1 hour' AND consumed_by = '{}'
   4. Call supabase.advisors.check — any new lints?
   5. Call vercel.deployments.list — any failed deploys?
   6. Call github.commits.list — recent main-branch activity?
   7. Compute health snapshot — write to ai_memory (scope='agent_global')
   8. If any signal CRITICAL → emit system_alert + (optionally) call monitoring.escalate

Every day at 08:00 Madrid (cron tick — Phase 3+):
   1. Aggregate 24h KPIs across all agents (joins ai_agent_runs by date)
   2. Identify breached daily_cost_usd_caps
   3. Identify agents with success_rate < 95% over trailing 7d → recommend disable
   4. Write strategic summary to ai_memory (scope='agent_global', importance_score=0.9)
   5. Emit strategic_review_completed event with summary payload
   6. (Phase 5+) Send a daily ops brief via Resend to operator email
```

## 3. Strategic importance

Three reasons the AI Operations Layer is a CORE moat, not a feature:

### 3.1 · It compounds every dataset advantage

The Hospitality Intelligence Engine (`docs/intelligence/`) gives us a corpus. The Underwriting Agent applies that corpus to a deal in 30 seconds — a human analyst takes 8 hours. The Report Generation Agent then emits a printable institutional memo. The CRM Agent surfaces it to the right partner. The entire flow runs while the analyst sleeps. The competitive gap is not "we have AI" — it's **"every action that compounds across surfaces compounds 24/7".**

### 3.2 · It separates HotelVALORA from the SaaS template

The default trajectory for a hospitality SaaS is: form fields → database → reports. Add AI later as a chatbot widget. That trajectory plateaus at €20-50k ACV per seat. HotelVALORA's bet is: **the AI Operations Layer is the product**. The frontend is the cockpit; the agents are the engines. That changes the ACV ceiling because what you sell stops being seats and starts being decisions.

### 3.3 · It builds an institutional trust surface

Institutional clients won't trust black-box AI. They trust **deterministic shells wrapped around non-deterministic intelligence**. Every action is a row in `ai_agent_runs`. Every destructive action passes `ai_human_review`. Every KPI is measured. Auditability is the difference between "AI we use" and "AI we let near the books".

## 4. Position in the platform

```
                ┌─────────────────────────────────────────────────────────────────────────┐
                │                  HotelVALORA Frontend (Vercel · Next.js)                │
                │                                                                          │
                │   Library · Reports · Maps · Underwriting · CRM (future) · Alerts       │
                └─────────────────────────────────────────────────────────────────────────┘
                       ▲                                                          ▲
                       │ reads canonical data                                     │ subscribes via Realtime
                       │ (TanStack Query · anon Supabase client · RLS)            │ to ai_events
                       ▼                                                          │
                ┌─────────────────────────────────────────────────────────────────────────┐
                │                       Supabase Postgres — shared substrate              │
                │                                                                          │
                │   APPLICATION DATA            INTELLIGENCE DATA           AI OPS DATA   │
                │   ───────────────            ──────────────────           ────────────  │
                │   valuations                  market_news                  ai_agents     │
                │   profiles                    hotel_transactions           ai_agent_runs │
                │   organizations               hotel_projects               ai_events     │
                │   favorite_reports            investors                    ai_memory     │
                │   top_promote_reports         operators                    ai_tools      │
                │   ...                         sources / entities / tags    ai_human_review│
                │                                                                          │
                │   RLS: public-read for showcase data · service-role for ops data        │
                └─────────────────────────────────────────────────────────────────────────┘
                       ▲                                ▲                                ▲
                       │ writes (validated)             │ writes                         │ writes (audited)
                       │                                │                                │
                ┌──────┴────────┐               ┌───────┴────────┐              ┌────────┴─────────┐
                │   App APIs    │               │  Intelligence  │              │   AI Agents      │
                │   server      │               │  Ingestion     │              │   (background)   │
                │   actions     │               │  Cron          │              │                  │
                └───────────────┘               └────────────────┘              └──────────────────┘
                                                                                         ▲
                                                                                         │ triggered by
                                                                                         │
                                                                          ┌──────────────┴───────────────┐
                                                                          │  Cron · ai_events · webhooks │
                                                                          │  manual · agent-to-agent     │
                                                                          └──────────────────────────────┘
```

## 5. Operating philosophy

### 5.1 · Deterministic shell, non-deterministic core

Every agent run is a **finite state machine**. The states are deterministic (load context → call tool → validate output → write audit step → next state). The "core" — the LLM call or model invocation — is non-deterministic, but it is one step of a wider deterministic loop. We never let an LLM control orchestration. That's a strict rule.

### 5.2 · Audit everything, retain nothing else

Every `ai_agent_runs` row has the full `input`, `output`, `steps`, `tokens_in/out`, `cost_usd`. Retention is forever. Aggregate metrics roll up daily. **Nothing else** about an agent's internal state persists beyond `ai_memory`. There is no hidden state.

### 5.3 · Permissions are declarative

An agent cannot call `stripe.refunds.create` unless there is a row in `ai_agent_permissions` granting it. Even the service-role client respects this — the application code consults `ai_agent_permissions` before issuing the tool call. RLS enforces table-level. The permissions matrix is the **trust surface**.

### 5.4 · Destructive actions queue for humans

Every tool with `is_destructive=true` OR `requires_human_approval=true` does not execute when the agent calls it. Instead, the agent inserts into `ai_human_review` with the `proposed_action` and pauses the run (`status='awaiting_approval'`). A human approves or rejects. On approval, the run resumes; the same `ai_agent_runs.id` records the resumption. **The agent never has unilateral destructive power.**

### 5.5 · Memory is scoped, expiring, and importance-weighted

`ai_memory` rows have a scope (`agent_global` / `agent_org` / `agent_user` / `agent_session` / `shared`) and an `expires_at`. The orchestrator garbage-collects expired memory daily. Each row has `importance_score` (0..1) which the LLM context-builder uses to rank what to include. We never inflate the LLM context with raw history; we curate it.

### 5.6 · The orchestrator is a queue + a router, not an LLM

In Phase 2-3, the "orchestrator" is a Postgres-backed queue + a Vercel cron + a router function that maps `ai_event_kind` → `ai_agent_id`. There is NO LLM-controlled router. When an event fires, the router consults a static rules table (eg. `news_ingested → market_intelligence`) and enqueues a run. We may eventually let an LLM propose orchestration changes, but those land via `ai_human_review` first.

### 5.7 · Cost ceilings are non-negotiable

Every agent has a daily cost cap declared in `ai_agents.config.daily_cost_usd_cap`. When the cap is hit, runs queue but don't execute until the next day. The orchestrator enforces this. We will refuse to ship an agent without a declared cap.

## 6. Connection points to the rest of the platform

### 6.1 · With the Hospitality Intelligence Engine
The Market Intelligence Agent IS the consumer of the engine. The corpus tables (`market_news`, `hotel_transactions`, …) are read-only inputs to the agent; the agent writes derived rows (categorisation, entity extraction, dossier rollups). The intelligence engine has a daily cron at 08:48 Madrid; the agent runs after each ingestion completes, triggered via `news_ingested` event.

### 6.2 · With Underwriting
The Underwriting Agent reads:
- The user's underwriting form input (live, via the UX shell)
- The corpus comps from Intelligence
- The asset's existing data from `valuations`
- The user's investment criteria from `investment_requirements`, `valuation_preferences`

It writes:
- A draft underwriting record back to `valuations`
- A draft investment memo as a `saved_reports` row
- A `news_entities` link if the memo references news rows

Every Underwriting Agent run is gated by user-initiated input — it does NOT run autonomously today. Phase 5+ may add proactive memo refresh.

### 6.3 · With the CRM (future)
The CRM Agent watches:
- `ai_events.kind = 'tour_requested'` → enriches `contacts` + drops a follow-up reminder
- New `market_news` entries that mention an investor in CRM → appends to dossier
- Stripe payment events → upgrades contact tier

It writes:
- `contacts`, `leads`, `notes`, `activity_log` rows
- `ai_human_review` for any contact merge proposals

### 6.4 · With the Alerts system (future)
The Alerts engine is a thin event-listener: subscriptions matched against `hotel_transactions` insert events → Resend dispatch via the existing email integration. It is NOT a standalone agent — it's a workflow inside the Market Intelligence Agent's surface.

### 6.5 · With external integrations
Each external integration is declared as a tool in `ai_tools`. Adding a new integration = new row. No agent can call an undeclared tool. The integration surface for each agent:

| Agent | Likely integrations |
|---|---|
| Market Intelligence | RSS feeds · scrape targets · CoStar API (Phase 5) · OpenAI / Anthropic (summaries) |
| Data Ingestion | Local Excel parsers · CoStar exports · Catastro · MSCI |
| QA / Monitoring | Vercel API · Supabase advisors · PagerDuty / Slack webhooks · UptimeRobot |
| Underwriting | OpenAI / Anthropic · internal financial-engine service · Mapbox |
| Report Generation | Puppeteer (PDF) · Mapbox (static maps) · OpenAI (summaries) |
| CRM / Dealflow | Supabase tables · Resend (reminders) · LinkedIn (enrichment) |
| Customer Success | WhatsApp Business API · Intercom · Crisp |
| CMO | LinkedIn API · X API · Resend · Buffer · Notion |
| CFO | Stripe · Holded · Xero · QuickBooks · bank APIs (Plaid/Truelayer) |

## 7. AI governance principles

Six principles. Non-negotiable.

1. **Explainability over magic.** Every agent decision must trace to specific inputs the user can re-inspect.
2. **Tier-aware capability.** Free users get summarised outputs; paying users get full agent capability. No agent ignores tier.
3. **Human-in-the-loop on side-effects.** Anything that moves money, sends a message to an external party, or modifies an external integration → `ai_human_review`.
4. **Permission denial fails loud.** A blocked tool call is logged as a step with `status='failed'` + error reason. We don't silently degrade.
5. **No agent runs another's destructive tools.** Agent-to-agent calls can only invoke read tools. The CMO can't ask the CFO to issue a refund through it.
6. **Operator override is always available.** Any human with `users.role IN ('admin','owner')` can pause an agent (`ai_agents.enabled = false`), cancel a run, or reject pending reviews — via SQL or future admin UI.

## 8. Future monetisation possibilities

Pre-product-market-fit thesis. Not committed to.

- **Agent-tier subscriptions**: free (Market Intelligence read-only) / pro (Underwriting + Report Generation per-deal credits) / premium (Underwriting unlimited + CRM + alerts) / enterprise (all agents + dedicated config)
- **Per-memo pricing**: €50–500 per institutional-grade underwriting memo, billed against a credit balance
- **CRM Agent as a B2B add-on**: family offices pay €X k/month for dossier maintenance
- **Co-branded alerts** for partner funds: Resend-dispatched daily briefs under their brand
- **API access**: institutional clients consume `intelligence.dossier.refresh` + `reports.pdf.generate` via authenticated API keys

## 9. Long-term product vision

| Phase | Quarter (rough) | Outcome |
|---|---|---|
| 1 — Foundation | Q2 2026 (done) | Schema + docs + master strategy |
| 2 — Intelligence + Ingestion + Monitoring agents (Tier 1) | Q3 2026 | Daily news in production · CoStar parsing live · uptime + advisor monitoring active |
| 3 — Memory + orchestrator + permissions enforcement | Q3 2026 | pgvector enabled · `ai_memory` populated · permissions enforced at every tool call |
| 4 — Underwriting + Report Generation agents | Q4 2026 | Strategic moat live · institutional memos generated on-demand · tier gating |
| 5 — CRM / Dealflow agent + alerts engine | Q1 2027 | Investor + operator dossiers live · per-user alert subscriptions |
| 6 — CS + CMO + CFO agents | Q2-Q3 2027 | Full operating layer · all internal ops AI-assisted · human-in-the-loop everywhere |
| 7+ — Open API + co-branded products | 2027+ | Monetised partner-facing surfaces |

## 10. Why this document exists

Every future engineer or AI agent reading the repo should be able to internalise the strategy from this single document and the seven companion technical docs. The companion docs are:

| Doc | What it covers |
|---|---|
| [`ai-agent-architecture.md`](./ai-agent-architecture.md) | System architecture · components · data flow |
| [`ai-agent-orchestration.md`](./ai-agent-orchestration.md) | Triggers · dispatch · agent-to-agent calls · queue model |
| [`ai-memory-strategy.md`](./ai-memory-strategy.md) | Scope · embeddings · expiration · importance weighting |
| [`ai-agent-permissions.md`](./ai-agent-permissions.md) | RBAC matrix · tool gates · destructive-action policy |
| [`ai-event-system.md`](./ai-event-system.md) | `ai_events` schema · routing rules · realtime fan-out |
| [`ai-agent-kpis.md`](./ai-agent-kpis.md) | Measurement framework · cost caps · quality scoring |
| [`ai-agent-roadmap.md`](./ai-agent-roadmap.md) | Phases · deliverables · exit criteria · anti-goals |

Source-of-truth schema: [`docs/database/migrations/0007_ai_operations_layer_schema.sql`](../database/migrations/0007_ai_operations_layer_schema.sql).

---

**Cross-references:**

| Topic | Doc |
|---|---|
| Hospitality Intelligence Engine — data substrate for Market Intelligence Agent | [`docs/intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md`](../intelligence/HOTELVALORA_HOSPITALITY_INTELLIGENCE_MASTER_SYSTEM.md) |
| Platform overview | [`docs/HOTELVALORA_MASTER_SYSTEM.md`](../HOTELVALORA_MASTER_SYSTEM.md) |
| Database schema (full) | [`docs/database/README.md`](../database/README.md) |
| Tech stack inventory | [`docs/infrastructure/HOTELVALORA_TECH_STACK_MASTER.md`](../infrastructure/HOTELVALORA_TECH_STACK_MASTER.md) |
| Auth runtime | [`docs/auth.md`](../auth.md) |
