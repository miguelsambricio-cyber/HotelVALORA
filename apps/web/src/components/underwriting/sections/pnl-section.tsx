import { SectionShell } from "../primitives/section-shell";
import { KpiTile, type KpiTileProps } from "../primitives/kpi-hero";
import { EditableTile } from "../primitives/editable-tile";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { SortableGrid } from "../edit/sortable-grid";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";
import { computePL } from "@/lib/report/financials/calculations";
import { getDefaultAssumptions } from "@/lib/report/financials/assumptions";

/**
 * Section 02 · P&L · USALI structure · institutional headline + detail.
 *
 * Headline KPIs (operator priority set · 2026-05-19):
 *   1. Stabilised GOP           · from /report/financials/pl
 *   2. GOP margin               · GOP / Total Revenue · from P&L page
 *   3. EBITDA margin            · EBITDA / Total Revenue · from P&L page
 *   4. EBITDA per key           · from P&L page
 *   5. CIT %                    · editable · drives engine re-price
 *
 * Headline source: `computePL(getDefaultAssumptions())` from the
 * standalone /report/financials/pl page. The numbers MATCH that page
 * exactly. The 5-year table below still consumes the engine's pl module
 * (different shape · richer year axis Y0..Y10). The architectural
 * unification is documented in docs/underwriting/pl-data-divergence.md.
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
  const exitYear = bundle.computed.exit.exit_year;
  // Operating schedule · acquisition periods hidden from the P&L view.
  // Concept column + every period in [0..exitYear] whose phase is operating.
  const operatingPeriodsInRange = periods
    .slice(0, exitYear + 1)
    .filter((pd) => (pd.phase ?? "operating") !== "acquisition");
  const cols = 1 + operatingPeriodsInRange.length;
  const rooms = bundle.inputs.asset.rooms;
  const citRatePct = bundle.inputs.tax.cit_rate_pct * 100; // decimal → percentage points

  // Headline tiles consume the standalone /report/financials/pl page model
  // so GOP + EBITDA + margins MATCH that page exactly. The P&L page works
  // on a 5-year horizon (Y1..Y5) · we anchor on Year 3 (stabilised) per
  // institutional convention used by /pl's EBITDA Stabilized card.
  const plPage = computePL(getDefaultAssumptions());
  const plStabilizedIdx = 2; // Y3 · stabilised year on the P&L page
  const stabilisedRevenue = plPage.results.totalRevenue[plStabilizedIdx] ?? 0;
  const stabilisedGop = plPage.results.gop[plStabilizedIdx] ?? 0;
  const stabilisedEbitda = plPage.results.ebitda[plStabilizedIdx] ?? 0;

  const gopMarginPct = stabilisedRevenue > 0
    ? (stabilisedGop / stabilisedRevenue) * 100
    : 0;
  const ebitdaMarginPct = (plPage.results.ebitdaMargin[plStabilizedIdx] ?? 0) * 100;
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
          <SortableGrid
            gridId="pnl.headline"
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            items={[
              { id: "stab-gop", content: (
                <PnlKpi label="Stabilised GOP" value={fmtEUR(stabilisedGop)} sub="Y3 · from /pl page" highlight />
              ) },
              { id: "gop-margin", content: (
                <PnlKpi label="GOP Margin" value={fmtPct(gopMarginPct)} sub="GOP / Revenue" tone={marginTone(gopMarginPct, 30)} />
              ) },
              { id: "ebitda-margin", content: (
                <PnlKpi label="EBITDA Margin" value={fmtPct(ebitdaMarginPct)} sub="EBITDA / Revenue" tone={marginTone(ebitdaMarginPct, 25)} />
              ) },
              { id: "ebitda-per-key", content: (
                <PnlKpi label="EBITDA per key" value={fmtEUR(ebitdaPerKey)} sub={`${rooms} keys · Y3`} />
              ) },
              { id: "cit-pct", content: (
                <EditableTile label="CIT %" value={citRatePct} format="percent" min={0} max={100}
                  onCommit={(cit_rate_pct) => onOverrideChange({ cit_rate_pct })} sub="Spanish Ley IS · 25% standard" />
              ) },
            ]}
          />
          <YearGrid
            periods={periods}
            displayThroughIndex={exitYear}
            kind="operating"
            excludeAcquisition
            caption="P&L · PropCo without Exit Strategy"
          >
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
