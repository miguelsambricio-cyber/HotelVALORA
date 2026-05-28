import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../../asset-analysis/hotel-toggle";
import { PLContent } from "../../../financials/pl/pl-content";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
} from "@/lib/report/canonical-reader";
import { buildFinancialsSlice } from "@/lib/report/report-object";
import { getReportById } from "@/lib/report/report-session";
import { isProvisionalTemplate } from "@/lib/report/financials/coverage";

export const metadata: Metadata = {
  title: "5-Year P&L Forecast — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
  searchParams?: { tier?: string };
}

async function loadAssumptions(reportId: string) {
  const session = await getReportById(reportId);
  if (!session) return { initialAssumptions: undefined, hotelLabel: "Prime", provisional: false };

  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) return { initialAssumptions: undefined, hotelLabel: "Prime", provisional: false };

  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );
  const slice = buildFinancialsSlice(hotel, marketKpi);
  const provisional = isProvisionalTemplate(hotel);
  return {
    initialAssumptions: slice.assumptions,
    hotelLabel: hotel.canonical_name ?? "Hotel",
    provisional,
  };
}

export default async function PLPage({ params }: PageProps) {
  const { initialAssumptions, hotelLabel, provisional } = await loadAssumptions(params.reportId);

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
              <PLContent
                initialAssumptions={initialAssumptions}
                provisional={provisional}
              />
            </Suspense>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
