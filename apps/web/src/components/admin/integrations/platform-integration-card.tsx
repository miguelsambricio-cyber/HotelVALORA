import { ExternalLink, KeyRound, Database, Clock, Workflow, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlatformIntegrationDescriptor } from "@/lib/admin/integrations/platform-registry";

/**
 * Platform integration card — the simpler sibling of IntegrationCard.
 *
 * Used for Infrastructure, Communications, Relationship Intelligence,
 * and Commercial integrations. The Intelligence layer keeps its rich
 * IntegrationCard with full session telemetry; everything else uses
 * this descriptor-only card. Same visual contract (dark forest-900
 * gradient, lime accents, tracked-out micro-labels).
 */
export function PlatformIntegrationCard({
  integration,
}: {
  integration: PlatformIntegrationDescriptor;
}) {
  const statusTone = (() => {
    switch (integration.status) {
      case "live":
        return "bg-emerald-500/20 text-emerald-100 ring-emerald-500/40";
      case "partial":
        return "bg-amber-500/15 text-amber-100 ring-amber-500/40";
      case "testing":
        return "bg-sky-500/15 text-sky-100 ring-sky-500/40";
      case "configured_not_wired":
        return "bg-slate-700/40 text-slate-200 ring-lime-300/40";
      case "planned":
        return "bg-slate-700/40 text-slate-300 ring-slate-600/40";
    }
  })();
  const statusLabel = (() => {
    switch (integration.status) {
      case "configured_not_wired": return "configured · not wired";
      case "testing": return "testing";
      default: return integration.status;
    }
  })();
  const signalDot = (() => {
    switch (integration.signal) {
      case "ok": return "bg-emerald-400";
      case "warn": return "bg-amber-400";
      case "error": return "bg-rose-500";
      case "unknown": return "bg-slate-500";
      default: return "bg-slate-500";
    }
  })();

  return (
    <article className="flex h-full flex-col gap-4 rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
            <span aria-hidden className={cn("inline-block h-1.5 w-1.5 rounded-full", signalDot)} />
            {integration.provider}
          </p>
          <h3 className="mt-1 font-headline text-base font-extrabold tracking-tight text-white">
            {integration.name}
          </h3>
        </div>
        <span
          className={cn(
            "shrink-0 rounded px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.2em] ring-1",
            statusTone,
          )}
        >
          {statusLabel}
        </span>
      </header>

      <p className="text-[12.5px] leading-snug text-slate-300/90">{integration.purpose}</p>

      {integration.nextMilestone && (
        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5">
          <AlertTriangle size={11} className="mt-0.5 shrink-0 text-amber-200" />
          <p className="font-mono text-[10.5px] leading-relaxed text-amber-100/90">
            <span className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-amber-200">
              Next milestone ·{" "}
            </span>
            {integration.nextMilestone}
          </p>
        </div>
      )}

      <dl className="grid grid-cols-1 gap-2 border-t border-slate-800/60 pt-3 text-[11px]">
        <Row icon={<KeyRound size={11} />} label="Auth" value={integration.authMethod} />
        {integration.envVars.length > 0 && (
          <Row
            icon={<KeyRound size={11} />}
            label="Env"
            value={
              <span className="flex flex-wrap gap-1">
                {integration.envVars.map((v) => (
                  <code key={v} className="rounded bg-slate-800/60 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 ring-1 ring-slate-700/60">
                    {v}
                  </code>
                ))}
              </span>
            }
          />
        )}
        {integration.tables.length > 0 && (
          <Row
            icon={<Database size={11} />}
            label="Schema"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.tables.join(" · ")}
              </span>
            }
          />
        )}
        {integration.cronDependencies.length > 0 && (
          <Row
            icon={<Clock size={11} />}
            label="Cron"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.cronDependencies.join(" · ")}
              </span>
            }
          />
        )}
        {integration.consumedBy.length > 0 && (
          <Row
            icon={<Workflow size={11} />}
            label="Surfaces"
            value={
              <span className="font-mono text-[10.5px] text-slate-300">
                {integration.consumedBy.join(" · ")}
              </span>
            }
          />
        )}
      </dl>

      {integration.notes && integration.notes.length > 0 && (
        <ul className="space-y-1 border-t border-slate-800/60 pt-3">
          {integration.notes.map((note, idx) => (
            <li
              key={idx}
              className="flex items-start gap-1.5 text-[11px] leading-snug text-slate-400"
            >
              <span aria-hidden className="mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full bg-slate-500" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      <footer className="mt-auto flex flex-wrap items-center gap-3 border-t border-slate-800/60 pt-3 text-[10.5px]">
        {integration.operatorManaged && (
          <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.2em] text-amber-100 ring-1 ring-amber-500/40">
            Operator-managed
          </span>
        )}
        {(integration.externalLinks ?? []).map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-mono text-slate-400 hover:text-lime-300"
          >
            <ExternalLink size={10} />
            {link.label}
          </a>
        ))}
      </footer>
    </article>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1">
        <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {label}
        </dt>
        <dd className="mt-0.5 text-slate-300">{value}</dd>
      </div>
    </div>
  );
}
