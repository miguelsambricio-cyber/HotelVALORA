"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getGroupVisual,
  getStatusVisual,
  groupForStatus,
  type AgentDescriptor,
} from "@/lib/admin/agents";

export interface AgentDetailPanelProps {
  agent: AgentDescriptor | null;
  open: boolean;
  onClose: () => void;
}

/**
 * Right-side slide-out operational panel for an agent.
 *
 * Bloomberg / Palantir aesthetic — dark canvas, dense info, tracked-out
 * micro-labels, sectioned content. Opens from the right with a backdrop
 * fade; Escape closes; body scroll locked while open.
 *
 * The orbital view at /user/admin/agents opens this panel inline (no
 * route change) for fast operator drill-in. The per-agent SSG page at
 * /user/admin/agents/[agentId] stays live for direct linking + sharing —
 * the "Open full dashboard" CTA at the panel footer navigates there.
 */
export function AgentDetailPanel({ agent, open, onClose }: AgentDetailPanelProps) {
  // Body scroll lock + Escape close
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const group = agent ? groupForStatus(agent.status) : null;
  const groupV = group ? getGroupVisual(group) : null;
  const statusV = agent ? getStatusVisual(agent.status) : null;

  return (
    <div
      aria-hidden={!open}
      className={cn("fixed inset-0 z-[60]", open ? "" : "pointer-events-none")}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={agent ? `${agent.name} operational detail` : "Agent detail"}
        className={cn(
          "absolute inset-y-0 right-0 flex w-full max-w-[640px] flex-col bg-slate-950 text-slate-100 shadow-[0_0_64px_-8px_rgba(0,0,0,0.6)]",
          "border-l border-slate-800 transition-transform duration-300 ease-out",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        {agent && groupV && statusV ? (
          <>
            {/* Header */}
            <header className="flex items-start gap-3 border-b border-slate-800 bg-slate-900/40 px-6 py-5">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-forest-900 px-1.5 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
                    Tier {agent.tier}
                  </span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.22em] ring-1",
                      groupV.bg,
                      groupV.ring,
                      groupV.text,
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn("text-[8px] leading-none", groupV.pulse && "animate-pulse")}
                    >
                      {groupV.dot}
                    </span>
                    {group}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
                    {statusV.label}
                  </span>
                </div>
                <h2 className="mt-2 font-headline text-xl font-extrabold tracking-tight text-white">
                  {agent.name}
                </h2>
                <p className="mt-1 font-mono text-[11px] text-slate-500">
                  {agent.workspace ?? "supervisory · cross-platform read"}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close detail panel"
                className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
              >
                <X size={16} />
              </button>
            </header>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* Mission */}
              <Section title="Mission">
                <p className="text-[13px] leading-relaxed text-slate-300">{agent.mission}</p>
              </Section>

              {/* Operational quad */}
              <Section title="Operational State">
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Stat label="Current mode" value={agent.currentMode} />
                  <Stat label="Success rate" value={agent.successRate} mono />
                  <Stat label="Last execution" value={formatTs(agent.lastExecution)} mono />
                  <Stat label="Next execution" value={formatTs(agent.nextExecution)} mono />
                  <Stat label="Cron schedule" value={agent.cronSchedule ?? "—"} mono />
                  <Stat label="Health score" value={`${agent.healthScore} / 100`} mono />
                </dl>
              </Section>

              {/* Responsibilities */}
              <Section title="Responsibilities">
                <ul className="space-y-1.5 text-[13px] text-slate-300">
                  {agent.responsibilities.map((r, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-lime-300" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Linked systems */}
              <Section title="Linked systems">
                <ul className="space-y-1 font-mono text-[12px] text-slate-300">
                  {agent.linkedSystems.map((s, i) => (
                    <li key={i}>
                      <span className="text-slate-500">›</span> {s}
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Operational metrics */}
              <Section title="Operational metrics">
                <ul className="grid grid-cols-2 gap-2">
                  {agent.kpis.map((kpi, i) => (
                    <li
                      key={i}
                      className="rounded-lg border border-slate-800 bg-slate-900/40 px-3 py-2"
                    >
                      <span className="block font-headline text-[9px] font-bold uppercase tracking-widest text-slate-500">
                        {kpi.label}
                      </span>
                      <span className="mt-1 block font-headline text-[15px] font-extrabold text-white">
                        {kpi.value}
                      </span>
                      {kpi.hint && (
                        <span className="mt-0.5 block text-[10.5px] leading-snug text-slate-500">
                          {kpi.hint}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Section>

              {/* Latest events */}
              <Section title="Latest events">
                <ol className="space-y-1.5 font-mono text-[11.5px]">
                  {agent.mockLogs.map((log, i) => (
                    <li key={i} className="flex gap-2.5">
                      <span className="shrink-0 text-slate-500">{formatTsShort(log.ts)}</span>
                      <span
                        className={cn(
                          "shrink-0 w-10 text-[10px] font-bold uppercase tracking-widest",
                          logLevelClass(log.level),
                        )}
                      >
                        {log.level}
                      </span>
                      <span className="text-slate-200">{log.message}</span>
                    </li>
                  ))}
                </ol>
              </Section>

              {/* Current blockers */}
              {agent.blockers.length > 0 ? (
                <Section title="Current blockers">
                  <ul className="space-y-1.5 text-[13px] text-amber-200">
                    {agent.blockers.map((b, i) => (
                      <li key={i} className="flex gap-2">
                        <span aria-hidden className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-amber-400" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : (
                <Section title="Current blockers">
                  <p className="text-[12.5px] text-slate-500">— none —</p>
                </Section>
              )}

              {/* Future integrations */}
              <Section title="Future integrations">
                <ul className="space-y-1.5 text-[13px] text-slate-300">
                  {agent.futureIntegrations.map((f, i) => (
                    <li key={i} className="flex gap-2">
                      <span aria-hidden className="mt-2 inline-block h-1 w-1 shrink-0 rounded-full bg-sky-400" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </Section>

              {/* References */}
              {agent.references.length > 0 && (
                <Section title="References">
                  <ul className="space-y-1">
                    {agent.references.map((r, i) => (
                      <li key={i}>
                        <a
                          href={r.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-[12px] text-lime-300 underline-offset-2 hover:underline"
                        >
                          {r.label}
                          <ExternalLink size={12} aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </Section>
              )}
            </div>

            {/* Footer CTA */}
            <footer className="border-t border-slate-800 bg-slate-900/40 px-6 py-3">
              <Link
                href={`/user/admin/agents/${agent.id}`}
                className="inline-flex items-center gap-1.5 font-headline text-[11px] font-extrabold uppercase tracking-widest text-lime-300 hover:text-lime-200"
              >
                Open full dashboard <ArrowRight size={12} />
              </Link>
            </footer>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[12px] text-slate-500">
            — no agent selected —
          </div>
        )}
      </aside>
    </div>
  );
}

// ── atoms ───────────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5">
      <h3 className="mb-2 font-headline text-[9.5px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 text-[12.5px] font-bold text-white",
          mono && "font-mono tracking-tight",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function logLevelClass(level: "ok" | "info" | "warn" | "error"): string {
  switch (level) {
    case "ok": return "text-emerald-400";
    case "info": return "text-sky-300";
    case "warn": return "text-amber-300";
    case "error": return "text-rose-400";
  }
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  } catch {
    return iso;
  }
}

function formatTsShort(iso: string): string {
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
  } catch {
    return iso.slice(11, 19);
  }
}
