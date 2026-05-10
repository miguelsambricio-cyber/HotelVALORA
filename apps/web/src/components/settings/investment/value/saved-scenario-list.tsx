"use client";

import { useState } from "react";
import { ChevronDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SavedScenario } from "@/lib/investment";

export interface SavedScenarioListProps {
  title: string;
  scenarios: SavedScenario[];
  onRemove: (id: string) => void;
  className?: string;
}

const MODE_LABELS: Record<SavedScenario["mode"], string> = {
  total: "Total",
  per_room: "Per Room",
  per_m2: "Per m²",
};

/**
 * Collapsible "SAVED SCENARIOS" list — used by both Site Acquisition
 * and Exit Investment sections. Open by default; chevron flips to up
 * when collapsed. Each row carries a label, the formatted amount with
 * mode/variant tag, and a destructive delete icon.
 */
export function SavedScenarioList({
  title,
  scenarios,
  onRemove,
  className,
}: SavedScenarioListProps) {
  const [open, setOpen] = useState(true);

  return (
    <div className={cn("mt-4 space-y-2", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
          {title}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "text-slate-500 transition-transform",
            !open && "-rotate-90",
          )}
        />
      </button>

      {open && (
        <div className="space-y-2">
          {scenarios.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[11px] italic text-slate-400">
              No saved scenarios yet — use the Guardar action to capture one.
            </p>
          ) : (
            scenarios.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 transition-colors hover:border-slate-300"
              >
                <span className="text-sm font-bold text-forest-900">
                  {s.name}
                </span>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-forest-900">
                    € {s.amount.toLocaleString("en-US")} ({MODE_LABELS[s.mode]} /{" "}
                    {s.variant === "max" ? "Max" : "Min"})
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    aria-label={`Delete ${s.name}`}
                    className="flex items-center justify-center rounded-lg p-1.5 text-red-600 transition-colors hover:bg-red-50"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
