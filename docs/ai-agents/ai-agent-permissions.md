# AI Agent Permissions

The trust surface. Without this, the AI Operations Layer is not deployable to production.

**Last refreshed:** 2026-05-11

---

## 1. The principle

**Agents have NO blanket access.** Every read, every write, every tool call is gated by an explicit row in `ai_agent_permissions`. The service-role key gives the runtime physical access to everything; the permissions table tells the runtime what it is allowed to do.

When the runtime is presented with "agent X wants to call tool Y on resource Z with action W", it asks:

```sql
select 1 from ai_agent_permissions
where agent_id = $X
  and resource_type = $type
  and resource_name = $Y or $Z
  and $W = any(actions)
limit 1;
```

If 0 rows: action denied. The step is logged with `status='failed'` and reason `permission_denied`. The run continues to the next step.

## 2. The row shape

```
agent_id        ai_agent_id
resource_type   'table' | 'tool' | 'endpoint' | 'external_api'
resource_name   'market_news' | 'resend.emails.send' | 'GET /api/...' | 'stripe.com'
actions         ai_permission_action[]   -- 'select','insert','update','delete','execute'
scope           jsonb                    -- { org_id?, where?, columns?, rate_limit? }
granted_by      uuid → users(id)
notes           text
```

The `scope` jsonb is where fine-grained guardrails live. Examples:

```json
{ "org_id": "00000000-0000-0000-0000-000000010001" }    // limit to this org
{ "where": "visibility = 'public'" }                     // SQL predicate
{ "columns": ["title","summary","url"] }                 // column allowlist for select
{ "rate_limit": { "per_minute": 30 } }                   // tool rate cap
```

The runtime layers these:
1. Looks up the row.
2. Applies the `where` predicate to outgoing SQL.
3. Truncates the response to allowed columns.
4. Throttles by `rate_limit`.

## 3. Default-deny

Every agent ships with **zero permissions**. Permissions are explicit grants. When you onboard a new agent, you also write its grants. We do not grant by default and revoke ad-hoc.

This is the inverse of typical RLS where you write policies that allow. Here you write rows that allow, and absence denies.

## 4. Phase 2 baseline grants (Market Intelligence Agent)

These are the grants the agent needs to do its job in Phase 2:

```sql
insert into public.ai_agent_permissions (agent_id, resource_type, resource_name, actions, notes) values
  -- Read the corpus
  ('market_intelligence', 'table', 'market_news',        '{select,insert,update}', 'Canonical news corpus'),
  ('market_intelligence', 'table', 'sources',            '{select}',                'Source registry'),
  ('market_intelligence', 'table', 'hotel_transactions', '{select,insert}',         'Structured transaction events'),
  ('market_intelligence', 'table', 'hotel_projects',     '{select,insert}',         'Structured project events'),
  ('market_intelligence', 'table', 'investors',          '{select,insert,update}',  'Investor registry'),
  ('market_intelligence', 'table', 'operators',          '{select,insert,update}',  'Operator registry'),
  ('market_intelligence', 'table', 'news_entities',      '{select,insert}',         'Link table'),
  ('market_intelligence', 'table', 'news_tags',          '{select,insert,delete}',  'Tag taxonomy'),
  ('market_intelligence', 'table', 'news_ingestion_runs','{select,insert,update}',  'Audit log'),
  ('market_intelligence', 'table', 'ai_memory',          '{select,insert,delete}',  'Own memory'),
  ('market_intelligence', 'table', 'ai_events',          '{insert}',                'Emit events for downstream agents'),
  -- Tool calls
  ('market_intelligence', 'tool', 'supabase.market_news.select',        '{execute}', ''),
  ('market_intelligence', 'tool', 'supabase.market_news.insert',        '{execute}', ''),
  ('market_intelligence', 'tool', 'supabase.hotel_transactions.insert', '{execute}', ''),
  ('market_intelligence', 'tool', 'supabase.hotel_projects.insert',     '{execute}', ''),
  ('market_intelligence', 'tool', 'intelligence.dossier.refresh',       '{execute}', ''),
  -- LLM call (Phase 3)
  ('market_intelligence', 'external_api', 'openai.com', '{execute}', '{"rate_limit":{"per_minute":60}}'::jsonb),
  -- RSS / scrape (Phase 2)
  ('market_intelligence', 'external_api', '*.hosteltur.com',     '{execute}', ''),
  ('market_intelligence', 'external_api', '*.hospitalitynet.org','{execute}', ''),
  -- ... more sources
;
```

Each grant carries `notes` so future operators understand the why. The grants are versioned as part of a Phase 2 migration; not in the foundation migration `0007` because they're agent-implementation-specific.

## 5. Destructive-action policy

Two flags on `ai_tools` drive the policy:

| Flag | Effect |
|---|---|
| `is_destructive=true` | Tool may not be invoked outside `ai_human_review` approval flow |
| `requires_human_approval=true` | Same, but applied at agent runtime even if not destructive (eg. outbound communications) |

When the runtime encounters either flag set, it:
1. Inserts an `ai_human_review` row with `proposed_action: { tool_id, input, agent_id, run_id }`.
2. Sets `ai_agent_runs.status='awaiting_approval'` on the calling run.
3. Returns control to the orchestrator (the run is paused).
4. When a human approves (via SQL update or future admin UI), the orchestrator emits `human_approved` event. The runtime resumes the run from the paused step.

**There is no override.** Even the `service_role` cannot bypass this in code — the runtime gate is the only execution path for destructive tools. An operator can, of course, manually run the SQL themselves outside the agent, but that's audited via `audit_logs`.

## 6. Examples — destructive vs safe

| Tool | Destructive? | Requires approval? | Rationale |
|---|---|---|---|
| `supabase.market_news.select` | no | no | Read-only |
| `supabase.market_news.insert` | no | no | Owned by Market Intelligence, append-only |
| `supabase.execute_sql` | YES | YES | Arbitrary SQL — never trusted |
| `resend.emails.send` | no | YES | Sends to a real human — needs review |
| `stripe.refunds.create` | YES | YES | Moves money |
| `vercel.deployments.rollback` | YES | YES | Production impact |
| `linkedin.posts.publish` | no | YES | Public-facing content — brand voice review |
| `intelligence.dossier.refresh` | no | no | Read + recompute, no external side effect |
| `alerts.dispatch` | no | no | Sends pre-templated emails to opted-in users only |

The list of tools + flags is in the seed of migration `0007`. Adjusting requires a new migration that updates `ai_tools` rows — auditable + reversible.

## 7. Permission inheritance — there is none

Agents calling other agents (agent-to-agent) cannot lend their permissions. Each invocation re-validates against the callee's permission set. This prevents the CMO Agent from sneaking a tool call through the QA / Monitoring Agent.

The one allowed pattern: an agent reads its own scoped memory + emits events. The downstream agent reads the events. The event payload is the contract; no shared permissions.

## 8. RLS interaction

`ai_agent_permissions` complements but does not replace Postgres RLS. The full pipeline:

1. Agent runtime checks `ai_agent_permissions` → allow / deny
2. If allow, runtime issues the SQL using service-role
3. Service-role bypasses RLS, BUT the runtime applied the `scope.where` predicate to the SQL — so the query is still scoped
4. Database executes within the scope
5. Result returned, optionally column-filtered per `scope.columns`

If RLS is enabled and `service_role` bypasses it: relying on RLS alone is insufficient (agents would have blanket DB access). Relying on `ai_agent_permissions` alone is insufficient (a developer can bypass the runtime). Both together are belt-and-braces.

## 9. Permission audit

Every permission check is logged inside `ai_agent_runs.steps`:

```json
{
  "step": "tool_call",
  "tool_id": "resend.emails.send",
  "status": "denied",
  "reason": "permission_denied",
  "checked_against": { "agent_id": "cmo", "resource_type": "tool", "resource_name": "resend.emails.send", "action": "execute" }
}
```

This gives full traceability: every denial appears in the run audit. No silent skips.

## 10. Operator workflows

### Granting a new permission

```sql
insert into public.ai_agent_permissions (agent_id, resource_type, resource_name, actions, granted_by, notes)
values ('cmo', 'tool', 'linkedin.posts.publish', '{execute}', '<operator_uuid>', 'Approved by exec on 2026-08-15');
```

### Revoking

```sql
delete from public.ai_agent_permissions
where agent_id = 'cmo' and resource_name = 'linkedin.posts.publish';
```

### Scoping to one org

```sql
update public.ai_agent_permissions
set scope = jsonb_set(coalesce(scope, '{}'::jsonb), '{org_id}', '"00000000-0000-0000-0000-000000010001"'::jsonb)
where agent_id = 'underwriting' and resource_name = 'valuations';
```

### Listing what an agent can do

```sql
select resource_type, resource_name, actions, scope
from public.ai_agent_permissions
where agent_id = 'market_intelligence'
order by resource_type, resource_name;
```

## 11. Migration-driven evolution

Permission changes ship as part of migrations. A Phase 2 migration that turns on Market Intelligence Agent looks like:

```
0007_ai_operations_layer_schema.sql          ← THIS ONE (Phase 1)
0008_market_intelligence_agent_permissions.sql ← Phase 2
0009_data_ingestion_agent_permissions.sql      ← Phase 2
0010_qa_monitoring_agent_permissions.sql       ← Phase 2
... etc
```

Each migration grants the minimum the agent needs. Reviewing a Phase 2 PR = reviewing the new permission rows. The blast radius of any agent is what's in its migration; no surprises.
