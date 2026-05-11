# CEO / Orchestration Agent — Supervision Layer

**Agent id:** `ceo`
**Tier:** 0 (orchestration, ABOVE the operational agents)
**Workspace:** none — this agent is read-only across the platform
**Status:** `planned` — activation in Phase 3 once Tier 1 + Tier 2 agents have generated enough telemetry to supervise

---

## 1. Purpose

The CEO Agent is the **supervisory orchestration layer**. It coordinates the operational ecosystem of HOTELVALORA AI agents, monitors their health, surfaces anomalies, and escalates when human intervention is needed. It does **not** execute heavy ingestion or write to operational tables — it watches, coordinates, and escalates.

This is the institutional equivalent of an operations chief reading dashboards, walking the floor, asking "is everything green?", and pulling the right person aside when something drifts.

## 2. The expanded charter (post market-vs-underwriting split)

With the formal separation of the CoStar Market Data Agent and the CompSet Underwriting Agent, the CEO Agent gains explicit supervisory responsibilities for both. Its expanded charter:

### 2.1 · Platform supervision

- Review platform status **hourly** (Vercel + Supabase + Resend health probes)
- Verify all agents are healthy (run rate within bounds, success rate ≥ 95%)
- Verify ingestion pipelines are functioning (`news_ingestion_runs` + each MASTER's `INGESTION_LOG` freshness)
- Detect failures across the agent fleet (failed runs, repeated errors, cost-cap warnings)
- Coordinate escalations (deduplicate Resend alerts across agents)
- Monitor costs (sum daily spend across the fleet against per-agent caps + global cap)

### 2.2 · Infrastructure supervision

- Verify cron execution — each cron route fired within its expected window
- Verify database health — Supabase advisor probes, RLS posture audit, migration drift detection
- Verify Vercel deployment status — production deployment fresh, no failed builds in the last 24h
- Verify Resend status — API key valid, sender domain healthy, recent send success rate ≥ 99%
- Verify external integrations — CoStar / STR API contracts (when wired), Stripe (when wired)

### 2.3 · Operational pipeline supervision

- Validate report-generation workflows end-to-end (subject data → compset data → positioning → PDF render)
- Monitor underwriting pipeline integrity (CompSet Underwriting Agent snapshot age per active hotel)
- Monitor institutional data freshness:
  - CoStar warehouse — last MASTER refresh per granularity should be ≤ 45 days old
  - Compset snapshots — should be ≤ 90 days old for active hotels
  - Transactions corpus — should grow at ≥ 5 rows/week steady state
  - News corpus — should grow at ≥ 10 rows/day per the news ingestion cron

### 2.4 · Cross-agent coordination

- Detect dependency violations (e.g. CompSet Underwriting Agent triggered before CoStar Market Data Agent's quarterly refresh landed)
- Sequence cascading refreshes (Q1 market refresh → triggers downstream per-hotel positioning refreshes)
- Surface inter-agent friction (e.g. shared cost-cap pressure across Tier 1 + Tier 2)
- Coordinate human-approval queues (`ai_human_review` rows stale > 24h)

## 3. What the CEO Agent does NOT do

This is critical:

- ❌ It does NOT execute heavy ingestion. It supervises.
- ❌ It does NOT write to operational masters. It reads `INGESTION_LOG` sheets and `ai_agent_runs` rows.
- ❌ It does NOT make business decisions. It surfaces problems for human decision.
- ❌ It does NOT bypass human approval. It can detect that approvals are stuck and escalate.
- ❌ It does NOT call other agents directly. It emits coordination events; the orchestrator routes.
- ❌ It does NOT send customer-facing communications. It uses `monitoring.escalate.email` to internal operators only.

## 4. Operational rhythm

| Frequency | Action |
|---|---|
| Hourly | Health snapshot — counts of failed runs, stuck approvals, cost-cap warnings, freshness alerts |
| Daily | Strategic review — written summary of the day's anomalies + recommendations |
| Weekly | Stability index — rolling 7d view of each agent's success rate, latency, cost; trends flagged |
| Monthly | Coverage audit — verify each active hotel has a recent positioning snapshot; verify each active country has a recent warehouse refresh; verify deal pipeline is hydrated with the right context |
| Per-event | Reactive escalation — when downstream `human_approval_needed` / `health_check_failed` / `cost_cap_warning` events fire |

## 5. Source data the CEO reads

| Source | What it tells the CEO |
|---|---|
| `public.ai_agent_runs` | Recent runs per agent, status distribution, cost totals, error patterns |
| `public.ai_events` | Cross-agent event flow; detect bottlenecks (e.g. `costar_ingestion_staged` events not being consumed by `compset_snapshot_ready`) |
| `public.ai_human_review` | Stuck approvals (status='pending' > 24h) |
| `public.ai_memory` (agent_global scope) | Each agent's last-snapshot snapshot for context |
| `public.news_ingestion_runs` | Hospitality Intelligence Engine health |
| `services/transactions/MASTER/INGESTION_LOG` | Last transactions ingestion run per workbook |
| `services/costar/MASTER/INGESTION_LOG` (×4) | Last warehouse refresh per granularity |
| `services/compset/MASTER/INGESTION_LOG` (×2) | Last compset / positioning run |
| Supabase advisors | RLS / index / security recommendations |
| Vercel API (deployments + cron + logs) | Deployment freshness, cron execution audit |
| Resend API | Send-rate health |

## 6. Outputs the CEO produces

| Output | Persisted to |
|---|---|
| Hourly health snapshot | `ai_memory` scope=`agent_global`, content prefix `hourly_health:<iso>` |
| Daily strategic review | `ai_memory` scope=`agent_global`, content prefix `daily_review:<date>` |
| Escalations via Resend | `monitoring.escalate.email` tool; recorded in `ai_memory` with `escalation:<dedup_key>` |
| Coordination events | `ai_events` kind=`strategic_review_completed` / `agent_anomaly_detected` / `cost_cap_warning` |
| Approval-stale notifications | Reactive event on `human_approval_needed` rows aging past 24h |

## 7. Permissions (planned for Phase 3 migration)

Read-only across the entire AI Operations Layer + ingestion workspaces:

- `public.ai_agent_runs` · `public.ai_events` · `public.ai_human_review` · `public.ai_memory` · `public.ai_agents` · `public.ai_tools` · `public.ai_agent_permissions`
- `public.news_ingestion_runs` · `public.sources`
- `public.audit_logs`
- Filesystem: read-only access to all `services/*/MASTER/INGESTION_LOG` sheets (via the same audit-sync endpoint)
- External: Supabase advisor API · Vercel deployments API · GitHub commits API

Tools allowed (`execute`):
- `ai_ops.health_check` · `ai_ops.runs.select` · `ai_ops.events.select` · `ai_ops.cost.aggregate` · `ai_ops.human_review.select`
- `ai_ops.invoke_agent` (for coordination — e.g. triggering a manual run when the cron missed)
- `monitoring.escalate.email` (internal alerts via Resend, env-pinned recipients)
- `supabase.advisors.check` · `supabase.audit_logs.select`
- `vercel.deployments.list` · `github.commits.list`
- `intelligence.runs.summary`

**NO** write permissions to any application table. The CEO Agent is read-only by design.

## 8. Escalation rules

| Condition | Severity | Action |
|---|---|---|
| Any Tier 1 agent in `failed` state ≥ 3 times in 24h | warning | Resend escalation, naming the agent + error pattern |
| Total fleet daily cost > 80% of aggregate caps | warning | Resend escalation + projected day-end spend |
| Total fleet daily cost > 100% | critical | Resend escalation, stop scheduling new LLM steps until 00:00 UTC reset |
| Approval queue age > 24h on any row | info | Resend digest of stale approvals |
| Approval queue age > 72h on any row | warning | Resend escalation per stale row |
| Market warehouse refresh > 60 days stale | warning | Resend escalation + suggestion to trigger manual refresh |
| Active hotel positioning > 120 days stale | warning | Resend escalation + suggest CompSet Underwriting Agent refresh |
| Vercel deployment > 14 days old | info | Resend digest, suggesting a redeploy |
| Supabase advisor surfaces a critical recommendation | critical | Resend escalation, summarising the advisor finding |
| Cron route last fired > 1.5× its scheduled interval ago | warning | Resend escalation — cron may be broken |

## 9. The CEO as a circuit breaker (Phase 4+)

When system stress is detected (e.g. a downstream agent stuck in a retry loop, repeated parse failures across a workspace, cascading review queues), the CEO Agent can:

- Temporarily pause an offending agent by flipping `ai_agents.enabled=false` (the runtime refuses to invoke disabled agents)
- Emit a `system_alert` event with a "circuit break" payload
- Resend-escalate to the operator with a recovery checklist
- Wait for human re-enable before resuming

This circuit-breaker pattern lands in Phase 4 alongside the LLM-assisted strategic review. In Phase 3, the CEO is observation-only.

## 10. Files

| File | Role |
|---|---|
| `public.ai_agents.id = 'ceo'` | Registry row (already seeded by migration 0008) |
| `docs/ai-agents/ai-agent-roadmap.md` § Phase 3 | Activation criteria |
| `docs/agents/costar-market-data-agent.md` | Supervised agent A |
| `docs/agents/compset-underwriting-agent.md` | Supervised agent B |
| `apps/web/src/lib/ai-agents/agents/ceo.ts` | Implementation (lands in Phase 3) |
| `apps/web/src/app/api/cron/ceo-hourly/route.ts` | Hourly probe cron (Phase 3) |
| `apps/web/src/app/api/cron/ceo-daily/route.ts` | Daily review cron (Phase 3) |

## 11. Activation checklist (when Phase 3 ships)

- [ ] Migration adding read-only permission rows for `ceo` agent_id
- [ ] `apps/web/src/lib/ai-agents/agents/ceo.ts` implementation
- [ ] Cron routes — hourly (`0 * * * *` UTC) + daily (`0 6 * * *` UTC)
- [ ] Reactive subscription on `human_approval_needed` events (stale-after-24h escalation)
- [ ] Reactive subscription on `health_check_failed` events
- [ ] Cross-workspace freshness probe (reads `services/*/MASTER/INGESTION_LOG` via cloud helpers)
- [ ] Daily strategic review writer (LLM-assisted prose; Phase 4 if LLM cost budget allows, Phase 3 with templated narrative otherwise)
- [ ] Smoke test with fixture data + simulated escalation paths
- [ ] Flip `public.ai_agents.status` to `beta`, `enabled=true`
- [ ] Flip to `active` after 30 days of stable operation + zero false-positive escalations
