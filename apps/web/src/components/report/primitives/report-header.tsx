import type { ReactNode } from "react";
import { PdfExportButton } from "./pdf-export-button";
import { cn } from "@/lib/utils";

export type ReportHeaderLayout = "inline" | "stacked";

export interface ReportHeaderProps {
  /** Small uppercase label above the title (e.g. "hotel valuation") */
  sectionLabel: string;
  /** Page-level title (e.g. "Executive Summary") */
  title: string;
  /** Visual size variant for the title */
  titleSize?: "2xl" | "4xl";
  /** Optional right-aligned action node (e.g. a toggle) — hidden in print */
  actions?: ReactNode;
  /** Hide the built-in PDF export button (when a parent provides its own) */
  hideExportButton?: boolean;
  /**
   * Header layout:
   * - `inline`  → label + (title + actions + PDF button) on a single row block.
   *               Default — used by Executive Summary, Competitive Set.
   * - `stacked` → PDF button on its own row above; label + (title + actions)
   *               on the rows below. Used by Asset Analysis (Stitch design).
   */
  layout?: ReportHeaderLayout;
  className?: string;
}

export function ReportHeader({
  sectionLabel,
  title,
  titleSize = "2xl",
  actions,
  hideExportButton = false,
  layout = "inline",
  className,
}: ReportHeaderProps) {
  if (layout === "stacked") {
    return (
      <div
        className={cn(
          "p-8 border-b border-blue-100 bg-white/95 print:px-4 print:py-3",
          className,
        )}
      >
        {!hideExportButton && (
          <div className="flex justify-end mb-4 print:hidden">
            <PdfExportButton />
          </div>
        )}
        <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
          {sectionLabel}
        </p>
        <div className="flex flex-col md:flex-row justify-between items-baseline md:items-center gap-4 mt-1">
          <h2
            className={cn(
              "font-extrabold text-forest-900 font-headline tracking-tighter print:text-base",
              titleSize === "4xl" ? "text-4xl" : "text-2xl",
            )}
          >
            {title}
          </h2>
          {actions && <div className="shrink-0 print:hidden">{actions}</div>}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between px-8 py-6 border-b border-blue-100 bg-white print:px-4 print:py-2",
        className,
      )}
    >
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">
          {sectionLabel}
        </p>
        <div className="flex flex-col md:flex-row items-start md:items-baseline justify-between gap-3">
          <h2
            className={cn(
              "font-bold font-headline tracking-tight text-forest-900 leading-tight print:text-base",
              titleSize === "4xl" ? "text-4xl font-extrabold" : "text-2xl",
            )}
          >
            {title}
          </h2>
          {actions && <div className="shrink-0 print:hidden">{actions}</div>}
        </div>
      </div>
      {!hideExportButton && (
        <div className="mt-1 ml-6 shrink-0">
          <PdfExportButton />
        </div>
      )}
    </div>
  );
}
