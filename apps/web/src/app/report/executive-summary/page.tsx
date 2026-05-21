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
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";
import { mapCanonicalToExecutiveSummary } from "@/lib/report/canonical-mappers/executive-summary";
import { runForHotel } from "@/lib/report/underwriting-runner";
import { upsertHotelReportLibrary } from "@/lib/report/library-persistence";

export const metadata = {
  title: "Executive Summary — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: {
    /** Supabase canonical UUID · primary route. */
    canonical_id?: string;
    /** Synthetic snapshot hotel_id (`h_<hex>`) · resolved via multi-path matcher. */
    hotel_id?: string;
    /** Operator-friendly fallback (e.g. ?reportId=demo-report-001) · keeps mock visible. */
    reportId?: string;
  };
}

async function loadExecutiveSummaryData(
  searchParams: PageProps["searchParams"],
): Promise<{ data: ExecutiveSummaryData; source: "canonical" | "mock"; canonical_id?: string }> {
  // Phase 4 · resolve to a canonical hotel id when either param is present
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
      const data = mapCanonicalToExecutiveSummary(hotel, marketKpi);
      // Persist the report row into hotel_report_library · awaits so
      // production library stays consistent with rendered reports.
      // Errors swallowed inside the helper · never block UI.
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
        report_url: `/report/executive-summary?canonical_id=${canonicalId}`,
      });
      return { data, source: "canonical", canonical_id: canonicalId };
    }
  }
  // Fallback · keep demo content visible when no canonical_id resolves
  return {
    data: getMockExecutiveSummary(searchParams?.reportId ?? "demo-report-001"),
    source: "mock",
  };
}

export default async function ExecutiveSummaryPage({ searchParams = {} }: PageProps) {
  const { data } = await loadExecutiveSummaryData(searchParams);

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-0">
        {/* Paper card · canonical institutional header treatment ·
            lowercase eyebrow · stacked headerLayout · closed card ·
            4xl title · matches the 8 sibling /report/* surfaces and
            the Madrid Centro full-report chained version. */}
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Executive Summary"
          titleSize="4xl"
          headerLayout="stacked"
          closed
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
