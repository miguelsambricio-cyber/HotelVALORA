# AI Agent Cost Guardrails

Operational discipline for the AI Operations Layer — keeps every agent's spend predictable and bounded.

**Last refreshed:** 2026-05-11
**Status:** Live since Phase 2 — pre-installed before LLM usage to avoid retrofitting under pressure.

---

## 1. The principle

Every agent declares a **daily cost cap** + a **monthly cost cap** in `ai_agents.config`. The runtime reads the caps at every invocation, sums the day's spend across `ai_agent_runs.cost_usd`, and refuses to call an LLM step when the projected total would exceed the daily cap.

Phase 2 agents are regex-only (no LLM) so spend is structurally near zero. The guardrails are wired ahead of LLM activation in Phase 4 so we never face a runaway-cost surprise.

## 2. Where the caps live

```jsonb
ai_agents.config = {
  "tier": 1,
  "phase_activated": 2,
  "daily_cost_usd_cap":   0.20,
  "monthly_cost_usd_cap": 5.00,
  "retention_days_runs":   90,
  "retention_days_events": 60,
  "retention_days_memory": 365,
  "escalation_channel":    "resend",
  "approval_required_for": [...tool_ids],
  "rate_limit_runs_per_hour": 6,
  ...
}
```

| Field | Default | Purpose |
|---|---|---|
| `daily_cost_usd_cap` | 0.10 | Hard ceiling per UTC day. Resets at 00:00 UTC. |
| `monthly_cost_usd_cap` | 2.00 | Soft ceiling per calendar month (informational — QA agent escalates when crossed). |
| `rate_limit_runs_per_hour` | 6 | Cron schedulers honour this; manual triggers ignore it (operator override). |

Phase 2 caps were set deliberately low because the agents are regex-only:

| Agent | Daily $ | Monthly $ | Rationale |
|---|---|---|---|
| `market_intelligence` | 0.20 | 5.00 | Headroom for the eventual LLM summariser (Phase 4) |
| `data_ingestion` | 0.10 | 2.00 | Manual trigger only — cap exists for sanity, not load |
| `qa_monitoring` | 0.05 | 1.00 | Hourly probe with no LLM use — should never spend |
| `ceo` (planned) | TBD | TBD | Activates in Phase 3 with its own caps |

## 3. The runtime gate

`apps/web/src/lib/ai-agents/core/budget.ts` exposes two functions.

### `preflight(ctx, estimatedCostUsd)`

Called BEFORE an LLM step. Pulls today's spend from `ai_agent_runs.cost_usd` aggregated for the agent. Adds the current run's accumulated cost + the estimated cost of the upcoming step. If the projected total exceeds `daily_cost_usd_cap`:

1. logs a `budget_preflight` step with `status=denied / reason=budget_exceeded`
2. emits a `cost_cap_warning` event (kind=`cost_cap_warning`)
3. returns `false` — the caller short-circuits

The caller's expected pattern:

```ts
const ok = await budgetPreflight(ctx, 0.002); // 2 mil-cents estimate
if (!ok) return { output: { skipped: "budget_exceeded" } };
const llmResult = await llmExtract(...);
budgetAccount(ctx, { cost_usd: llmResult.cost_usd, tokens_in: ..., tokens_out: ..., model: ... });
```

### `account(ctx, delta)`

Called AFTER an LLM step. Adds the call's cost + tokens to the in-memory ctx. The audit shell (`closeRun`) writes the totals back to `ai_agent_runs.cost_usd / tokens_in / tokens_out` at run close. Token counts are recorded too — useful for cost forecasting once volume picks up.

### `getBudgetSnapshot(agentId, config)`

Returns:

```ts
{
  today_usd, month_usd,
  daily_cap_usd, monthly_cap_usd,
  daily_pct, monthly_pct,
  remaining_today_usd,
}
```

Used by the QA / Monitoring Agent and the `/dev/ai-ops` probe page.

## 4. The QA / Monitoring escalation

When `daily_pct >= 0.8` the QA Agent escalates via `monitoring.escalate.email` (Resend) with severity:

| Spend percentage | Severity | Action |
|---|---|---|
| < 80% | none | informational |
| 80–99% | warning | Resend alert · 15-min cooldown |
| ≥ 100% | critical | Resend alert · runtime gate has already blocked the spend |

The alert subject + body include `agent_id`, today's spend, the cap, and an explicit suggestion to raise the cap if the increase is expected (operator decides intentionally).

## 5. Per-run cost computation

The runtime does NOT compute LLM cost. Each agent that calls an LLM is responsible for computing cost from the provider's response and calling `budgetAccount`. The recommended pattern (Phase 4 onwards) is to wrap LLM calls in a `llmExtract` helper that returns `{ data, tokens_in, tokens_out, cost_usd }` so cost accounting is centralised.

```ts
// apps/web/src/lib/ai-agents/llm-client.ts  (PHASE 4 — not yet shipped)
async function llmExtract<T>(prompt, schema, meta) {
  const { object, usage } = await generateObject({...});
  const cost = priceFor(meta.model, usage.promptTokens, usage.completionTokens);
  return { data: object, tokens_in: usage.promptTokens, tokens_out: usage.completionTokens, cost_usd: cost };
}
```

Cost rates for each model live in a separate `apps/web/src/lib/ai-agents/llm-pricing.ts` table — easy to update when providers change pricing.

## 6. Retention is part of cost

Storage cost grows with retention. `retention_days_*` keys on `ai_agents.config` declare the maximum age for each table:

| Key | Default | Cleanup |
|---|---|---|
| `retention_days_runs` | 90 | Daily cron deletes ai_agent_runs older than this (Phase 3) |
| `retention_days_events` | 60 | Same for ai_events |
| `retention_days_memory` | 365 | Same for ai_memory |

Phase 2 ships the keys but NOT the cleanup cron. Storage cost is negligible at current volume — cleanup ships when volume justifies it (Phase 4).

## 7. Cost-cap evolution playbook

When an agent activates LLM use:

1. Raise `daily_cost_usd_cap` in `ai_agents.config` via a migration (auditable)
2. The QA Agent will start sending 80% / 100% Resend alerts as spend approaches the new ceiling
3. After 7 consecutive days within budget, lower the cap by 25% to enforce ongoing discipline
4. Repeat until the cap reflects steady-state spend with comfortable headroom

The discipline: **the cap exists to surface unexpected behaviour, not to enable maximum spend**.

## 8. Anti-patterns (don't)

- ❌ Bumping the cap silently because the agent flagged it. Investigate first.
- ❌ Setting caps in code instead of `ai_agents.config`. The config jsonb is the single source.
- ❌ Computing cost on the LLM step's return value with magic numbers. Use the pricing table.
- ❌ Treating Phase 2 caps as final. Each phase that wires LLM use bumps the caps in the same migration that adds the agent's tools.

## 9. Files

| File | Role |
|---|---|
| `apps/web/src/lib/ai-agents/core/budget.ts` | `preflight` + `account` + `getBudgetSnapshot` |
| `apps/web/src/lib/ai-agents/agents/qa-monitoring.ts` | Reads snapshots, escalates at 80%/100% |
| `apps/web/src/app/dev/ai-ops/page.tsx` | Live cost visibility per agent |
| `ai_agents.config` (jsonb) | Source of truth for caps + retention |
| `ai_agent_runs.cost_usd` (numeric) | Per-run cost ledger |
