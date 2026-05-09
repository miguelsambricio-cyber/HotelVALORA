import { cn } from "@/lib/utils";
import type { MarketInsight } from "@/lib/report/market-overview-data";
import { InsightBadge } from "./insight-badge";
import { MetricGrid } from "./metric-grid";
import { SplitBar } from "./split-bar";
import { MiniBarChart } from "./mini-bar-chart";
import { TrendBars } from "./trend-bars";
import { InvestmentChart } from "./investment-chart";

export interface MarketInsightCardProps {
  insight: MarketInsight;
  className?: string;
}

/**
 * Self-contained insight card consumed by the horizontal scroller (web) and
 * the 2 × 2 grid (print). Composes — in this order:
 *
 *   1. Header (title + InsightBadge)
 *   2. MetricGrid (3 × 3)
 *   3. SplitBar (Nacional / Internacional, Direct / OTA, …)
 *   4. Two MiniBarChart instances (Arrival, Demographic, Origin, …)
 *   5. TrendBars (Total Travelers / RevPAR Growth)
 *   6. Two InvestmentChart instances (Volumen / Precio per hab)
 *   7. Investment metrics (3 × 2)
 *   8. Footer KPI (Población / Premium Inventory)
 *
 * Sectioned via `border-t / pt-N / mt-N` rather than `space-y-N` so the
 * vertical rhythm survives nested grids in print.
 */
export function MarketInsightCard({ insight, className }: MarketInsightCardProps) {
  // The Stitch reference renders the badge on two lines (an explicit <br>
  // between "Investment" and the scope label). InsightBadge applies
  // `whitespace-pre-line` so a literal `\n` in the string becomes a line
  // break — keeps the two-line institutional feel without dropping HTML.
  const investmentBadge = `Investment\n${insight.badge}`;

  return (
    <article
      id={`insight-${insight.scope}`}
      className={cn(
        "h-full bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col gap-6",
        "print:shadow-none print:break-inside-avoid print:p-2 print:gap-1.5 print:rounded-md",
        className,
      )}
    >
      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-start gap-3 print:gap-1.5">
        <h3 className="text-2xl font-extrabold text-forest-900 font-headline leading-tight print:text-sm">
          {insight.title}
        </h3>
        <InsightBadge>{insight.badge}</InsightBadge>
      </div>

      {/* ── METRIC GRID 3 × 3 ──────────────────────────────────────────── */}
      <MetricGrid metrics={insight.metrics} columns={3} />

      {/* ── SPLIT BAR + MINI CHARTS + TREND ────────────────────────────── */}
      <div className="flex flex-col gap-4 print:gap-1.5">
        <SplitBar data={insight.splitBar} />
        <div className="grid grid-cols-2 gap-4 print:gap-1.5">
          <MiniBarChart data={insight.miniCharts[0]} palette="emerald" />
          <MiniBarChart data={insight.miniCharts[1]} palette="slate" />
        </div>
        <TrendBars data={insight.trend} />
      </div>

      {/* ── INVESTMENT BLOCK ───────────────────────────────────────────── */}
      <div className="pt-4 border-t border-slate-100 flex flex-col gap-6 print:pt-1.5 print:gap-1.5">
        <div className="flex justify-between items-start gap-3 print:gap-1.5">
          <h4 className="text-base font-extrabold text-forest-900 font-headline uppercase tracking-tight print:text-[10px]">
            {insight.title}
          </h4>
          <InsightBadge>{investmentBadge}</InsightBadge>
        </div>

        <div className="space-y-6 print:space-y-1.5">
          <InvestmentChart data={insight.investmentCharts[0]} />
          <InvestmentChart data={insight.investmentCharts[1]} />
        </div>

        {/* Tech data — 2-column metric pairs */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 print:gap-x-2 print:gap-y-0.5 print:pt-1">
          {insight.investmentMetrics.map((metric) => (
            <div key={metric.id}>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider print:text-[7px]">
                {metric.label}
              </p>
              <div className="flex items-baseline gap-1.5 print:gap-0.5">
                <span className="text-sm font-bold text-slate-800 print:text-[9px]">
                  {metric.value}
                </span>
                {metric.delta && (
                  <span
                    className={cn(
                      "text-[10px] font-bold print:text-[7px]",
                      metric.deltaTone === "down"
                        ? "text-red-600"
                        : metric.deltaTone === "up"
                          ? "text-emerald-600"
                          : "text-slate-500",
                    )}
                  >
                    {metric.delta}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── FOOTER KPI — vertical (label above value), 3-col grid ──────────
         Población / Premium Inventory always lands in col 3 via `col-start-3`.
         Cols 1 + 2 stay empty for future metrics; adding new entries before
         this block in JSX will fill them via auto-flow without a layout
         change. Visual styling mirrors the investment-metric tiles for
         consistency across the bottom row of the card. */}
      <div className="pt-4 mt-auto border-t border-slate-100 grid grid-cols-3 gap-4 print:pt-1 print:gap-x-2 print:gap-y-0.5">
        <div className="col-start-3">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider print:text-[7px]">
            {insight.footer.label}
          </p>
          <p className="text-sm font-bold text-slate-800 print:text-[9px]">
            {insight.footer.value}
          </p>
        </div>
      </div>
    </article>
  );
}
