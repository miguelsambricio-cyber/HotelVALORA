import { cn } from "@/lib/utils";
import type { SubscriptionKpis } from "@/lib/admin/subscriptions/live";

export function SubscriptionsKpis({ kpis }: { kpis: SubscriptionKpis }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Monetization Layer · Operational State
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">{kpis.total} subscription{kpis.total === 1 ? "" : "s"}</p>
      </header>
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        <Totem label="Active" value={kpis.active} severity="ok" />
        <Totem label="Trialing" value={kpis.trialing} />
        <Totem label="Past due" value={kpis.past_due} severity={kpis.past_due > 0 ? "warn" : "neutral"} />
        <Totem label="Canceled" value={kpis.canceled} />
        <Totem label="Expired" value={kpis.expired} severity={kpis.expired > 0 ? "warn" : "neutral"} />
        <Totem label="Comped (active)" value={kpis.comped_active} severity="ok" />
      </dl>
      <div className="mt-4 border-t border-slate-800/60 pt-3">
        <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">By tier</p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
          <Totem label="Free" value={kpis.by_tier.free} compact />
          <Totem label="Pro" value={kpis.by_tier.pro} compact />
          <Totem label="Premium" value={kpis.by_tier.premium} compact />
          <Totem label="Top Promote" value={kpis.by_tier.top_promote} compact />
          <Totem label="Comped" value={kpis.by_tier.comped} compact />
          <Totem label="Team" value={kpis.by_tier.team} compact />
          <Totem label="Enterprise" value={kpis.by_tier.enterprise} compact />
        </dl>
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          {kpis.attributed_to_campaign} attributed to a campaign · campaign provenance preserved
        </p>
      </div>
    </section>
  );
}

function Totem({ label, value, severity, compact }: {
  label: string; value: number;
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
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</dt>
      <dd className={cn("mt-1 font-headline font-extrabold", compact ? "text-lg" : "text-2xl", tone)}>{value}</dd>
    </div>
  );
}
