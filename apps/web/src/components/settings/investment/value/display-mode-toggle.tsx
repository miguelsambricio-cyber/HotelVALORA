"use client";

import { cn } from "@/lib/utils";
import type { DisplayMode } from "@/lib/investment";

const MODES: { id: DisplayMode; label: string }[] = [
  { id: "total", label: "Total" },
  { id: "per_room", label: "Per Room" },
  { id: "per_m2", label: "Per m²" },
];

export interface DisplayModeToggleProps {
  value: DisplayMode;
  onChange: (m: DisplayMode) => void;
  className?: string;
}

/**
 * Compact 3-button segmented selector for monetary display modes —
 * Total / Per Room / Per m². Used by Asking Price, Total Investment,
 * Exit Price, Rent on the Hotel Value page.
 */
export function DisplayModeToggle({
  value,
  onChange,
  className,
}: DisplayModeToggleProps) {
  return (
    <div className={cn("inline-flex rounded-lg bg-slate-50 p-1", className)}>
      {MODES.map((m) => {
        const isActive = m.id === value;
        return (
          <button
            key={m.id}
            type="button"
            onClick={() => onChange(m.id)}
            className={cn(
              "rounded-md px-3 py-1 text-[10px] font-bold transition-all",
              isActive
                ? "bg-white text-forest-900 shadow-sm"
                : "text-slate-500 hover:text-forest-900",
            )}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
