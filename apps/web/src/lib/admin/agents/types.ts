/**
 * Types for the HOTELVALORA AI Operations Center.
 *
 * Mock data layer today — schema mirrors what `public.ai_agent_runs` +
 * `public.ai_agents` + per-workspace `INGESTION_LOG` will surface when
 * Phase 3 wires the realtime read path.
 */

export type AgentId =
  | "ceo"
  | "market_intelligence"
  | "costar_market_data"
  | "compset_underwriting"
  | "data_ingestion"
  | "qa_monitoring"
  | "cfo"
  | "cmo"
  | "customer_success"
  | "crm_dealflow";

export type AgentStatus =
  | "healthy"
  | "active"
  | "monitoring"
  | "running"
  | "manual_mode"
  | "standby"
  | "error";

export type AgentTier = 0 | 1 | 2 | 3;

export interface AgentKpi {
  label: string;
  value: string;
  hint?: string;
}

export interface AgentRoadmapItem {
  phase: string;
  description: string;
  status: "shipped" | "in_progress" | "planned";
}

export interface AgentLogEntry {
  ts: string;
  level: "ok" | "info" | "warn" | "error";
  message: string;
}

export interface AgentDescriptor {
  /** Stable id — matches `public.ai_agents.id` enum value */
  id: AgentId;
  /** Display name */
  name: string;
  /** Short label for orbital node (≤ 18 chars) */
  shortName: string;
  /** Tier 0 = supervisor; 1/2/3 = operational */
  tier: AgentTier;
  /** Current operational status */
  status: AgentStatus;
  /** Human-friendly status label */
  statusLabel: string;
  /** Workspace the agent owns (when applicable) */
  workspace: string | null;
  /** Mission statement — one sentence */
  purpose: string;
  /** What the agent owns end-to-end */
  responsibilities: string[];
  /** External systems the agent reaches */
  integrations: string[];
  /** How the agent executes — short narrative */
  workflow: string;
  /** Operational mode: 'autonomous' / 'manual' / 'standby' / etc. */
  currentMode: string;
  /** ISO timestamp of last completed run; null when never run */
  lastExecution: string | null;
  /** ISO timestamp of next scheduled run; null when on-demand */
  nextExecution: string | null;
  /** 0–100 health score */
  healthScore: number;
  /** Operational KPIs — 4 cards on the dashboard */
  kpis: AgentKpi[];
  /** Mock log feed — Bloomberg-terminal style */
  mockLogs: AgentLogEntry[];
  /** Future roadmap items */
  roadmap: AgentRoadmapItem[];
  /** Infrastructure dependencies */
  infrastructureDeps: string[];
  /** Documentation references */
  references: { label: string; href: string }[];
}
