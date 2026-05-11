# AI Agent Architecture

Technical architecture for the HotelVALORA AI Operations Layer.

**Last refreshed:** 2026-05-11
**Status:** Phase 1 (foundation) — schema applied, no agent runtime yet.

---

## 1. The agent runtime model

An agent is a serverless function that follows a strict execution shape:

```
        invoke(input, trigger_meta)
              │
              ▼
   ┌──────────────────────┐
   │  1. open run         │  → INSERT into ai_agent_runs (status='running')
   ├──────────────────────┤
   │  2. load context     │  → query ai_memory (scoped) + read-permitted tables
   ├──────────────────────┤
   │  3. plan             │  → deterministic state machine OR single LLM plan call
   ├──────────────────────┤
   │  4. step loop:       │
   │     for each step:   │
   │      check permission│  → ai_agent_permissions
   │      check approval  │  → if destructive: insert ai_human_review, pause
   │      execute tool    │  → registered ai_tools id only
   │      validate result │  → schema_out from ai_tools
   │      append to steps │  → ai_agent_runs.steps jsonb
   │      emit events     │  → insert ai_events for downstream agents
   ├──────────────────────┤
   │  5. persist memory   │  → insert ai_memory rows with importance + expiry
   ├──────────────────────┤
   │  6. close run        │  → UPDATE ai_agent_runs (status='success', counters)
   └──────────────────────┘
```

The agent is the deterministic shell. The "plan" step may consult an LLM, but the LLM output is parsed against a JSON schema and rejected on mismatch. The LLM never controls orchestration.

## 2. Where agent code lives

For Phase 2 (Intelligence, Ingestion, Monitoring):

```
apps/web/src/lib/ai-agents/
├── core/
│   ├── runtime.ts           # invoke() · open/close run · step loop
│   ├── permissions.ts       # check ai_agent_permissions before tool call
│   ├── memory.ts            # load + persist ai_memory
│   ├── events.ts            # emit + listen to ai_events
│   ├── escalation.ts        # human review queue helpers
│   └── tools.ts             # registry resolver: id → handler
├── agents/
│   ├── market-intelligence.ts
│   ├── data-ingestion.ts
│   └── qa-monitoring.ts
└── tools/
    ├── supabase-tools.ts    # supabase.* tool handlers
    ├── resend-tools.ts      # resend.* tool handlers
    └── vercel-tools.ts      # vercel.* tool handlers
```

Each agent file exports a single function `run(input, runCtx)` that follows the runtime model. The runtime in `core/` wraps it with the audit shell.

For agents that need cron firing (Market Intelligence), the cron route handler at `apps/web/src/app/api/cron/<agent>/route.ts` calls `runtime.invoke('market_intelligence', cronInput)`.

For agents that react to events (CRM Agent listening to `tour_requested`), a Supabase Realtime subscription in a long-running edge function calls `runtime.invoke('crm_dealflow', eventInput)`. Phase 5+ work.

## 3. Components — responsibilities

### 3.1 · Runtime (`core/runtime.ts`)

Single entry point:

```ts
export async function invoke(
  agentId: AiAgentId,
  input: unknown,
  trigger: { kind: TriggerKind; triggered_by?: string; event_id?: string; agent_id?: AiAgentId }
): Promise<AgentRunResult> {
  const run = await openRun(agentId, trigger, input);
  try {
    const agent = AGENTS[agentId];
    if (!agent || !agent.enabled) throw new Error("Agent disabled");
    const context = await loadContext(agentId, input);
    const result = await agent.run(input, { run, context });
    await persistMemory(agentId, result.memory);
    await emitEvents(result.events);
    await closeRun(run.id, "success", result);
    return result;
  } catch (err) {
    await closeRun(run.id, "failed", { error: err });
    throw err;
  }
}
```

### 3.2 · Permission checker (`core/permissions.ts`)

```ts
export async function checkPermission(
  agentId: AiAgentId,
  resourceType: "table" | "tool" | "endpoint" | "external_api",
  resourceName: string,
  action: PermissionAction
): Promise<boolean>
```

Queries `ai_agent_permissions`. Cached per-run (no re-query within a single run). A miss returns false and the calling step short-circuits to `status='failed'` with reason `"permission_denied"`.

### 3.3 · Memory loader (`core/memory.ts`)

```ts
export async function loadContext(agentId: AiAgentId, input: unknown): Promise<AgentContext>
export async function persistMemory(agentId: AiAgentId, memories: NewMemory[]): Promise<void>
```

Returns:
- `globalMemory`: top-N rows by `importance_score` from `scope='agent_global'`
- `orgMemory`: rows from `scope='agent_org' AND scope_org_id = input.org_id`
- `userMemory`: rows from `scope='agent_user' AND scope_user_id = input.user_id`
- `sessionMemory`: rows from `scope='agent_session' AND scope_session_id = input.session_id`

Importance weighting + token-budget-aware truncation. Phase 3 adds embedding similarity once `pgvector` is enabled.

### 3.4 · Event bus (`core/events.ts`)

```ts
export async function emit(kind: AiEventKind, payload: unknown, scope?: EventScope): Promise<void>
export async function subscribe(kind: AiEventKind, handler: EventHandler): Subscription  // Phase 3+
```

Phase 2: `emit` just INSERTs into `ai_events`. Subscribers query the table on cron.
Phase 3+: `subscribe` uses Supabase Realtime to fan out to long-running edge functions.

### 3.5 · Escalation (`core/escalation.ts`)

```ts
export async function requestApproval(
  runId: string,
  reason: string,
  proposedAction: unknown,
  expiresIn?: Duration
): Promise<HumanReviewRow>

export async function pollApproval(reviewId: string): Promise<"approved" | "rejected" | "pending" | "expired">
```

Inserts into `ai_human_review`, updates `ai_agent_runs.status='awaiting_approval'`, returns the row. Caller short-circuits the step loop. A future admin UI polls these.

### 3.6 · Tool registry (`core/tools.ts`)

Maps `tool_id` → handler function. Validates `input` against `ai_tools.schema_in`, runs the handler, validates output against `schema_out`.

## 4. Where the LLM lives

LLMs are invoked **inside** agent step handlers, not at the runtime level. Each agent that uses an LLM imports an `llm-client.ts` wrapper around `@ai-sdk/openai` or `@ai-sdk/anthropic` via the Vercel AI SDK:

```ts
// apps/web/src/lib/ai-agents/llm-client.ts
import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

export async function llmExtract<T>(
  prompt: string,
  schema: z.ZodType<T>,
  meta: { agent_id: AiAgentId; run_id: string }
): Promise<{ data: T; tokens_in: number; tokens_out: number; cost_usd: number }> {
  // wraps generateObject with cost tracking + run_id tagging
}
```

Every LLM call returns structured output (`generateObject`) — never free-form text. The agent's deterministic shell consumes the schema-typed result.

## 5. Trigger surfaces

Phase 2 supports these triggers; Phase 3+ adds more.

| Trigger kind | Source | Use case | Phase |
|---|---|---|---|
| `cron` | Vercel Cron | Daily news ingestion · monitoring scans · CFO reconciliation | 2 |
| `manual` | Admin UI / curl | Re-run a failed agent · ad-hoc dossier refresh | 2 |
| `event` | `ai_events` row insert | News ingested → Market Intelligence reactive enrichment | 3 |
| `webhook` | External system | Stripe webhook → CFO Agent · Vercel deploy → QA Agent | 3 |
| `escalation` | Human approves an `ai_human_review` | Resume an `awaiting_approval` run | 2 (basic) · 3 (full) |
| `agent` | Another agent calls `invoke()` | Underwriting Agent calls Report Generation Agent | 4 |

## 6. Failure modes + recovery

| Failure | Symptom | Recovery |
|---|---|---|
| LLM provider timeout | step entry shows `tokens_in=0 tokens_out=0` + error message | Auto-retry once with exponential backoff. Persistent → emit `system_alert` event |
| Permission denied | step `status='failed'` with reason | Logged; run terminates with status='partial'. Operator grants permission + manually re-runs |
| Schema validation failure on LLM output | step `status='failed'` | Auto-retry with a "you returned invalid JSON; here's the error" reprompt. Second failure → escalate to human |
| Daily cost cap hit | `ai_agent_runs.status='queued'` accumulates | Caps reset at 00:00 Madrid. Queue drains in order |
| External API failure (Stripe / Resend) | tool call error | Logged. If `is_destructive=true` action: roll back via compensating call (e.g. delete the Resend draft) |
| Memory query timeout | step takes >10s | Phase 3 fallback: skip memory loading, run with input only. Phase 4: add memory query cache |

## 7. Cost model

| Component | Cost (Phase 2) | Cost at scale (Year 2) |
|---|---|---|
| Vercel Functions for agent runtime | €0 (Hobby tier) | €20–50/mo (Pro tier) |
| Supabase storage for runs + memory | €0 | €5–20/mo as memory grows |
| LLM API (OpenAI / Anthropic via AI Gateway) | ~€1/mo (Intelligence summaries only) | €50–500/mo across all active agents |
| Vector embeddings | €0 (deferred) | €10–30/mo (Phase 3+) |
| Realtime fan-out | €0 (Supabase Realtime included) | €0 within plan limits |
| External integrations | €0 (Resend free tier, etc.) | €100–1000/mo total |
| **Effective monthly** | **<€20** | **€200–1500** |

The cost-cap-per-agent (`ai_agents.config.daily_cost_usd_cap`) enforces an upper bound. No agent can quietly burn a budget.

## 8. Security posture

- Service-role only writes to `ai_agent_runs`, `ai_events`, `ai_memory`, `ai_human_review`, `ai_agent_permissions`. Public-read on `ai_agents` + `ai_tools` for transparency.
- The cron-firing surface validates `CRON_SECRET` (existing pattern from Resend / Intelligence Engine).
- Agent-to-agent calls go through `runtime.invoke()` — never direct imports — so the audit chain stays intact.
- LLM provider API keys never appear in client bundles (`import "server-only"` on every agent module).
- Destructive tool calls cannot bypass `ai_human_review` — the runtime enforces it.
- Operator override: `update ai_agents set enabled=false where id='...'` instantly halts an agent. RLS denies operator role from `anon` / `authenticated` — only `service_role` (admin SQL access) can flip this.

## 9. Integration with other systems

| System | Touchpoint |
|---|---|
| **Hospitality Intelligence Engine** | Market Intelligence Agent reads `market_news` etc., writes derived entities. Engine emits `news_ingested` event → agent reacts |
| **Library** | Read-only consumer of agent outputs (dossiers, news cross-links). No write path from frontend |
| **Maps** | Same — reads `hotel_transactions` aggregates produced by Market Intelligence Agent |
| **Underwriting UX** | Front-end calls a server action that invokes the Underwriting Agent with the user's form input |
| **CRM (future)** | The CRM Agent owns writes to `contacts`, `leads`, `notes`, `activity_log` via service role + permission checks |
| **Resend** | Tool `resend.emails.send` registered in `ai_tools` with `requires_human_approval=true` for any outbound that's not a templated transactional. CMO Agent uses this heavily |
| **Stripe** | `stripe.charges.list` (safe), `stripe.refunds.create` (destructive, requires approval). CFO Agent only |
| **Vercel / Supabase / WhatsApp / LinkedIn / X** | Each registered as a tool. Each agent that needs it must have an explicit `ai_agent_permissions` row |
