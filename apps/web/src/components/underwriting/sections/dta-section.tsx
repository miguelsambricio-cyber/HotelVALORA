import { SectionShell } from "../primitives/section-shell";
import { KpiTile } from "../primitives/kpi-hero";
import { EditableTile } from "../primitives/editable-tile";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";

/**
 * Section 05 · DTA · Spanish Ley IS · accounting-grade memorandum.
 *
 * Operator-editable Ley IS knobs:
 *   · Limit EBITDA %       · default 30% (Ley IS art. 16)
 *   · Compensation floor € · default 1,000,000 €
 */
export function DtaSection({
  bundle,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const d = bundle.computed.dta;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;
  const ebitdaLimitPct = bundle.inputs.tax.ebitda_limit_pct * 100;
  const finexpFloorEur = bundle.inputs.tax.finexp_floor_eur;

  let peakDta = 0;
  let peakDtaYear = 0;
  for (let t = 0; t < d.dta_end.length; t++) {
    if (d.dta_end[t] > peakDta) {
      peakDta = d.dta_end[t];
      peakDtaYear = t;
    }
  }
  const totalCashTax = d.tax_payment.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);
  const totalDtaDecreases = d.dta_decreases.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);

  return (
    <SectionShell
      number={5}
      anchorId="dta"
      title="DTA · PropCo without Exit Strategy"
      subtitle="Spanish Ley IS art. 16 · EBITDA 30% cap · 1M € floor · current / deferred / accounting tax separation"
      status={{ label: "Accounting-grade · roll-forward consistent", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <KpiTile label="Peak DTA balance" value={fmtEUR(peakDta)} sub={`Y${peakDtaYear} · tax €`} highlight />
            <KpiTile label="DTA released (hold)" value={fmtEUR(totalDtaDecreases)} sub="compensated against capacity" tone="ok" />
            <KpiTile label="Cash tax paid (hold)" value={fmtEUR(totalCashTax)} sub="CF outflow · 25% × fiscal EBT" />
            <KpiTile label="DTA at exit" value={fmtEUR(d.dta_end[exitYear] ?? 0)} sub="absorbed by gain on sale" />
            <EditableTile
              label="Limit EBITDA %"
              value={ebitdaLimitPct}
              format="percent"
              min={0}
              max={100}
              onCommit={(ebitda_limit_pct) => onOverrideChange({ ebitda_limit_pct })}
              sub="Ley IS art. 16 · 30% standard"
            />
            <EditableTile
              label="Limit compensation"
              value={finexpFloorEur}
              format="currency"
              min={0}
              onCommit={(finexp_floor_eur) => onOverrideChange({ finexp_floor_eur })}
              sub="finexp deduction floor · 1M € standard"
            />
          </div>
          <YearGrid periods={periods} caption="DTA · PropCo without Exit Strategy">
            <DivisionRow label="P&L feeds" columnCount={cols} />
            <YearRow label="EBIT" values={d.ebit} indent={1} />
            <YearRow label="EBITDA (Bº Operativo s/Ley IS)" values={d.ebitda} indent={1} />
            <DivisionRow label="Ley IS limits" columnCount={cols} />
            <YearRow label="Limit · 30% EBITDA" values={d.limit_ebitda_30pct} indent={1} kind="muted" />
            <YearRow label="Limit · finexp deduction cap" values={d.limit_finexp_floor} indent={1} kind="muted" />
            <YearRow label="Deductible Financial Expenses" values={d.financial_expenses_after_limits} indent={1} />
            <SubtotalRow label="Fiscal EBT (after limits)" values={d.ebt_after_limits} tone="subtotal" />
            <DivisionRow label="DTA roll-forward (tax €)" columnCount={cols} />
            <YearRow label="DTA Beginning" values={d.dta_beginning} kind="muted" />
            <YearRow label="Increases" values={d.dta_increases} kind="positive" />
            <YearRow label="Decreases (compensation)" values={d.dta_decreases} kind="negative" />
            <SubtotalRow label="DTA End" values={d.dta_end} tone="result" />
            <DivisionRow label="CIT calculation + Tax Payment" columnCount={cols} />
            <YearRow label="CIT (P&L · accounting)" values={d.cit_pl} kind="negative" />
            <YearRow label="DTA compensation applied" values={d.dta_compensation} kind="muted" />
            <SubtotalRow label="Cash Tax Payment" values={d.tax_payment} tone="warning" />
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
