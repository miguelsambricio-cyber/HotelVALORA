import { cn } from "@/lib/utils";
import type { DemandGeneratorTile } from "@/lib/report/market-overview-data";
import { DemandGeneratorCard } from "./demand-generator-card";

export interface DemandGeneratorsGalleryProps {
  tiles: DemandGeneratorTile[];
  /** Section heading (defaults to "Demand Generators") */
  title?: string;
  className?: string;
}

/**
 * Section block: heading + 4-col grid of demand generator tiles. Mobile
 * collapses to 2-col; print forces 4-col so the gallery stays compact on A4.
 */
export function DemandGeneratorsGallery({
  tiles,
  title = "Demand Generators",
  className,
}: DemandGeneratorsGalleryProps) {
  return (
    <section className={cn(className)}>
      <h3 className="text-xs font-bold tracking-widest text-slate-700 uppercase mb-6 print:mb-3 font-headline">
        {title}
      </h3>
      <div className="grid grid-cols-2 lg:grid-cols-4 print:grid-cols-4 gap-6 print:gap-3">
        {tiles.map((tile) => (
          <DemandGeneratorCard key={tile.id} tile={tile} />
        ))}
      </div>
    </section>
  );
}
