"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  AGENT_REGISTRY,
  ORBIT_ORDER,
  groupForStatus,
  type AgentDescriptor,
  type AgentId,
} from "@/lib/admin/agents";
import { AgentNode } from "./agent-node";
import { AgentDetailPanel } from "./agent-detail-panel";

export interface AgentOrbitProps {
  className?: string;
  /** orbit ring radius in pixels relative to container center (default 240) */
  orbitRadius?: number;
}

/**
 * Radial / orbital architecture for the AI Operations Center.
 *
 *   Center: CEO Agent (Tier 0, supervisory).
 *   Orbit:  9 operational agents around the CEO, evenly spaced.
 *
 * Supervisory threads drawn as SVG lines from each orbital position back
 * to the CEO — visualises the coordination relationship. Click any node
 * to open the right-side AgentDetailPanel (mission · cron schedule ·
 * linked systems · operational metrics · latest events · blockers ·
 * future integrations). The per-agent full dashboard at
 * /user/admin/agents/<id> stays available for direct linking.
 *
 * Visual direction: Bloomberg / Palantir. Dark slate-950 canvas, lime-300
 * grid + supervisory threads, status-tinted glows on each operational node.
 */
export function AgentOrbit({ className, orbitRadius = 240 }: AgentOrbitProps) {
  const ceo = AGENT_REGISTRY.ceo;
  const [selected, setSelected] = useState<AgentDescriptor | null>(null);

  const positions = useMemo(() => {
    const n = ORBIT_ORDER.length;
    return ORBIT_ORDER.map((id, i) => {
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;
      return { id, x, y, angle };
    });
  }, [orbitRadius]);

  const size = orbitRadius * 2 + 220;

  const onSelect = (agent: AgentDescriptor) => setSelected(agent);
  const onClose = () => setSelected(null);

  // Fleet-state aggregates for the header readout
  const groupCounts = useMemo(() => {
    const counts: Record<string, number> = { ACTIVE: 0, IDLE: 0, WARNING: 0, ERROR: 0 };
    [ceo, ...ORBIT_ORDER.map((id) => AGENT_REGISTRY[id])].forEach((a) => {
      counts[groupForStatus(a.status)] = (counts[groupForStatus(a.status)] ?? 0) + 1;
    });
    return counts;
  }, [ceo]);

  return (
    <>
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-2xl",
          "border border-slate-800 bg-gradient-to-br from-slate-950 via-forest-900 to-slate-950",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
          className,
        )}
        style={{ minHeight: size }}
      >
        {/* Bloomberg-style coordinate grid */}
        <svg
          aria-hidden
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.08]"
        >
          <defs>
            <pattern id="orbit-grid" width="5" height="5" patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#D7F587" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#orbit-grid)" />
        </svg>

        {/* Tracked-out header */}
        <div className="absolute left-6 top-5 flex items-center gap-3 text-lime-300/80">
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em]">
            HOTELVALORA · AI Operations Center
          </span>
          <span className="text-lime-300/40">/</span>
          <span className="font-mono text-[10px] uppercase tracking-widest">
            ceo-orbit · v0.2
          </span>
        </div>

        <div className="absolute right-6 top-5 hidden gap-4 font-mono text-[10px] uppercase tracking-widest text-lime-300/60 md:flex">
          <span>{ORBIT_ORDER.length + 1} agents</span>
          <span className="text-emerald-400">· {groupCounts.ACTIVE ?? 0} active</span>
          <span className="text-amber-400">· {groupCounts.WARNING ?? 0} manual</span>
          <span className="text-slate-400">· {groupCounts.IDLE ?? 0} idle</span>
        </div>

        {/* Orbital arena */}
        <div
          className="relative mx-auto"
          style={{ width: size, height: size, maxWidth: "100%" }}
        >
          <svg
            aria-hidden
            className="absolute inset-0 h-full w-full"
            viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
          >
            <circle
              cx={0}
              cy={0}
              r={orbitRadius}
              fill="none"
              stroke="rgba(215, 245, 135, 0.18)"
              strokeWidth="1"
              strokeDasharray="2 6"
            />
            <circle
              cx={0}
              cy={0}
              r={orbitRadius * 0.55}
              fill="none"
              stroke="rgba(215, 245, 135, 0.08)"
              strokeWidth="1"
            />
            {positions.map(({ id, x, y }) => {
              const group = groupForStatus(AGENT_REGISTRY[id].status);
              const stroke =
                group === "ACTIVE" ? "rgba(16,185,129,0.50)" :
                group === "WARNING" ? "rgba(245,158,11,0.45)" :
                group === "ERROR" ? "rgba(244,63,94,0.55)" :
                "rgba(148,163,184,0.30)";
              return (
                <line
                  key={id}
                  x1={0}
                  y1={0}
                  x2={x}
                  y2={y}
                  stroke={stroke}
                  strokeWidth="1"
                  strokeLinecap="round"
                />
              );
            })}
          </svg>

          {/* CEO at center */}
          <div
            className="absolute"
            style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
          >
            <AgentNode
              agent={ceo}
              variant="center"
              onSelect={onSelect}
              active={selected?.id === "ceo"}
            />
          </div>

          {/* Orbital nodes */}
          {positions.map(({ id, x, y }) => {
            const agent = AGENT_REGISTRY[id as AgentId];
            return (
              <div
                key={id}
                className="absolute"
                style={{
                  top: `calc(50% + ${y}px)`,
                  left: `calc(50% + ${x}px)`,
                  transform: "translate(-50%, -50%)",
                }}
              >
                <AgentNode
                  agent={agent}
                  variant="orbit"
                  onSelect={onSelect}
                  active={selected?.id === id}
                />
              </div>
            );
          })}
        </div>

        {/* Footer legend */}
        <div className="border-t border-lime-300/10 bg-slate-950/40 px-6 py-2.5 font-mono text-[10px] uppercase tracking-widest text-lime-300/60">
          <span className="mr-4 text-emerald-400">● ACTIVE</span>
          <span className="mr-4 text-amber-400">◐ WARNING / Manual</span>
          <span className="mr-4 text-slate-400">○ IDLE / Standby</span>
          <span className="text-rose-400">▲ ERROR</span>
        </div>
      </div>

      <AgentDetailPanel agent={selected} open={selected !== null} onClose={onClose} />
    </>
  );
}
