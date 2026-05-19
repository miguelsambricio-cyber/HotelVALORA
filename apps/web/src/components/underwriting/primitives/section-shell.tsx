"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Sliders } from "lucide-react";
import { EditableText } from "../edit/editable-text";
import { cn } from "@/lib/utils";

/**
 * Underwriting section shell · canonical layout for every report section.
 *
 *  · Sticky header (number + title + status badge + anchor id)
 *  · Always-visible Summary slot
 *  · Collapsible "Detail schedule" (children) · lazy-mount on first open
 *  · Collapsible "Assumptions" (premium-gated · always shown for MVP)
 *
 * Corporate light theme · white bg · slate-200 borders · black text.
 * Editable assumptions surface in blue (#005db7) downstream.
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
  hideDetailToggle = false,
}: {
  number: number;
  anchorId: string;
  title: string;
  subtitle?: string;
  status?: { label: string; tone: "ok" | "warn" | "info" };
  summary: React.ReactNode;
  detail?: React.ReactNode;
  assumptions?: React.ReactNode;
  printIncludeDetail?: boolean;
  hideDetailToggle?: boolean;
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
      className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:break-inside-avoid print:p-3 print:shadow-none"
    >
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="min-w-0">
          <p className="font-headline text-[9.5px] font-extrabold uppercase tracking-[0.28em] text-[#005db7]">
            Section {String(number).padStart(2, "0")}
          </p>
          <EditableText
            as="h2"
            textId={`${anchorId}.title`}
            defaultText={title}
            className="mt-0.5 block font-headline text-[18px] font-extrabold tracking-tight text-slate-900 sm:text-[20px]"
          />
          {subtitle && (
            <EditableText
              as="p"
              textId={`${anchorId}.subtitle`}
              defaultText={subtitle}
              className="mt-0.5 block font-mono text-[11px] text-slate-500"
            />
          )}
        </div>
        {status && (
          <span
            className={cn(
              "shrink-0 rounded-md px-2 py-1 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em]",
              status.tone === "ok" && "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
              status.tone === "warn" && "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
              status.tone === "info" && "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
            )}
          >
            {status.label}
          </span>
        )}
      </header>

      <div className="space-y-3">{summary}</div>

      {detail && hideDetailToggle && (
        <div className="pt-1">{detail}</div>
      )}

      {detail && !hideDetailToggle && (
        <div className="rounded-md border border-slate-200 bg-slate-50/60">
          <button
            type="button"
            onClick={detailToggle}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-700 hover:text-[#005db7]"
            aria-expanded={detailOpen}
          >
            {detailOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            Detail schedule
          </button>
          <div
            className={cn(
              "border-t border-slate-200 px-3 py-3",
              detailOpen ? "block" : "hidden",
              printIncludeDetail && "print:block",
            )}
          >
            {detailWasOpened || printIncludeDetail ? detail : null}
          </div>
        </div>
      )}

      {assumptions && (
        <div className="rounded-md border border-slate-200 bg-slate-50/60 print:hidden">
          <button
            type="button"
            onClick={() => setAssumptionsOpen((v) => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-700 hover:text-[#005db7]"
            aria-expanded={assumptionsOpen}
          >
            {assumptionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Sliders size={11} />
            Assumptions
            <span className="ml-1 rounded bg-blue-50 px-1.5 py-0.5 font-mono text-[8.5px] text-[#005db7] ring-1 ring-blue-200">
              Premium
            </span>
          </button>
          <div className={cn("border-t border-slate-200 px-3 py-3", assumptionsOpen ? "block" : "hidden")}>
            {assumptions}
          </div>
        </div>
      )}
    </section>
  );
}
