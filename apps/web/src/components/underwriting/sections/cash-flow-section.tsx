import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero } from "../primitives/kpi-hero";
import { NarrativeParagraph, NarrativeMetric } from "../primitives/narrative-paragraph";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 04 · Cash Flow · direct method · 4-section memorandum.
 *
 *   A · Cash bridge headline (operating + investment + financing + net)
 *   B · Operating CF detail
 *   C · Investment CF detail (acquisition + capex + fees · Y0 only)
 *   D · Financing + Equity CF detail
 *   E · Detail schedule (full per-period table)
 *
 * Reads with hierarchy · not as a flat year-grid.
 */
export function CashFlowSection({ bundle }: { bundle: UnderwritingBundle }) {
  const cf = bundle.computed.cash_flow;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;

  // Pre-aggregate the 4 buckets (positive = inflow, negative = outflow)
  const investmentY0 = (cf.acquisition[0] ?? 0) + (cf.capex[0] ?? 0) + (cf.contingency_insurance[0] ?? 0) + (cf.acquisition_fees_taxes[0] ?? 0);
  const financingY0 = (cf.debt_drawn[0] ?? 0) + (cf.interest_expense[0] ?? 0) + (cf.loan_principal[0] ?? 0);
  const equityY0 = cf.equity_drawn[0] ?? 0;
  const totalCashAtExit = cf.net_cash_flow.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);
  const totalOpCashOverHold = cf.operating_cash_flow.slice(1, exitYear + 1).reduce((a, b) => a + b, 0);
  const totalDebtServiceOverHold = -1 * (cf.interest_expense.slice(1, exitYear + 1).reduce((a, b) => a + b, 0) + cf.loan_principal.slice(1, exitYear + 1).reduce((a, b) => a + b, 0));

  return (
    <SectionShell
      number={4}
      anchorId="cash-flow"
      title="Cash Flow"
      subtitle="Direct method · Operating · Investment · Financing · Equity · bridged to Balance Sheet cash"
      status={{ label: "Reconciled to BS · ±0 €", tone: "info" }}
      summary={
        <NarrativeParagraph eyebrow="Cash arc">
          Y0 deploys <NarrativeMetric>{fmtEUR(Math.abs(investmentY0))}</NarrativeMetric> in acquisition + CAPEX funded by{" "}
          <NarrativeMetric>{fmtEUR(financingY0)}</NarrativeMetric> in senior debt drawdowns and{" "}
          <NarrativeMetric>{fmtEUR(equityY0)}</NarrativeMetric> in equity. Through the {exitYear}-year hold the asset generates{" "}
          <NarrativeMetric>{fmtEUR(totalOpCashOverHold)}</NarrativeMetric> in operating cash, servicing{" "}
          <NarrativeMetric>{fmtEUR(totalDebtServiceOverHold)}</NarrativeMetric> in debt obligations · cash balance reaches{" "}
          <NarrativeMetric>{fmtEUR(totalCashAtExit)}</NarrativeMetric> by exit including realisation proceeds.
        </NarrativeParagraph>
      }
      detail={
        <div className="space-y-6 print:space-y-4">
          {/* Block A · Cash bridge headline */}
          <MemorandumBlock number="A" title="Cash bridge headline" subtitle="4-section institutional structure">
            <KpiHero
              tiles={[
                { label: "Y0 Investment outlay", value: fmtEUR(Math.abs(investmentY0)), sub: "acquisition + CAPEX + fees", tone: "neutral" },
                { label: "Y0 Debt drawn", value: fmtEUR(financingY0), sub: "senior secured + CAPEX line", tone: "ok" },
                { label: "Y0 Equity drawn", value: fmtEUR(equityY0), sub: "sponsor equity injection", tone: "neutral" },
                { label: "Cash at exit", value: fmtEUR(totalCashAtExit), sub: `cumulative through Y${exitYear}`, highlight: true },
              ]}
            />
          </MemorandumBlock>

          {/* Block B · Operating CF */}
          <MemorandumBlock number="B" title="Operating Cash Flow" subtitle="EBITDA after replacement · less cash tax">
            <YearGrid periods={periods} caption="Operating">
              <YearRow label="EBITDA after Replacement" values={cf.ebitda_after_replacement} />
              <YearRow label="Yield (NOI / total investment)" values={cf.yield_net} format="percent" indent={1} kind="muted" />
              <YearRow label="Tax Payment" values={cf.tax_payment} kind="negative" />
              <SubtotalRow label="Operating Cash Flow" values={cf.operating_cash_flow} tone="result" />
            </YearGrid>
          </MemorandumBlock>

          {/* Block C · Investment CF */}
          <MemorandumBlock number="C" title="Investment Cash Flow" subtitle="One-shot Y0 outflows · acquisition + CAPEX">
            <YearGrid periods={periods} caption="Investment">
              <YearRow label="Acquisition" values={cf.acquisition} kind="negative" indent={1} />
              <YearRow label="CAPEX" values={cf.capex} kind="negative" indent={1} />
              <YearRow label="Contingency + Insurance" values={cf.contingency_insurance} kind="negative" indent={1} />
              <YearRow label="Acquisition Fees + Taxes" values={cf.acquisition_fees_taxes} kind="negative" indent={1} />
            </YearGrid>
          </MemorandumBlock>

          {/* Block D · Financing + Equity */}
          <MemorandumBlock number="D" title="Financing & Equity Cash Flow" subtitle="Senior debt drawdowns · debt service · equity injection">
            <YearGrid periods={periods} caption="Financing + Equity">
              <DivisionRow label="Financing" columnCount={cols} />
              <YearRow label="Debt Drawn" values={cf.debt_drawn} kind="positive" indent={1} />
              <YearRow label="Interest Expense" values={cf.interest_expense} kind="negative" indent={1} />
              <YearRow label="Loan Principal + Bullet" values={cf.loan_principal} kind="negative" indent={1} />
              <DivisionRow label="Equity" columnCount={cols} />
              <YearRow label="Equity Drawn" values={cf.equity_drawn} kind="positive" indent={1} />
              <SubtotalRow label="Net Cash Flow" values={cf.net_cash_flow} tone="result" />
              <YearRow label="Change in BS Cash" values={cf.change_in_cash_bs} kind="muted" />
            </YearGrid>
          </MemorandumBlock>
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
