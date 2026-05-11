import type { Database } from "@/lib/supabase/types";

/**
 * Core types for the AI Operations Layer runtime.
 *
 * These mirror DB enums in apps/web/src/lib/supabase/types.ts but expose
 * narrower TS aliases so call sites read naturally. Keep this file
 * dependency-free apart from the generated Database type.
 */

export type AgentId = Database["public"]["Enums"]["ai_agent_id"];
export type AgentStatus = Database["public"]["Enums"]["ai_agent_status"];
export type RunStatus = Database["public"]["Enums"]["ai_agent_run_status"];
export type EventKind = Database["public"]["Enums"]["ai_event_kind"];
export type MemoryScope = Database["public"]["Enums"]["ai_memory_scope"];
export type PermissionAction =
  Database["public"]["Enums"]["ai_permission_action"];

export type TriggerKind =
  | "cron"
  | "manual"
  | "event"
  | "webhook"
  | "escalation"
  | "agent";

export type ResourceType = "table" | "tool" | "endpoint" | "external_api";

export interface TriggerMeta {
  kind: TriggerKind;
  triggered_by?: string | null;
  event_id?: string | null;
  agent_id?: AgentId | null;
}

export interface AgentConfig {
  tier?: number;
  phase_activated?: number;
  daily_cost_usd_cap?: number;
  monthly_cost_usd_cap?: number;
  retention_days_runs?: number;
  retention_days_events?: number;
  retention_days_memory?: number;
  escalation_channel?: "resend" | "slack" | "pagerduty" | "none";
  escalation_recipients_env?: string;
  approval_required_for?: string[];
  rate_limit_runs_per_hour?: number;
  alert_cooldown_minutes?: number;
  notes?: string;
}

export interface StepLog {
  step: string;
  status: "ok" | "denied" | "failed" | "skipped" | "awaiting_approval";
  reason?: string;
  tool_id?: string;
  duration_ms?: number;
  meta?: Record<string, unknown>;
  at?: string;
}

export interface RunContext {
  run_id: string;
  agent_id: AgentId;
  trigger: TriggerMeta;
  config: AgentConfig;
  steps: StepLog[];
  events: NewEvent[];
  memory: NewMemory[];
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  started_at: number;
}

export interface NewEvent {
  kind: EventKind;
  source: string;
  payload: Record<string, unknown>;
  scope_org_id?: string;
  scope_user_id?: string;
}

export interface NewMemory {
  scope: MemoryScope;
  content: string;
  scope_org_id?: string;
  scope_user_id?: string;
  scope_session_id?: string;
  importance_score?: number;
  meta?: Record<string, unknown>;
  expires_at?: string;
}

export interface AgentRunResult {
  status: RunStatus;
  output?: Record<string, unknown>;
  steps: StepLog[];
  events: NewEvent[];
  memory: NewMemory[];
  cost_usd: number;
  tokens_in: number;
  tokens_out: number;
  error_message?: string;
}

export interface AgentDefinition {
  id: AgentId;
  run: (
    input: Record<string, unknown>,
    ctx: RunContext,
  ) => Promise<Pick<AgentRunResult, "output">>;
}
