"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export interface PropertyImageTab {
  label: string;
  /** Optional explicit href; when omitted the tab is a non-routing button */
  href?: string;
}

export interface PropertyImageCardProps {
  /** Square hero image src */
  src: string;
  /** Image alt text */
  alt?: string;
  /** Tabs below the image — first is active by default */
  tabs?: PropertyImageTab[];
  className?: string;
}

/**
 * Square property image with a row of small caption tabs underneath
 * (e.g. "Catastro" / "Planos"). The first tab is active by default; tab state
 * is local to the card. Visual matches the Stitch Asset Analysis hero image.
 */
export function PropertyImageCard({
  src,
  alt = "Property Overview",
  tabs = [],
  className,
}: PropertyImageCardProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="aspect-square w-full rounded-lg border border-slate-200 shadow-sm bg-[#f6f8f7] overflow-hidden flex items-center justify-center print:shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      </div>

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
