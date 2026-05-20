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
import {
  getCanonicalHotelById,
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";
import { mapCanonicalToCompetitiveSet } from "@/lib/report/canonical-mappers/competitive-set";

export const metadata: Metadata = {
  title: "Competitive Set — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string };
}

async function loadCompetitiveSetData(
  searchParams: PageProps["searchParams"],
): Promise<{ data: CompetitiveSetData; source: "canonical" | "mock" }> {
  let canonicalId = searchParams?.canonical_id?.trim() || null;
  if (!canonicalId && searchParams?.hotel_id) {
    canonicalId = await resolveCanonicalIdFromSnapshotHotelId(searchParams.hotel_id.trim());
  }
  if (canonicalId) {
    const hotel = await getCanonicalHotelById(canonicalId);
    if (hotel) {
      const data = await mapCanonicalToCompetitiveSet(hotel);
      return { data, source: "canonical" };
    }
  }
  return { data: getMockCompetitiveSet(), source: "mock" };
}

export default async function CompetitiveSetPage({ searchParams = {} }: PageProps) {
  const { data } = await loadCompetitiveSetData(searchParams);

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-0">
        {/* Canonical institutional header · lowercase eyebrow ·
            stacked layout · closed card · matches the 9 sibling
            /report/* surfaces. The `headerRight` prop (legacy alias)
            is replaced with the canonical `actions` prop. */}
        <ReportPaper
          sectionLabel="hotel valuation"
          title="Competitive Set"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={<PrimeToggle />}
        >
          {/* Section 1 — Comparison table */}
          <div className="px-8 pt-6 pb-4 print:px-4 print:pt-3 print:pb-2">
            <CompetitiveSetTable properties={data.properties} />
          </div>

          {/* Section 2 — Gallery grid */}
          <div className="px-8 pt-2 pb-8 print:px-4 print:pb-4">
            <HotelGalleryGrid images={data.gallery} />
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
