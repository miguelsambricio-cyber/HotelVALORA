"use client";

import { cn } from "@/lib/utils";
import type { LibraryReport, ReportCategory } from "@/types/library";

export interface HotelMapMarkerProps {
  report: LibraryReport;
  selected: boolean;
  onSelect: (id: string) => void;
}

const CATEGORY_DOT: Record<ReportCategory, string> = {
  saved: "bg-forest-900 ring-forest-700/40",
  community: "bg-blue-700 ring-blue-200/70",
  "top-promote": "bg-lime-300 ring-lime-300/40",
};

const CATEGORY_TIP: Record<ReportCategory, string> = {
  saved: "bg-forest-900 text-white",
  community: "bg-blue-700 text-white",
  "top-promote": "bg-lime-300 text-forest-900",
};

/**
 * Single marker rendered over the static institutional grayscale map.
 * Position uses `mockPosition` (top%, left%) — these will be replaced by
 * a real lat/lng projection once a map provider is wired.
 *
 * The TOP PROMOTE marker pulses softly to draw the eye, matching the
 * Stitch reference behaviour.
 */
export function HotelMapMarker({
  report,
  selected,
  onSelect,
}: HotelMapMarkerProps) {
  const { topPct, leftPct } = report.mockPosition;
  const isPromoted = report.category === "top-promote";

  return (
    <button
      type="button"
      onClick={() => onSelect(report.id)}
      aria-pressed={selected}
      aria-label={`Select ${report.hotelName}`}
      className="group pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer focus:outline-none"
      style={{ top: `${topPct}%`, left: `${leftPct}%` }}
    >
      <span className="relative flex">
        <span
          className={cn(
            "block h-3 w-3 rounded-full ring-[3px] transition-transform",
            CATEGORY_DOT[report.category],
            isPromoted && "animate-pulse",
            selected && "scale-125 ring-[5px]",
            "group-hover:scale-110",
            "group-focus-visible:ring-blue-700/40",
          )}
        />
        <span
          className={cn(
            "absolute bottom-full left-1/2 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg px-2 py-1 text-[10px] font-bold opacity-0 shadow-md transition-opacity",
            "group-hover:opacity-100 group-focus-visible:opacity-100",
            selected && "opacity-100",
            CATEGORY_TIP[report.category],
          )}
        >
          {report.hotelName}
        </span>
      </span>
    </button>
  );
}
