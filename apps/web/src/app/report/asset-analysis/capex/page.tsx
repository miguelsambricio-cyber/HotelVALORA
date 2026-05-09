import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { HotelToggle } from "../hotel-toggle";
import {
  CapexScheduleCard,
  CapexTable,
  PropertyGallerySidebar,
  RenderConfigurator,
  ToggleSelector,
} from "@/components/report/asset-analysis/capex";
import { getMockCapexRenders } from "@/lib/report/capex-renders-data";

export const metadata: Metadata = {
  title: "CAPEX & Renders — HotelVALORA",
};

export default function CapexRendersPage() {
  const data = getMockCapexRenders();

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
      <ReportPaper
        sectionLabel="hotel valuation"
        title="CAPEX & Renders"
        titleSize="4xl"
        headerLayout="stacked"
        closed
        actions={headerActions}
      >
        <div className="px-8 py-6 print:px-4 print:py-3">
          {/* CAPEX TABS — basic vs custom */}
          <ToggleSelector
            options={data.capexModes}
            defaultSelectedId={data.capexMode}
            size="md"
            className="mb-5"
          />

          {/* CAPEX BREAKDOWN + PROPERTY GALLERY
             Left column carries TOTAL CAPEX → Hard / Soft / Project Costs →
             CAPEX Schedule (as a 5th card). Right column is the fixed-width
             Property Gallery. items-start so neither column stretches the
             other vertically. */}
          <div className="grid items-start gap-5 grid-cols-1 lg:grid-cols-[minmax(0,1fr)_250px] print:grid-cols-[minmax(0,1fr)_250px]">
            <div className="min-w-0 space-y-4">
              <CapexTable breakdown={data.capex} />
              <CapexScheduleCard schedule={data.schedule} />
            </div>
            <PropertyGallerySidebar data={data.gallery} />
          </div>

          {/* RENDERS — full-width, AI configurator (no-print by design) */}
          <section
            id="renders"
            className="mt-8 pt-6 border-t border-slate-200 print:hidden"
          >
            <h3 className="text-xl font-bold text-forest-900 font-headline tracking-tight mb-6 flex items-center gap-2">
              Renders - Configuración IA
              <Sparkles size={20} className="text-amber-500" />
            </h3>
            <RenderConfigurator state={data.renderConfig} />
          </section>
        </div>
      </ReportPaper>
    </ReportShell>
  );
}
