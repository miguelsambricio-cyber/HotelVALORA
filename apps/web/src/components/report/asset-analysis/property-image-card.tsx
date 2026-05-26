"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HotelPhotoCarousel } from "@/components/report/executive-summary/hotel-photo-carousel";

export interface PropertyImageTab {
  label: string;
  /** Optional explicit href; when omitted the tab is a non-routing button */
  href?: string;
}

export interface PropertyImageCardProps {
  /** Legacy single-image fallback when `photos` is empty or not provided. */
  src: string;
  /** Real gallery (canonical gallery_paths). When 1+ entries, the card
   *  renders a carousel · same component as the Executive Summary so the
   *  navigation UX is identical. Falls back to single `<img src>` when
   *  empty (mock fallback path). */
  photos?: string[];
  /** Image alt text · also used as the carousel hotel name. */
  alt?: string;
  /** Tabs below the image — first is active by default. Pending future
   *  IMAGEN / MAPA replacement (see docs/features/catastro-imagen-mapa-spec.md). */
  tabs?: PropertyImageTab[];
  className?: string;
}

/**
 * Square hero photo for the Asset Analysis right column. Now a real
 * carousel (HotelPhotoCarousel) when `photos` provided · single-image
 * fallback preserved for legacy mock data paths. Tabs below.
 */
export function PropertyImageCard({
  src,
  photos,
  alt = "Property Overview",
  tabs = [],
  className,
}: PropertyImageCardProps) {
  const [activeTab, setActiveTab] = useState(0);
  const hasGallery = photos && photos.length > 0;

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {hasGallery ? (
        <HotelPhotoCarousel name={alt} photos={photos} aspect="square" />
      ) : (
        <div className="aspect-square w-full rounded-lg border border-slate-200 shadow-sm bg-[#f6f8f7] overflow-hidden flex items-center justify-center print:shadow-none">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {tabs.length > 0 && (
        <div className="flex gap-6 justify-center print:hidden">
          {tabs.map((tab, idx) => {
            const isActive = idx === activeTab;
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => setActiveTab(idx)}
                className={cn(
                  "text-xs font-bold font-display pb-1 uppercase tracking-widest transition-colors",
                  isActive
                    ? "text-forest-700 border-b-2 border-forest-700"
                    : "text-slate-400 hover:text-forest-700",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
