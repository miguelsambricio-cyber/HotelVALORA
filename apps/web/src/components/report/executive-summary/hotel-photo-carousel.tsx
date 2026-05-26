"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/**
 * Placeholder photo set · used ONLY when no canonical hotel photos arrive
 * (mock fallback path, or canonical row without hero_image_path /
 * gallery_paths). Real hotels render their Booking gallery via the
 * `photos` prop · see canonical-mappers/executive-summary.ts.
 */
const PLACEHOLDER_PHOTOS = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=800&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
];

interface HotelPhotoCarouselProps {
  name: string;
  photos?: string[];
  /** Override the aspect ratio. Defaults to "[4/3]". Asset Analysis uses
   *  "square" so the hero photo card stays on its existing footprint. */
  aspect?: "[4/3]" | "square" | "video";
}

export function HotelPhotoCarousel({
  name,
  photos,
  aspect = "[4/3]",
}: HotelPhotoCarouselProps) {
  // Prefer real photos · fall back to placeholder set when canonical
  // lacks media. Empty array is treated as "no real photos".
  const effectivePhotos =
    photos && photos.length > 0 ? photos : PLACEHOLDER_PHOTOS;
  const [index, setIndex] = useState(0);

  function prev() {
    setIndex((i) => (i === 0 ? effectivePhotos.length - 1 : i - 1));
  }
  function next() {
    setIndex((i) => (i === effectivePhotos.length - 1 ? 0 : i + 1));
  }

  const aspectClass =
    aspect === "square" ? "aspect-square" :
    aspect === "video" ? "aspect-video" :
    "aspect-[4/3]";

  // Preload the next 2 photos so navigation feels instant · prevents the
  // "gray flash" the operator reported (was caused by React remount via
  // `key={src}` forcing the new img to fetch from scratch on each click).
  const upcoming = [
    effectivePhotos[(index + 1) % effectivePhotos.length],
    effectivePhotos[(index + 2) % effectivePhotos.length],
  ];

  return (
    <div className={`${aspectClass} w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden relative bg-slate-900`}>
      {/* Photo · no `key` prop so React reuses the <img> element on
       *  navigation (avoids the unmount+remount that flashed the bg
       *  through during fetch). `decoding="async"` lets the browser
       *  draw the previous frame until the next is ready. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={effectivePhotos[index]}
        alt={`${name} — foto ${index + 1}`}
        className="w-full h-full object-cover"
        loading="eager"
        decoding="async"
      />

      {/* Hidden preload of the next 2 photos */}
      <div className="hidden" aria-hidden>
        {upcoming.map((src) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img key={src} src={src} alt="" loading="eager" />
        ))}
      </div>

      {/* Bottom caption bar · the gradient is `pointer-events-none` so
       *  it never intercepts hovers on the photo. The caption + nav
       *  buttons live in a sibling flex row above, with their own
       *  pointer-events restored. Reduced gradient intensity (45 from 70)
       *  so the photo's bottom 30% isn't obscured. */}
      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/45 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 px-3 py-2 flex items-end justify-between pointer-events-none">
        <p className="text-white text-[10px] font-semibold truncate pr-2 drop-shadow-sm">{name}</p>

        <div className="flex items-center gap-1 shrink-0 pointer-events-auto">
          <button
            type="button"
            onClick={prev}
            aria-label="Foto anterior"
            className="w-6 h-6 rounded bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-white text-[10px] font-bold tabular-nums min-w-[32px] text-center drop-shadow-sm">
            {index + 1}/{effectivePhotos.length}
          </span>
          <button
            type="button"
            onClick={next}
            aria-label="Foto siguiente"
            className="w-6 h-6 rounded bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
