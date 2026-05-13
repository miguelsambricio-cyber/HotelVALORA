import { Layers, Network, ShieldCheck, Lock, Radar } from "lucide-react";

/**
 * Compact operational-context strip — five slate cells beneath the
 * hero KPIs. Static metadata reflecting governance + monitoring posture:
 *
 *   total platform layers · total integrations · operator controlled = 100%
 *   internal restricted access · monitoring 24/7
 *
 * Reinforces the "institutional control room" feel without competing
 * with the colorful hero numerals above.
 */
export function OperationalStrip({
  totalIntegrations,
  totalLayers = 9,
}: {
  totalIntegrations: number;
  totalLayers?: number;
}) {
  return (
    <ul className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800/60 bg-slate-900/40 p-2 sm:grid-cols-3 lg:grid-cols-5">
      <Cell
        icon={<Layers size={12} aria-hidden />}
        label="Platform layers"
        value={totalLayers}
      />
      <Cell
        icon={<Network size={12} aria-hidden />}
        label="Total integrations"
        value={totalIntegrations}
      />
      <Cell
        icon={<ShieldCheck size={12} aria-hidden />}
        label="Operator controlled"
        value="100%"
      />
      <Cell
        icon={<Lock size={12} aria-hidden />}
        label="Access"
        value="Internal · restricted"
      />
      <Cell
        icon={<Radar size={12} aria-hidden />}
        label="Monitoring"
        value="24 / 7"
      />
    </ul>
  );
}

function Cell({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <li className="flex items-center gap-2 rounded-xl bg-slate-900/60 px-3 py-2 ring-1 ring-inset ring-slate-800/60">
      <span className="text-slate-400">{icon}</span>
      <div className="min-w-0">
        <p className="truncate font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
          {label}
        </p>
        <p className="truncate font-mono text-[11px] font-bold text-lime-300">
          {value}
        </p>
      </div>
    </li>
  );
}
