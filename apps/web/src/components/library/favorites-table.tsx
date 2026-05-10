"use client";

import { memo, useMemo } from "react";
import { FileText, Star } from "lucide-react";
import { toast } from "sonner";
import { useLibraryStore } from "@/lib/library/store";
import { MOCK_LIBRARY_REPORTS } from "@/lib/library/mock-reports";
import type { LibraryReport, ReportCategory } from "@/types/library";
import { cn } from "@/lib/utils";
import { AmenityIconCell } from "./amenity-icon-cell";
import { ContactCell } from "./contact-cell";
import { LockedCell } from "./locked-cell";
import { ReportTypeChip } from "./report-type-chip";

// ── Helpers ─────────────────────────────────────────────────────────────────

const CATEGORY_LEGEND_KEY: Record<
  ReportCategory,
  "saved" | "community" | "topPromote"
> = {
  saved: "saved",
  community: "community",
  "top-promote": "topPromote",
};

const fmtEur = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return "—";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `€${Math.round(n / 1_000)}k`;
  return `€${n}`;
};

const fmtPct = (n: number | null | undefined): string =>
  n === null || n === undefined ? "—" : `${n.toFixed(1)}%`;

// ── Cell primitives ─────────────────────────────────────────────────────────

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex items-center gap-0.5 whitespace-nowrap">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={11}
          aria-hidden
          className={
            i < count
              ? "fill-amber-400 stroke-amber-400"
              : "stroke-slate-300"
          }
        />
      ))}
    </div>
  );
}

// ── Header cells ────────────────────────────────────────────────────────────

function Th({
  children,
  className,
  rowSpan,
  colSpan,
  sticky,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  rowSpan?: number;
  colSpan?: number;
  sticky?: boolean;
  accent?: "blue" | "emerald";
}) {
  return (
    <th
      scope="col"
      rowSpan={rowSpan}
      colSpan={colSpan}
      className={cn(
        "border-b border-slate-200 px-3 py-2 text-left align-middle text-[10px] font-bold uppercase tracking-widest text-slate-500",
        sticky && "sticky left-0 z-30 bg-slate-50",
        accent === "blue" && "bg-blue-50/40 text-blue-700",
        accent === "emerald" && "bg-emerald-50/40 text-emerald-800",
        !sticky && !accent && "bg-slate-50",
        className,
      )}
    >
      {children}
    </th>
  );
}

function SubTh({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "blue" | "emerald";
}) {
  return (
    <th
      scope="col"
      className={cn(
        "border-b border-slate-200 px-2 py-1.5 text-center align-middle text-[9px] font-semibold uppercase tracking-widest text-slate-400",
        accent === "blue" && "bg-blue-50/40",
        accent === "emerald" && "bg-emerald-50/40",
        !accent && "bg-slate-50",
        className,
      )}
    >
      {children}
    </th>
  );
}

// ── Row ─────────────────────────────────────────────────────────────────────

interface RowProps {
  report: LibraryReport;
  onSelect: (id: string) => void;
  showReferenceColumn: boolean;
}

const Td = ({
  children,
  className,
  accent,
}: {
  children: React.ReactNode;
  className?: string;
  accent?: "blue" | "emerald";
}) => (
  <td
    className={cn(
      "px-3 py-2.5 align-middle text-[12px] text-slate-700",
      accent === "blue" && "bg-blue-50/30",
      accent === "emerald" && "bg-emerald-50/20",
      className,
    )}
  >
    {children}
  </td>
);

const FavoritesRow = memo(function FavoritesRow({
  report,
  onSelect,
  showReferenceColumn,
}: RowProps) {
  const f = report.financials;
  return (
    <tr
      onClick={() => onSelect(report.id)}
      className="group cursor-pointer transition-colors hover:bg-slate-50"
    >
      {/* Hotel Name — sticky left */}
      <td className="sticky left-0 z-10 whitespace-nowrap border-r border-slate-100 bg-white px-3 py-2.5 align-middle text-[12px] font-bold text-forest-900 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.04)] group-hover:bg-slate-50">
        {report.hotelName}
      </td>

      {/* Category — star rating */}
      <Td className="whitespace-nowrap">
        <StarRating count={report.starRating} />
      </Td>

      {/* Rooms */}
      <Td className="text-center font-mono tabular-nums">{report.rooms}</Td>

      {/* Market */}
      <Td className="whitespace-nowrap">{report.city}</Td>

      {/* Amenities — 8 cells */}
      <Td className="border-l border-slate-100 text-center">
        <AmenityIconCell amenity="bar" active={report.amenities.bar} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="restaurant" active={report.amenities.restaurant} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="rooftop" active={report.amenities.rooftop} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="meetingRooms" active={report.amenities.meetingRooms} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="gym" active={report.amenities.gym} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="spa" active={report.amenities.spa} />
      </Td>
      <Td className="text-center">
        <AmenityIconCell amenity="pool" active={report.amenities.pool} />
      </Td>
      <Td className="border-r border-slate-100 text-center">
        <AmenityIconCell amenity="parking" active={report.amenities.parking} />
      </Td>

      {/* Open year */}
      <Td className="text-center text-slate-500">{report.listing.openYear}</Td>

      {/* Class */}
      <Td className="whitespace-nowrap text-center text-slate-500">
        {report.listing.classLabel}
      </Td>

      {/* Location score */}
      <Td className="text-center font-mono tabular-nums text-slate-600">
        {report.location.locationScore.toFixed(2)}
      </Td>

      {/* Address */}
      <Td className="whitespace-nowrap text-slate-500">
        {report.location.address}
      </Td>

      {/* ZIP */}
      <Td className="font-mono tabular-nums text-slate-500">
        {report.location.zip}
      </Td>

      {/* Country */}
      <Td className="text-center text-slate-500">{report.country}</Td>

      {/* Sub-Market */}
      <Td className="whitespace-nowrap text-slate-500">
        {report.location.subMarket}
      </Td>

      {/* Role */}
      <Td className="whitespace-nowrap text-center italic text-slate-500">
        {report.listing.role}
      </Td>

      {/* Objective */}
      <Td className="whitespace-nowrap text-slate-500">
        {report.listing.objective}
      </Td>

      {/* CAPEX (blue accent) */}
      <Td accent="blue" className="border-l border-blue-100 text-center font-semibold text-blue-700">
        {f.capex === null ? <LockedCell /> : fmtEur(f.capex)}
      </Td>

      {/* Total Invest — 3 cols */}
      <Td className="border-l border-slate-100 text-center font-bold text-forest-900">
        {f.totalInvest ? fmtEur(f.totalInvest.total) : <LockedCell />}
      </Td>
      <Td className="text-center text-slate-600">
        {f.totalInvest ? fmtEur(f.totalInvest.perRoom) : <LockedCell />}
      </Td>
      <Td className="border-r border-slate-100 text-center text-slate-600">
        {f.totalInvest ? fmtEur(f.totalInvest.perM2) : <LockedCell />}
      </Td>

      {/* Cap Rate (emerald accent) */}
      <Td accent="emerald" className="text-center font-bold text-emerald-700">
        {fmtPct(f.capRate)}
      </Td>

      {/* Market Value TTM — 3 cols (emerald accent) */}
      <Td accent="emerald" className="border-l border-emerald-100 text-center font-bold text-forest-900">
        {fmtEur(f.marketValueTtm.total)}
      </Td>
      <Td accent="emerald" className="text-center font-medium text-emerald-900">
        {fmtEur(f.marketValueTtm.perRoom)}
      </Td>
      <Td accent="emerald" className="border-r border-emerald-100 text-center font-medium text-emerald-900">
        {fmtEur(f.marketValueTtm.perM2)}
      </Td>

      {/* Exit year */}
      <Td className="text-center text-slate-600">
        {f.exitYear ?? <LockedCell />}
      </Td>

      {/* Exit Price — 3 cols */}
      <Td className="border-l border-slate-100 text-center font-bold text-forest-900">
        {f.exitPrice ? fmtEur(f.exitPrice.total) : <LockedCell />}
      </Td>
      <Td className="text-center text-slate-600">
        {f.exitPrice ? fmtEur(f.exitPrice.perRoom) : <LockedCell />}
      </Td>
      <Td className="border-r border-slate-100 text-center text-slate-600">
        {f.exitPrice ? fmtEur(f.exitPrice.perM2) : <LockedCell />}
      </Td>

      {/* Yield */}
      <Td className="text-center font-bold text-emerald-700">
        {f.yield === null ? <LockedCell /> : fmtPct(f.yield)}
      </Td>

      {/* IRR Project */}
      <Td className="text-center font-extrabold text-emerald-800">
        {f.irrProject === null ? <LockedCell /> : fmtPct(f.irrProject)}
      </Td>

      {/* IRR Equity (blue accent) */}
      <Td accent="blue" className="text-center font-extrabold text-blue-700">
        {f.irrEquity === null ? <LockedCell /> : fmtPct(f.irrEquity)}
      </Td>

      {/* REF (Top Reports list only) */}
      {showReferenceColumn && (
        <Td className="border-l border-slate-100 font-mono text-[11px] text-slate-500">
          {report.referenceCode}
        </Td>
      )}

      {/* Report Type + indicators */}
      <Td className="whitespace-nowrap">
        <ReportTypeChip type={report.reportType} indicators={report.indicators} />
      </Td>

      {/* Contact — hover-popover for top-promoted reports */}
      <Td className="text-center">
        <ContactCell report={report} />
      </Td>

      {/* Star (favorited) */}
      <Td className="text-center">
        <Star
          size={16}
          aria-hidden
          className={
            report.favorited
              ? "fill-amber-400 stroke-amber-400"
              : "stroke-slate-300"
          }
        />
      </Td>

      {/* PDF */}
      <Td className="text-center">
        <FileText
          size={16}
          aria-hidden
          className={report.hasPdf ? "text-forest-700" : "text-slate-300"}
        />
      </Td>
    </tr>
  );
});

// ── Table ───────────────────────────────────────────────────────────────────

export interface FavoritesTableProps {
  /** Insert a REF column (HV-YYYY-NNN) just before "Report Type". Used by
   *  /library/top-list. Default: false. */
  showReferenceColumn?: boolean;
}

export function FavoritesTable({
  showReferenceColumn = false,
}: FavoritesTableProps = {}) {
  const legend = useLibraryStore((s) => s.legend);
  const search = useLibraryStore((s) => s.searchQuery);
  const setSelected = useLibraryStore((s) => s.setSelectedReportId);

  const visible = useMemo<LibraryReport[]>(() => {
    const q = search.trim().toLowerCase();
    return MOCK_LIBRARY_REPORTS.filter((r) => {
      if (!legend[CATEGORY_LEGEND_KEY[r.category]]) return false;
      if (
        q &&
        !r.hotelName.toLowerCase().includes(q) &&
        !r.city.toLowerCase().includes(q) &&
        !r.location.subMarket.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [legend, search]);

  const handleRowSelect = (id: string) => {
    setSelected(id);
    toast.message("Report detail view coming soon", {
      description: "Will open the underwriting report for this asset.",
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_20px_40px_rgba(0,51,30,0.06)]">
      <div className="library-list-scroll flex-1 overflow-auto">
        <table className="w-full min-w-[4500px] border-collapse text-left">
          <thead className="sticky top-0 z-40 bg-slate-50">
            {/* Row 1 — top headers (with rowSpan / colSpan groups) */}
            <tr className="border-b border-slate-200 shadow-sm">
              <Th rowSpan={2} sticky className="border-r border-slate-200">
                Hotel Name
              </Th>
              <Th rowSpan={2}>Category</Th>
              <Th rowSpan={2} className="text-center">
                Rooms
              </Th>
              <Th rowSpan={2}>Market</Th>
              <Th colSpan={8} className="border-x border-slate-100 text-center">
                Amenities &amp; Services
              </Th>
              <Th rowSpan={2}>Open date</Th>
              <Th rowSpan={2}>Class</Th>
              <Th rowSpan={2} className="text-center">
                Location score
              </Th>
              <Th rowSpan={2}>Address</Th>
              <Th rowSpan={2}>ZIP</Th>
              <Th rowSpan={2}>Country</Th>
              <Th rowSpan={2}>Sub-Market</Th>
              <Th rowSpan={2} className="text-center">
                Role
              </Th>
              <Th rowSpan={2}>Objective</Th>
              <Th rowSpan={2} accent="blue">
                CAPEX
              </Th>
              <Th colSpan={3} className="border-x border-slate-100 text-center">
                Total Invest
              </Th>
              <Th rowSpan={2} accent="emerald">
                Cap. Rate
              </Th>
              <Th colSpan={3} accent="emerald" className="border-x border-emerald-100 text-center">
                Market Value TTM
              </Th>
              <Th rowSpan={2}>Exit year</Th>
              <Th colSpan={3} className="border-x border-slate-100 text-center">
                Exit Price
              </Th>
              <Th rowSpan={2} accent="emerald">
                Yield
              </Th>
              <Th rowSpan={2} accent="emerald">
                IRR Project
              </Th>
              <Th rowSpan={2} accent="blue">
                IRR Equity
              </Th>
              {showReferenceColumn && <Th rowSpan={2}>REF</Th>}
              <Th rowSpan={2}>Report Type</Th>
              <Th rowSpan={2} className="text-center">
                Contact
              </Th>
              <Th rowSpan={2} className="text-center">
                ⭐
              </Th>
              <Th rowSpan={2} className="text-center">
                PDF
              </Th>
            </tr>
            {/* Row 2 — sub-headers for grouped columns */}
            <tr className="border-b border-slate-200">
              <SubTh className="border-r border-slate-100">Bar</SubTh>
              <SubTh className="border-r border-slate-100">Rest.</SubTh>
              <SubTh className="border-r border-slate-100">Roof</SubTh>
              <SubTh className="border-r border-slate-100">Meet.</SubTh>
              <SubTh className="border-r border-slate-100">Gym</SubTh>
              <SubTh className="border-r border-slate-100">Spa</SubTh>
              <SubTh className="border-r border-slate-100">Pool</SubTh>
              <SubTh>Park.</SubTh>
              <SubTh className="border-l border-slate-100">Total</SubTh>
              <SubTh>(€) room</SubTh>
              <SubTh className="border-r border-slate-100">(€) m²</SubTh>
              <SubTh accent="emerald">Hotel Value</SubTh>
              <SubTh accent="emerald">(€) room</SubTh>
              <SubTh accent="emerald">(€) m²</SubTh>
              <SubTh className="border-l border-slate-100">Exit</SubTh>
              <SubTh>(€) room</SubTh>
              <SubTh className="border-r border-slate-100">(€) m²</SubTh>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visible.length > 0 ? (
              visible.map((r) => (
                <FavoritesRow
                  key={r.id}
                  report={r}
                  onSelect={handleRowSelect}
                  showReferenceColumn={showReferenceColumn}
                />
              ))
            ) : (
              <tr>
                <td
                  colSpan={showReferenceColumn ? 37 : 36}
                  className="px-4 py-10 text-center text-[13px] text-slate-500"
                >
                  No reports match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
          Showing {visible.length} of {MOCK_LIBRARY_REPORTS.length} hotels
        </span>
      </footer>
    </div>
  );
}
