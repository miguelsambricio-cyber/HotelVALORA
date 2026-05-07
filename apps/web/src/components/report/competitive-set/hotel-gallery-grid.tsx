import { HotelGalleryCard } from "./hotel-gallery-card";
import { ReportMap } from "@/components/report/ui/report-map";
import type { GalleryImage } from "@/lib/report/competitive-set-data";

interface HotelGalleryGridProps {
  images: GalleryImage[];
}

export function HotelGalleryGrid({ images }: HotelGalleryGridProps) {
  const topImages = images.slice(0, 4);
  const restImages = images.slice(4);

  return (
    <div className="space-y-4">
      {/*
       * Top block: 2×2 image grid (left) + full CompSet map (right).
       *
       * min-h-[460px] satisfies compset-map-container's min-height: 450px.
       * Grid default align-items: stretch → both cells fill the row height.
       * print: min-height reset via .compset-map-container override in globals.css
       *        explicit h-80 caps the block in the 960px print canvas.
       */}
      <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-4 min-h-[460px] print:min-h-0 print:h-80">

        {/* Left: 2×2 image grid — fills full height of the row */}
        <div className="md:col-span-5 print:col-span-5 grid grid-cols-2 grid-rows-2 gap-4 h-full">
          {topImages.map((img) => (
            <HotelGalleryCard
              key={img.src}
              src={img.src}
              alt={img.alt}
              className="h-full aspect-auto"
            />
          ))}
        </div>

        {/* Right: full CompSet map — same height as 2×2 block */}
        <div className="md:col-span-7 print:col-span-7 h-full">
          <ReportMap className="h-full rounded-xl border border-slate-200 shadow-sm" />
        </div>
      </div>

      {/* Bottom: remaining images, 4 per row */}
      <div className="grid grid-cols-2 md:grid-cols-4 print:grid-cols-4 gap-4">
        {restImages.map((img) => (
          <HotelGalleryCard key={img.src} src={img.src} alt={img.alt} />
        ))}
      </div>
    </div>
  );
}
