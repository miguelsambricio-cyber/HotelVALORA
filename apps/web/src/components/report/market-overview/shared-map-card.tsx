import { cn } from "@/lib/utils";
import type {
  DemandGeneratorMapPin,
  DemandGeneratorCategory,
} from "@/lib/report/market-overview-data";

export interface SharedMapCardProps {
  imageSrc: string;
  pins: DemandGeneratorMapPin[];
  className?: string;
}

const PIN_BG: Record<DemandGeneratorCategory, string> = {
  poi: "bg-[#172B4D]",
  metro: "bg-[#0052CC]",
  train: "bg-[#6554C0]",
  airport: "bg-[#FF8B00]",
};

const PIN_SHAPE: Record<DemandGeneratorCategory, string> = {
  poi: "rounded-full",
  metro: "rounded-sm",
  train: "rounded-sm",
  airport: "rounded-sm",
};

/**
 * Stylised map card that mirrors the Stitch sample: teal background, central
 * map silhouette, numbered category pins layered on top. The pin geometry is
 * data-driven (`pins[i].top` / `pins[i].left`) so the same component works
 * across markets without code changes.
 */
export function SharedMapCard({ imageSrc, pins, className }: SharedMapCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl overflow-hidden shadow-sm border border-slate-200 relative bg-[#7BD0CE] w-full min-h-[400px] flex items-center justify-center print:shadow-none print:min-h-[260px]",
        className,
      )}
    >
      <div className="relative w-full max-w-[300px] aspect-square">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Map location"
          className="w-full h-full object-contain drop-shadow-2xl"
          src={imageSrc}
        />
        {pins.map((pin) => {
          const shape = PIN_SHAPE[pin.category];
          const bg =
            pin.pin === 1 ? "bg-[#00875A]" : PIN_BG[pin.category];
          return (
            <div
              key={pin.pin}
              className={cn(
                "absolute w-6 h-6 text-white flex items-center justify-center text-xs font-bold border-2 border-white shadow-sm",
                shape,
                bg,
              )}
              style={{ top: pin.top, left: pin.left }}
            >
              {pin.pin}
            </div>
          );
        })}
      </div>
    </div>
  );
}
