"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  AGENT_REGISTRY,
  ORBIT_ORDER,
  getStatusVisual,
} from "@/lib/admin/agents";
import { AgentNode } from "./agent-node";

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
 * to the CEO — visualises the coordination relationship. Status colors
 * inherit from the same visual contract as the badges + health rings.
 *
 * Bloomberg-terminal aesthetic: dark navy chart frame · sharp coordinate
 * grid · tracked-out micro-labels. Static layout — no realtime yet.
 */
export function AgentOrbit({ className, orbitRadius = 240 }: AgentOrbitProps) {
  const ceo = AGENT_REGISTRY.ceo;

  const positions = useMemo(() => {
    const n = ORBIT_ORDER.length;
    return ORBIT_ORDER.map((id, i) => {
      // Start at top (-90deg) and walk clockwise.
      const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = Math.cos(angle) * orbitRadius;
      const y = Math.sin(angle) * orbitRadius;
      return { id, x, y, angle };
    });
  }, [orbitRadius]);

  // Container is square; we lay it out with absolute positioning at center.
  const size = orbitRadius * 2 + 200;

  return (
    <div
      className={cn(
        "relative w-full overflow-hidden rounded-2xl",
        "border border-slate-200 bg-gradient-to-br from-slate-950 via-forest-900 to-slate-950",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
      style={{ minHeight: size }}
    >
      {/* Bloomberg-style coordinate grid in the background */}
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

      {/* Tracked-out header label */}
      <div className="absolute left-6 top-5 flex items-center gap-3 text-lime-300/80">
        <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em]">
          HOTELVALORA · AI Operations Center
        </span>
        <span className="text-lime-300/40">/</span>
        <span className="font-mono text-[10px] uppercase tracking-widest">
          ceo-orbit · static-fixture · v0.1
        </span>
      </div>

      <div className="absolute right-6 top-5 hidden gap-4 text-[10px] font-mono uppercase tracking-widest text-lime-300/60 md:flex">
        <span>10 agents</span>
        <span>· 3 active</span>
        <span>· 2 manual</span>
        <span>· 4 standby</span>
      </div>

      {/* Orbital arena — relative-positioned, centered */}
      <div
        className="relative mx-auto"
        style={{ width: size, height: size, maxWidth: "100%" }}
      >
        {/* SVG layer: orbit guide circle + supervisory threads to CEO */}
        <svg
          aria-hidden
          className="absolute inset-0 h-full w-full"
          viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        >
          {/* Orbit guide ring */}
          <circle
            cx={0}
            cy={0}
            r={orbitRadius}
            fill="none"
            stroke="rgba(215, 245, 135, 0.18)"
            strokeWidth="1"
            strokeDasharray="2 6"
          />
          {/* Inner ring for visual depth */}
          <circle
            cx={0}
            cy={0}
            r={orbitRadius * 0.55}
            fill="none"
            stroke="rgba(215, 245, 135, 0.08)"
            strokeWidth="1"
          />
          {/* Supervisory threads — line from each orbit position back to CEO */}
          {positions.map(({ id, x, y }) => {
            const v = getStatusVisual(AGENT_REGISTRY[id].status);
            const stroke =
              v.ringClass.includes("emerald")
                ? "rgba(16,185,129,0.50)"
                : v.ringClass.includes("amber")
                ? "rgba(245,158,11,0.45)"
                : v.ringClass.includes("sky")
                ? "rgba(14,165,233,0.50)"
                : v.ringClass.includes("rose")
                ? "rgba(244,63,94,0.55)"
                : "rgba(148,163,184,0.30)";
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

        {/* CEO at the center */}
        <div
          className="absolute"
          style={{
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        >
          <AgentNode agent={ceo} variant="center" />
        </div>

        {/* Orbital nodes */}
        {positions.map(({ id, x, y }) => {
          const agent = AGENT_REGISTRY[id];
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
              <AgentNode agent={agent} variant="orbit" />
            </div>
          );
        })}
      </div>

      {/* Footer micro-legend */}
      <div className="border-t border-lime-300/10 bg-slate-950/40 px-6 py-2.5 text-[10px] font-mono uppercase tracking-widest text-lime-300/60">
        <span className="mr-4 text-emerald-400">● Healthy / Active / Monitoring</span>
        <span className="mr-4 text-sky-400">● Running</span>
        <span className="mr-4 text-amber-400">◐ Manual Mode</span>
        <span className="mr-4 text-slate-400">○ Standby</span>
        <span className="text-rose-400">▲ Error</span>
      </div>
    </div>
  );
}
