import { cn } from "@/lib/utils";
import type { ContactKpis } from "@/lib/admin/contacts/live";

/**
 * 14-totem KPI strip · institutional relationship console header.
 * Two rows · band/state on top · type breakdown on bottom.
 */
export function ContactsKpis({ kpis }: { kpis: ContactKpis }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Institutional Relationship Graph
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">{kpis.total} canonical contacts</p>
      </header>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4 lg:grid-cols-7">
        <Totem label="Active" value={kpis.active} severity="ok" />
        <Totem label="Strategic" value={kpis.strategic} severity={kpis.strategic > 0 ? "ok" : "neutral"} />
        <Totem label="Warm" value={kpis.warm} severity={kpis.warm > 0 ? "ok" : "neutral"} />
        <Totem label="Cold + signal" value={kpis.cold_with_signal} severity="neutral" />
        <Totem label="Dormant" value={kpis.dormant} severity={kpis.dormant > 0 ? "warn" : "neutral"} />
        <Totem
          label="Invalid / flagged"
          value={kpis.invalid_or_flagged}
          severity={kpis.invalid_or_flagged > 0 ? "warn" : "neutral"}
        />
        <Totem label="Recently active · 90d" value={kpis.recently_active_90d} severity="ok" />
      </dl>

      <div className="mt-4 border-t border-slate-800/60 pt-3">
        <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
          By relationship type
        </p>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4 lg:grid-cols-8">
          <Totem label="Principals" value={kpis.principals} compact />
          <Totem label="Brokers" value={kpis.brokers} compact />
          <Totem label="Lenders" value={kpis.lenders} compact />
          <Totem label="Operators" value={kpis.operators} compact />
          <Totem label="Developers" value={kpis.developers} compact />
          <Totem label="Hotel Supply" value={kpis.hotel_supply} compact />
          <Totem label="IA Supply" value={kpis.ia_supply} compact />
          <Totem label="Bidirectional" value={kpis.bidirectional_threads} compact />
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
    severity === "ok"
      ? "text-emerald-300"
      : severity === "warn"
        ? "text-amber-300"
        : severity === "error"
          ? "text-rose-300"
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
