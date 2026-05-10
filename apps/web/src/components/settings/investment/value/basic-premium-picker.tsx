"use client";

import { cn } from "@/lib/utils";
import type { BasicPremiumMode } from "@/lib/investment";

export interface BasicPremiumPickerProps {
  value: BasicPremiumMode;
  onChange: (m: BasicPremiumMode) => void;
  className?: string;
}

/**
 * 2-card mode picker — Basic vs Premium. When the active value is
 * "premium", the consuming section reveals editable advanced inputs;
 * "basic" usually surfaces a locked-content placeholder. Used by
 * Acquisition Cost (Site Acquisition) and Management Fee (P&L Forecast).
 */
export function BasicPremiumPicker({
  value,
  onChange,
  className,
}: BasicPremiumPickerProps) {
  return (
    <div className={cn("grid grid-cols-1 gap-4 md:grid-cols-2", className)}>
      <Tile
        label="Basic"
        active={value === "basic"}
        onClick={() => onChange("basic")}
      />
      <Tile
        label="Premium"
        active={value === "premium"}
        onClick={() => onChange("premium")}
      />
    </div>
  );
}

function Tile({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col rounded-xl border-2 p-5 text-left transition-all",
        active
          ? "border-forest-900 bg-white"
          : "border-transparent bg-slate-50 hover:bg-slate-100",
      )}
    >
      <span className="text-sm font-bold text-forest-900">{label}</span>
    </button>
  );
}
