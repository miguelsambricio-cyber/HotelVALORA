import { SectionShell } from "../primitives/section-shell";
import { KpiHero } from "../primitives/kpi-hero";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 04 · Cash Flow · direct method · 4-section memorandum.
 *
 *   A · Cash bridge headline (KPIs always visible)
 *   B · Operating CF detail
 *   C · Investment CF detail (Y0 only)
 *   D · Financing + Equity CF detail
 */
export function CashFlowSection({ bundle }: { bundle: UnderwritingBundle }) {
  const cf = bundle.computed.cash_flow;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;

  const investmentY0 = (cf.acquisition[0] ?? 0) + (cf.capex[0] ?? 0) + (cf.contingency_insurance[0] ?? 0) + (cf.acquisition_fees_taxes[0] ?? 0);
  const financingY0 = (cf.debt_drawn[0] ?? 0) + (cf.interest_expense[0] ?? 0) + (cf.loan_principal[0] ?? 0);
  const equityY0 = cf.equity_drawn[0] ?? 0;
  const totalCashAtExit = cf.net_cash_flow.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);
  // % LTC = debt drawn at Y0 / total investment outlay at Y0
  const ltcPct = Math.abs(investmentY0) > 0
    ? (cf.debt_drawn[0] ?? 0) / Math.abs(investmentY0) * 100
    : 0;

  return (
    <SectionShell
      number={4}
      anchorId="cash-flow"
      title="Cash Flow"
      subtitle="Direct method · Operating · Investment · Financing · Equity · bridged to Balance Sheet cash"
      status={{ label: "Reconciled to BS · ±0 €", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          <KpiHero
            tiles={[
              { label: "Y0 Investment outlay", value: fmtEUR(Math.abs(investmentY0)), sub: "acquisition + CAPEX + fees", tone: "neutral" },
              { label: "Y0 Debt drawn", value: fmtEUR(financingY0), sub: "senior secured + CAPEX line", tone: "ok" },
              { label: "% LTC", value: `${ltcPct.toFixed(1).replace(".", ",")}%`, sub: "debt drawn / investment outlay" },
              { label: "Y0 Equity drawn", value: fmtEUR(equityY0), sub: "sponsor equity injection", tone: "neutral" },
              { label: "Cash at exit", value: fmtEUR(totalCashAtExit), sub: `cumulative through Y${exitYear}`, highlight: true },
            ]}
          />
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
        </div>
      }
    />
  );
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}
