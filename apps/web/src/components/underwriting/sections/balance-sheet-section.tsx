import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 03 · Balance Sheet · PropCo without Exit Strategy.
 * Block 1 scaffold · Block 3 wires engine + reconciliation invariants.
 */
export function BalanceSheetSection({ bundle }: { bundle: UnderwritingBundle }) {
  const bs = bundle.computed.balance_sheet;
  return (
    <SectionShell
      number={3}
      anchorId="balance-sheet"
      title="Balance Sheet · PropCo without Exit Strategy"
      subtitle="Asset stack + capital structure · Year 0 to Year 10"
      status={{ label: "Scaffold", tone: "info" }}
      summary={
        <div className="space-y-2">
          <p className="font-mono text-[11.5px] text-slate-400">
            Auto-reconciles · warnings fire when Total Assets ≠ Equity + Debt. Cash linked to Cash Flow statement.
          </p>
          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="BS balance check" detail="Engine pending" />
            <ReconciliationBadge status="info" label="Cash ↔ CF link" detail="Engine pending" />
          </div>
        </div>
      }
      detail={
        <YearGrid caption="Balance Sheet · PropCo without Exit Strategy">
          <DivisionRow label="Assets" />
          <SubtotalRow label="Non Current Assets" values={bs.non_current_assets} tone="subtotal" />
          <YearRow label="Building" values={bs.building} indent={1} />
          <YearRow label="Installations (MEP)" values={bs.installations_mep} indent={1} />
          <YearRow label="DTA" values={bs.dta_asset} indent={1} />
          <YearRow label="Cash" values={bs.cash} />
          <SubtotalRow label="Total Assets" values={bs.total_assets} tone="result" />
          <DivisionRow label="Equity + Debt" />
          <SubtotalRow label="Equity" values={bs.equity} tone="subtotal" />
          <YearRow label="Initial Equity" values={bs.initial_equity} indent={1} kind="muted" />
          <YearRow label="Reserves" values={bs.reserves} indent={1} kind="muted" />
          <YearRow label="Net Income (period)" values={bs.net_income_period} indent={1} kind="muted" />
          <YearRow label="Debt" values={bs.debt} />
          <SubtotalRow label="Total Eq & Debt" values={bs.total_eq_debt} tone="result" />
        </YearGrid>
      }
    />
  );
}
