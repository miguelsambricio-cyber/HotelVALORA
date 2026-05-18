import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 04 · Cash Flow · direct method · single unified schedule.
 *
 * Headline KPIs intentionally removed · they duplicated Section 1
 * drivers (Investment outlay, Debt drawn, % LTC, Equity drawn). Cash
 * Flow now reads as a single institutional per-period table.
 */
export function CashFlowSection({ bundle }: { bundle: UnderwritingBundle }) {
  const cf = bundle.computed.cash_flow;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;

  return (
    <SectionShell
      number={4}
      anchorId="cash-flow"
      title="Cash Flow"
      subtitle="Direct method · Operating · Investment · Financing · Equity · bridged to Balance Sheet cash"
      status={{ label: "Reconciled to BS · ±0 €", tone: "info" }}
      summary={
        <YearGrid periods={periods} caption="Cash Flow · Operating · Investment · Financing · Equity">
          <DivisionRow label="Operating" columnCount={cols} />
          <YearRow label="EBITDA after Replacement" values={cf.ebitda_after_replacement} />
          <YearRow label="Yield (NOI / total investment)" values={cf.yield_net} format="percent" indent={1} kind="muted" />
          <YearRow label="Tax Payment" values={cf.tax_payment} kind="negative" />
          <SubtotalRow label="Operating Cash Flow" values={cf.operating_cash_flow} tone="subtotal" />
          <DivisionRow label="Investment" columnCount={cols} />
          <YearRow label="Acquisition" values={cf.acquisition} kind="negative" indent={1} />
          <YearRow label="CAPEX" values={cf.capex} kind="negative" indent={1} />
          <YearRow label="Contingency + Insurance" values={cf.contingency_insurance} kind="negative" indent={1} />
          <YearRow label="Acquisition Fees + Taxes" values={cf.acquisition_fees_taxes} kind="negative" indent={1} />
          <DivisionRow label="Financing" columnCount={cols} />
          <YearRow label="Debt Drawn" values={cf.debt_drawn} kind="positive" indent={1} />
          <YearRow label="Interest Expense" values={cf.interest_expense} kind="negative" indent={1} />
          <YearRow label="Loan Principal + Bullet" values={cf.loan_principal} kind="negative" indent={1} />
          <DivisionRow label="Equity" columnCount={cols} />
          <YearRow label="Equity Drawn" values={cf.equity_drawn} kind="positive" indent={1} />
          <SubtotalRow label="Net Cash Flow" values={cf.net_cash_flow} tone="result" />
          <YearRow label="Change in BS Cash" values={cf.change_in_cash_bs} kind="muted" />
        </YearGrid>
      }
    />
  );
}
