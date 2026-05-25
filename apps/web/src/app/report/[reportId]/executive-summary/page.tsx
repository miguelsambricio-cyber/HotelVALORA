import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { AssetSection } from "@/components/report/executive-summary/asset-section";
import { MarketSection } from "@/components/report/executive-summary/market-section";
import { ValuationSection } from "@/components/report/executive-summary/valuation-section";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { MethodologicalNote } from "@/components/report/ui/methodological-note";
import {
  getMockExecutiveSummary,
  type ExecutiveSummaryData,
} from "@/lib/report/executive-summary-data";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
} from "@/lib/report/canonical-reader";
import { mapCanonicalToExecutiveSummary } from "@/lib/report/canonical-mappers/executive-summary";
import { runForHotel } from "@/lib/report/underwriting-runner";
import { upsertHotelReportLibrary } from "@/lib/report/library-persistence";
import { getReportById } from "@/lib/report/report-session";

export const metadata = {
  title: "Executive Summary — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
}

async function loadExecutiveSummaryData(
  reportId: string,
): Promise<{ data: ExecutiveSummaryData; source: "canonical" | "mock"; canonical_id?: string }> {
  const session = await getReportById(reportId);
  if (!session) {
    // Invalid reportId · fall back to mock so the canvas stays renderable.
    // The mock fallback is intentionally preserved · operator decision
    // (next step in the sprint).
    return { data: getMockExecutiveSummary("demo-report-001"), source: "mock" };
  }

  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) {
    return { data: getMockExecutiveSummary("demo-report-001"), source: "mock" };
  }

  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );
  const data = mapCanonicalToExecutiveSummary(hotel, marketKpi);

  const engineRun = (() => {
    try { return runForHotel(hotel); } catch { return null; }
  })();
  await upsertHotelReportLibrary(hotel, {
    engineRun,
    valuation: {
      estimated_value_eur: data.valuation.estimatedValue,
      valuation_range_low_eur: data.valuation.valuationRangeLow,
      valuation_range_high_eur: data.valuation.valuationRangeHigh,
      cap_rate_pct: data.valuation.capRate,
      per_key_eur: data.valuation.perRoom,
      per_sqm_eur: data.valuation.perSqmHotel,
      gop_margin_pct: data.valuation.gopMargin,
    },
    scenario_label: data.valuation.scenario,
    keys_from_heuristic: data.valuation.scenario?.includes("heurístico") ?? false,
    report_url: `/report/${reportId}/executive-summary`,
  });
  return { data, source: "canonical", canonical_id: session.canonical_id };
}

export default async function ExecutiveSummaryPage({ params }: PageProps) {
  const { data } = await loadExecutiveSummaryData(params.reportId);

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-0">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Executive Summary"
          titleSize="4xl"
          headerLayout="stacked"
          closed
        >
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 print:px-4 print:pt-3 print:pb-2">
            <AssetSection asset={data.asset} meta={data.meta} />
          </div>

          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <MarketSection data={data.marketMetrics} />
          </div>

          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <ValuationSection valuation={data.valuation} charts={data.charts} />
          </div>

          <MethodologicalNote />
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
