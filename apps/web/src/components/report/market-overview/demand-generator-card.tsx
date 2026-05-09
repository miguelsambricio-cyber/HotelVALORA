"use client";

import {
  ArrowRight,
  Train,
  DoorOpen,
  Building2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DemandGeneratorTile } from "@/lib/report/market-overview-data";

const ICON_MAP: Record<string, LucideIcon> = {
  Transport: Train,
  "IFEMA Convention Center": DoorOpen,
  "Bernabéu Stadium": Building2,
};

export interface DemandGeneratorCardProps {
  tile: DemandGeneratorTile;
  className?: string;
}

/**
 * Single 4:3-ish image card used in the demand generators gallery. When the
 * tile carries an `iconLabel` instead of a `src`, the card falls back to a
 * subtle placeholder with a Lucide icon — institutional grey rather than a
 * jarring broken image.
 */
export function DemandGeneratorCard({ tile, className }: DemandGeneratorCardProps) {
  const Icon = tile.iconLabel ? ICON_MAP[tile.iconLabel] ?? Building2 : null;

  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden shadow-sm border border-slate-200 h-40 relative print:shadow-none print:h-32",
        tile.src ? "" : "bg-slate-100 flex items-center justify-center",
        className,
      )}
    >
      {tile.src ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={tile.alt}
            src={tile.src}
            className="w-full h-full object-cover"
          />
        </>
      ) : (
        Icon && (
          <div className="text-center flex flex-col items-center gap-1 opacity-40">
            <Icon size={28} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              {tile.iconLabel}
            </span>
          </div>
        )
      )}
      <button
        type="button"
        aria-label={`View ${tile.alt}`}
        className="absolute bottom-2 right-2 w-8 h-8 bg-white/70 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-110 print:hidden"
      >
        <ArrowRight size={16} className="text-slate-800" />
      </button>
    </div>
  );
}
