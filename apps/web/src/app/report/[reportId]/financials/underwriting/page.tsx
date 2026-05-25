import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../../asset-analysis/hotel-toggle";
import { UnderwritingShell } from "@/components/underwriting/underwriting-shell";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
} from "@/lib/report/canonical-reader";
import { runForHotel } from "@/lib/report/underwriting-runner";
import { buildUnderwritingBundleFromCanonical } from "@/lib/report/report-object";
import { getReportById } from "@/lib/report/report-session";

export const metadata: Metadata = {
  title: "Underwriting · Financials · HotelVALORA",
  description:
    "Institutional underwriting operating system · P&L · Balance Sheet · Cash Flow · DTA · Investment & CAPEX · Financing · Exit Strategy with Project & Equity IRR.",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
  searchParams?: { tier?: string };
}

async function loadBundle(reportId: string) {
  const session = await getReportById(reportId);
  if (!session) return { bundle: SCENARIO_BASE, source: "mock" as const };

  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) return { bundle: SCENARIO_BASE, source: "mock" as const };

  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );
  const engineRun = (() => {
    try { return runForHotel(hotel); } catch { return null; }
  })();

  const bundle = buildUnderwritingBundleFromCanonical(hotel, marketKpi, engineRun);
  return { bundle, source: "canonical" as const, hotel };
}

export default async function UnderwritingPage({ params }: PageProps) {
  const { bundle, source, hotel } = await loadBundle(params.reportId);
  const hotelLabel = source === "canonical" && hotel ? hotel.canonical_name ?? "Hotel" : "Hotel";

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3 print:gap-3">
      <span className="text-xl font-bold text-slate-700 font-headline print:text-base">
        {hotelLabel}
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
            <UnderwritingShell bundle={bundle} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
