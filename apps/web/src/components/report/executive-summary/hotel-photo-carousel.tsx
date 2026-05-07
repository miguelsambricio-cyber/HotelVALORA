"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const HOTEL_PHOTOS = [
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
  "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800&q=80",
  "https://images.unsplash.com/photo-1551882547-ff40c63fe2e2?w=800&q=80",
  "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
];

interface HotelPhotoCarouselProps {
  name: string;
  photos?: string[];
}

export function HotelPhotoCarousel({
  name,
  photos = HOTEL_PHOTOS,
}: HotelPhotoCarouselProps) {
  const [index, setIndex] = useState(0);

  function prev() {
    setIndex((i) => (i === 0 ? photos.length - 1 : i - 1));
  }
  function next() {
    setIndex((i) => (i === photos.length - 1 ? 0 : i + 1));
  }

  return (
    <div className="aspect-[4/3] w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden relative bg-slate-100">
      {/* Photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={photos[index]}
        src={photos[index]}
        alt={`${name} — foto ${index + 1}`}
        className="w-full h-full object-cover transition-opacity duration-300"
      />

      {/* Bottom gradient bar */}
      <div className="absolute bottom-0 left-0 right-0 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent flex items-end justify-between">
        <p className="text-white text-[10px] font-semibold truncate pr-2">{name}</p>

        {/* Navigation — bottom-right */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={prev}
            aria-label="Foto anterior"
            className="w-6 h-6 rounded bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-white text-[10px] font-bold tabular-nums min-w-[28px] text-center">
            {index + 1}/{photos.length}
          </span>
          <button
            type="button"
            onClick={next}
            aria-label="Foto siguiente"
            className="w-6 h-6 rounded bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
