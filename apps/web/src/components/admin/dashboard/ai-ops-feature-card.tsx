import Link from "next/link";
import { ArrowRight, CircuitBoard } from "lucide-react";
import { ALL_AGENTS, groupForStatus } from "@/lib/admin/agents";

/**
 * Large featured section linking to /user/admin/agents.
 *
 * Visual focus point on the Executive Control Room — institutional dark
 * canvas, prominent CTA, fleet-state summary, supervisory threads hint
 * (mini SVG arc indicating the orbital layout that lives behind the CTA).
 */
export function AiOpsFeatureCard() {
  const groups = ALL_AGENTS.reduce<Record<string, number>>((acc, a) => {
    const g = groupForStatus(a.status);
    acc[g] = (acc[g] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <section
      className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-forest-900 to-slate-950 p-6 sm:p-8"
      aria-labelledby="ai-ops-feature-heading"
    >
      {/* Bloomberg-style grid pattern */}
      <svg
        aria-hidden
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.06]"
      >
        <defs>
          <pattern id="ai-ops-grid" width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#D7F587" strokeWidth="0.2" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#ai-ops-grid)" />
      </svg>

      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-3">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-lime-300 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-forest-900">
              Live
            </span>
            <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80">
              AI Operations Center
            </span>
          </div>
          <h2
            id="ai-ops-feature-heading"
            className="font-headline text-2xl font-extrabold tracking-tighter text-white sm:text-3xl"
          >
            Orbital orchestration of the institutional AI fleet
          </h2>
          <p className="text-[13px] leading-relaxed text-slate-300">
            CEO Agent at the centre · 9 operational agents orbiting in the institutional layout.
            Click any node to open its operational detail panel (mission · cron schedule · linked
            systems · operational metrics · latest events · current blockers · future integrations).
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <Link
              href="/user/admin/agents"
              className="inline-flex items-center gap-1.5 rounded-lg bg-lime-300 px-4 py-2 font-headline text-[12px] font-extrabold uppercase tracking-widest text-forest-900 transition-transform hover:brightness-110 active:scale-95"
            >
              Open AI Operations Center <ArrowRight size={14} />
            </Link>
            <span className="font-mono text-[10px] uppercase tracking-widest text-lime-300/60">
              · {ALL_AGENTS.length} agents · {groups.ACTIVE ?? 0} active · {groups.WARNING ?? 0} manual · {groups.IDLE ?? 0} idle
            </span>
          </div>
        </div>

        {/* Mini orbital glyph — institutional hint of what lives behind the CTA */}
        <div className="relative flex h-40 w-40 shrink-0 items-center justify-center sm:h-48 sm:w-48">
          <svg
            aria-hidden
            viewBox="-100 -100 200 200"
            className="absolute inset-0 h-full w-full"
          >
            <circle
              cx="0"
              cy="0"
              r="80"
              fill="none"
              stroke="rgba(215,245,135,0.25)"
              strokeWidth="1"
              strokeDasharray="2 5"
            />
            {Array.from({ length: 9 }).map((_, i) => {
              const a = -Math.PI / 2 + (i / 9) * Math.PI * 2;
              const x = Math.cos(a) * 80;
              const y = Math.sin(a) * 80;
              return (
                <g key={i}>
                  <line
                    x1="0"
                    y1="0"
                    x2={x}
                    y2={y}
                    stroke="rgba(215,245,135,0.18)"
                    strokeWidth="0.6"
                  />
                  <circle
                    cx={x}
                    cy={y}
                    r="5"
                    fill={i < 3 ? "#34d399" : i < 5 ? "#fbbf24" : "#94a3b8"}
                  />
                </g>
              );
            })}
          </svg>
          <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-forest-900 ring-2 ring-lime-300/60">
            <CircuitBoard size={26} className="text-lime-300" strokeWidth={2.2} />
          </div>
        </div>
      </div>
    </section>
  );
}
