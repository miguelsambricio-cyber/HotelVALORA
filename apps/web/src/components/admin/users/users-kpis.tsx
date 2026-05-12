import { cn } from "@/lib/utils";
import type { UserKpis } from "@/lib/admin/users/live";

export function UsersKpis({ kpis }: { kpis: UserKpis }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Operational Growth Funnel
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          {kpis.total} {kpis.total === 1 ? "user" : "users"} on HOTELVALORA
        </p>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
        <Totem label="Active" value={kpis.active} severity={kpis.active > 0 ? "ok" : "neutral"} />
        <Totem label="Invited" value={kpis.invited} severity={kpis.invited > 0 ? "ok" : "neutral"} />
        <Totem label="Onboarding" value={kpis.onboarding} severity="ok" />
        <Totem label="Inactive" value={kpis.inactive} severity={kpis.inactive > 0 ? "warn" : "neutral"} />
        <Totem label="Churn risk" value={kpis.churn_risk} severity={kpis.churn_risk > 0 ? "error" : "neutral"} />
        <Totem label="Linked from contacts" value={kpis.linked_from_contacts} severity="ok" />
      </dl>

      <div className="mt-4 border-t border-slate-800/60 pt-3">
        <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          By plan
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-5">
          <Totem label="Free" value={kpis.free} compact />
          <Totem label="Pro" value={kpis.pro} compact />
          <Totem label="Premium" value={kpis.premium} compact />
          <Totem label="Team / Enterprise" value={kpis.team_enterprise} compact />
          <Totem label="Active subs" value={kpis.active_subscriptions} compact />
        </dl>
      </div>
    </section>
  );
}

function Totem({
  label,
  value,
  severity,
  compact,
}: {
  label: string;
  value: number;
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
        {value}
      </dd>
    </div>
  );
}
