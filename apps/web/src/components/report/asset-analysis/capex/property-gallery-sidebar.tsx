import { Images } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyGalleryData } from "@/lib/report/capex-renders-data";

export interface PropertyGallerySidebarProps {
  data: PropertyGalleryData;
  /** Card title (defaults to "Property Gallery") */
  title?: string;
  /** Footer button label (defaults to "View All Photos") */
  footerLabel?: string;
  /**
   * Tile height in px. Default 92. Every tile is rendered with this exact
   * height — no responsive variation, no auto-height.
   */
  tileHeight?: number;
  className?: string;
}

/**
 * Right-rail premium hotel gallery for the CAPEX page. Tiles are stacked
 * vertically (one per row); each tile fills the container width and uses a
 * fixed pixel height so all 8 thumbnails have identical dimensions. Soft
 * hover zoom, dark bottom gradient, white 14 px / 600 caption bottom-left.
 */
export function PropertyGallerySidebar({
  data,
  title = "Property Gallery",
  footerLabel = "View All Photos",
  tileHeight = 92,
  className,
}: PropertyGallerySidebarProps) {
  return (
    <div
      className={cn(
        "flex flex-col bg-white border border-slate-200 rounded-xl shadow-sm print:shadow-none",
        className,
      )}
      style={{ padding: "14px" }}
    >
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold font-headline text-slate-800 text-sm">{title}</h3>
        <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {data.totalCount} items
        </span>
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
        {data.items.map((item) => (
          <div
            key={item.id}
            style={{ height: `${tileHeight}px` }}
            className="relative group w-full rounded-[10px] overflow-hidden border border-slate-200 shadow-sm bg-slate-100 print:shadow-none shrink-0"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.src}
              alt={item.alt}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-3 pt-8 pb-2 pointer-events-none">
              <span className="text-white font-semibold text-[14px] leading-tight tracking-tight drop-shadow">
                {item.caption}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100 print:hidden">
        <button
          type="button"
          className="w-full py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          <Images size={14} />
          {footerLabel}
        </button>
      </div>
    </div>
  );
}
