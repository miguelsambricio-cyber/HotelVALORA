"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  getStatusVisual,
  type AgentDescriptor,
} from "@/lib/admin/agents";

export interface AgentNodeProps {
  agent: AgentDescriptor;
  variant?: "center" | "orbit";
  className?: string;
}

/**
 * Single agent node inside the orbital layout. Center variant is the CEO;
 * orbit variant is a smaller round chip with status halo + short label.
 *
 * Click navigates to the per-agent dashboard at /user/admin/agents/<id>.
 */
export function AgentNode({ agent, variant = "orbit", className }: AgentNodeProps) {
  const visual = getStatusVisual(agent.status);
  const isCenter = variant === "center";

  return (
    <Link
      href={`/user/admin/agents/${agent.id}`}
      className={cn("group block", className)}
      aria-label={`Open ${agent.name} dashboard`}
    >
      <div
        className={cn(
          "relative flex flex-col items-center justify-center rounded-full bg-white transition-transform group-hover:scale-[1.04]",
          "ring-1 ring-slate-200",
          visual.haloClass,
          isCenter
            ? "h-44 w-44 sm:h-52 sm:w-52"
            : "h-28 w-28 sm:h-32 sm:w-32",
        )}
      >
        <div
          aria-hidden
          className={cn(
            "absolute inset-1 rounded-full border-[1.5px]",
            isCenter ? "border-forest-900/15" : "border-slate-200/80",
          )}
        />
        {isCenter && (
          <span
            aria-hidden
            className="pointer-events-none absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-lime-300"
          >
            Tier 0
          </span>
        )}
        <span
          aria-hidden
          className={cn(
            "leading-none",
            isCenter ? "text-3xl" : "text-xl",
            visual.ringClass.replace("stroke-", "text-"),
          )}
        >
          {visual.dot}
        </span>
        <span
          className={cn(
            "mt-1 px-2 text-center font-headline font-extrabold leading-tight text-forest-900",
            isCenter ? "text-base" : "text-[11px]",
          )}
        >
          {agent.shortName}
        </span>
        <span
          className={cn(
            "px-2 text-center font-headline font-bold uppercase tracking-widest text-slate-500",
            isCenter ? "mt-1 text-[9px]" : "text-[8px]",
          )}
        >
          {visual.label}
        </span>
      </div>
    </Link>
  );
}
