"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

interface PrimeToggleProps {
  defaultEnabled?: boolean;
}

export function PrimeToggle({ defaultEnabled = true }: PrimeToggleProps) {
  const [enabled, setEnabled] = useState(defaultEnabled);

  return (
    <div className="flex items-center gap-3">
      <span className="text-base font-bold text-slate-700 font-headline select-none">
        Prime
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled((v) => !v)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent",
          "transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700",
          enabled ? "bg-emerald-700" : "bg-slate-300"
        )}
      >
        <span className="sr-only">Toggle Prime status</span>
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0",
            "transition duration-200 ease-in-out",
            enabled ? "translate-x-5" : "translate-x-0"
          )}
        />
      </button>
    </div>
  );
}
