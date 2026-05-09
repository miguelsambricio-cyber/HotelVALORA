import type { Metadata } from "next";
import { Suspense } from "react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import { PLContent } from "./pl-content";

export const metadata: Metadata = {
  title: "P&L 5 Years — HotelVALORA",
};

/**
 * Server component shell — pre-renders the institutional framing
 * (sidebar, paper card, header, ActionBar) at build time so the user sees
 * the full layout instantly. The interactive body (`<PLContent />`)
 * hydrates inside `<Suspense>` because it reads `useSearchParams` via
 * `useTier()` for the tier-mode override.
 */
export default function PLPage() {
  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        Prime
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="P&L 5 Years"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 print:px-3 print:py-2">
            <Suspense fallback={null}>
              <PLContent />
            </Suspense>
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
