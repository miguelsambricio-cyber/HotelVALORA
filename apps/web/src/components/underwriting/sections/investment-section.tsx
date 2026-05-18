import { SectionShell } from "../primitives/section-shell";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 06 · Investment · CAPEX · D&A · with Dynamic Cap Rate showcase.
 *
 * This section hosts the CORE IP of HotelVALORA:
 *   · Dynamic Cap Rate engine (Block 6)
 *   · Investment breakdown with unit toggles (€ total · €/key · €/sqm · €/int.sqm)
 *   · D&A split (Building 25y · MEP 7y)
 *   · CAPEX taxonomy hardcost / softcost / project
 *
 * Block 1: scaffold only. Block 4 wires investment breakdown.
 * Block 6 ships the Dynamic Cap Rate card.
 */
export function InvestmentSection({ bundle }: { bundle: UnderwritingBundle }) {
  const { cap_rate, investment } = bundle.computed;
  return (
    <SectionShell
      number={6}
      anchorId="investment"
      title="Investment · CAPEX · D&A"
      subtitle="Site acquisition · CAPEX taxonomy · D&A split · Dynamic Cap Rate (HotelVALORA IP)"
      status={{ label: "Scaffold · Block 6 ships Cap Rate engine", tone: "info" }}
      summary={
        <div className="space-y-3">
          {/* Dynamic Cap Rate placeholder card · Block 6 fills */}
          <div className="rounded-md border-2 border-lime-300/40 bg-lime-300/5 p-4">
            <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80">
              HotelVALORA Dynamic Cap Rate
            </p>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <CapRateBox label="Entry · Acquisition" used={cap_rate.entry.used_pct} source={cap_rate.entry.source} />
              <CapRateBox label="Exit · Terminal value" used={cap_rate.exit.used_pct} source={cap_rate.exit.source} />
            </div>
            <p className="mt-3 font-mono text-[10px] text-slate-500">
              Block 6 wires the engine: market evidence (comparable transactions) · adjustment logic (size · state · macro) · confidence engine · operator override layer. Each adjustment will be traceable with rationale.
            </p>
          </div>

          {/* Investment breakdown totals · Block 4 fills */}
          <div className="grid gap-2 sm:grid-cols-4">
            <SummaryBox label="Site acquisition" value={investment.site_acquisition_total} />
            <SummaryBox label="CAPEX" value={investment.capex_total} />
            <SummaryBox label="Contingency + Insurance" value={investment.contingency_insurance} />
            <SummaryBox label="Acquisition fees + taxes" value={investment.acquisition_fees_taxes} />
          </div>
          <div className="rounded-md border border-lime-300/30 bg-lime-300/5 p-3">
            <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-lime-300">
              Total Building Cost
            </p>
            <p className="mt-1 font-mono text-[18px] font-extrabold tabular-nums text-lime-200">
              {fmtCompactEUR(investment.total_building_cost)}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="CAPEX engine pending" detail="Block 4" />
            <ReconciliationBadge status="info" label="Cap Rate engine pending" detail="Block 6" />
          </div>
        </div>
      }
      detail={
        <div className="space-y-3">
          <p className="font-mono text-[11.5px] text-slate-400">
            Block 4 deliverable · investment breakdown table with toggle (€ total · €/key · €/sqm · €/intervention sqm), hardcost / softcost / project costs taxonomy, D&A schedule per fixed-asset class.
          </p>
        </div>
      }
    />
  );
}

function CapRateBox({
  label,
  used,
  source,
}: {
  label: string;
  used: number;
  source: "dynamic" | "override";
}) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-[20px] font-extrabold tabular-nums text-lime-200">
        {used.toFixed(2).replace(".", ",")}%
      </p>
      <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">
        {source === "dynamic" ? "Dynamic · HotelVALORA recommended" : "Manual override"}
      </p>
    </div>
  );
}

function SummaryBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-2.5">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-[14px] font-extrabold tabular-nums text-slate-100">
        {fmtCompactEUR(value)}
      </p>
    </div>
  );
}

function fmtCompactEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}
