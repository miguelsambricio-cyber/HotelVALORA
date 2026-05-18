import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero } from "../primitives/kpi-hero";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 02 · P&L · USALI structure · memorandum view.
 *
 *   A · Operating headline (KPIs · always visible)
 *   B · Detail schedule (full USALI per-period table · always open)
 *
 * No thesis narrative · no accordion chrome · institutional control layer.
 */
export function PnlSection({ bundle }: { bundle: UnderwritingBundle }) {
  const p = bundle.computed.pnl;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;
  const stabilisedYr = Math.max(1, exitYear);
  const stabilisedGop = p.gross_operating_profit[stabilisedYr] ?? 0;
  const stabilisedEbitda = p.ebitda_after_replacement[stabilisedYr] ?? 0;
  const stabilisedNi = p.net_income[stabilisedYr] ?? 0;
  const stabilisedGopMarginPct = stabilisedGop > 0
    ? (stabilisedEbitda / stabilisedGop) * 100
    : 0;
  const totalRevY1 = (p.hotel[1] ?? 0) + (p.fb[1] ?? 0) + (p.other_departments[1] ?? 0);

  return (
    <SectionShell
      number={2}
      anchorId="pnl"
      title="P&L · PropCo without Exit Strategy"
      subtitle="USALI structure · operating revenue → GOP → EBITDA → Net Income"
      status={{ label: "Operating truth · engine-driven", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          <MemorandumBlock number="A" title="Operating headline" subtitle={`Stabilised metrics at Y${stabilisedYr}`}>
            <KpiHero
              tiles={[
                { label: "Total Revenue · Y1", value: fmtEUR(totalRevY1), sub: "departmental P&L sum" },
                { label: "Stabilised GOP", value: fmtEUR(stabilisedGop), sub: `Y${stabilisedYr} · pre owner costs` },
                { label: "Stabilised EBITDA", value: fmtEUR(stabilisedEbitda), sub: `Y${stabilisedYr} · post replacement`, highlight: true },
                { label: "EBITDA margin", value: fmtPct(stabilisedGopMarginPct), sub: "% of GOP", tone: marginTone(stabilisedGopMarginPct) },
                { label: "Net Income · stabilised", value: fmtEUR(stabilisedNi), sub: `Y${stabilisedYr} · after CIT`, tone: stabilisedNi > 0 ? "ok" : "warn" },
                { label: "Cumulative NI", value: fmtEUR(p.total_net_income[exitYear] ?? 0), sub: `through Y${exitYear} hold` },
              ]}
            />
          </MemorandumBlock>

          <MemorandumBlock number="B" title="Detail schedule" subtitle="USALI · Revenue → Costs → EBITDA → D&A → EBIT → FinExp → EBT → CIT → NI">
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
              <DivisionRow label="Below-the-line" columnCount={cols} />
              <YearRow label="D&A" values={p.da} kind="negative" />
              <SubtotalRow label="EBIT" values={p.ebit} tone="subtotal" />
              <YearRow label="Financial Expenses" values={p.financial_expenses} kind="negative" />
              <SubtotalRow label="EBT" values={p.ebt} tone="subtotal" />
              <YearRow label="CIT" values={p.cit} kind="negative" />
              <SubtotalRow label="Net Income" values={p.net_income} tone="result" />
              <YearRow label="Total Net Income (cumulative)" values={p.total_net_income} kind="muted" />
            </YearGrid>
          </MemorandumBlock>
        </div>
      }
    />
  );
}

function marginTone(pct: number): "ok" | "warn" | "negative" {
  return pct >= 70 ? "ok" : pct >= 50 ? "warn" : "negative";
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(1).replace(".", ",")}%`;
}
