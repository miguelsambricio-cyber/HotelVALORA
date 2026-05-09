import { cn } from "@/lib/utils";
import type { RenderPreview } from "@/lib/report/capex-renders-data";

export interface RenderPreviewCardProps {
  preview: RenderPreview;
  className?: string;
}

/**
 * Hero render image with a bottom gradient that carries the caption. Reused
 * pattern from the Hotel personalizado photo carousel — same aspect ratio and
 * border treatment, different overlay style.
 */
export function RenderPreviewCard({ preview, className }: RenderPreviewCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl overflow-hidden shadow-inner border border-slate-200 aspect-video bg-slate-100 print:shadow-none",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={preview.src}
        alt={preview.caption}
        className="w-full h-full object-cover"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        <span className="text-white font-semibold text-sm">{preview.caption}</span>
      </div>
    </div>
  );
}
