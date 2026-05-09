import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import { DynamicsChartCard } from "@/components/report/market-overview/dynamics";
import { CHART_PRESETS } from "@/lib/report/market-dynamics-data";

export const metadata: Metadata = {
  title: "Market Dynamics — HotelVALORA",
};

/**
 * Market Dynamics — 8 institutional charts in a 2×4 grid (web + print).
 * Each card owns its own filter state initialised from CHART_PRESETS.
 *
 * Stitch parity:
 *   Row 1 — Mercado · Ocupacion           (5Y / 3Y)
 *   Row 2 — Compset · ADR                  (5Y / 3Y)
 *   Row 3 — Compset · RevPAR               (5Y / 3Y)
 *   Row 4 — Mercado · Oferta RN / Demanda RN (5Y / 5Y)
 *
 * Page is a server component — only the chart cards are client (they hold
 * the per-card filter state). HotelToggle stays client.
 */
export default function MarketDynamicsPage() {
  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        Prime
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Market Dynamics"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-3 print:py-2">
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 print:grid-cols-2 print:gap-3">
              {CHART_PRESETS.map((preset, idx) => (
                <DynamicsChartCard
                  key={idx}
                  initialFilters={preset.initial}
                  color={preset.color}
                />
              ))}
            </section>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
