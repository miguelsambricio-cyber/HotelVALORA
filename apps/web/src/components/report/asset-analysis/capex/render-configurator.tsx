"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RenderConfigState } from "@/lib/report/capex-renders-data";
import { RenderPreviewCard } from "./render-preview-card";
import { RenderTagGroup } from "./render-tag-group";

export interface RenderConfiguratorProps {
  state: RenderConfigState;
  /** Optional click handler for the "Generar Variación IA" button */
  onGenerate?: () => void;
  className?: string;
}

/**
 * AI render configurator. Composes:
 *   - the hero preview image (`RenderPreviewCard`)
 *   - one `RenderTagGroup` per configurable axis (area, style, view, …)
 *   - a footer row with the "include in report" checkbox + "generate" CTA
 *
 * The whole block is `print:hidden` because it represents an interactive
 * authoring control that has no place in the rendered PDF.
 */
export function RenderConfigurator({
  state,
  onGenerate,
  className,
}: RenderConfiguratorProps) {
  const [included, setIncluded] = useState(state.includeInReport);

  return (
    <div
      className={cn(
        "bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 print:hidden",
        className,
      )}
    >
      <RenderPreviewCard preview={state.preview} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {state.groups.map((group) => (
          <RenderTagGroup key={group.id} group={group} />
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pt-4 border-t border-slate-100 gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={included}
            onChange={(e) => setIncluded(e.target.checked)}
            className="rounded border-slate-300 text-forest-900 focus:ring-forest-900 h-4 w-4"
          />
          <span className="text-sm font-semibold text-slate-700">
            Incluir esta vista en el reporte final
          </span>
        </label>
        <button
          type="button"
          onClick={onGenerate}
          className="flex items-center gap-2 bg-[#005db7] text-white px-5 py-2.5 rounded-lg text-sm font-bold shadow-md hover:brightness-110 transition-all active:scale-95"
        >
          <Sparkles size={20} />
          Generar Variación IA
        </button>
      </div>
    </div>
  );
}
