"use client";

import { useLibraryStore } from "@/lib/library/store";
import { MapLayerToggle } from "./map-layer-toggle";

/**
 * Sidebar card combining the category legend (Saved / Comunidad / Top
 * Promote) with the optional map overlays (Heatmap / Líneas de Metro /
 * Centro Histórico). Toggles bind directly to the library store — no
 * prop drilling.
 *
 * Swatch colors mirror the marker palette used on the map:
 *   • Saved Reports → forest-900 (dark green) ring forest-700/30
 *   • Comunidad     → blue-700 ring blue-200/60
 *   • Top Promote   → lime-300 ring lime-300/40
 */
export function MapLegendCard() {
  const legend = useLibraryStore((s) => s.legend);
  const layers = useLibraryStore((s) => s.layers);
  const toggleLegend = useLibraryStore((s) => s.toggleLegend);
  const toggleLayer = useLibraryStore((s) => s.toggleLayer);

  return (
    <section className="rounded-xl bg-slate-50 p-5">
      <span className="mb-4 block text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Legend
      </span>

      <div className="flex flex-col gap-5">
        <MapLayerToggle
          label="Saved Reports"
          checked={legend.saved}
          onChange={() => toggleLegend("saved")}
          swatchClassName="bg-forest-900 ring-forest-700/30"
        />
        <MapLayerToggle
          label="Comunidad"
          checked={legend.community}
          onChange={() => toggleLegend("community")}
          swatchClassName="bg-blue-700 ring-blue-200/60"
        />
        <MapLayerToggle
          label="Top Promote"
          checked={legend.topPromote}
          onChange={() => toggleLegend("topPromote")}
          swatchClassName="bg-lime-300 ring-lime-300/40"
        />

        <div className="my-1 h-px bg-slate-200/70" />

        <MapLayerToggle
          label="Heatmap"
          checked={layers.heatmap}
          onChange={() => toggleLayer("heatmap")}
        />
        <MapLayerToggle
          label="Líneas de Metro"
          checked={layers.metroLines}
          onChange={() => toggleLayer("metroLines")}
        />
        <MapLayerToggle
          label="Centro Histórico"
          checked={layers.historicCenter}
          onChange={() => toggleLayer("historicCenter")}
        />
      </div>
    </section>
  );
}
