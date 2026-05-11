# AI Memory Strategy

How agents remember.

**Last refreshed:** 2026-05-11

---

## 1. Two kinds of memory

| Kind | Where | Lifetime | Example |
|---|---|---|---|
| **Working memory** (run-scoped) | In-process during one `ai_agent_runs` | seconds–minutes | "I just summarised article 42; the next step needs that summary" |
| **Long-term memory** (persistent) | `ai_memory` table | hours–forever | "Blackstone's recent acquisitions in EU hospitality"; "user @miguel prefers PRO-tier metrics format" |

Working memory is plain function-scope variables inside the agent code. It does NOT touch the DB.

Long-term memory is what this doc covers.

## 2. Scope dimensions

`ai_memory.scope` enum has five values:

| Scope | When to use | Example |
|---|---|---|
| `agent_global` | Facts true for everyone using the agent | "Trophy assets in Madrid Centro typically transact at 4–5% cap" |
| `agent_org` | Tenant-specific facts | "OrgX's investment thesis prefers Spanish luxury, 100+ rooms" |
| `agent_user` | Per-user preferences + history | "User asks for the Spanish version of summaries"; "User flagged Mandarin Oriental as priority" |
| `agent_session` | Short-lived conversational state | "User is mid-flow asking about Hotel A; don't lose context yet" |
| `shared` | Cross-agent facts | Investor + operator dossier facts that Market Intelligence + CRM + Underwriting all read |

Every memory row has `scope` PLUS optionally `scope_org_id` / `scope_user_id` / `scope_session_id` to identify the entity within scope.

## 3. The `ai_memory` row shape

```
id              uuid
agent_id        ai_agent_id (which agent owns this memory)
scope           ai_memory_scope
scope_org_id    uuid?        (null unless scope in ('agent_org','shared'))
scope_user_id   uuid?        (null unless scope='agent_user')
scope_session_id text?       (null unless scope='agent_session')
content         text         (the memory text)
embedding_ready boolean      (toggled when Phase 3 pgvector populates)
importance_score numeric(3,2) (0..1 — humans + agents both write this)
meta            jsonb        (provenance, source_run_id, tags)
expires_at      timestamptz? (auto-prune date)
created_at      timestamptz
```

Phase 3 adds an `embedding` column of type `vector(1536)` once the `pgvector` extension is enabled. Separate migration.

## 4. Loading memory into context

When an agent starts a run:

```ts
async function loadContext(agentId, input): Promise<AgentContext> {
  const [global, org, user, session, shared] = await Promise.all([
    fetchTopByImportance(agentId, "agent_global", null, 10),
    input.org_id   ? fetchTopByImportance(agentId, "agent_org", input.org_id, 10)     : [],
    input.user_id  ? fetchTopByImportance(agentId, "agent_user", input.user_id, 10)   : [],
    input.session_id ? fetchAllForSession(input.session_id)                          : [],
    fetchTopByImportance(agentId, "shared", null, 5),
  ]);
  return { global, org, user, session, shared };
}
```

Total token budget per scope is declared per-agent in `ai_agents.config.memory_budget`. The runtime truncates the lowest-importance rows when over budget. Phase 3 swaps `fetchTopByImportance` for embedding-similarity ranking (`order by embedding <=> query_embedding`).

## 5. Writing memory

After a run completes, agents may persist new memories:

```ts
agent.run returns {
  ...
  memory: [
    {
      scope: "agent_user",
      scope_user_id: input.user_id,
      content: "User asked about luxury Madrid assets 3x this week",
      importance_score: 0.6,
      expires_at: addDays(now, 30),
    },
    {
      scope: "shared",
      content: "Blackstone closed Hotel Arts Barcelona, €450M, 4.6% cap rate",
      importance_score: 0.9,
      meta: { source_news_id: "..." },
    },
  ];
}
```

The runtime writes these AFTER the run's `status='success'` is set. Failed runs do NOT persist memory.

## 6. Importance scoring

Agents decide `importance_score` at write time. Heuristics by agent type:

- **Market Intelligence**: source reliability × recency × magnitude (deal size, # of entities mentioned). Range 0.3–0.95.
- **Underwriting**: explicit user signal ("save this comp") = 0.9. Auto-extracted insight = 0.5.
- **CRM**: explicit user pin = 1.0. Inferred dossier fact = 0.6. Backlog noise = 0.2 (auto-expires in 7 days).

Humans can hand-edit `importance_score` via future admin UI. The "I keep seeing this fact returned" feedback signal will boost the score.

## 7. Expiration + garbage collection

`ai_memory.expires_at` is honoured by a nightly cron (Phase 3):

```sql
delete from public.ai_memory where expires_at is not null and expires_at < now();
```

Plus a sliding-window prune for noisy memories:

```sql
delete from public.ai_memory
where scope = 'agent_session'
  and created_at < now() - interval '24 hours';
```

Session memory is always short-lived. Agent_user / agent_org / agent_global default to no expiry unless the agent sets one.

## 8. Phase 3 — embeddings via pgvector

Migration (Phase 3) enables the extension + adds the column:

```sql
create extension if not exists vector;
alter table public.ai_memory add column embedding vector(1536);
create index ai_memory_embedding_idx on public.ai_memory using ivfflat (embedding vector_cosine_ops);
```

The Market Intelligence Agent's first task post-Phase 3 is backfilling embeddings for all existing memory. The runtime then uses cosine similarity to rank context:

```sql
select id, content, importance_score
from ai_memory
where agent_id = $1 and scope = $2 and (scope_org_id = $3 or scope_org_id is null)
order by (embedding <=> $4::vector) ascending, importance_score desc
limit $5;
```

Cost: ~$0.02 per 1M tokens for OpenAI's `text-embedding-3-small`. Embedding all of Phase 2's corpus ≈ €1.

## 9. Shared memory across agents

The `scope='shared'` rows are visible to every agent (subject to permissions). Use cases:

| Fact | Producer | Consumers |
|---|---|---|
| "Blackstone bought Hotel Arts" | Market Intelligence | CRM (dossier), Underwriting (comp), Report Generation (memo) |
| "User_X is on premium tier" | CFO (via Stripe webhook) | Customer Success, CMO (campaign segmentation) |
| "Deploy dpl_XYZ rolled back" | QA / Monitoring | CMO (delay post), Customer Success (status page) |

A producer agent writing a shared memory row is signalling "this fact is now globally true". Consumers should re-rank context on next run. Phase 4 adds explicit `memory_invalidate` events to let agents push memory updates reactively.

## 10. Memory hygiene rules

1. **No PII in memory unless scoped to that user.** A `scope='shared'` row about a user is forbidden. Use `scope='agent_user'`.
2. **Never store the full LLM prompt + response.** That's audit data — already in `ai_agent_runs.steps`. Memory is the synthesised insight.
3. **Compact regularly.** When the same fact is restated 3+ times, agents should merge them into one row with higher `importance_score` and delete the originals. Phase 4 cron.
4. **Versioning.** When a fact is updated ("Hotel Arts SOLD" replaces "Hotel Arts on the market"), insert a new memory + set `expires_at=now()` on the old one. Audit trail in `meta.replaces_id`.
5. **Tier-respecting reads.** When a free-tier user is the context, agents must filter out premium-only memories. Enforced by joining `ai_memory.meta->>'tier_required'` with the user's actual tier.

## 11. What memory IS NOT

- **NOT** chat history (that's session state, ephemeral).
- **NOT** raw documents (those are in their canonical tables — `market_news`, `valuations`).
- **NOT** the full LLM context window (that's assembled per-run).
- **NOT** unverified claims (only insert facts the agent has high confidence in).
- **NOT** unbounded. Every agent has a row-count cap on `ai_memory` declared in `ai_agents.config.memory_max_rows`. Reaching the cap triggers an auto-compaction run.

## 12. Observability

The admin UI (future) will show:
- Memory rows per agent × scope × age
- Top-100 memories by importance per agent
- "Stale memory" report (rows past 90 days with importance < 0.4 — candidates for prune)
- Cost of embedding storage over time

For Phase 2-3, raw SQL queries are sufficient.
