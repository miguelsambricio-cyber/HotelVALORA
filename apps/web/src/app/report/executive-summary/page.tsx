import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { AssetSection } from "@/components/report/executive-summary/asset-section";
import { MarketSection } from "@/components/report/executive-summary/market-section";
import { ValuationSection } from "@/components/report/executive-summary/valuation-section";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { MethodologicalNote } from "@/components/report/ui/methodological-note";
import { getMockExecutiveSummary } from "@/lib/report/executive-summary-data";

export const metadata = {
  title: "Executive Summary — HotelVALORA",
};

export default function ExecutiveSummaryPage() {
  const data = getMockExecutiveSummary("demo-report-001");

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-0">
        {/* Paper card */}
        <ReportPaper
          sectionLabel="Hotel Valuation"
          title="Executive Summary"
        >
          {/* Section 1 — Hotel Asset */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 print:px-4 print:pt-3 print:pb-2">
            <AssetSection asset={data.asset} meta={data.meta} />
          </div>

          {/* Section 2 — Market Overview */}
          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <MarketSection data={data.marketMetrics} />
          </div>

          {/* Section 3 — Hotel Valuation */}
          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <ValuationSection valuation={data.valuation} charts={data.charts} />
          </div>

          {/* Methodological note */}
          <MethodologicalNote />
        </ReportPaper>

        {/* Action bar — below the paper, matching Stitch layout */}
        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
