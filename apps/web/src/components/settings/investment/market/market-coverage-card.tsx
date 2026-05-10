"use client";

import { useState } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountryPill {
  id: string;
  label: string;
  flag: string;
}

const COUNTRIES: CountryPill[] = [
  { id: "es", label: "Spain", flag: "🇪🇸" },
  { id: "it", label: "Italy", flag: "🇮🇹" },
];

/**
 * Compact coverage variant for the Hotel Market page sidebar — only
 * country pills, no submarket tree (the full tree lives on the Hotel
 * Asset page card). Selected country is highlighted in primary; others
 * stay subtle. v1: pure UI state. v2: links into the active scope used
 * by downstream market analytics surfaces.
 */
export function MarketCoverageCard() {
  const [activeId, setActiveId] = useState<string>("it");

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-6 flex items-center gap-2 text-forest-900">
        <Globe size={20} />
        <h3 className="font-headline text-lg font-extrabold">Global Coverage</h3>
      </header>

      <div className="space-y-2">
        {COUNTRIES.map((c) => {
          const isActive = c.id === activeId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setActiveId(c.id)}
              className={cn(
                "group flex w-full items-center justify-between rounded-xl border p-3 transition-colors",
                isActive
                  ? "border-forest-900/20 bg-forest-900/5"
                  : "border-transparent hover:border-slate-200 hover:bg-slate-50",
              )}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl leading-none" aria-hidden>
                  {c.flag}
                </span>
                <span
                  className={cn(
                    "text-sm font-bold transition-colors",
                    isActive
                      ? "text-forest-900"
                      : "text-slate-800 group-hover:text-forest-900",
                  )}
                >
                  {c.label}
                </span>
              </div>
              <ChevronRight
                size={16}
                className={cn(
                  "transition-colors",
                  isActive
                    ? "text-forest-900"
                    : "text-slate-400 group-hover:text-forest-900",
                )}
              />
            </button>
          );
        })}
      </div>
    </section>
  );
}
