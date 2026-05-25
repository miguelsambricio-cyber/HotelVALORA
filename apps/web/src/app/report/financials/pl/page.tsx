import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import { PLContent } from "./pl-content";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";
import { buildFinancialsSlice } from "@/lib/report/report-object";

export const metadata: Metadata = {
  title: "5-Year P&L Forecast — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: {
    canonical_id?: string;
    hotel_id?: string;
    tier?: string;
  };
}

/**
 * /report/financials/pl · canonical-coupled (Phase C · 2026-05-25)
 *
 * When `canonical_id` (or `hotel_id`) is supplied · the page resolves the
 * canonical hotel · resolves the submarket KPIs · derives PLAssumptions
 * (rooms · ADR · occupancy · GOP ratios) from canonical + admin defaults ·
 * and passes them as `initialAssumptions` to `<PLContent />`.
 *
 * When no canonical_id is supplied · `<PLContent />` falls back to
 * `getDefaultAssumptions()` (same behaviour as pre-Phase C).
 *
 * Header now shows the hotel's canonical name when canonical-coupled.
 */
async function loadAssumptions(searchParams: PageProps["searchParams"]) {
  let canonicalId = searchParams?.canonical_id?.trim() || null;
  if (!canonicalId && searchParams?.hotel_id) {
    canonicalId = await resolveCanonicalIdFromSnapshotHotelId(searchParams.hotel_id.trim());
  }
  if (!canonicalId) return { initialAssumptions: undefined, hotelLabel: "Prime" };

  const hotel = await getCanonicalHotelById(canonicalId);
  if (!hotel) return { initialAssumptions: undefined, hotelLabel: "Prime" };

  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );
  const slice = buildFinancialsSlice(hotel, marketKpi);
  return { initialAssumptions: slice.assumptions, hotelLabel: hotel.canonical_name ?? "Hotel" };
}

export default async function PLPage({ searchParams = {} }: PageProps) {
  const { initialAssumptions, hotelLabel } = await loadAssumptions(searchParams);

  const headerActions = (
    <div className="flex items-center gap-4 print:gap-3">
      <span className="text-xl font-bold text-slate-700 font-headline print:text-base">
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
          title="5-Year P&L Forecast"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-3 print:py-2">
            <Suspense fallback={null}>
              <PLContent initialAssumptions={initialAssumptions} />
            </Suspense>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
