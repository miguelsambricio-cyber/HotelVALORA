import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  AgentId,
  PermissionAction,
  ResourceType,
  RunContext,
} from "./types";
import { logStep } from "./audit";

/**
 * Default-deny permission gate. Every read, write, or tool execute goes
 * through `check()`. Misses log a `permission_denied` step on the run
 * and short-circuit the caller. There is no implicit grant — absence
 * denies.
 *
 * Cache: per-run only. We re-load on the next invocation so admins can
 * tighten or loosen grants without bouncing the runtime.
 */

interface PermissionRow {
  resource_type: string;
  resource_name: string;
  actions: PermissionAction[];
  scope: Record<string, unknown> | null;
}

const cache = new Map<AgentId, PermissionRow[]>();

export async function loadPermissions(
  agentId: AgentId,
): Promise<PermissionRow[]> {
  const hit = cache.get(agentId);
  if (hit) return hit;
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("ai_agent_permissions")
    .select("resource_type, resource_name, actions, scope")
    .eq("agent_id", agentId);
  if (error) throw new Error(`loadPermissions(${agentId}): ${error.message}`);
  const rows = (data ?? []) as PermissionRow[];
  cache.set(agentId, rows);
  return rows;
}

export function clearPermissionCache(agentId?: AgentId): void {
  if (agentId) cache.delete(agentId);
  else cache.clear();
}

export async function check(
  ctx: RunContext,
  resourceType: ResourceType,
  resourceName: string,
  action: PermissionAction,
): Promise<boolean> {
  const rows = await loadPermissions(ctx.agent_id);
  const allowed = rows.some(
    (r) =>
      r.resource_type === resourceType &&
      r.resource_name === resourceName &&
      r.actions.includes(action),
  );
  if (!allowed) {
    logStep(ctx, {
      step: "permission_check",
      status: "denied",
      reason: "permission_denied",
      meta: { resource_type: resourceType, resource_name: resourceName, action },
    });
  }
  return allowed;
}

/**
 * Hard variant — throws on miss. Use inside tool implementations where
 * the caller should abort the whole run, not just the step.
 */
export async function requirePermission(
  ctx: RunContext,
  resourceType: ResourceType,
  resourceName: string,
  action: PermissionAction,
): Promise<void> {
  const ok = await check(ctx, resourceType, resourceName, action);
  if (!ok) {
    throw new Error(
      `permission_denied: ${ctx.agent_id} cannot ${action} ${resourceType}:${resourceName}`,
    );
  }
}
