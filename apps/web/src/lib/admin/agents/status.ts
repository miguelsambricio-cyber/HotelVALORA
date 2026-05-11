import type { AgentStatus, AgentStatusGroup } from "./types";

/**
 * Visual contract for the 7 status tints used by the AI Operations Center.
 *
 * Bloomberg-terminal aesthetic — saturated, high-contrast, structured.
 * Each status carries:
 *   - a dot character for terminal-style readouts
 *   - a Tailwind class set (bg + text + ring) for badges
 *   - a ring/glow color for orbit nodes
 *   - a verbal label
 *
 * Phase 3 will replace mock status assignment with derived state from
 * ai_agent_runs + ai_events streaming.
 */

export interface AgentStatusVisual {
  dot: string;
  badgeClass: string;
  ringClass: string;
  haloClass: string;
  label: string;
  /** verbal mode summary — surfaced under the badge */
  modeHint: string;
}

const VISUALS: Record<AgentStatus, AgentStatusVisual> = {
  healthy: {
    dot: "●",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ringClass: "stroke-emerald-500",
    haloClass: "shadow-[0_0_24px_-4px_rgba(16,185,129,0.55)]",
    label: "Healthy",
    modeHint: "Autonomous · within SLA",
  },
  active: {
    dot: "●",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ringClass: "stroke-emerald-500",
    haloClass: "shadow-[0_0_32px_-4px_rgba(16,185,129,0.65)]",
    label: "Active",
    modeHint: "Supervisory · coordinating",
  },
  monitoring: {
    dot: "●",
    badgeClass: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    ringClass: "stroke-emerald-500",
    haloClass: "shadow-[0_0_24px_-4px_rgba(16,185,129,0.55)]",
    label: "Monitoring",
    modeHint: "Hourly probes",
  },
  running: {
    dot: "●",
    badgeClass: "bg-sky-50 text-sky-700 ring-1 ring-sky-200",
    ringClass: "stroke-sky-500",
    haloClass: "shadow-[0_0_24px_-4px_rgba(14,165,233,0.55)]",
    label: "Running",
    modeHint: "Executing now",
  },
  manual_mode: {
    dot: "◐",
    badgeClass: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
    ringClass: "stroke-amber-500",
    haloClass: "shadow-[0_0_20px_-6px_rgba(245,158,11,0.45)]",
    label: "Manual Mode",
    modeHint: "Operator-driven · awaiting activation",
  },
  standby: {
    dot: "○",
    badgeClass: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    ringClass: "stroke-slate-400",
    haloClass: "shadow-none",
    label: "Standby",
    modeHint: "Planned · not active",
  },
  error: {
    dot: "▲",
    badgeClass: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    ringClass: "stroke-rose-500",
    haloClass: "shadow-[0_0_28px_-2px_rgba(244,63,94,0.55)]",
    label: "Error",
    modeHint: "Requires attention",
  },
};

export function getStatusVisual(status: AgentStatus): AgentStatusVisual {
  return VISUALS[status];
}

export function isOperational(status: AgentStatus): boolean {
  return status === "healthy" || status === "active" || status === "monitoring" || status === "running";
}

/**
 * Coarse-grained ACTIVE / IDLE / WARNING / ERROR readout used by the
 * institutional orbital UI. Bloomberg + Palantir convention — four lights.
 *
 *   healthy / active / monitoring / running  → ACTIVE
 *   manual_mode                              → WARNING (the operator is the loop)
 *   standby                                  → IDLE    (planned, not running)
 *   error                                    → ERROR
 */
export function groupForStatus(status: AgentStatus): AgentStatusGroup {
  switch (status) {
    case "healthy":
    case "active":
    case "monitoring":
    case "running":
      return "ACTIVE";
    case "manual_mode":
      return "WARNING";
    case "standby":
      return "IDLE";
    case "error":
      return "ERROR";
  }
}

export interface StatusGroupVisual {
  /** Light-canvas text class — for pills on white / slate-50 backgrounds */
  text: string;
  /** Light-canvas background tint for pills */
  bg: string;
  /** Light-canvas ring tint for pills */
  ring: string;
  /** Dark-canvas text class — for dots + labels on slate-950 / forest-900 */
  darkText: string;
  /** Dot character */
  dot: string;
  /** Whether the dot should pulse (operational) */
  pulse: boolean;
}

const GROUP_VISUAL: Record<AgentStatusGroup, StatusGroupVisual> = {
  ACTIVE: {
    text: "text-emerald-700",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    darkText: "text-emerald-400",
    dot: "●",
    pulse: true,
  },
  IDLE: {
    text: "text-slate-500",
    bg: "bg-slate-100",
    ring: "ring-slate-200",
    darkText: "text-slate-400",
    dot: "○",
    pulse: false,
  },
  WARNING: {
    text: "text-amber-700",
    bg: "bg-amber-50",
    ring: "ring-amber-200",
    darkText: "text-amber-400",
    dot: "◐",
    pulse: false,
  },
  ERROR: {
    text: "text-rose-700",
    bg: "bg-rose-50",
    ring: "ring-rose-200",
    darkText: "text-rose-400",
    dot: "▲",
    pulse: true,
  },
};

export function getGroupVisual(group: AgentStatusGroup): StatusGroupVisual {
  return GROUP_VISUAL[group];
}
