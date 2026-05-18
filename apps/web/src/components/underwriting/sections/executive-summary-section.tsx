import { SectionShell } from "../primitives/section-shell";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 01 · Executive Summary.
 *
 * Always summary-only · no detail / no assumptions panel. This is the
 * "investment committee one-glance" view. Block 7 wires real engine
 * outputs (project IRR, equity IRR, exit metrics, DSCR avg, etc.).
 */
export function ExecutiveSummarySection({ bundle }: { bundle: UnderwritingBundle }) {
  const asset = bundle.inputs.asset;
  const c = bundle.computed;

  return (
    <SectionShell
      number={1}
      anchorId="executive-summary"
      title="Executive Summary"
      subtitle={`${asset.hotel_name ?? "Unnamed asset"} · ${asset.market} · ${asset.submarket} · ${asset.rooms} keys · ${asset.category.replace("star", "*")}`}
      status={{ label: "Scaffold", tone: "info" }}
      summary={
        <div className="space-y-4">
          {/* Hero KPIs · placeholder · Block 7 fills with engine outputs */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroKpi label="Project IRR" value="—" sub="targets 12-15%" />
            <HeroKpi label="Equity IRR" value="—" sub="targets 18-22%" />
            <HeroKpi label="MOIC" value="—" sub="× equity" />
            <HeroKpi label="LTV" value="—" sub="senior debt" />
            <HeroKpi label="Entry Cap Rate" value="—" sub="HotelVALORA Dynamic" />
            <HeroKpi label="Exit Cap Rate" value="—" sub="terminal yield" />
            <HeroKpi label="Avg DSCR" value="—" sub="trailing 12m" />
            <HeroKpi label="Hold" value={`Y${c.exit.exit_year}`} sub="exit year" />
          </div>

          {/* Reconciliation strip · institutional confidence signals */}
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
            <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
              Reconciliation
            </p>
            <ReconciliationBadge status="info" label="Engine pending" detail="Block 2 wires the calculation engine" />
          </div>
        </div>
      }
    />
  );
}

function HeroKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-[20px] font-extrabold tabular-nums text-white">
        {value}
      </p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{sub}</p>}
    </div>
  );
}

