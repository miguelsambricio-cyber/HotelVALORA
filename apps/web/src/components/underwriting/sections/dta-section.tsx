import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 05 · DTA · PropCo without Exit Strategy.
 *
 * Tax-shield + Deferred Tax Assets engine. Spanish Ley IS framework
 * (EBITDA 30% limit · 1M € deductibility floor for financial expenses).
 * Block 4 ships the engine wiring · this is core technical IP.
 */
export function DtaSection({ bundle }: { bundle: UnderwritingBundle }) {
  const d = bundle.computed.dta;
  return (
    <SectionShell
      number={5}
      anchorId="dta"
      title="DTA · PropCo without Exit Strategy"
      subtitle="Tax shield · Spanish Ley IS · EBITDA 30% limit · 1M € floor"
      status={{ label: "Scaffold · Block 4 ships engine", tone: "info" }}
      summary={
        <p className="font-mono text-[11.5px] text-slate-400">
          One of HotelVALORA's technical differentiators · models the EBITDA limitation logic, financial-expense deductibility floor, and DTA inc/dec mechanics over the hold period.
        </p>
      }
      detail={
        <YearGrid caption="DTA · PropCo without Exit Strategy">
          <DivisionRow label="P&L feeds" />
          <YearRow label="EBIT" values={d.ebit} indent={1} />
          <YearRow label="EBITDA (Bº Operativo s/Ley IS)" values={d.ebitda} indent={1} />
          <DivisionRow label="Limitations" />
          <YearRow label="Límite EBITDA · 30%" values={d.limit_ebitda_30pct} indent={1} kind="muted" />
          <YearRow label="Límite Financial Expenses · floor" values={d.limit_finexp_floor} indent={1} kind="muted" />
          <YearRow label="Financial Expenses after limits" values={d.financial_expenses_after_limits} indent={1} />
          <SubtotalRow label="EBT after limits" values={d.ebt_after_limits} tone="subtotal" />
          <DivisionRow label="DTA roll-forward" />
          <YearRow label="DTA Beginning" values={d.dta_beginning} kind="muted" />
          <YearRow label="Increases" values={d.dta_increases} kind="positive" />
          <YearRow label="Decreases" values={d.dta_decreases} kind="negative" />
          <SubtotalRow label="DTA End" values={d.dta_end} tone="result" />
          <DivisionRow label="CIT calc + Tax Payment" />
          <YearRow label="CIT (P&L)" values={d.cit_pl} kind="negative" />
          <YearRow label="DTA Compensation" values={d.dta_compensation} kind="muted" />
          <SubtotalRow label="Tax Payment" values={d.tax_payment} tone="warning" />
        </YearGrid>
      }
    />
  );
}
