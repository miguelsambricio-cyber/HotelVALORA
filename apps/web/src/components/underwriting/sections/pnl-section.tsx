import { SectionShell } from "../primitives/section-shell";
import { KpiTile, type KpiTileProps } from "../primitives/kpi-hero";
import { EditableTile } from "../primitives/editable-tile";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";

/**
 * Section 02 · P&L · USALI structure · institutional headline + detail.
 *
 * Headline KPIs (operator priority set · 2026-05-18):
 *   1. Stabilised GOP
 *   2. GOP margin               · GOP / Total Revenue
 *   3. Stabilised EBITDA
 *   4. EBITDA margin            · EBITDA / Total Revenue
 *   5. EBITDA per key
 *   6. CIT %                    · editable · drives engine re-price
 */
export function PnlSection({
  bundle,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const p = bundle.computed.pnl;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;
  const rooms = bundle.inputs.asset.rooms;
  const citRatePct = bundle.inputs.tax.cit_rate_pct * 100; // decimal → percentage points

  const stabilisedYr = Math.max(1, exitYear);
  const stabilisedRevenue =
    (p.hotel[stabilisedYr] ?? 0) +
    (p.fb[stabilisedYr] ?? 0) +
    (p.other_departments[stabilisedYr] ?? 0);
  const stabilisedGop = p.gross_operating_profit[stabilisedYr] ?? 0;
  const stabilisedEbitda = p.ebitda_after_replacement[stabilisedYr] ?? 0;

  const gopMarginPct = stabilisedRevenue > 0
    ? (stabilisedGop / stabilisedRevenue) * 100
    : 0;
  const ebitdaMarginPct = stabilisedRevenue > 0
    ? (stabilisedEbitda / stabilisedRevenue) * 100
    : 0;
  const ebitdaPerKey = rooms > 0 ? stabilisedEbitda / rooms : 0;

  return (
    <SectionShell
      number={2}
      anchorId="pnl"
      title="P&L · PropCo without Exit Strategy"
      subtitle="USALI structure · operating revenue → GOP → EBITDA → Net Income"
      status={{ label: "Operating truth · engine-driven", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <PnlKpi label="Stabilised GOP" value={fmtEUR(stabilisedGop)} sub={`Y${stabilisedYr} · pre owner costs`} highlight />
            <PnlKpi label="GOP margin" value={fmtPct(gopMarginPct)} sub="% of total revenue" tone={marginTone(gopMarginPct, 30)} />
            <PnlKpi label="Stabilised EBITDA" value={fmtEUR(stabilisedEbitda)} sub={`Y${stabilisedYr} · post replacement`} highlight />
            <PnlKpi label="EBITDA margin" value={fmtPct(ebitdaMarginPct)} sub="% of total revenue" tone={marginTone(ebitdaMarginPct, 25)} />
            <PnlKpi label="EBITDA per key" value={fmtEUR(ebitdaPerKey)} sub={`${rooms} keys`} />
            <EditableTile
              label="CIT %"
              value={citRatePct}
              format="percent"
              min={0}
              max={100}
              onCommit={(cit_rate_pct) => onOverrideChange({ cit_rate_pct })}
              sub="Spanish Ley IS · 25% standard"
            />
          </div>
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
        </div>
      }
    />
  );
}

function PnlKpi(props: KpiTileProps) {
  return <KpiTile {...props} />;
}

function marginTone(pct: number, target: number): "ok" | "warn" | "negative" {
  return pct >= target ? "ok" : pct >= target * 0.7 ? "warn" : "negative";
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
