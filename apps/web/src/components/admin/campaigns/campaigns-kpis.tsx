import { cn } from "@/lib/utils";
import type { CampaignKpis } from "@/lib/admin/campaigns/live";

export function CampaignsKpis({ kpis }: { kpis: CampaignKpis }) {
  const convRate = kpis.invitations_sent > 0
    ? Math.round((kpis.invitations_converted / kpis.invitations_sent) * 1000) / 10
    : null;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Activation Layer · Operational Funnel
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          {kpis.total} active · {kpis.archived} archived
        </p>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
        <Totem label="Running" value={kpis.running} severity={kpis.running > 0 ? "ok" : "neutral"} />
        <Totem label="Draft" value={kpis.draft} />
        <Totem label="Paused" value={kpis.paused} severity={kpis.paused > 0 ? "warn" : "neutral"} />
        <Totem label="Completed" value={kpis.completed} />
        <Totem label="Archived" value={kpis.archived} />
      </dl>
      <div className="mt-4 border-t border-slate-800/60 pt-3">
        <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Invitation flow · all campaigns
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          <Totem label="Total invitations" value={kpis.invitations_total} compact />
          <Totem label="Sent / in-flight" value={kpis.invitations_sent} compact />
          <Totem label="Converted" value={kpis.invitations_converted} compact severity="ok" />
          <Totem
            label="Conversion rate"
            value={convRate ?? 0}
            valueSuffix={convRate === null ? "" : " %"}
            compact
            severity={convRate !== null && convRate >= 10 ? "ok" : "neutral"}
          />
        </dl>
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          {kpis.subscriptions_attributed} active subscription{kpis.subscriptions_attributed === 1 ? "" : "s"} attributed to a campaign
        </p>
      </div>
    </section>
  );
}

function Totem({
  label,
  value,
  valueSuffix,
  severity,
  compact,
}: {
  label: string;
  value: number;
  valueSuffix?: string;
  severity?: "ok" | "warn" | "error" | "neutral";
  compact?: boolean;
}) {
  const tone =
    severity === "ok" ? "text-emerald-300"
    : severity === "warn" ? "text-amber-300"
    : severity === "error" ? "text-rose-300"
    : "text-lime-300";
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={cn("mt-1 font-headline font-extrabold", compact ? "text-lg" : "text-2xl", tone)}>
        {value}{valueSuffix}
      </dd>
    </div>
  );
}
