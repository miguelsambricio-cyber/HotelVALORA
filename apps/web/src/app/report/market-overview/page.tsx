import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../asset-analysis/hotel-toggle";
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
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";
import { mapCanonicalToMarketOverview } from "@/lib/report/canonical-mappers/market-overview";

export const metadata: Metadata = {
  title: "Market Overview — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string };
}

async function loadMarketOverviewData(
  searchParams: PageProps["searchParams"],
): Promise<{ data: MarketOverviewData; source: "canonical" | "mock" }> {
  let canonicalId = searchParams?.canonical_id?.trim() || null;
  if (!canonicalId && searchParams?.hotel_id) {
    canonicalId = await resolveCanonicalIdFromSnapshotHotelId(searchParams.hotel_id.trim());
  }
  if (canonicalId) {
    const hotel = await getCanonicalHotelById(canonicalId);
    if (hotel) {
      const marketKpi = await resolveBestAvailableMarketKpis(
        hotel.market_name,
        hotel.submarket_name,
        { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
      );
      return { data: mapCanonicalToMarketOverview(hotel, marketKpi), source: "canonical" };
    }
  }
  return { data: getMockMarketOverview(), source: "mock" };
}

export default async function MarketOverviewPage({ searchParams = {} }: PageProps) {
  const { data } = await loadMarketOverviewData(searchParams);

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
            {/* INSIGHT SCROLLER — 4 cards (Country / Market / Submarket / Class)
                Web: horizontal snap-scroll, 2 visible at a time.
                Print: collapses to a static 2 × 2 grid.

                Macro on top (Country / Market) → micro below (Submarket / Class)
                in the print 2 × 2 because cards are placed in registry order. */}
            <HorizontalInsightScroller>
              {data.insights.map((insight) => (
                <MarketInsightCard key={insight.scope} insight={insight} />
              ))}
            </HorizontalInsightScroller>

            {/* SHARED — Corporate & Sport Events */}
            <CorporateSportsCard data={data.corporateSports} />

            {/* SHARED — Demand Generators list + Map */}
            <DemandGeneratorsBlock data={data.demandGenerators} />

            {/* SHARED — Demand Generators 4-col gallery */}
            <DemandGeneratorsGallery tiles={data.gallery} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
