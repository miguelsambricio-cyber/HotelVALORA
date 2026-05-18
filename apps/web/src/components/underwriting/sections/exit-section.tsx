import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 08 · Exit Strategy · Project & Equity IRR.
 *
 * Block 1 scaffold · Block 7 wires:
 *   · Exit price calculation from Dynamic Cap Rate (Block 6)
 *   · Debt repayment at exit
 *   · Project Cash Flow + Project IRR
 *   · Equity Cash Flow + Equity IRR
 *   · MOIC
 *
 * Block 9 adds promote waterfall · multiple exit scenarios · refinance vs sell.
 */
export function ExitSection({ bundle }: { bundle: UnderwritingBundle }) {
  const e = bundle.computed.exit;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitPriceSeries = periods.map((_, i) => (i === e.exit_year ? e.exit_price : 0));
  return (
    <SectionShell
      number={8}
      anchorId="exit"
      title="Exit Strategy · Project & Equity IRR"
      subtitle="Terminal value · debt repayment · equity returns waterfall"
      status={{ label: "Scaffold · Block 7 ships IRR engine", tone: "info" }}
      summary={
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <ExitKpi label="Exit Year" value={`Y${e.exit_year}`} />
            <ExitKpi label="Exit Cap Rate" value={`${e.exit_cap_rate_pct.toFixed(2).replace(".", ",")}%`} sub="HotelVALORA Dynamic" />
            <ExitKpi label="Exit Price" value={fmtEUR(e.exit_price)} sub={`${fmtEUR(e.exit_price_per_room)} / key`} />
            <ExitKpi label="Exit Fee" value={`${(e.exit_fee_pct * 100).toFixed(1).replace(".", ",")}%`} />
            <ExitKpi label="Debt Repayment" value={fmtEUR(e.debt_repayment_at_exit)} tone="warn" />
            <ExitKpi label="Equity Investment" value={fmtEUR(e.equity_investment)} />
            <ExitKpi label="Project IRR" value={`${e.project_irr_pct.toFixed(1).replace(".", ",")}%`} tone="ok" />
            <ExitKpi label="Equity IRR" value={`${e.equity_irr_pct.toFixed(1).replace(".", ",")}%`} tone="ok" />
          </div>
        </div>
      }
      detail={
        <YearGrid periods={periods} caption="Exit Strategy · Project + Equity Cash Flows">
          <DivisionRow label="Project Cash Flow" columnCount={cols} />
          <YearRow label="Operating Cash Flow" values={bundle.computed.cash_flow.operating_cash_flow} indent={1} />
          <YearRow label="Exit Price" values={exitPriceSeries} indent={1} kind="positive" />
          <SubtotalRow label="Project Cash Flow" values={e.project_cash_flow} tone="result" />
          <DivisionRow label="Equity Cash Flow" columnCount={cols} />
          <YearRow label="Debt Cash Flows" values={e.debt_cash_flow} indent={1} />
          <SubtotalRow label="Equity Cash Flow" values={e.equity_cash_flow} tone="result" />
        </YearGrid>
      }
    />
  );
}

function ExitKpi({
  label, value, sub, tone = "neutral",
}: {
  label: string; value: string; sub?: string; tone?: "neutral" | "ok" | "warn";
}) {
  const valueTone =
    tone === "ok" ? "text-emerald-200" : tone === "warn" ? "text-amber-200" : "text-slate-100";
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-[15px] font-extrabold tabular-nums ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{sub}</p>}
    </div>
  );
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}
