import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 04 · Cash Flow · PropCo without Exit Strategy.
 * Block 1 scaffold. DSCR / debt waterfall visuals land in Block 5.
 */
export function CashFlowSection({ bundle }: { bundle: UnderwritingBundle }) {
  const cf = bundle.computed.cash_flow;
  return (
    <SectionShell
      number={4}
      anchorId="cash-flow"
      title="Cash Flow · PropCo without Exit Strategy"
      subtitle="Operating · Investment · Financing · Equity · reconciled with BS Cash line"
      status={{ label: "Scaffold", tone: "info" }}
      summary={
        <div className="space-y-2">
          <p className="font-mono text-[11.5px] text-slate-400">
            DSCR / RCSD visual lives in Section 07 (Financing). Block 5 ships the debt waterfall chart here.
          </p>
          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="Net CF ↔ ΔCash (BS)" detail="Engine pending" />
          </div>
        </div>
      }
      detail={
        <YearGrid caption="Cash Flow · PropCo without Exit Strategy">
          <YearRow label="EBITDA after Replacement" values={cf.ebitda_after_replacement} />
          <YearRow label="Yield Net" values={cf.yield_net} format="percent" indent={1} kind="muted" />
          <YearRow label="Tax Payment" values={cf.tax_payment} kind="negative" />
          <DivisionRow label="Investment" />
          <YearRow label="Acquisition" values={cf.acquisition} kind="negative" indent={1} />
          <YearRow label="CAPEX" values={cf.capex} kind="negative" indent={1} />
          <YearRow label="Contingency + Insurance" values={cf.contingency_insurance} kind="negative" indent={1} />
          <YearRow label="Acquisition Fees + Taxes" values={cf.acquisition_fees_taxes} kind="negative" indent={1} />
          <SubtotalRow label="Operating Cash Flow" values={cf.operating_cash_flow} tone="subtotal" />
          <DivisionRow label="Financing" />
          <YearRow label="Debt" values={cf.debt_drawn} indent={1} />
          <YearRow label="Interest Expense" values={cf.interest_expense} kind="negative" indent={1} />
          <YearRow label="Loan Principal" values={cf.loan_principal} kind="negative" indent={1} />
          <DivisionRow label="Equity" />
          <YearRow label="Equity" values={cf.equity_drawn} indent={1} />
          <SubtotalRow label="Net Cash Flow" values={cf.net_cash_flow} tone="result" />
          <YearRow label="Change in Cash (BS)" values={cf.change_in_cash_bs} kind="muted" />
        </YearGrid>
      }
    />
  );
}
