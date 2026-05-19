import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";

import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";

import { AssetSection } from "@/components/report/executive-summary/asset-section";
import { MarketSection } from "@/components/report/executive-summary/market-section";
import { ValuationSection } from "@/components/report/executive-summary/valuation-section";
import { MethodologicalNote } from "@/components/report/ui/methodological-note";

import {
  AssetMetricsTable,
  FacilitiesCard,
  RoomMixCard,
  GuestInsightsCard,
  PropertyImageCard,
  PropertyGallery,
  MethodologyNote,
} from "@/components/report/asset-analysis";

import { CompetitiveSetTable } from "@/components/report/competitive-set/competitive-set-table";
import { HotelGalleryGrid } from "@/components/report/competitive-set/hotel-gallery-grid";

import {
  CorporateSportsCard,
  DemandGeneratorsBlock,
  DemandGeneratorsGallery,
  HorizontalInsightScroller,
  MarketInsightCard,
} from "@/components/report/market-overview";

import { PLContent } from "@/app/report/financials/pl/pl-content";
import { UnderwritingShell } from "@/components/underwriting/underwriting-shell";

import { getMockExecutiveSummary } from "@/lib/report/executive-summary-data";
import { getMockAssetAnalysis } from "@/lib/report/asset-analysis-data";
import { getMockCompetitiveSet } from "@/lib/report/competitive-set-data";
import { getMockMarketOverview } from "@/lib/report/market-overview-data";

import { getHotelBundle } from "@/lib/hotels/bundle-resolver";
import {
  getHotelRegistryEntry,
  getMadridCentroHotels,
  type HotelId,
} from "@/lib/hotels/madrid-centro-registry";
import {
  overlayExecutiveSummary,
  overlayAssetAnalysis,
  overlayCompetitiveSet,
  overlayMarketOverview,
} from "@/lib/hotels/hotel-aware-overlays";

interface PageProps {
  params: { hotelId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const entry = getHotelRegistryEntry(params.hotelId as HotelId);
  const name = entry?.profile.display_name ?? "Madrid Centro Hotel";
  return {
    title: `${name} · Institutional Report · HotelVALORA`,
    description: `Full institutional memorandum for ${name} · executive summary · asset · compset · market · financials · underwriting (engine 0.2.0).`,
  };
}

export function generateStaticParams() {
  return getMadridCentroHotels().map((h) => ({ hotelId: h.id }));
}

/**
 * /madrid-centro/[hotelId]/full-report
 *
 * End-to-end institutional memorandum · 6 chained sections in a single
 * landscape canvas:
 *
 *   01 · Executive Summary       (illustrative dataset)
 *   02 · Asset Analysis          (illustrative dataset)
 *   03 · Competitive Set         (illustrative dataset)
 *   04 · Market Overview         (illustrative dataset)
 *   05 · Financials · P&L 5Y     (illustrative dataset)
 *   06 · Underwriting Memo       (live engine · hotel-resolved bundle)
 *
 * Honest institutional disclosure: only Section 06 (Underwriting) is
 * hotel-aware via the bundle resolver today; the other 5 sections
 * surface the canonical mock dataset while per-hotel wiring lands in
 * subsequent integration phases (Phase C wiring · Phase E intelligence
 * layer).
 *
 * Boundary: ADDITIVE composition · reuses every section component
 * untouched · zero modification to existing report pages · zero touch
 * on the underwriting baseline freeze.
 */
export default function MadridCentroFullReport({ params }: PageProps) {
  const entry = getHotelRegistryEntry(params.hotelId as HotelId);
  if (!entry) notFound();

  const bundle = getHotelBundle(params.hotelId as HotelId);
  if (!bundle) notFound();

  const profile = entry.profile;

  // Per-section mock data overlaid with hotel context (Phase E).
  // The deeper illustrative fields remain canonical · only the
  // identity-bearing surfaces (name · submarket · category · keys ·
  // total sqm · room mix totals) are contextualised per hotel.
  const hotelId = profile.id;
  const execData = overlayExecutiveSummary(getMockExecutiveSummary("demo-report-001"), hotelId);
  const assetData = overlayAssetAnalysis(getMockAssetAnalysis(), hotelId);
  const compsetData = overlayCompetitiveSet(getMockCompetitiveSet(), hotelId);
  const marketData = overlayMarketOverview(getMockMarketOverview(), hotelId);

  const hotelHeaderLabel = (
    <div className="flex flex-wrap items-center gap-3 print:gap-3">
      <Link
        href="/madrid-centro"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 underline-offset-4 hover:underline print:hidden"
      >
        ← All hotels
      </Link>
      <span className="hidden h-3 w-px bg-slate-300 print:hidden sm:block" />
      <span className="font-headline text-base font-bold text-slate-700 print:text-sm">
        {profile.display_name}
      </span>
      <Link
        href={`/madrid-centro/${profile.id}`}
        className="ml-auto font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-[#005db7] underline-offset-4 hover:underline print:hidden"
      >
        Underwriting only ↗
      </Link>
    </div>
  );

  return (
    <ReportShell printOrientation="landscape">
      <div className="space-y-6 print:space-y-3">
        {/* ── Hotel context band · top of memo · institutional opening ── */}
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm print:border-0 print:shadow-none print:px-4 print:py-3">
          <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
            Institutional Memorandum · Madrid Centro
          </p>
          <h1 className="mt-2 font-headline text-2xl font-extrabold tracking-tight text-forest-900 print:text-xl">
            {profile.display_name}
          </h1>
          <p className="mt-2 max-w-3xl font-mono text-[12px] leading-relaxed text-slate-700">
            {profile.positioning}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[10.5px]">
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Submarket:</dt>
              <dd className="font-bold text-slate-900">{profile.submarket}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Category:</dt>
              <dd className="font-bold text-slate-900">{profile.category.replace("star", "★")}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Keys:</dt>
              <dd className="font-bold text-slate-900">{profile.rooms}</dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-slate-500">State:</dt>
              <dd className="font-bold text-slate-900 capitalize">
                {profile.state.replace("_", " ")}
              </dd>
            </div>
            <div className="flex gap-1.5">
              <dt className="text-slate-500">Engine:</dt>
              <dd className="font-bold text-slate-900">v{bundle.engine_version}</dd>
            </div>
          </dl>
          <p className="mt-3 font-mono text-[9.5px] italic leading-relaxed text-slate-500">
            Illustrative institutional dataset · Sections 01–05 carry per-hotel
            identity overlay (name · submarket · category · keys · gross building)
            on top of the canonical reference fields · Live market intelligence
            integration in progress. Section 06 (Underwriting Memo) is fully
            hotel-resolved via engine 0.2.0.
          </p>
        </div>

        {/* ── 01 · Executive Summary ─────────────────────────────────── */}
        <ReportPaper sectionLabel="01 · hotel valuation" title="Executive Summary" actions={hotelHeaderLabel}>
          <div className="px-8 pt-8 pb-6 border-b border-slate-100 print:px-4 print:pt-3 print:pb-2">
            <AssetSection asset={execData.asset} meta={execData.meta} />
          </div>
          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <MarketSection data={execData.marketMetrics} />
          </div>
          <div className="px-8 py-6 border-b border-slate-100 print:px-4 print:py-2">
            <ValuationSection valuation={execData.valuation} charts={execData.charts} />
          </div>
          <MethodologicalNote />
        </ReportPaper>

        {/* ── 02 · Asset Analysis ────────────────────────────────────── */}
        <ReportPaper
          sectionLabel="02 · hotel valuation"
          title="Asset Analysis"
          titleSize="4xl"
          headerLayout="stacked"
          closed
        >
          <div className="px-8 py-6 print:px-4 print:py-3">
            <div className="grid grid-cols-1 md:grid-cols-10 print:grid-cols-10 gap-8 print:gap-4 items-start">
              <div className="md:col-span-6 print:col-span-6 flex flex-col">
                <AssetMetricsTable rows={assetData.metrics} />
                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3 items-stretch">
                  <FacilitiesCard items={assetData.facilities} />
                  <RoomMixCard rows={assetData.roomMix} />
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3 items-stretch">
                  <GuestInsightsCard
                    tone="positive"
                    title="Lo que más gusta a los huéspedes"
                    body={assetData.guestInsights.positive}
                  />
                  <GuestInsightsCard
                    tone="negative"
                    title="Lo que menos gusta a los huéspedes"
                    body={assetData.guestInsights.negative}
                  />
                </div>
                <MethodologyNote />
              </div>
              <div className="md:col-span-4 print:col-span-4 flex flex-col gap-4">
                <PropertyImageCard src={assetData.media.heroImage} tabs={assetData.media.heroTabs} />
                <PropertyGallery
                  label={assetData.media.galleryLabel}
                  images={assetData.media.galleryImages}
                  className="mt-8 print:mt-4"
                />
              </div>
            </div>
          </div>
        </ReportPaper>

        {/* ── 03 · Competitive Set ───────────────────────────────────── */}
        <ReportPaper sectionLabel="03 · hotel valuation" title="Competitive Set" titleSize="4xl">
          <div className="px-8 pt-6 pb-4 print:px-4 print:pt-3 print:pb-2">
            <CompetitiveSetTable properties={compsetData.properties} />
          </div>
          <div className="px-8 pt-2 pb-8 print:px-4 print:pb-4">
            <HotelGalleryGrid images={compsetData.gallery} />
          </div>
        </ReportPaper>

        {/* ── 04 · Market Overview ───────────────────────────────────── */}
        <ReportPaper
          sectionLabel="04 · hotel valuation"
          title="Market Overview"
          titleSize="4xl"
          headerLayout="stacked"
          closed
        >
          <div className="px-8 py-6 print:px-3 print:py-2 space-y-8 print:space-y-3">
            <HorizontalInsightScroller>
              {marketData.insights.map((insight) => (
                <MarketInsightCard key={insight.scope} insight={insight} />
              ))}
            </HorizontalInsightScroller>
            <CorporateSportsCard data={marketData.corporateSports} />
            <DemandGeneratorsBlock data={marketData.demandGenerators} />
            <DemandGeneratorsGallery tiles={marketData.gallery} />
          </div>
        </ReportPaper>

        {/* ── 05 · Financials · P&L 5-Year Forecast ──────────────────── */}
        <ReportPaper
          sectionLabel="05 · hotel valuation"
          title="5-Year P&L Forecast"
          titleSize="4xl"
          headerLayout="stacked"
          closed
        >
          <div className="px-8 py-6 print:px-3 print:py-2">
            <Suspense fallback={null}>
              <PLContent />
            </Suspense>
          </div>
        </ReportPaper>

        {/* ── 06 · Underwriting Memo · live hotel-resolved bundle ────── */}
        <ReportPaper
          sectionLabel="06 · hotel valuation"
          title="Underwriting"
          titleSize="4xl"
          headerLayout="stacked"
          closed
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
