import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../hotel-toggle";
import {
  CapexScheduleCard,
  CapexTable,
  PropertyGallerySidebar,
  RenderConfigurator,
  ToggleSelector,
} from "@/components/report/asset-analysis/capex";
import { getMockCapexRenders } from "@/lib/report/capex-renders-data";
import {
  getCanonicalHotelById,
  resolveCanonicalIdAny,
} from "@/lib/report/canonical-reader";
import { buildCapexSlice, adaptCapexSliceToBreakdown } from "@/lib/report/report-object";

export const metadata: Metadata = {
  title: "CAPEX & Renders — HotelVALORA",
};

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams?: { canonical_id?: string; hotel_id?: string; ref?: string };
}

async function loadCapexData(searchParams: PageProps["searchParams"]) {
  const mock = getMockCapexRenders();

  const candidate = searchParams?.canonical_id || searchParams?.hotel_id || searchParams?.ref;
  const canonicalId = candidate ? await resolveCanonicalIdAny(candidate) : null;
  if (!canonicalId) return mock;

  const hotel = await getCanonicalHotelById(canonicalId);
  if (!hotel) return mock;

  const slice = buildCapexSlice(hotel);
  const rooms = hotel.total_keys ?? hotel.total_rooms ?? 150;
  const canonicalBreakdown = adaptCapexSliceToBreakdown(slice, rooms);

  // Mix · canonical-derived CAPEX breakdown + schedule, gallery + renders
  // remain mock until per-hotel curation lands (Phase E+).
  return {
    ...mock,
    hotelLabel: hotel.canonical_name ?? mock.hotelLabel,
    capex: canonicalBreakdown,
  };
}

export default async function CapexRendersPage({ searchParams = {} }: PageProps) {
  const data = await loadCapexData(searchParams);

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

          {/* CAPEX BREAKDOWN + PROPERTY GALLERY */}
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

      <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}
