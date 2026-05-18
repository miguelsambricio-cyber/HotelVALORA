import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 02 · P&L · PropCo without Exit Strategy.
 * Block 2 wires the period axis · cells fill once the engine modules
 * (pnl + financing + dta) land in Block 3.
 */
export function PnlSection({ bundle }: { bundle: UnderwritingBundle }) {
  const p = bundle.computed.pnl;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  return (
    <SectionShell
      number={2}
      anchorId="pnl"
      title="P&L · PropCo without Exit Strategy"
      subtitle="Operating performance · USALI structure"
      status={{ label: "Scaffold", tone: "info" }}
      summary={
        <p className="font-mono text-[11.5px] text-slate-400">
          Block 3 ships the engine wiring for Hotel · F&B · Other · GOP · Costs · EBITDA after Replacement · D&A · EBIT · Financial Expenses · EBT · CIT · Net Income.
        </p>
      }
      detail={
        <YearGrid periods={periods} caption="P&L · PropCo without Exit Strategy">
          <DivisionRow label="Revenue" columnCount={cols} />
          <YearRow label="Hotel" values={p.hotel} indent={1} />
          <YearRow label="F&B" values={p.fb} indent={1} />
          <YearRow label="Other departments" values={p.other_departments} indent={1} />
          <SubtotalRow label="Gross Operating Profit" values={p.gross_operating_profit} tone="subtotal" />
          <DivisionRow label="Costs" columnCount={cols} />
          <YearRow label="Management Fee" values={p.mgmt_fee} indent={1} kind="negative" />
          <YearRow label="Property Taxes" values={p.property_taxes} indent={1} kind="negative" />
          <YearRow label="Property Insurance" values={p.property_insurance} indent={1} kind="negative" />
          <YearRow label="FF&E Reserve" values={p.ffe_reserve} indent={1} kind="negative" />
          <SubtotalRow label="EBITDA after Replacement" values={p.ebitda_after_replacement} tone="result" />
          <YearRow label="D&A" values={p.da} kind="negative" />
          <SubtotalRow label="EBIT" values={p.ebit} tone="subtotal" />
          <YearRow label="Financial Expenses" values={p.financial_expenses} kind="negative" />
          <SubtotalRow label="EBT" values={p.ebt} tone="subtotal" />
          <YearRow label="CIT" values={p.cit} kind="negative" />
          <SubtotalRow label="Net Income" values={p.net_income} tone="result" />
          <YearRow label="Total Net Income (cumulative)" values={p.total_net_income} kind="muted" />
        </YearGrid>
      }
    />
  );
}
