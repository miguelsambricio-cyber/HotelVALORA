import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { CompetitiveSetTable } from "@/components/report/competitive-set/competitive-set-table";
import { HotelGalleryGrid } from "@/components/report/competitive-set/hotel-gallery-grid";
import { PrimeToggle } from "@/components/report/competitive-set/prime-toggle";
import {
  getMockCompetitiveSet,
  type CompetitiveSetData,
} from "@/lib/report/competitive-set-data";
import { getCanonicalHotelById } from "@/lib/report/canonical-reader";
import { mapCanonicalToCompetitiveSet } from "@/lib/report/canonical-mappers/competitive-set";
import { getReportById } from "@/lib/report/report-session";

export const metadata: Metadata = {
  title: "Competitive Set — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  params: { reportId: string };
}

async function loadCompetitiveSetData(
  reportId: string,
): Promise<{ data: CompetitiveSetData; source: "canonical" | "mock" }> {
  const session = await getReportById(reportId);
  if (!session) return { data: getMockCompetitiveSet(), source: "mock" };
  const hotel = await getCanonicalHotelById(session.canonical_id);
  if (!hotel) return { data: getMockCompetitiveSet(), source: "mock" };
  const data = await mapCanonicalToCompetitiveSet(hotel);
  return { data, source: "canonical" };
}

export default async function CompetitiveSetPage({ params }: PageProps) {
  const { data } = await loadCompetitiveSetData(params.reportId);

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-0">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Competitive Set"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={<PrimeToggle />}
        >
          <div className="px-8 pt-6 pb-4 print:px-4 print:pt-3 print:pb-2">
            <CompetitiveSetTable properties={data.properties} />
          </div>

          <div className="px-8 pt-2 pb-8 print:px-4 print:pb-4">
            <HotelGalleryGrid images={data.gallery} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
