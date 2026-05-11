# AI Agent Manual Approval Flow

How destructive or sensitive tool calls go through a human checkpoint before execution.

**Last refreshed:** 2026-05-11
**Status:** Architecture live since Phase 2 — dormant in practice (Tier 1 agents do not invoke gated tools yet).

---

## 1. Why this exists

Two non-negotiables collide:
- LLM-driven agents must be able to attempt destructive operations (refunds, deletions, outbound communications, parser executions) — otherwise they're useful for one-quarter of the work and a hindrance for the rest.
- We never trust agent autonomy on destructive surfaces — every such operation is a contract with the operator.

The bridge is a hard gate at the runtime layer that intercepts any tool call flagged as destructive or as requiring human approval, inserts a row in `ai_human_review`, pauses the run, and waits for an explicit operator decision before resuming.

## 2. What is gated

| Source of gating | Where it lives | Effect |
|---|---|---|
| `ai_tools.is_destructive = true` | Tool catalogue | Every call to this tool goes through the gate |
| `ai_tools.requires_human_approval = true` | Tool catalogue | Same, but for non-destructive sensitive surfaces (outbound emails, content publishing) |
| `ai_agents.config.approval_required_for: ["<tool_id>", ...]` | Per-agent config | Per-agent override — even a non-destructive tool can be gated for one specific agent |

Phase 2 inventory:

| Tool | Why gated |
|---|---|
| `supabase.execute_sql` | Arbitrary SQL — destructive |
| `stripe.refunds.create` | Moves money — destructive |
| `vercel.deployments.rollback` | Production impact — destructive |
| `resend.emails.send` | Outbound to a real human — sensitive |
| `whatsapp.messages.send` | Same — sensitive |
| `linkedin.posts.publish` | Public-facing content — sensitive |
| `x.tweets.publish` | Same — sensitive |
| `costar.exports.parse` | Per-agent gate on `data_ingestion` until Excel ingest hardens |

Internal escalation (`monitoring.escalate.email`) is NOT gated — it goes to a closed env-pinned recipient list, same posture as the existing `alerts.dispatch` tool.

## 3. The runtime gate

`apps/web/src/lib/ai-agents/core/approval.ts` exposes `gate(ctx, toolId, proposedInput, reason)`.

Caller pattern inside an agent:

```ts
const outcome = await approvalGate(
  ctx,
  "costar.exports.parse",
  { upload_id, bucket, storage_path, source_kind },
  "Operator requested execution of CoStar/Excel parser",
);
if (outcome.decision === "paused") return { output: { gate: outcome } };
if (outcome.decision === "denied") return { output: { gate: outcome } };
// Otherwise: outcome.decision === "allowed", execute the tool.
```

Returns:
- `{ decision: "allowed" }` — proceed with the tool call
- `{ decision: "paused", review_id }` — `ai_human_review` row inserted, run marked `awaiting_approval`, caller should short-circuit
- `{ decision: "denied", reason }` — tool unknown or hard-blocked

## 4. What happens on `paused`

1. Insert `ai_human_review` row:
   - `agent_id`, `run_id`, `reason`
   - `proposed_action`: `{ tool_id, input }` — full payload, so the reviewer can verify what will be executed
   - `status = 'pending'`
   - `expires_at = now() + 7 days` (default — Phase 3 lets the operator override)
2. Set `ai_agent_runs.status = 'awaiting_approval'` on the calling run.
3. Emit a `human_approval_needed` event so downstream watchers (the future admin UI, the CEO agent in Phase 3) react.
4. Log a `approval_gate` step with `status='awaiting_approval'` and the `review_id` in metadata.
5. Caller short-circuits — the agent's `run()` returns with the gate outcome in `output`.

## 5. What happens on approval / rejection

**Phase 2 — explicit re-trigger only.** The operator approves a review by:

```sql
update public.ai_human_review
set status = 'approved',
    reviewer_id = '<operator_uuid>',
    reviewer_notes = 'Looked at the file, OK to parse',
    reviewed_at = now()
where id = '<review_id>';
```

A future admin UI (Phase 3) wraps this in a click. To execute the gated tool, the operator re-triggers the agent invocation (manual POST to the agent's route handler). The runtime sees the review row is `approved`, skips the gate, and executes the tool.

Phase 3 wires Supabase Realtime to `ai_human_review` so an `approved` flip emits `human_approved` and the orchestrator resumes the paused run automatically.

## 6. Failure modes

| Failure | Behaviour |
|---|---|
| `ai_tools` row missing for the requested tool | `gate()` returns `denied`, step logged with `tool_unknown` |
| Reviewer never responds | `expires_at` passes → review's `status` becomes implicitly stale. QA Agent escalates after 24h (stuck_approvals) |
| Operator approves but doesn't re-trigger | Review sits as `approved` forever (no harm — the agent run already closed as `awaiting_approval`) |
| Review rejected | Operator updates `status='rejected'`. Re-triggering the agent re-enters the gate, finds the rejected row, treats it as `denied`. Phase 3 adds the auto-detection |

## 7. Auditability

Every gate decision is recorded twice:

- in `ai_agent_runs.steps`: a `approval_gate` step with status + tool_id + meta.review_id
- in `ai_human_review`: a row with the proposed_action payload + reviewer metadata

This is enough to reconstruct any past gate: who asked, what was asked, who approved (or didn't), when, what payload was actually executed.

## 8. Permission separation

The gate is downstream of the permission check. An agent must first have a `tool` permission to even reach the gate. The gate then decides whether the call goes through immediately or waits for human approval.

```
ai_agent_permissions  →  agent CAN attempt the tool call
ai_tools.is_destructive / requires_human_approval  →  call needs approval before executing
ai_agents.config.approval_required_for  →  agent-specific override even if the tool is non-destructive
ai_human_review                          →  the wait+resume mechanism
```

Each layer answers a different question. Together they give: "this agent is allowed to attempt this", "this attempt needs human OK", "here's the human OK".

## 9. Anti-patterns (don't)

- ❌ Bypass the gate with a direct service-role SQL call. The runtime is the only execution path that preserves the audit chain.
- ❌ Approve a review without reading the `proposed_action` jsonb. The point is to see what would happen.
- ❌ Auto-approve via cron. If the operation can be auto-approved, mark the tool non-destructive instead — a hidden auto-approve is worse than no gate at all.
- ❌ Use the gate to slow non-sensitive operations. Real escalation costs operator attention.

## 10. Files

| File | Role |
|---|---|
| `apps/web/src/lib/ai-agents/core/approval.ts` | `gate()` + `openHumanReview()` |
| `apps/web/src/lib/ai-agents/agents/data-ingestion.ts` | First production caller of `gate()` (gates `costar.exports.parse`) |
| `apps/web/src/app/dev/ai-ops/page.tsx` | Pending approval visibility (count + age) |
| `ai_human_review` table | Review queue |
| `ai_tools.is_destructive` / `requires_human_approval` | Per-tool gating flags |
| `ai_agents.config.approval_required_for` | Per-agent overrides |
