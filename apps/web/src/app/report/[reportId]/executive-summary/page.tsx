import { getMockExecutiveSummary } from "@/lib/report/executive-summary-data";
import { getSectionById } from "@/lib/report/sections";
import { SectionNav } from "@/components/report/sections/section-nav";
import { AssetSection } from "@/components/report/executive-summary/asset-section";
import { MarketSection } from "@/components/report/executive-summary/market-section";
import { ValuationSection } from "@/components/report/executive-summary/valuation-section";
import { ActionBar } from "@/components/report/executive-summary/action-bar";

interface Props {
  params: { reportId: string };
}

export default function ExecutiveSummaryPage({ params }: Props) {
  const data = getMockExecutiveSummary(params.reportId);

  return (
    <div className="p-6 md:p-8">
      {/* ── Paper card ──────────────────────────────────────────────────── */}
      <div className="bg-white shadow-2xl border-x border-t border-blue-100 rounded-t-xl overflow-hidden graph-paper max-w-5xl mx-auto">

        {/* Paper header */}
        <div className="p-8 border-b border-blue-200 bg-white/95">
          <div className="mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
              hotel valuation
            </span>
            <h2 className="text-4xl font-extrabold text-forest-900 font-display tracking-tighter leading-none mt-1">
              Executive Summary
            </h2>
          </div>
        </div>

        {/* Three sub-sections */}
        <div className="px-8 py-6 space-y-12">
          <AssetSection asset={data.asset} meta={data.meta} />
          <MarketSection data={data.marketMetrics} />
          <ValuationSection valuation={data.valuation} charts={data.charts} />
        </div>

        {/* Methodological note */}
        <div className="p-8 border-t border-slate-200 bg-white/95">
          <p className="text-[11px] leading-relaxed text-slate-500 font-medium border-l-4 border-emerald-500 pl-4">
            <strong className="text-forest-900 block mb-1">Methodological Note:</strong>
            Valoración estimada con modelo dinámico v4.1 basado en parámetros operativos del activo y
            transacciones hoteleras del submercado. Calculations assume standardized accounting USALI.
            El Cap Rate se calcula sobre EBITDA after replacement. This valuation report is generated
            by HotelVALORA Institutional algorithms based on market data up to August 2024. This is an
            automated assessment with actual market data and does not substitute a formal RICS-certified
            appraisal.
          </p>
        </div>
      </div>

      {/* ── Action bar + section nav ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto mt-0">
        <ActionBar totalPages={1} />
      </div>

      <SectionNav
        reportId={params.reportId}
        currentSectionId="executive-summary"
        className="mt-6 max-w-5xl mx-auto"
      />
    </div>
  );
}

export function generateMetadata() {
  return { title: "Resumen Ejecutivo — HotelVALORA" };
}
