"use client";

import { History, Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { CoverageTree } from "./coverage-tree";

export interface CoverageCardProps {
  className?: string;
}

/**
 * Right-sidebar card surfacing the platform's geographic coverage.
 * Tree rendered by CoverageTree primitive; bottom carries an info card
 * with the last data refresh timestamp (mock value for v1).
 */
export function CoverageCard({ className }: CoverageCardProps) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-7 shadow-sm",
        className,
      )}
    >
      <header className="mb-6 flex items-center gap-2 text-forest-900">
        <Globe size={20} />
        <h3 className="font-headline text-lg font-extrabold">Global Coverage</h3>
      </header>

      <CoverageTree />

      {/* LAST UPDATE info box */}
      <div className="mt-8 border-t border-slate-100 pt-6">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-3 flex items-center gap-2">
            <History size={16} className="text-forest-700" strokeWidth={2.2} />
            <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-forest-700">
              Last Update
            </span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500">
            Market data for Southern Europe was refreshed 2 hours ago. 42 new
            hotel assets analysed today.
          </p>
        </div>
      </div>
    </section>
  );
}
