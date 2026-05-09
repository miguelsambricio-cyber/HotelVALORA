import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import {
  AssetMetricsTable,
  FacilitiesCard,
  RoomMixCard,
  GuestInsightsCard,
  PropertyImageCard,
  PropertyGallery,
  MethodologyNote,
} from "@/components/report/asset-analysis";
import { getMockAssetAnalysis } from "@/lib/report/asset-analysis-data";
import { HotelToggle } from "./hotel-toggle";

export const metadata: Metadata = {
  title: "Asset Analysis — HotelVALORA",
};

export default function AssetAnalysisPage() {
  const data = getMockAssetAnalysis();

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
      <div className="space-y-6 print:space-y-0">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Asset Analysis"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-4 print:py-3">
            <div className="grid grid-cols-1 md:grid-cols-10 print:grid-cols-10 gap-8 print:gap-4 items-start">
              {/* Left column — 60% */}
              <div className="md:col-span-6 print:col-span-6 flex flex-col">
                <AssetMetricsTable rows={data.metrics} />

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3 items-stretch">
                  <FacilitiesCard items={data.facilities} />
                  <RoomMixCard rows={data.roomMix} />
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6 print:gap-3 items-stretch">
                  <GuestInsightsCard
                    tone="positive"
                    title="Lo que más gusta a los huéspedes"
                    body={data.guestInsights.positive}
                  />
                  <GuestInsightsCard
                    tone="negative"
                    title="Lo que menos gusta a los huéspedes"
                    body={data.guestInsights.negative}
                  />
                </div>

                <MethodologyNote />
              </div>

              {/* Right column — 40% */}
              <div className="md:col-span-4 print:col-span-4 flex flex-col gap-4">
                <PropertyImageCard
                  src={data.media.heroImage}
                  tabs={data.media.heroTabs}
                />

                <PropertyGallery
                  label={data.media.galleryLabel}
                  images={data.media.galleryImages}
                  className="mt-8 print:mt-4"
                />
              </div>
            </div>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
