# AI Agent KPIs

How we measure agent success.

**Last refreshed:** 2026-05-11

---

## 1. Why KPIs are not optional

The default failure mode of AI features is "everyone thinks it's amazing but no-one can prove it". Every HotelVALORA agent declares its KPIs in `ai_agents.kpis` at definition time. Phase 2+ implementations include dashboards that compute the KPI from `ai_agent_runs`.

A new agent without measurable KPIs cannot ship to production. That's a release gate.

## 2. The KPI taxonomy

Five universal KPIs apply to every agent. Each agent adds 2–4 domain-specific KPIs on top.

### 2.1 · Universal — applies to all 9 agents

| KPI | Formula | Healthy range |
|---|---|---|
| **Run success rate** | `count(status=success) / count(*)` over trailing 7d | ≥ 95% |
| **Median latency** | `percentile_cont(0.5) within group (order by run_completed_at - run_started_at)` | Agent-specific |
| **Cost per run** | `avg(cost_usd)` over trailing 30d | ≤ declared `daily_cost_usd_cap / expected_daily_runs` |
| **Escalation rate** | `count(awaiting_approval) / count(*)` | Agent-specific — destructive agents naturally higher |
| **Permission denial rate** | `count(steps where status='denied') / count(steps)` | ≤ 1% (>1% means permissions are wrong) |

### 2.2 · Per-agent domain KPIs

| Agent | Domain KPIs |
|---|---|
| **CEO / Orchestration (Tier 0)** | MTTD platform (mean time to detect any platform anomaly — target <5min) · Escalation precision (% of escalations that humans confirm as actionable — target ≥90%) · Agent coverage (% of agents reviewed per hourly cycle — target 100%) · Strategic review quality (manual rating of daily review usefulness — target ≥80% after 30d) · Hourly run completion (target ≥99%) · False-positive alert rate (target <2%) |
| **Market Intelligence** | Coverage (sources/day) · Dedup rate · Freshness (publish → corpus latency) · Categorisation accuracy (manual audit sample) |
| **Data Ingestion** | Parse success rate · Manual review rate · Schema drift detection rate · Column-mapping confidence |
| **QA / Monitoring** | MTTD (mean time to detect) · False positive rate · Coverage (% of services probed) · Alert acknowledgement latency |
| **Underwriting** | Memo acceptance rate (institutional sign-off) · Manual correction rate · Time saved vs human analyst · DCF accuracy vs ground-truth comps |
| **Report Generation** | Generation time · Render fidelity (% match vs UI) · Tier-correctness (% of paid tier features rendered for paid users only) |
| **CRM / Dealflow** | Dossier freshness · Reminder accuracy · Contact-merge precision · Pipeline-stage transition accuracy |
| **Customer Success** | First-response time · Resolution rate (% without escalation) · CSAT proxy · Onboarding completion rate |
| **CMO** | Draft approval rate · Engagement lift vs no-AI baseline · Time-to-publish · Brand voice consistency (LLM-judged) |
| **CFO** | Reconciliation accuracy (100% required) · Forecast variance · Cloud cost detection lead time · Tax-prep cycle time |

## 3. How KPIs are computed

Phase 2: SQL views materialised nightly:

```sql
create materialized view ai_agent_kpis_daily as
select
  agent_id,
  date(run_started_at) as day,
  count(*) as total_runs,
  count(*) filter (where status = 'success') as successful_runs,
  count(*) filter (where status = 'failed')  as failed_runs,
  count(*) filter (where status = 'awaiting_approval') as escalated_runs,
  percentile_cont(0.5) within group (order by extract(epoch from (run_completed_at - run_started_at))) as median_latency_seconds,
  sum(cost_usd) as total_cost_usd,
  avg(cost_usd) as avg_cost_usd
from public.ai_agent_runs
where run_started_at > now() - interval '30 days'
group by agent_id, date(run_started_at);
```

Refresh nightly via cron. The Phase 5+ admin UI reads this view.

## 4. Daily cost cap

Every agent has `ai_agents.config.daily_cost_usd_cap`. The runtime enforces by checking accumulated cost before each LLM / paid-API tool call:

```ts
const todaysCost = await supabase.rpc("agent_todays_cost", { agent_id: id });
if (todaysCost >= dailyCap) {
  await pauseRun(runId, "daily_cap_reached");
  return;
}
```

Default caps (proposed; tune in Phase 2-3):

| Agent | Daily cap (€) |
|---|---|
| **CEO / Orchestration** | **0.50** (mostly read-only; LLM only for daily strategic-review summary generation) |
| Market Intelligence | 2.00 |
| Data Ingestion | 0.50 |
| QA / Monitoring | 0.20 (mostly read-only) |
| Underwriting | 5.00 per active user — scales with usage |
| Report Generation | 1.00 per active user |
| CRM / Dealflow | 1.00 per active org |
| Customer Success | 3.00 per active org |
| CMO | 2.00 |
| CFO | 0.50 |

At a typical "pre-PMF" tenant load: total platform-wide cost <€20/day = <€600/month. The CEO Agent adds only ~€0.50/day because its work is overwhelmingly read-only — the only LLM-bound step is the daily strategic-review prose summary.

## 5. Quality scoring — for AI-output agents

For agents whose output quality is subjective (Underwriting, Report, CMO, CS), we layer a feedback loop:

| Signal | How | Effect on KPI |
|---|---|---|
| User explicit thumbs up/down | UI button on agent-rendered output | Direct input to `quality_score` per run |
| User edit-after-render | Telemetry: % of generated content modified before save | High edit rate → lower implicit quality |
| Human review approval rate | `ai_human_review.status` distribution | Agent's "Draft approval rate" KPI |
| Periodic manual audit | Operator samples 50 runs/month, scores 0–5 | Ground-truth quality benchmark |

Quality scoring lands in Phase 4 — Phase 2-3 agents are mostly objective (parse / fetch / lint).

## 6. Cost vs quality tradeoffs

Different agents trade differently:

- **CEO / Orchestration**: precision over recall. False positives erode operator trust faster than missed anomalies. Use a deterministic-rule first pass; only consult LLM for the daily strategic-review prose.
- **Market Intelligence**: minimise cost while maintaining coverage. Use cheap LLM for first-pass categorisation, fall back to GPT-4 only for ambiguous cases.
- **Underwriting**: maximise quality regardless of cost. Each memo is high-stakes; €1–€5 cost per memo is invisible vs revenue.
- **Customer Success**: optimise first-response time even at cost. A €0.50 instant answer beats a €0.05 5-minute delay.
- **CFO**: prioritise correctness > cost > latency. Reconciliation errors cost more than LLM bills.

These tradeoffs are encoded in `ai_agents.config`:

```json
{
  "model_strategy": "cheap_first_escalate",  // for market_intelligence
  "model_strategy": "best_only",             // for underwriting
  "model_strategy": "low_latency",           // for customer_success
  "model_strategy": "best_with_verification" // for cfo
}
```

The runtime's `llm-client.ts` interprets these strategies.

## 7. Anti-patterns to avoid in KPI design

1. **Don't measure runs**: measure outcomes. "Number of runs" is not a KPI; "successful runs that produced user-actionable output" is.
2. **Don't aggregate without cohorts**: an agent that's 99% successful for free tier and 50% for premium is broken at the wrong end.
3. **Don't set targets you can't measure**: a "delight customers" KPI without a survey instrument is theatre.
4. **Don't ignore the tail**: median latency is necessary; p95 + p99 are how production behaves on bad days.
5. **Don't combine cost + quality into one number**: keep them orthogonal. Pareto front, not weighted sum.

## 8. Reporting cadence

| Cadence | Audience | Format |
|---|---|---|
| Per-run | Engineering | Vercel logs + `ai_agent_runs` row |
| Daily | Operator | `ai_agent_kpis_daily` view (Phase 3 admin UI) |
| Weekly | Eng + Product | Slack digest summarising last 7d (Phase 4+) |
| Monthly | Exec + Investors | One-page institutional KPI report (Phase 5+ — generated by Report Generation Agent itself, recursive) |

## 9. Killing an underperforming agent

If an agent's 30-day rolling KPIs miss healthy ranges:

1. Engineering investigation
2. If permission-related → grant/revoke fix
3. If model-related → swap model or strategy
4. If task-mismatch → narrow responsibilities (smaller scope)
5. If irrecoverable → `update ai_agents set status='disabled', enabled=false`. The agent stays in the registry as historical record but stops running.

We declare an agent "successful" after 90 consecutive days hitting all universal + domain KPIs. Then it graduates to "active" status. Until then it's "beta".
