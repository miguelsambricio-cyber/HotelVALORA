import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import {
  CorporateSportsCard,
  DemandGeneratorsBlock,
  DemandGeneratorsGallery,
  HorizontalInsightScroller,
  MarketInsightCard,
} from "@/components/report/market-overview";
import {
  getMockMarketOverview,
  type MarketOverviewData,
} from "@/lib/report/market-overview-data";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
} from "@/lib/report/canonical-reader";
import { mapCanonicalToMarketOverview } from "@/lib/report/canonical-mappers/market-overview";
import { getReportById } from "@/lib/report/report-session";

export const metadata: Metadata = {
  title: "Market Overview — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
}

async function loadMarketOverviewData(
  reportId: string,
): Promise<{ data: MarketOverviewData; source: "canonical" | "mock" }> {
  const session = await getReportById(reportId);
  if (!session) return { data: getMockMarketOverview(), source: "mock" };
  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) return { data: getMockMarketOverview(), source: "mock" };
  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );
  return { data: mapCanonicalToMarketOverview(hotel, marketKpi), source: "canonical" };
}

export default async function MarketOverviewPage({ params }: PageProps) {
  const { data } = await loadMarketOverviewData(params.reportId);

  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        {data.hotelLabel}
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-2">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Market Overview"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-3 print:py-2 space-y-8 print:space-y-3">
            <HorizontalInsightScroller>
              {data.insights.map((insight) => (
                <MarketInsightCard key={insight.scope} insight={insight} />
              ))}
            </HorizontalInsightScroller>

            <CorporateSportsCard data={data.corporateSports} />
            <DemandGeneratorsBlock data={data.demandGenerators} />
            <DemandGeneratorsGallery tiles={data.gallery} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
