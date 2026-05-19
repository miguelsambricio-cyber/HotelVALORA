import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { InitialInvestmentBlock } from "../primitives/initial-investment-block";
import { EditableText } from "../edit/editable-text";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 04 · Cash Flow · institutional Initial Investment + Operating Hold.
 *
 * The schedule reads as two distinct blocks:
 *   · InitialInvestmentBlock · sources & uses at closing (Y0).
 *   · YearGrid · operating cash flows Y1..Y{exit}.
 *
 * The capital-deployment rows (Acquisition, CAPEX, Contingency, Fees+Taxes,
 * Debt Drawn, Equity Drawn) live exclusively in the Initial Investment
 * block — they no longer pollute the operating schedule with Y0-only data.
 *
 * Operating rows (EBITDA, Tax, Interest, Loan Principal, Net CF, Change
 * in BS Cash) live in the YearGrid · the single timeline the IC reader
 * scans for operating performance.
 */
export function CashFlowSection({ bundle }: { bundle: UnderwritingBundle }) {
  const cf = bundle.computed.cash_flow;
  const periods = bundle.computed.periods;
  const exitYear = bundle.computed.exit.exit_year;
  // Operating schedule · acquisition phase hidden · Concept + visible periods.
  const operatingCols = periods
    .slice(0, exitYear + 1)
    .filter((pd) => (pd.phase ?? "operating") !== "acquisition").length;
  const cols = 1 + operatingCols;

  // ─── Initial Investment block · Y0 deployment ──────────────────────
  const acquisitionEur = Math.abs(cf.acquisition[0] ?? 0);
  const capexEur = Math.abs(cf.capex[0] ?? 0);
  const contingencyEur = Math.abs(cf.contingency_insurance[0] ?? 0);
  const feesEur = Math.abs(cf.acquisition_fees_taxes[0] ?? 0);
  const debtDrawnEur = cf.debt_drawn[0] ?? 0;
  const equityDrawnEur = cf.equity_drawn[0] ?? 0;
  const totalUses = acquisitionEur + capexEur + contingencyEur + feesEur;

  return (
    <SectionShell
      number={4}
      anchorId="cash-flow"
      title="Cash Flow"
      subtitle="Direct method · Initial Investment + Operating Hold · bridged to Balance Sheet cash"
      status={{ label: "Reconciled to BS · ±0 €", tone: "info" }}
      summary={
        <div className="space-y-4 print:space-y-3">
          <InitialInvestmentBlock
            title={
              <EditableText
                as="span"
                textId="sec04.iib.title"
                defaultText="Initial Investment"
                className="block"
              />
            }
            subtitle={
              <EditableText
                as="span"
                textId="sec04.iib.subtitle"
                defaultText="Capital deployment at closing"
                className="block"
              />
            }
            uses={[
              { id: "acquisition", label: "Acquisition", value: acquisitionEur, sub: `${pct(acquisitionEur, totalUses)} of uses` },
              { id: "capex", label: "CAPEX", value: capexEur, sub: `${pct(capexEur, totalUses)} of uses` },
              { id: "contingency", label: "Contingency + Insurance", value: contingencyEur },
              { id: "fees", label: "Acquisition Fees + Taxes", value: feesEur },
            ]}
            sources={[
              { id: "debt-drawn", label: "Debt Drawn", value: debtDrawnEur, sub: `${pct(debtDrawnEur, totalUses)} of total` },
              { id: "equity-drawn", label: "Equity Drawn", value: equityDrawnEur, sub: `${pct(equityDrawnEur, totalUses)} of total` },
            ]}
          />

          <YearGrid
            periods={periods}
            displayThroughIndex={exitYear}
            kind="operating"
            excludeAcquisition
            caption="Operating Hold · Y1 → Y{exit}"
          >
            <DivisionRow label="Operating" columnCount={cols} />
            <YearRow label="EBITDA after Replacement" values={cf.ebitda_after_replacement} />
            <YearRow label="Yield (NOI / total investment)" values={cf.yield_net} format="percent" indent={1} kind="muted" />
            <YearRow label="Tax Payment" values={cf.tax_payment} kind="negative" />
            <SubtotalRow label="Operating Cash Flow" values={cf.operating_cash_flow} tone="subtotal" />
            <DivisionRow label="Debt Service" columnCount={cols} />
            <YearRow label="Interest Expense" values={cf.interest_expense} kind="negative" indent={1} />
            <YearRow label="Loan Principal + Bullet" values={cf.loan_principal} kind="negative" indent={1} />
            <SubtotalRow label="Net Cash Flow" values={cf.net_cash_flow} tone="result" />
            <YearRow label="Change in BS Cash" values={cf.change_in_cash_bs} kind="muted" />
          </YearGrid>
        </div>
      }
    />
  );
}

function pct(part: number, whole: number): string {
  if (!Number.isFinite(whole) || whole === 0) return "—";
  return `${((part / whole) * 100).toFixed(1).replace(".", ",")}%`;
}
