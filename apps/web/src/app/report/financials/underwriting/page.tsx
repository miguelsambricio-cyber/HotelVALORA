import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import { UnderwritingShell } from "@/components/underwriting/underwriting-shell";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";

export const metadata: Metadata = {
  title: "Underwriting · Financials · HotelVALORA",
  description:
    "Institutional underwriting operating system · P&L · Balance Sheet · Cash Flow · DTA · Investment & CAPEX · Financing · Exit Strategy with Project & Equity IRR.",
};

/**
 * /report/financials/underwriting
 *
 * Corporate-grade light theme · the next page after 5-Year P&L Forecast.
 * Renders inside the canonical ReportPaper shell so the look-and-feel
 * (header band, paper background, padding, ActionBar footer) is identical
 * to /report/financials/pl. The UnderwritingShell owns the live engine
 * inputs (scenario picker + per-driver overrides).
 *
 * Print canvas stays landscape — year grids need horizontal real estate.
 */
export default function UnderwritingPage() {
  const headerActions = (
    <div className="flex flex-wrap items-center gap-3 print:gap-3">
      <span className="text-xl font-bold text-slate-700 font-headline print:text-base">
        Prime
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell printOrientation="landscape">
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Underwriting"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-4 py-6 sm:px-6 lg:px-8 print:px-3 print:py-2">
            <UnderwritingShell bundle={SCENARIO_BASE} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
