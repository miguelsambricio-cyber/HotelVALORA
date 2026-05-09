import { cn } from "@/lib/utils";
import type {
  DemandGeneratorsData,
  DemandGeneratorCategory,
} from "@/lib/report/market-overview-data";
import { SharedMapCard } from "./shared-map-card";

export interface DemandGeneratorsBlockProps {
  data: DemandGeneratorsData;
  className?: string;
}

const PIN_BG: Record<DemandGeneratorCategory, string> = {
  poi: "bg-slate-100 text-slate-600",
  metro: "bg-blue-50 text-blue-700",
  train: "bg-purple-50 text-purple-700",
  airport: "bg-orange-50 text-orange-700",
};

const PIN_SHAPE: Record<DemandGeneratorCategory, string> = {
  poi: "rounded-full",
  metro: "rounded-sm",
  train: "rounded-sm",
  airport: "rounded-sm",
};

/**
 * Two-column layout: left list of demand generators (with numbered pins
 * matching the map) + right shared-map card. Categories are split into
 * "Demand Generator" (POI) and "Transport" (metro / train / airport).
 */
export function DemandGeneratorsBlock({
  data,
  className,
}: DemandGeneratorsBlockProps) {
  const poi = data.items.filter((item) => item.category === "poi");
  const transport = data.items.filter((item) => item.category !== "poi");

  return (
    <section
      className={cn(
        "grid grid-cols-1 lg:grid-cols-2 print:grid-cols-2 gap-8 print:gap-4 print:break-inside-avoid",
        className,
      )}
    >
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm flex flex-col justify-center print:shadow-none">
        <h3 className="text-xs font-bold tracking-widest text-slate-700 uppercase mb-6 font-headline">
          {data.poiTitle}
        </h3>
        <ul className="space-y-4 mb-8">
          {poi.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs font-bold",
                    PIN_SHAPE[item.category],
                    PIN_BG[item.category],
                  )}
                >
                  {item.pin}
                </span>
                <span className="font-semibold text-slate-700">
                  {item.name}
                </span>
              </div>
              <span className="text-slate-400 font-medium">{item.distance}</span>
            </li>
          ))}
        </ul>

        <h3 className="text-xs font-bold tracking-widest text-slate-400 uppercase mb-6 font-headline">
          {data.transportTitle}
        </h3>
        <ul className="space-y-4">
          {transport.map((item) => (
            <li
              key={item.id}
              className="flex justify-between items-center text-sm"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "w-6 h-6 flex items-center justify-center text-xs font-bold",
                    PIN_SHAPE[item.category],
                    PIN_BG[item.category],
                  )}
                >
                  {item.pin}
                </span>
                <span className="font-semibold text-slate-700">
                  {item.name}
                </span>
              </div>
              <span className="text-slate-400 font-medium">{item.distance}</span>
            </li>
          ))}
        </ul>
      </div>

      <SharedMapCard imageSrc={data.mapImageSrc} pins={data.pins} />
    </section>
  );
}
