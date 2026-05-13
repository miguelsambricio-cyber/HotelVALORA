import { Layers, Network, ShieldCheck, Lock, Radar } from "lucide-react";

/**
 * Slim telemetry ribbon — five inline cells beneath the hero KPIs. Reads
 * as a single horizontal status bar at lg+ (label · mono value, separated
 * by hairline dividers) and stacks to a tight 2/3-col grid on smaller
 * viewports. Reinforces the "institutional control room" feel without
 * competing with the hero numerals above.
 */
export function OperationalStrip({
  totalIntegrations,
  totalLayers = 9,
}: {
  totalIntegrations: number;
  totalLayers?: number;
}) {
  return (
    <ul
      className={
        "grid grid-cols-2 gap-1.5 rounded-lg border border-slate-800/60 bg-slate-900/40 p-1 sm:grid-cols-3 " +
        "lg:flex lg:flex-row lg:items-stretch lg:divide-x lg:divide-slate-800/60 lg:gap-0 lg:p-0"
      }
    >
      <Cell
        icon={<Layers size={10} aria-hidden />}
        label="Platform layers"
        value={totalLayers}
      />
      <Cell
        icon={<Network size={10} aria-hidden />}
        label="Total integrations"
        value={totalIntegrations}
      />
      <Cell
        icon={<ShieldCheck size={10} aria-hidden />}
        label="Operator controlled"
        value="100%"
      />
      <Cell
        icon={<Lock size={10} aria-hidden />}
        label="Access"
        value="Internal · restricted"
      />
      <Cell
        icon={<Radar size={10} aria-hidden />}
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
    <li
      className={
        "flex items-center gap-1.5 rounded-md bg-slate-900/60 px-2 py-1 ring-1 ring-inset ring-slate-800/60 " +
        "lg:flex-1 lg:rounded-none lg:bg-transparent lg:px-3 lg:py-1.5 lg:ring-0"
      }
    >
      <span className="text-slate-500">{icon}</span>
      <div className="min-w-0 flex-1 lg:flex lg:items-baseline lg:gap-1.5">
        <p className="truncate font-headline text-[8px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </p>
        <p className="truncate font-mono text-[10px] font-bold text-lime-300">
          {value}
        </p>
      </div>
    </li>
  );
}
