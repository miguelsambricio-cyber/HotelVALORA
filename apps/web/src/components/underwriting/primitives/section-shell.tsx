"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sliders } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Underwriting section shell · canonical layout for every report section.
 *
 *  · Sticky header (number + title + status badge + anchor id)
 *  · Always-visible Summary slot
 *  · Collapsible "Detail schedule" (children) · lazy-mount on first open
 *  · Collapsible "Assumptions" (premium-gated · always shown for MVP)
 *
 * Mirrors institutional investment-memo rhythm: read summary in one
 * pass · expand only the schedules that need scrutiny · assumptions
 * stay tucked away until an underwriter wants to challenge them.
 */
export function SectionShell({
  number,
  anchorId,
  title,
  subtitle,
  status,
  summary,
  detail,
  assumptions,
  printIncludeDetail = true,
}: {
  /** Section ordinal in the scroll (1..8). */
  number: number;
  /** Hash anchor target for sticky nav. */
  anchorId: string;
  title: string;
  subtitle?: string;
  status?: { label: string; tone: "ok" | "warn" | "info" };
  /** Always rendered · light · investment-committee glance. */
  summary: React.ReactNode;
  /** Heavy table · lazy-mounted on first expand. */
  detail?: React.ReactNode;
  /** Edit forms · gated by premium tier in production. MVP: always shown. */
  assumptions?: React.ReactNode;
  /** When true, detail is force-rendered for the print layout. */
  printIncludeDetail?: boolean;
}) {
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailWasOpened, setDetailWasOpened] = useState(false);
  const [assumptionsOpen, setAssumptionsOpen] = useState(false);

  const detailToggle = () => {
    setDetailOpen((v) => {
      if (!v) setDetailWasOpened(true);
      return !v;
    });
  };

  return (
    <section
      id={anchorId}
      className="scroll-mt-24 space-y-3 rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-800/60 pb-3">
        <div className="min-w-0">
          <p className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.28em] text-lime-300/70">
            Section {String(number).padStart(2, "0")}
          </p>
          <h2 className="mt-0.5 font-headline text-[18px] font-extrabold tracking-tight text-white sm:text-[20px]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-0.5 font-mono text-[11px] text-slate-400">{subtitle}</p>
          )}
        </div>
        {status && (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em]",
              status.tone === "ok" && "bg-emerald-500/20 text-emerald-200 ring-1 ring-emerald-500/40",
              status.tone === "warn" && "bg-amber-500/20 text-amber-200 ring-1 ring-amber-500/40",
              status.tone === "info" && "bg-slate-700/60 text-slate-200 ring-1 ring-slate-600/60",
            )}
          >
            {status.label}
          </span>
        )}
      </header>

      <div className="space-y-3">{summary}</div>

      {detail && (
        <div className="rounded-md border border-slate-800/60 bg-slate-900/30">
          <button
            type="button"
            onClick={detailToggle}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-lime-200"
            aria-expanded={detailOpen}
          >
            {detailOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Detail schedule
          </button>
          {/* Always rendered for print · operator-collapsed for screen */}
          <div
            className={cn(
              "border-t border-slate-800/60 px-3 py-3",
              detailOpen ? "block" : "hidden",
              printIncludeDetail && "print:block",
            )}
          >
            {detailWasOpened || printIncludeDetail ? detail : null}
          </div>
        </div>
      )}

      {assumptions && (
        <div className="rounded-md border border-slate-800/60 bg-slate-900/30 print:hidden">
          <button
            type="button"
            onClick={() => setAssumptionsOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-lime-200"
            aria-expanded={assumptionsOpen}
          >
            {assumptionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Sliders size={11} />
            Assumptions
            <span className="ml-1 rounded bg-lime-300/15 px-1.5 py-0.5 font-mono text-[8.5px] text-lime-200 ring-1 ring-lime-300/30">
              Premium
            </span>
          </button>
          <div className={cn("border-t border-slate-800/60 px-3 py-3", assumptionsOpen ? "block" : "hidden")}>
            {assumptions}
          </div>
        </div>
      )}
    </section>
  );
}
