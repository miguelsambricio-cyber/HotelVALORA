import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AgentId, MemoryScope, NewMemory } from "./types";

/**
 * Memory layer — read + write the agent's scoped notes. Phase 2 ranks
 * by `importance_score` then `created_at desc`. Phase 3 swaps in
 * pgvector similarity once the extension lands.
 */

export interface MemoryQuery {
  agentId: AgentId;
  scope?: MemoryScope;
  orgId?: string;
  userId?: string;
  sessionId?: string;
  /** keyword substring (case-insensitive) — Phase 2 only, replaced by embeddings in Phase 3 */
  match?: string;
  limit?: number;
}

export interface MemoryRow {
  id: string;
  scope: MemoryScope;
  content: string;
  importance_score: number | null;
  meta: Record<string, unknown> | null;
  created_at: string;
  expires_at: string | null;
}

export async function loadMemory(q: MemoryQuery): Promise<MemoryRow[]> {
  const admin = getSupabaseAdmin();
  let query = admin
    .from("ai_memory")
    .select(
      "id, scope, content, importance_score, meta, created_at, expires_at",
    )
    .eq("agent_id", q.agentId)
    .order("importance_score", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(q.limit ?? 25);

  if (q.scope) query = query.eq("scope", q.scope);
  if (q.orgId) query = query.eq("scope_org_id", q.orgId);
  if (q.userId) query = query.eq("scope_user_id", q.userId);
  if (q.sessionId) query = query.eq("scope_session_id", q.sessionId);
  if (q.match) query = query.ilike("content", `%${q.match}%`);

  const { data, error } = await query;
  if (error) throw new Error(`loadMemory: ${error.message}`);
  return (data ?? []) as MemoryRow[];
}

/**
 * Last-processed cursor — the "checkpoint" pattern: each agent stores
 * a single row in scope=agent_global with content "cursor:<key>" and
 * meta.value = timestamp. Used by event consumers + ingestion polling
 * to resume from the right place without scanning the full corpus.
 */
export async function getCursor(
  agentId: AgentId,
  key: string,
  fallbackIso: string,
): Promise<string> {
  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from("ai_memory")
    .select("meta")
    .eq("agent_id", agentId)
    .eq("scope", "agent_global")
    .eq("content", `cursor:${key}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const value =
    data && data.meta && typeof data.meta === "object"
      ? (data.meta as Record<string, unknown>).value
      : null;
  return typeof value === "string" ? value : fallbackIso;
}

export async function setCursor(
  agentId: AgentId,
  key: string,
  iso: string,
): Promise<void> {
  const admin = getSupabaseAdmin();
  // simple write-then-prune — we don't accumulate cursor history
  await admin
    .from("ai_memory")
    .delete()
    .eq("agent_id", agentId)
    .eq("scope", "agent_global")
    .eq("content", `cursor:${key}`);
  await admin.from("ai_memory").insert({
    agent_id: agentId,
    scope: "agent_global",
    content: `cursor:${key}`,
    importance_score: 0.99,
    meta: { value: iso } as never,
  });
}

export async function persistMemory(
  agentId: AgentId,
  memories: NewMemory[],
): Promise<void> {
  if (!memories.length) return;
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("ai_memory").insert(
    memories.map((m) => ({
      agent_id: agentId,
      scope: m.scope,
      content: m.content,
      scope_org_id: m.scope_org_id ?? null,
      scope_user_id: m.scope_user_id ?? null,
      scope_session_id: m.scope_session_id ?? null,
      importance_score: m.importance_score ?? null,
      meta: (m.meta ?? null) as never,
      expires_at: m.expires_at ?? null,
    })),
  );
  if (error) console.error(`[ai-agents] memory persist failed:`, error.message);
}
