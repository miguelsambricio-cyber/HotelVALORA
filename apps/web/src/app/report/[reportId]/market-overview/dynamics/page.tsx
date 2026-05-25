import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../../asset-analysis/hotel-toggle";
import { DynamicsChartCard } from "@/components/report/market-overview/dynamics";
import { CHART_PRESETS } from "@/lib/report/market-dynamics-data";
import { getCanonicalHotelById } from "@/lib/report/canonical-reader";
import { getReportById } from "@/lib/report/report-session";

export const metadata: Metadata = {
  title: "Market Dynamics — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
}

async function loadHotelLabel(reportId: string) {
  const session = await getReportById(reportId);
  if (!session) return "Prime";
  const hotel = await getCanonicalHotelById(session.canonical_id);
  return hotel?.canonical_name ?? "Prime";
}

export default async function MarketDynamicsPage({ params }: PageProps) {
  const hotelLabel = await loadHotelLabel(params.reportId);

  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        {hotelLabel}
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
