import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { UnderwritingShell } from "@/components/underwriting/underwriting-shell";
import { getHotelBundle } from "@/lib/hotels/bundle-resolver";
import {
  getHotelRegistryEntry,
  getMadridCentroHotels,
  type HotelId,
} from "@/lib/hotels/madrid-centro-registry";

interface PageProps {
  params: { hotelId: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const entry = getHotelRegistryEntry(params.hotelId as HotelId);
  const name = entry?.profile.display_name ?? "Madrid Centro Hotel";
  return {
    title: `${name} · Underwriting · HotelVALORA`,
    description: `Institutional underwriting memorandum for ${name} · engine 0.2.0 · 8 sections · live cap-rate engine.`,
  };
}

export function generateStaticParams() {
  return getMadridCentroHotels().map((h) => ({ hotelId: h.id }));
}

/**
 * /madrid-centro/[hotelId]
 *
 * Per-hotel underwriting memorandum · resolves the registry entry into
 * an UnderwritingBundle via the bundle-resolver, then renders the
 * canonical UnderwritingShell against it. The shell is untouched · the
 * only thing that changes between hotels is the `bundle` prop.
 *
 * Boundary: ADDITIVE · this route mirrors the surface of
 * /report/financials/underwriting but binds to a registry-resolved
 * bundle instead of SCENARIO_BASE. The underwriting baseline (the
 * /report/financials/underwriting page) remains untouched per freeze.
 */
export default function MadridCentroHotelPage({ params }: PageProps) {
  const entry = getHotelRegistryEntry(params.hotelId as HotelId);
  if (!entry) {
    notFound();
  }

  const bundle = getHotelBundle(params.hotelId as HotelId);
  if (!bundle) {
    notFound();
  }

  const submarket = entry.profile.submarket;
  const displayName = entry.profile.display_name;

  const headerActions = (
    <div className="flex flex-wrap items-center gap-3 print:gap-3">
      <Link
        href="/madrid-centro"
        className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-600 underline-offset-4 hover:underline print:hidden"
      >
        ← All hotels
      </Link>
      <span className="hidden h-3 w-px bg-slate-300 print:hidden sm:block" />
      <span className="text-xl font-bold text-slate-700 font-headline print:text-base">
        {displayName}
      </span>
    </div>
  );

  return (
    <ReportShell printOrientation="landscape">
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel={`madrid centro · ${submarket.toLowerCase()}`}
          title="Underwriting"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
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
