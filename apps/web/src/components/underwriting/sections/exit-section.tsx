import { SectionShell } from "../primitives/section-shell";
import { KpiTile } from "../primitives/kpi-hero";
import { EditableTile } from "../primitives/editable-tile";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { SortableGrid } from "../edit/sortable-grid";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";

/**
 * Section 08 · Exit Strategy · the strongest narrative piece.
 *
 * Corporate light theme · highlight tiles + value-creation bridge use
 * the forest accent (the report's canonical "result" colour); editable
 * Exit Year + Exit Fee tiles render in blue (#005db7) so the operator
 * sees one consistent edit signal across every page.
 */
export function ExitSection({
  bundle,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const e = bundle.computed.exit;
  const inv = bundle.computed.investment;
  const fin = bundle.computed.financing;
  const periods = bundle.computed.periods;
  const exitYearScope = bundle.computed.exit.exit_year;
  // Operating schedule · acquisition phase hidden · Concept + visible periods.
  const operatingCols = periods
    .slice(0, exitYearScope + 1)
    .filter((pd) => (pd.phase ?? "operating") !== "acquisition").length;
  const cols = 1 + operatingCols;
  const asset = bundle.inputs.asset;
  const capEntry = bundle.computed.cap_rate.entry;
  const capExit = bundle.computed.cap_rate.exit;
  const exitFeePct = bundle.inputs.exit.fee_pct * 100;

  const exitPriceNetOfFees = e.exit_price * (1 - bundle.inputs.exit.fee_pct);
  const debtBalanceAfterScheduled = fin.total_eofy_balance[e.exit_year] ?? 0;
  const netEquityProceeds = exitPriceNetOfFees - debtBalanceAfterScheduled;
  const exitPriceSeries = periods.map((_, i) => (i === e.exit_year ? e.exit_price : 0));

  const entryValue = inv.total_building_cost;

  return (
    <SectionShell
      number={8}
      anchorId="exit"
      title="Exit Strategy"
      subtitle={`Y${e.exit_year} disposition · institutional cap rate ${fmtPct(capExit.used_pct)} · ${asset.submarket}`}
      status={{ label: "IC narrative · disposition committee", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          {/* Returns headline · 5 results + 3 exit assumption tiles · reorderable */}
          <SortableGrid
            gridId="exit.headline"
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            items={[
              { id: "project-irr", content: (
                <KpiTile label="Project IRR" value={fmtPct(e.project_irr_pct)} sub="Unlevered · pre-tax" tone={irrTone(e.project_irr_pct, 8)} />
              ) },
              { id: "equity-irr", content: (
                <KpiTile label="Equity IRR" value={fmtPct(e.equity_irr_pct)} sub="Levered · post-tax" highlight tone={irrTone(e.equity_irr_pct, 12)} />
              ) },
              { id: "moic", content: (
                <KpiTile label="MOIC" value={`${e.moic.toFixed(2)}×`} sub="equity multiple" tone={moicTone(e.moic)} />
              ) },
              { id: "profit-share", content: (
                <KpiTile label="Profit share" value={fmtEUR(e.profit_share)} sub="equity gain" tone={e.profit_share > 0 ? "ok" : "warn"} />
              ) },
              { id: "exit-year", content: (
                <EditableTile label="Exit year" value={e.exit_year} format="years" min={1} max={10}
                  onCommit={(exit_year) => onOverrideChange({ exit_year })} sub="hold period · 1-10y" />
              ) },
              { id: "exit-cap-rate", content: (
                <EditableTile label="Exit cap rate" value={capExit.used_pct} format="percent" min={0} max={30}
                  onCommit={(exit_cap_rate_pct) => onOverrideChange({ exit_cap_rate_pct })}
                  sub={capExit.source === "dynamic" ? "Dynamic · exit yield" : "Manual override"} />
              ) },
              { id: "exit-fee", content: (
                <EditableTile label="Exit fee" value={exitFeePct} format="percent" min={0} max={10}
                  onCommit={(exit_fee_pct) => onOverrideChange({ exit_fee_pct })} sub="disposition fee · % of exit price" />
              ) },
              { id: "exit-price", content: (
                <KpiTile label="Exit Price" value={fmtEUR(e.exit_price)} sub={`${fmtEUR(e.exit_price_per_room)} / key · Y${e.exit_year}`} highlight />
              ) },
            ]}
          />

          {/* Entry vs exit valuation arc */}
          <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr]">
              <ValuationCard
                label="Entry"
                year="Y0"
                value={entryValue}
                capRate={capEntry.used_pct}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
                tone="neutral"
              />
              <div className="flex flex-row items-center justify-center gap-2 px-3 md:flex-col md:gap-0 print:py-3">
                <span className="font-headline text-[9px] font-extrabold uppercase tracking-[0.28em] text-forest-900">
                  Hold
                </span>
                <span className="font-mono text-[22px] font-extrabold text-forest-900 md:text-[24px]">
                  {e.exit_year}y
                </span>
                <span className="font-headline text-[9px] uppercase tracking-[0.18em] text-slate-500">
                  →
                </span>
              </div>
              <ValuationCard
                label="Exit"
                year={`Y${e.exit_year}`}
                value={e.exit_price}
                capRate={capExit.used_pct}
                rooms={asset.rooms}
                totalSqm={asset.total_sqm}
                tone="highlight"
              />
            </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <SummaryStat label="Equity contributed" value={fmtEUR(e.equity_investment)} />
            <SummaryStat label="Net exit proceeds" value={fmtEUR(netEquityProceeds)} tone="ok" />
            <SummaryStat label="Total distributions (cum.)" value={fmtEUR(e.profit_share + e.equity_investment)} tone="ok" />
          </div>

          <YearGrid
            periods={periods}
            displayThroughIndex={e.exit_year}
            kind="operating"
            excludeAcquisition
            caption="Operating Hold + Exit · Project + Equity Cash Flows · Y1 → Y{exit}"
          >
            <DivisionRow label="Project Cash Flow" columnCount={cols} />
            <YearRow label="Operating Cash Flow" values={bundle.computed.cash_flow.operating_cash_flow} indent={1} />
            <YearRow label="Exit Price (net of fees)" values={exitPriceSeries} indent={1} kind="positive" />
            <SubtotalRow label="Project Cash Flow" values={e.project_cash_flow} tone="result" />
            <IrrResultRow
              label="Project IRR"
              sublabel="Unlevered · pre-tax"
              value={e.project_irr_pct}
              columnCount={cols}
            />
            <DivisionRow label="Equity Cash Flow" columnCount={cols} />
            <YearRow label="Debt Cash Flows" values={e.debt_cash_flow} indent={1} />
            <SubtotalRow label="Equity Cash Flow" values={e.equity_cash_flow} tone="result" />
            <IrrResultRow
              label="Equity IRR"
              sublabel="Levered · post-tax"
              value={e.equity_irr_pct}
              columnCount={cols}
            />
          </YearGrid>
        </div>
      }
    />
  );
}

// ─── Sub-primitives ──────────────────────────────────────────────────

/**
 * IrrResultRow · prominent row inside the cash-flow YearGrid that
 * displays the IRR result for the preceding cash-flow subtotal.
 *
 * Visual: forest accent band · two-line stacked label (main + sublabel)
 * with bigger headline type · large mono number right-aligned. Reads as
 * a single institutional conclusion, not a per-period value.
 */
function IrrResultRow({
  label,
  sublabel,
  value,
  columnCount,
}: {
  label: string;
  sublabel?: string;
  value: number;
  columnCount: number;
}) {
  const display = !Number.isFinite(value) || value === 0
    ? "—"
    : `${value.toFixed(2).replace(".", ",")}%`;
  return (
    <tr className="border-t-2 border-forest-900/40 bg-forest-50">
      <td className="sticky left-0 z-[1] bg-forest-50 px-3 py-3 align-middle">
        <div className="flex flex-col gap-0.5">
          <span className="font-headline text-[13px] font-extrabold uppercase tracking-[0.18em] text-forest-900">
            {label}
          </span>
          {sublabel && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-600">
              {sublabel}
            </span>
          )}
        </div>
      </td>
      <td
        colSpan={Math.max(1, columnCount - 1)}
        className="px-3 py-3 text-right font-mono text-[20px] font-extrabold tabular-nums text-forest-900 sm:text-[22px]"
      >
        {display}
      </td>
    </tr>
  );
}

function ValuationCard({
  label,
  year,
  value,
  capRate,
  rooms,
  totalSqm,
  tone,
}: {
  label: string;
  year: string;
  value: number;
  capRate: number;
  rooms: number;
  totalSqm: number;
  tone: "neutral" | "highlight";
}) {
  const isHighlight = tone === "highlight";
  return (
    <div
      className={
        isHighlight
          ? "rounded-md border-2 border-forest-900/30 bg-forest-50 p-4"
          : "rounded-md border border-slate-200 bg-white p-4"
      }
    >
      <div className="flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.28em] text-slate-600">
          {label}
        </p>
        <span className="font-mono text-[10px] text-slate-500">{year}</span>
      </div>
      <p className={`mt-2 font-mono text-[22px] font-extrabold tabular-nums sm:text-[24px] ${isHighlight ? "text-forest-900" : "text-slate-900"}`}>
        {fmtEUR(value)}
      </p>
      <ul className="mt-2 space-y-0.5 font-mono text-[10px] text-slate-600">
        <li>{fmtEUR(value / rooms)} / key</li>
        <li>{fmtEUR(value / totalSqm)} / m²</li>
        <li>Cap rate · {fmtPct(capRate)}</li>
      </ul>
    </div>
  );
}

function SummaryStat({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "warn" | "neutral" }) {
  const colour = tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : "text-slate-900";
  return (
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</p>
      <p className={`mt-1 font-mono text-[14px] font-extrabold tabular-nums ${colour}`}>{value}</p>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────

function irrTone(irr: number, target: number): "ok" | "warn" | "negative" {
  return irr >= target ? "ok" : irr >= target * 0.7 ? "warn" : "negative";
}

function moicTone(moic: number): "ok" | "warn" | "negative" {
  return moic >= 1.8 ? "ok" : moic >= 1.3 ? "warn" : "negative";
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
  return `${n.toFixed(2).replace(".", ",")}%`;
}
