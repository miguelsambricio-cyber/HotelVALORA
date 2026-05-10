"use client";

import Image from "next/image";
import { useMemo } from "react";
import { toast } from "sonner";
import { useLibraryStore } from "@/lib/library/store";
import {
  MOCK_LIBRARY_REPORTS,
  getDefaultSelectedReport,
} from "@/lib/library/mock-reports";
import type { LibraryReport, ReportCategory } from "@/types/library";
import { FloatingHotelCard } from "./floating-hotel-card";
import { HotelMapMarker } from "./hotel-map-marker";
import { InstitutionalMapControls } from "./institutional-map-controls";

const CATEGORY_LEGEND_KEY: Record<
  ReportCategory,
  "saved" | "community" | "topPromote"
> = {
  saved: "saved",
  community: "community",
  "top-promote": "topPromote",
};

// Stylised Madrid Metro overlay. Decorative SVG only — four reference
// lines (L1, L2, L6 ring, L10) plus a handful of station nodes, drawn
// in the official line palette at institutional opacity. `viewBox`
// + `preserveAspectRatio="none"` lets the SVG stretch to fill the
// map area regardless of viewport. `pointer-events-none` keeps the
// markers fully clickable underneath.
function MetroLinesLayer() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-0 h-full w-full"
    >
      <g
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="0.55"
        opacity="0.78"
        vectorEffect="non-scaling-stroke"
      >
        {/* L1 — light blue, north-south spine */}
        <polyline
          points="22,6 24,18 30,32 34,46 38,60 42,74 46,90"
          stroke="#19a4dc"
        />
        {/* L2 — red, east-west across the centre */}
        <polyline
          points="6,48 18,46 32,48 48,50 62,48 78,46 96,44"
          stroke="#e30613"
        />
        {/* L6 — gray, the circular line */}
        <ellipse
          cx="52"
          cy="52"
          rx="34"
          ry="26"
          stroke="#9aa0a6"
          strokeWidth="0.45"
        />
        {/* L10 — dark blue, NW–SE diagonal */}
        <polyline
          points="6,86 22,72 38,56 54,44 70,32 88,18"
          stroke="#0065b6"
        />
      </g>
      <g fill="#ffffff" stroke="#1f2937" strokeWidth="0.18">
        <circle cx="34" cy="46" r="0.9" />
        <circle cx="38" cy="60" r="0.9" />
        <circle cx="48" cy="50" r="0.9" />
        <circle cx="54" cy="44" r="0.9" />
        <circle cx="62" cy="48" r="0.9" />
        <circle cx="70" cy="32" r="0.9" />
      </g>
    </svg>
  );
}

/**
 * Mock institutional grayscale map.
 *
 * Today: a static grayscale aerial photograph of Madrid + percentage-
 * positioned markers. The visual layer (image, gradient overlay,
 * controls) is fully isolated from data so the page above it can stay
 * provider-agnostic. Tomorrow's swap targets:
 *
 *   import { Map } from "react-map-gl";
 *
 * …and the marker list below becomes a `<Marker>` array driven by real
 * `lat/lng` (already on every record). No page-level changes needed.
 *
 * Search & legend toggles filter the visible markers in-memory.
 */
export function HotelMap() {
  const legend = useLibraryStore((s) => s.legend);
  const layers = useLibraryStore((s) => s.layers);
  const searchQuery = useLibraryStore((s) => s.searchQuery);
  const selectedId = useLibraryStore((s) => s.selectedReportId);
  const setSelected = useLibraryStore((s) => s.setSelectedReportId);

  const visible = useMemo<LibraryReport[]>(() => {
    const q = searchQuery.trim().toLowerCase();
    return MOCK_LIBRARY_REPORTS.filter((r) => {
      if (!legend[CATEGORY_LEGEND_KEY[r.category]]) return false;
      if (q && !r.hotelName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [legend, searchQuery]);

  const previewReport: LibraryReport =
    visible.find((r) => r.id === selectedId) ??
    visible[0] ??
    getDefaultSelectedReport();

  return (
    <div className="relative flex-1 overflow-hidden bg-slate-200">
      <div className="relative h-full w-full">
        <Image
          src="https://lh3.googleusercontent.com/aida-public/AB6AXuCncRoNCzRIPdczeRvSC6SQNta80kspOfWJOfA0G5U2gRce48Azb0LwjrqhRPlEfNBmY7F3JWzu8_3u4h2RpXRQTwCNCkc_R4XGM_WDexSWRWLOlzcjcu3nQEz-eON-nP0ACq0vooKoN1kGolgTrUb-MLTcQRnd_nmWCe-NtS-6rTlYbNX20Vt8G7O9pLFiRPa0Txy0T5Amp7c-RIsBTFLBdFRcAWvz51SZyEBWV6pCGsJ6Hs47xbSqsreRkV3g72HeSnbQjzUobAya"
          alt="Institutional grayscale map of Madrid"
          fill
          priority
          unoptimized
          sizes="(max-width: 768px) 100vw, calc(100vw - 320px)"
          className="object-cover opacity-40 brightness-110 grayscale"
        />

        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/85 via-white/0 to-transparent"
        />

        {/* Optional overlays — purely presentational placeholders today */}
        {layers.heatmap && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(220,38,38,0.18),transparent_55%),radial-gradient(circle_at_30%_60%,rgba(245,158,11,0.18),transparent_50%)]"
          />
        )}
        {layers.metroLines && <MetroLinesLayer />}
        {layers.historicCenter && (
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-1/2 h-56 w-56 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-forest-900/40"
          />
        )}

        <div
          aria-hidden
          className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 select-none"
        >
          <span className="font-headline text-7xl font-black uppercase tracking-[1.5rem] text-forest-900/10">
            Madrid
          </span>
        </div>
      </div>

      <div className="pointer-events-none absolute inset-0">
        {visible.map((report) => (
          <HotelMapMarker
            key={report.id}
            report={report}
            selected={report.id === previewReport.id}
            onSelect={setSelected}
          />
        ))}
      </div>

      <InstitutionalMapControls
        onZoomIn={() => toast.message("Zoom +")}
        onZoomOut={() => toast.message("Zoom -")}
        onToggleLayers={() =>
          toast.message("Layers panel coming with the real map provider")
        }
      />

      {previewReport && (
        <FloatingHotelCard
          report={previewReport}
          onViewFullValuation={(id) =>
            toast.info(`Open valuation for ${id}`, {
              description: "Wire to /report once the report registry is ready.",
            })
          }
        />
      )}
    </div>
  );
}
