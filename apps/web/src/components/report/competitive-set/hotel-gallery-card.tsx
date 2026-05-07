import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface HotelGalleryCardProps {
  src: string;
  alt: string;
  className?: string;
}

export function HotelGalleryCard({ src, alt, className }: HotelGalleryCardProps) {
  return (
    <div className={cn("relative group aspect-[4/3] rounded-xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      <button
        type="button"
        aria-label={`Ver ${alt}`}
        className="absolute bottom-2 right-2 w-8 h-8 flex items-center justify-center bg-white/60 hover:bg-white/80 backdrop-blur-sm rounded-full shadow-sm z-20 transition-all group-hover:scale-110"
      >
        <ArrowRight size={14} className="text-emerald-950 font-bold" />
      </button>
    </div>
  );
}
