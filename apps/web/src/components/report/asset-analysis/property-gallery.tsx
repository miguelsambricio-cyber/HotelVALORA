"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GalleryImage } from "@/lib/report/asset-analysis-data";

interface GalleryItemProps {
  image: GalleryImage;
}

function GalleryItem({ image }: GalleryItemProps) {
  const [showAlt, setShowAlt] = useState(false);
  const currentSrc = showAlt && image.altSrc ? image.altSrc : image.src;

  return (
    <div>
      <div className="aspect-video w-full rounded-lg border border-slate-200 shadow-sm bg-slate-100 flex items-center justify-center overflow-hidden mb-1 relative print:shadow-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={currentSrc}
          alt={image.caption}
          className="w-full h-full object-cover"
        />
        {image.altSrc && (
          <button
            type="button"
            aria-label={`Toggle ${image.caption} preview`}
            onClick={() => setShowAlt((v) => !v)}
            className="absolute bottom-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm shadow-sm flex items-center justify-center hover:scale-110 transition-transform z-10 print:hidden"
          >
            <ArrowRight size={14} className="text-slate-700" />
          </button>
        )}
      </div>
      {image.caption && (
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          {image.caption}
        </span>
      )}
    </div>
  );
}

export interface PropertyGalleryProps {
  images: GalleryImage[];
  /** Section label rendered above the gallery (uppercase, with a bottom rule) */
  label?: string;
  className?: string;
}

/**
 * Vertical labelled image gallery for the right column of Asset Analysis.
 * Each item is an aspect-video card with a caption underneath; the optional
 * arrow button swaps to `altSrc` when present (mirrors Stitch hover behavior).
 */
export function PropertyGallery({
  images,
  label,
  className,
}: PropertyGalleryProps) {
  return (
    <div className={cn(className)}>
      {label && (
        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 border-b border-slate-200 pb-2">
          {label}
        </h4>
      )}
      <div className="flex flex-col gap-4">
        {images.map((image) => (
          <GalleryItem key={image.caption} image={image} />
        ))}
      </div>
    </div>
  );
}
