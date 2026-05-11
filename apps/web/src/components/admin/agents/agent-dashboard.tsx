import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentDescriptor } from "@/lib/admin/agents";
import { getStatusVisual } from "@/lib/admin/agents";
import { AgentStatusBadge } from "./agent-status-badge";
import { AgentHealthRing } from "./agent-health-ring";
import { AgentMetricsPanel } from "./agent-metrics-panel";
import { AgentLogsPanel } from "./agent-logs-panel";

export interface AgentDashboardProps {
  agent: AgentDescriptor;
  className?: string;
}

/**
 * Per-agent operational dashboard. Composes:
 *   - Header — status badge · health ring · breadcrumb back to orbit
 *   - Hero — purpose + workspace + current mode + last/next execution
 *   - KPI grid (AgentMetricsPanel)
 *   - Two-column body: responsibilities + integrations · workflow + infra
 *   - Logs feed (AgentLogsPanel)
 *   - Roadmap timeline
 *   - References footer
 *
 * Visual contract is HOTELVALORA institutional: forest-900 typography,
 * slate-200 borders, white cards on the same `bg-[#f6f8f7]` as /settings.
 */
export function AgentDashboard({ agent, className }: AgentDashboardProps) {
  const visual = getStatusVisual(agent.status);
  return (
    <div className={cn("space-y-6", className)}>
      {/* Breadcrumb back to orbit */}
      <Link
        href="/user/admin/agents"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> AI Operations Center
      </Link>

      {/* Header card */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col items-start gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
                Tier {agent.tier}
              </span>
              <AgentStatusBadge status={agent.status} label={agent.statusLabel} />
            </div>
            <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-4xl">
              {agent.name}
            </h1>
            <p className="max-w-2xl text-[13.5px] leading-relaxed text-slate-600">
              {agent.purpose}
            </p>
            <p className="text-[11px] uppercase tracking-widest text-slate-500">
              {visual.modeHint}
            </p>
          </div>
          <AgentHealthRing score={agent.healthScore} status={agent.status} />
        </div>
        <dl className="grid grid-cols-1 divide-x-0 divide-y divide-slate-200 border-t border-slate-200 sm:grid-cols-4 sm:divide-x sm:divide-y-0">
          <DefItem label="Workspace" value={agent.workspace ?? "—"} mono />
          <DefItem label="Current Mode" value={agent.currentMode} />
          <DefItem label="Last Execution" value={formatTs(agent.lastExecution)} mono />
          <DefItem label="Next Execution" value={formatTs(agent.nextExecution)} mono />
        </dl>
      </section>

      {/* KPI grid */}
      <AgentMetricsPanel kpis={agent.kpis} />

      {/* Two-column body */}
      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard title="Responsibilities">
          <ul className="space-y-2 text-[13px] leading-relaxed text-slate-700">
            {agent.responsibilities.map((r, i) => (
              <li key={i} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-forest-900" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Integrations">
          <ul className="space-y-2 text-[13px] leading-relaxed text-slate-700">
            {agent.integrations.map((i, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                <span className="font-mono text-[12px]">{i}</span>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title="Workflow">
          <p className="text-[13px] leading-relaxed text-slate-700">{agent.workflow}</p>
        </SectionCard>

        <SectionCard title="Infrastructure Dependencies">
          <ul className="space-y-1.5 text-[13px] text-slate-700">
            {agent.infrastructureDeps.map((d, i) => (
              <li key={i} className="font-mono text-[12px]">
                <span className="text-slate-400">›</span> {d}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>

      {/* Logs feed — Bloomberg terminal */}
      <AgentLogsPanel entries={agent.mockLogs} />

      {/* Roadmap timeline */}
      <SectionCard title="Future Roadmap">
        <ol className="space-y-3">
          {agent.roadmap.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className={cn("mt-1 inline-block h-2 w-2 shrink-0 rounded-full", roadmapDotClass(item.status))} />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-headline text-[11px] font-extrabold uppercase tracking-widest text-forest-900">
                    {item.phase}
                  </span>
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-widest",
                      roadmapBadgeClass(item.status),
                    )}
                  >
                    {item.status === "shipped" ? "Shipped" : item.status === "in_progress" ? "In Flight" : "Planned"}
                  </span>
                </div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{item.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      {/* References */}
      {agent.references.length > 0 && (
        <SectionCard title="References">
          <ul className="space-y-1.5">
            {agent.references.map((r, i) => (
              <li key={i}>
                <a
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-[13px] text-forest-700 underline-offset-2 hover:underline"
                >
                  {r.label}
                  <ExternalLink size={12} aria-hidden />
                </a>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ── helpers ─────────────────────────────────────────────────────────────────

function DefItem({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="px-5 py-3.5">
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 truncate text-[13px] text-forest-900",
          mono ? "font-mono text-[12px]" : "font-headline font-extrabold",
        )}
      >
        {value || "—"}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
        {title}
      </h3>
      {children}
    </section>
  );
}

function roadmapDotClass(status: "shipped" | "in_progress" | "planned"): string {
  if (status === "shipped") return "bg-emerald-500";
  if (status === "in_progress") return "bg-sky-500";
  return "bg-slate-300";
}

function roadmapBadgeClass(status: "shipped" | "in_progress" | "planned"): string {
  if (status === "shipped") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200";
  if (status === "in_progress") return "bg-sky-50 text-sky-700 ring-1 ring-sky-200";
  return "bg-slate-100 text-slate-500 ring-1 ring-slate-200";
}

function formatTs(iso: string | null): string {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
  } catch {
    return iso;
  }
}
