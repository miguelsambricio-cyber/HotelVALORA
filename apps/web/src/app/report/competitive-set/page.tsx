import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { CompetitiveSetTable } from "@/components/report/competitive-set/competitive-set-table";
import { HotelGalleryGrid } from "@/components/report/competitive-set/hotel-gallery-grid";
import { PrimeToggle } from "@/components/report/competitive-set/prime-toggle";
import { getMockCompetitiveSet } from "@/lib/report/competitive-set-data";

export const metadata: Metadata = {
  title: "Competitive Set — HotelVALORA",
};

export default function CompetitiveSetPage() {
  const data = getMockCompetitiveSet();

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
