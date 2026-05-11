"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getGroupVisual,
  groupForStatus,
  type AgentDescriptor,
} from "@/lib/admin/agents";

export interface AgentNodeProps {
  agent: AgentDescriptor;
  variant?: "center" | "orbit";
  /** When set, the node renders as a <button> and calls this on click instead of navigating */
  onSelect?: (agent: AgentDescriptor) => void;
  /** Highlight ring when this node is currently selected in the orbital UI */
  active?: boolean;
  className?: string;
}

/**
 * Single agent node inside the orbital layout. Center variant is the CEO;
 * orbit variant is a smaller round chip with status halo + short label.
 *
 * Two interaction modes:
 *   - default: <Link> to /user/admin/agents/<id> (full-page dashboard)
 *   - onSelect: <button> that triggers the right-side AgentDetailPanel
 *
 * Status surface uses the institutional 4-light readout (ACTIVE / IDLE /
 * WARNING / ERROR) — derived from the richer underlying AgentStatus.
 */
export function AgentNode({
  agent,
  variant = "orbit",
  onSelect,
  active,
  className,
}: AgentNodeProps) {
  const group = groupForStatus(agent.status);
  const groupV = getGroupVisual(group);
  const isCenter = variant === "center";

  const haloClass =
    group === "ACTIVE"
      ? isCenter
        ? "shadow-[0_0_36px_-2px_rgba(16,185,129,0.65)]"
        : "shadow-[0_0_22px_-4px_rgba(16,185,129,0.55)]"
      : group === "WARNING"
      ? "shadow-[0_0_20px_-6px_rgba(245,158,11,0.55)]"
      : group === "ERROR"
      ? "shadow-[0_0_24px_-2px_rgba(244,63,94,0.55)]"
      : "shadow-none";

  const inner = (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-full transition-transform",
        "ring-1",
        active ? "ring-2 ring-lime-300" : "ring-slate-700/70",
        "bg-slate-950/70",
        haloClass,
        isCenter ? "h-44 w-44 sm:h-52 sm:w-52" : "h-28 w-28 sm:h-[120px] sm:w-[120px]",
        "group-hover:scale-[1.04]",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-[3px] rounded-full border-[1.5px]",
          isCenter ? "border-lime-300/30" : "border-slate-700/60",
        )}
      />
      {isCenter && (
        <span
          aria-hidden
          className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-lime-300 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-forest-900"
        >
          Tier 0
        </span>
      )}
      <span
        aria-hidden
        className={cn(
          "leading-none",
          isCenter ? "text-3xl" : "text-xl",
          groupV.darkText,
          groupV.pulse && "animate-pulse",
        )}
      >
        {groupV.dot}
      </span>
      <span
        className={cn(
          "mt-1 px-2 text-center font-headline font-extrabold leading-tight text-white",
          isCenter ? "text-base" : "text-[10.5px]",
        )}
      >
        {agent.shortName}
      </span>
      <span
        className={cn(
          "px-2 text-center font-headline font-bold uppercase tracking-[0.22em]",
          isCenter ? "mt-1 text-[9px]" : "text-[8px]",
          groupV.darkText,
        )}
      >
        {group}
      </span>
      {!isCenter && (
        <span className="mt-0.5 font-mono text-[8.5px] uppercase tracking-widest text-slate-500">
          {agent.successRate}
        </span>
      )}
    </div>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(agent)}
        className={cn(
          "group block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300",
          className,
        )}
        aria-label={`Open ${agent.name} detail panel`}
      >
        {inner}
      </button>
    );
  }

  return (
    <Link
      href={`/user/admin/agents/${agent.id}`}
      className={cn("group block", className)}
      aria-label={`Open ${agent.name} dashboard`}
    >
      {inner}
    </Link>
  );
}
