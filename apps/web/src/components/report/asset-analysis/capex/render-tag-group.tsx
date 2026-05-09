"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { RenderTagGroupData } from "@/lib/report/capex-renders-data";

export interface RenderTagGroupProps {
  group: RenderTagGroupData;
  /** Fired when the user picks a different option */
  onChange?: (groupId: string, optionId: string) => void;
  className?: string;
}

/**
 * Single labelled tag group: a small uppercase label above a wrapped row of
 * pill buttons. Used for Area, Tipo de imagen, Vista, and Imágen por página
 * inside the AI render configurator.
 */
export function RenderTagGroup({ group, onChange, className }: RenderTagGroupProps) {
  const [selected, setSelected] = useState(group.selectedId);

  return (
    <div className={cn(className)}>
      <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
        {group.label}
      </div>
      <div className="flex flex-wrap gap-2">
        {group.options.map((option) => {
          const isActive = option.id === selected;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                setSelected(option.id);
                onChange?.(group.id, option.id);
              }}
              className={cn(
                "px-3 py-1.5 text-xs rounded-md transition-colors",
                isActive
                  ? "bg-forest-900 text-white border border-forest-900/20 shadow-sm font-bold"
                  : "border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
