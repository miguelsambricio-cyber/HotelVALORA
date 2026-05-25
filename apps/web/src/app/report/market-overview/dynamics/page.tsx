import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import { DynamicsChartCard } from "@/components/report/market-overview/dynamics";
import { CHART_PRESETS } from "@/lib/report/market-dynamics-data";
import {
  getCanonicalHotelById,
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";

export const metadata: Metadata = {
  title: "Market Dynamics — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string };
}

/**
 * Market Dynamics — MARKET-LEVEL data per operator directive (2026-05-25 §3).
 *
 * Page accepts `canonical_id` (or `hotel_id`) · resolves the hotel only
 * to populate the header label · the underlying chart presets remain
 * market-level (Madrid-wide) since all Madrid hotels share the same
 * market dynamics. Future: filter by `hotel.market_id` when CoStar
 * publishes per-market time-series.
 */
async function loadHotelLabel(searchParams: PageProps["searchParams"]) {
  let canonicalId = searchParams?.canonical_id?.trim() || null;
  if (!canonicalId && searchParams?.hotel_id) {
    canonicalId = await resolveCanonicalIdFromSnapshotHotelId(searchParams.hotel_id.trim());
  }
  if (!canonicalId) return "Prime";
  const hotel = await getCanonicalHotelById(canonicalId);
  return hotel?.canonical_name ?? "Prime";
}

export default async function MarketDynamicsPage({ searchParams = {} }: PageProps) {
  const hotelLabel = await loadHotelLabel(searchParams);

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
