# AI Event System

The canonical bus that lets agents react to what the platform and other agents do.

**Last refreshed:** 2026-05-11

---

## 1. Two roles of events

Events serve two purposes:

| Role | Example | Consumer |
|---|---|---|
| **Trigger** | `news_ingested` → Market Intelligence Agent runs | Background agents |
| **Audit signal** | `human_approved` → trigger run resumes | Other agents + admin dashboards |

Same table (`ai_events`), same shape. The difference is who subscribes.

## 2. The row shape

```
id              uuid
kind            ai_event_kind enum   (see § 3)
source          text                 ('system' | 'user:<uuid>' | 'agent:<id>' | 'external:<service>')
payload         jsonb                (event-specific; see § 4)
scope_org_id    uuid?                (when the event is org-scoped)
scope_user_id   uuid?                (when the event is user-scoped)
consumed_by     uuid[]               (run_ids that have already processed this event)
occurred_at     timestamptz          (when the event happened — set by producer)
expires_at      timestamptz?         (after which consumers may ignore)
created_at      timestamptz
```

`consumed_by` is an idempotency aid — when an agent processes an event, it appends its run id. Subsequent listeners that already consumed it skip.

## 3. The taxonomy (`ai_event_kind` enum)

| Kind | Meaning | Producer | Likely consumer |
|---|---|---|---|
| `news_ingested` | A new `market_news` row was created (or updated with content change) | Intelligence cron | Market Intelligence Agent |
| `valuation_created` | A new `valuations` row | App server action | Underwriting Agent (optional auto-suggest) |
| `valuation_updated` | An existing valuation was modified | App | Report Generation Agent (cache invalidate) |
| `tour_requested` | A "Schedule a Tour" CTA fired | App | CRM / Dealflow Agent |
| `user_signed_up` | New `auth.users` row (via `handle_new_user` trigger) | Auth | Customer Success Agent |
| `payment_received` | Stripe webhook → `payment_events` row | External | CFO Agent + CRM Agent |
| `deploy_completed` | Vercel webhook on production deploy | External | QA / Monitoring Agent |
| `health_check_failed` | Monitoring probe failed | QA Agent | Itself (escalate to humans) |
| `system_alert` | Platform-level issue (low memory, etc.) | Various | QA Agent + operators |
| `human_approval_needed` | An agent paused awaiting `ai_human_review` | Any agent | Admin UI · CMO Agent (announce internally) |
| `human_approved` | A human approved a paused action | Admin | Originating agent |
| `human_rejected` | A human rejected | Admin | Originating agent |
| `cron_fired` | A cron tick fired | Vercel | Specific agent named in payload |
| `strategic_review_completed` | Daily strategic review finished | CEO / Orchestration Agent | Operator dashboard · email brief (Phase 5+) · CMO (for internal posts) |
| `agent_anomaly_detected` | An agent is failing / behaving unusually | CEO Agent | Operator dashboard · `ai_human_review` queue |
| `cost_cap_warning` | An agent at >80% of its daily cap | CEO Agent | Operator · agent itself (may throttle proactively) |
| `custom` | Catch-all for one-off integrations | Anyone | Per integration |

Adding a new kind requires a migration (alter enum). Custom is the escape hatch for short-lived prototypes. The three CEO Agent kinds (`strategic_review_completed`, `agent_anomaly_detected`, `cost_cap_warning`) shipped in migration `0008`.

## 4. Payload conventions

Every payload is jsonb, but typed conventions per kind:

```ts
// news_ingested
{ news_id: "<uuid>", source_id: "<uuid>", url_hash: "<sha256>" }

// valuation_created / updated
{ valuation_id: "<uuid>", owner_id: "<uuid>", visibility: "public|private|..." }

// tour_requested
{ valuation_id: "<uuid>", account_manager_email: "...", requester_email: "..." }

// payment_received
{ stripe_event_id: "evt_...", user_id: "<uuid>", amount_eur: number, tier_after: "..." }

// deploy_completed
{ deployment_id: "dpl_...", commit_sha: "...", state: "READY|ERROR", target: "production|preview" }

// health_check_failed
{ probe: "supabase|vercel|resend", error: "...", first_failed_at: "..." }

// human_approval_needed
{ review_id: "<uuid>", run_id: "<uuid>", agent_id: "...", reason: "..." }

// human_approved / human_rejected
{ review_id: "<uuid>", run_id: "<uuid>", reviewer_id: "<uuid>", notes: "..." }

// cron_fired
{ cron_path: "/api/cron/...", target_agent_id: "...", fired_at: "..." }

// strategic_review_completed (CEO Agent — daily)
{
  review_id: "<uuid>",
  trailing_24h: { runs: 142, success_rate: 0.97, cost_eur: 4.20, escalations: 3 },
  trailing_7d_summary: { ... },
  recommendations: [
    { action: "disable_agent", agent_id: "cmo", reason: "5d failure rate >50%" },
    { action: "raise_cost_cap", agent_id: "underwriting", from: 5.00, to: 8.00, reason: "consistently capped" }
  ],
  human_review_ids: ["<uuid>", "<uuid>"]
}

// agent_anomaly_detected (CEO Agent — hourly + reactive)
{
  agent_id: "data_ingestion",
  anomaly_kind: "failure_streak" | "latency_spike" | "permission_denial_spike" | "cost_anomaly",
  detail: "5 consecutive failed runs in last 2 hours",
  severity: "warning" | "critical",
  signals: [{ run_id, status, error_message }, ...]
}

// cost_cap_warning (CEO Agent — hourly)
{ agent_id: "underwriting", utilised_eur: 4.20, cap_eur: 5.00, percent: 84, time_remaining: "6h 12m" }
```

JSON schema for each kind is stored in `ai_tools.schema_in` for the corresponding `events.emit` tool (Phase 3). Validation rejects payloads that don't match.

## 5. Emit pattern

Phase 2 (simple INSERT):

```ts
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function emitEvent(kind: AiEventKind, payload: unknown, scope?: { orgId?: string; userId?: string }) {
  await getSupabaseAdmin()
    .from("ai_events")
    .insert({
      kind,
      source: "agent:market_intelligence", // or whatever
      payload: payload as Json,
      scope_org_id: scope?.orgId,
      scope_user_id: scope?.userId,
    });
}
```

That's it. The producer doesn't worry about who consumes. The downstream consumer polls or subscribes.

## 6. Consume patterns

### 6.1 · Polling (Phase 2)

A daily cron checks `ai_events` for unconsumed rows and dispatches:

```ts
const events = await supabase
  .from("ai_events")
  .select("*")
  .gt("occurred_at", lastRunTimestamp)
  .order("occurred_at", { ascending: true });

for (const e of events) {
  const agentId = ROUTING_TABLE[e.kind];
  if (!agentId) continue;
  if (e.consumed_by.includes(runIdForThisAgent)) continue;
  await invoke(agentId, e.payload, { kind: "event", event_id: e.id });
}
```

Simple, debuggable, works for daily-scale fan-out.

### 6.2 · Realtime (Phase 3+)

When agents need sub-second reaction (alerts, support routing), subscribe via Supabase Realtime:

```ts
const channel = supabase
  .channel("ai_events:tour_requested")
  .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_events", filter: "kind=eq.tour_requested" }, async (payload) => {
    await invoke("crm_dealflow", payload.new.payload, { kind: "event", event_id: payload.new.id });
  })
  .subscribe();
```

Needs a long-running runtime (Supabase Edge Function or a small persistent service). Defer to Phase 5+ when the volume justifies it.

### 6.3 · Webhook bridging

External systems (Stripe, Vercel, WhatsApp) post to `/api/webhooks/<source>/route.ts` which validates the signature, then emits an `ai_events` row. The standard fan-out path takes over.

## 7. Idempotency

Two layers of dedup:

| Layer | Mechanism |
|---|---|
| **Per-event-per-agent** | `consumed_by` array on `ai_events` — agent appends its run_id after success |
| **Per-payload** | Producers should make payloads idempotent. eg. `news_ingested` payload includes `url_hash` — Market Intelligence Agent uses it to short-circuit duplicate work |

The runtime adds the run_id to `consumed_by` ONLY on successful completion. Failed runs do not mark events as consumed → next polling cycle re-attempts.

## 8. Retention + cleanup

Events accumulate. Nightly cron (Phase 3):

```sql
-- prune events older than 90 days that have been consumed by their intended agent
delete from public.ai_events
where occurred_at < now() - interval '90 days'
  and array_length(consumed_by, 1) >= 1;

-- prune events past their expires_at regardless of consumption
delete from public.ai_events
where expires_at is not null and expires_at < now();
```

A keep-forever rule applies to events that signal big platform moments: `payment_received`, `valuation_created`, `human_approved/rejected`. Mark with `expires_at = null` and they survive prune. The dispatcher's daily query also needs an index — `occurred_at desc` already exists.

## 9. Tracing across events

A common need: "show me the full chain of work triggered by `news_ingested` event X".

```sql
with recursive chain as (
  select id, kind, source, payload, occurred_at, 0 as depth
  from ai_events where id = $1
  union all
  select e.id, e.kind, e.source, e.payload, e.occurred_at, c.depth + 1
  from ai_events e
  join ai_agent_runs r on r.triggering_event_id = c.id
  join ai_events e on e.id = any(
    select (jsonb_array_elements(r.output->'emitted_events') ->> 'event_id')::uuid
  )
)
select * from chain order by depth, occurred_at;
```

Phase 5 admin UI surfaces this as a tree visualisation.

## 10. Failure isolation

If an event triggers a failing agent run, the failure is contained:

- The run is marked `failed` with `error_message`
- The event's `consumed_by` is NOT updated (so another worker can retry)
- After 3 failed retries, the event is marked with `meta.poison_pill = true` and emits a `system_alert` event to alert humans

This pattern matches the news_ingestion_runs failure containment from the Intelligence Engine. Same operational philosophy.

## 11. Examples — full traces

### Example A: Daily news cycle

```
08:48 Madrid: ai_events.kind='cron_fired' (source='system', target_agent_id='intelligence_ingestion')
  → Intelligence cron runs (legacy, pre-agent — Phase 2 of Intelligence Engine)
  → Inserts 12 new market_news rows
  → Emits 12 ai_events.kind='news_ingested'

09:00 Madrid (next polling tick):
  → Market Intelligence Agent picks up the 12 events
  → For each: invoke('market_intelligence', { news_id })
  → Agent extracts entities, categorises, writes news_entities
  → Emits 'dossier_updated' for each affected investor/operator (Phase 4+)

10:00 Madrid:
  → (Phase 5) CRM Agent reacts to dossier_updated
  → Refreshes contact dossier
  → Drops follow-up reminders for any opted-in investor watchlist
```

### Example B: Tour request → CRM enrichment

```
User clicks "Schedule a Tour" in the Library
  → /library/* server action runs sendTourRequestAction
  → Resend sends the email
  → Server action emits ai_events.kind='tour_requested', source='user:<uuid>'

(Phase 5) CRM Agent reactive subscription:
  → invoke('crm_dealflow', { valuation_id, account_manager_email, requester_email })
  → Enriches the contact row in CRM
  → Inserts a follow-up reminder for the account manager
  → Updates the deal pipeline stage
```

### Example C: Health check failed → operator paged

```
QA / Monitoring Agent's cron probe finds Supabase advisor returning a new SECURITY DEFINER warning
  → Inserts ai_events.kind='health_check_failed' with payload {probe:'supabase_advisor', detail:...}
  → Same agent's reactive subscription catches the event
  → Calls `monitoring.escalate` tool (Slack webhook)
  → Inserts ai_events.kind='system_alert' for visibility
```

The agent producing the event AND consuming it is fine — explicit `triggering_event_id` keeps the audit honest.
