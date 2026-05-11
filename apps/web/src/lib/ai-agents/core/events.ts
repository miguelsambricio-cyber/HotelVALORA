import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { EventKind, NewEvent, RunContext } from "./types";

/**
 * Event bus — Phase 2 implementation is INSERT-only into ai_events. The
 * reactive fan-out (Supabase Realtime subscribers) is Phase 3 work.
 *
 * Subscribers in Phase 2 poll the table on cron via `selectSince()`,
 * passing the last-processed timestamp from the agent's own memory.
 * This avoids the multi-writer collision pattern that `consumed_by`
 * (uuid[]) would imply.
 */

export function emit(
  ctx: RunContext,
  kind: EventKind,
  payload: Record<string, unknown>,
  scope?: { org_id?: string; user_id?: string },
): void {
  ctx.events.push({
    kind,
    source: `agent:${ctx.agent_id}`,
    payload: { ...payload, run_id: ctx.run_id },
    scope_org_id: scope?.org_id,
    scope_user_id: scope?.user_id,
  });
}

export async function flush(events: NewEvent[]): Promise<void> {
  if (!events.length) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("ai_events").insert(
    events.map((e) => ({
      kind: e.kind,
      source: e.source,
      payload: e.payload as never,
      scope_org_id: e.scope_org_id ?? null,
      scope_user_id: e.scope_user_id ?? null,
    })),
  );
  if (error) {
    console.error(`[ai-agents] event flush failed:`, error.message);
  }
}

/**
 * Read events of the given kinds emitted on or after `sinceIso`.
 * Subscribers pass their last-processed timestamp from their own
 * ai_memory row so a cron firing skips already-handled events.
 */
export async function selectSince(
  kinds: EventKind[],
  sinceIso: string,
  limit = 200,
): Promise<
  Array<{
    id: string;
    kind: EventKind;
    payload: Record<string, unknown>;
    occurred_at: string;
  }>
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_events")
    .select("id, kind, payload, occurred_at")
    .in("kind", kinds)
    .gte("occurred_at", sinceIso)
    .order("occurred_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(`events.selectSince: ${error.message}`);
  return (data ?? []).map((row) => ({
    id: row.id as string,
    kind: row.kind as EventKind,
    payload: row.payload as Record<string, unknown>,
    occurred_at: row.occurred_at as string,
  }));
}
