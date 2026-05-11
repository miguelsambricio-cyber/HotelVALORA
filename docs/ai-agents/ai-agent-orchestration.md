# AI Agent Orchestration

How agents compose, fire, queue, and call each other.

**Last refreshed:** 2026-05-11

---

## 1. The orchestrator is a queue + a router

Not an LLM. Not an autonomous controller. The orchestrator is two pieces:

- **Queue**: rows in `ai_agent_runs` with `status='queued'`
- **Router**: a static rules table that maps `(trigger_kind, payload signature) → ai_agent_id` plus optional priority + cost guard

This is the boring, deterministic answer. It scales to dozens of agents without becoming unpredictable.

## 2. Trigger sources → run rows

```
┌─────────────────────────────────────────────────────────┐
│  Triggers                                                │
│                                                          │
│   Vercel Cron    ──────►  invoke(agent, cronInput)      │
│   ai_events      ──────►  router → invoke(agent, payload)│
│   Webhook        ──────►  authenticated → invoke()      │
│   Manual / curl  ──────►  invoke() with CRON_SECRET     │
│   Agent → Agent  ──────►  invoke() inside an agent step │
│   Approval       ──────►  resume_run(runId)             │
│                                                          │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
                ┌────────────────────┐
                │  ai_agent_runs     │
                │  (status='queued') │
                └────────────────────┘
                          │
                          ▼ workers pick up
                ┌────────────────────┐
                │  agent runtime     │
                │  invoke() loop     │
                └────────────────────┘
```

## 3. Routing rules

A static map. Adding routes is a doc + code change, never an LLM decision.

| Event kind | Routed to | Rationale |
|---|---|---|
| `news_ingested` | Market Intelligence Agent | Per-article enrichment after the ingestion cron writes to `market_news` |
| `valuation_created` | (Phase 4) Underwriting Agent — optional auto-suggest | Only on opt-in; default off |
| `valuation_updated` | Report Generation Agent (refresh PDF) | Lazy — runs at most once per hour per valuation |
| `tour_requested` | CRM / Dealflow Agent | Enrich contact + drop reminder |
| `user_signed_up` | Customer Success Agent → onboarding flow | Email sequence start |
| `payment_received` | CFO Agent → reconciliation + (Phase 6) CRM tier upgrade | |
| `deploy_completed` | QA / Monitoring Agent → smoke checks | |
| `health_check_failed` | QA / Monitoring Agent → escalate | Calls `monitoring.escalate` tool |
| `human_approved` | Resume the paused run | Picks up `ai_agent_runs.id` from event payload |
| `human_rejected` | Mark run as `failed` with reason | |
| `cron_fired` | The specific cron's named agent | Cron payload includes `target_agent_id` |
| `custom` | No default route | Each producer documents who consumes |

## 4. Agent-to-agent calls

When Agent A needs Agent B's output, A calls `runtime.invoke('agent_b', input, { kind: 'agent', agent_id: 'agent_a' })`. The runtime:

1. Creates a new `ai_agent_runs` row for B with `triggering_agent_id='agent_a'`
2. Executes B's loop
3. Returns B's `output` to A
4. A's own `ai_agent_runs.steps` records the sub-call as one step with `output: { sub_run_id: <B's id> }`

Constraints:
- A cannot pass its service-role context to B. B re-loads its own permissions.
- A cannot invoke a tool that B has approval for unless A independently has approval. No permission inheritance.
- A cannot bypass B's destructive-action gates. If B needs human approval, A's run also pauses while B's pending review sits in the queue.

## 5. Concurrency model

Phase 2-3: single-tenant. Each agent has at most ONE running invocation at a time per (agent, scope_org_id). The runtime enforces via:

```sql
-- pseudocode
select count(*) from ai_agent_runs
  where agent_id = ? and status in ('queued','running','awaiting_approval')
    and (scope_org_id = ? or scope_org_id is null);
-- if count >= 1 → defer the new invocation; don't insert
```

Phase 4+: scale to per-tenant parallelism with a small pool (e.g. up to 3 concurrent `underwriting` runs per org). Cost cap still applies.

## 6. Priority + scheduling

Each run row has an implicit priority via `trigger_kind`:

| Priority | Trigger | Rationale |
|---|---|---|
| 0 (highest) | `escalation` (human review approved) | Resume paused work first |
| 1 | `webhook` (external system) | Avoid losing external signals |
| 2 | `event` | Time-sensitive reactive work |
| 3 | `manual` | Operator-initiated |
| 4 | `cron` | Background, can wait |
| 5 (lowest) | `agent` (sub-call) | Should never block higher-priority work |

A simple `order by (case trigger_kind ...) asc, run_started_at asc` query is the scheduler. No need for a job queue library at this scale.

## 7. Daily cost cap enforcement

Before every step that may invoke an LLM or external paid API:

```ts
const todaysCost = await sumTodaysCost(agentId);  // sum cost_usd from ai_agent_runs.cost_usd where agent_id=? and date(run_started_at)=today
const cap = await getDailyCap(agentId);
if (todaysCost >= cap) {
  await pauseRun(runId, "daily_cap_reached");
  return;
}
```

The pause sets `ai_agent_runs.status='queued'` and adds a deferred-resume entry. At 00:00 Madrid the orchestrator resumes the deferred queue in priority order.

## 8. Mermaid: a concrete flow

Market Intelligence Agent reacts to news ingestion:

```
[ Vercel Cron 08:48 Madrid ]
            │
            ▼
[ Intelligence Ingestion (Phase 2 cron) ]
   - fetches 10 sources
   - upserts market_news rows
   - emits ai_events.kind='news_ingested' per source
            │
            ▼
[ ai_events queue grows ]
            │
            ▼ (orchestrator polls, finds new news_ingested rows)
[ Market Intelligence Agent runs ]
   - loads each news_id from event payload
   - calls LLM to extract entities + categorise (Phase 3)
   - calls supabase.market_news.update (permitted)
   - calls supabase.news_entities.insert (permitted)
   - emits ai_events.kind='dossier_updated' for each entity
            │
            ▼
[ (Phase 5) CRM Agent reacts to dossier_updated ]
   - updates contact dossier rows
   - schedules reminder if matching investor in CRM
            │
            ▼ (Phase 6) ai_events.kind='alert_dispatched'
[ Alerts engine sends Resend email to subscribed users ]
```

Each step is a separate `ai_agent_runs` row with full audit. The chain is traceable end-to-end.

## 9. Failure containment

If Market Intelligence Agent fails on news_id=42, news_id=43 onwards still process — runs are per-news_id, not per-cron-firing. If CRM Agent depends on dossier_updated and 5 of those events fail, the CRM Agent still processes the other 95. No single failure cascades.

The exception: agent-to-agent calls. If Underwriting Agent calls Report Generation Agent and the latter fails, the calling Underwriting run also marks as `partial` (not `failed`) — it completed the underwriting analysis but not the report. The user sees the analysis; the report retry queues separately.

## 10. Manual operator controls

| Action | How |
|---|---|
| Pause an agent | `update ai_agents set enabled=false where id='...';` |
| Cancel a queued run | `update ai_agent_runs set status='cancelled' where id='...';` |
| Approve a pending review | `update ai_human_review set status='approved', reviewer_id=..., reviewed_at=now() where id='...';` (Phase 6 admin UI replaces this) |
| Re-run a failed run | Insert a new run row with `trigger_kind='manual'` + same input |
| Drain the queue | `update ai_agent_runs set status='cancelled' where status='queued';` (emergency) |
| Reset daily cost cap (override) | `update ai_agents set config = jsonb_set(config, '{daily_cost_usd_cap}', to_jsonb(NEW_VALUE)) where id='...';` |

All operator actions are themselves audited via Postgres `audit_logs` (already in the existing schema from migration `0001`).
