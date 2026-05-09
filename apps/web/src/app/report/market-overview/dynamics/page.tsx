"use client";

import { useMemo, useState } from "react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import {
  DynamicsChartCard,
  DynamicsFilterBar,
} from "@/components/report/market-overview/dynamics";
import {
  DEFAULT_FILTERS,
  getDynamicsCharts,
  type DynamicsFilterState,
} from "@/lib/report/market-dynamics-data";

export default function MarketDynamicsPage() {
  const [filters, setFilters] = useState<DynamicsFilterState>(DEFAULT_FILTERS);
  const charts = useMemo(() => getDynamicsCharts(filters), [filters]);

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
          <div className="px-8 py-6 print:px-3 print:py-2 space-y-6 print:space-y-3">
            {/* GLOBAL FILTER BAR — 4 axes drive all 6 charts simultaneously */}
            <DynamicsFilterBar value={filters} onChange={setFilters} />

            {/* 2 × 3 CHART GRID
                Web:    2 cols × 3 rows, 400px-tall cards
                Mobile: stacked
                Print:  2 cols × 3 rows, ~170px cards, break-inside-avoid */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2 print:gap-3">
              {charts.map((chart) => (
                <DynamicsChartCard key={chart.id} chart={chart} />
              ))}
            </section>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
