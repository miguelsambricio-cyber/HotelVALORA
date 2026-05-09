"use client";

import { Printer } from "lucide-react";
import { exportReport } from "@/lib/report/pdf-export";
import type { ReportMetadata } from "@/types/report";
import { cn } from "@/lib/utils";

export interface PdfExportButtonProps {
  /** Optional report metadata used to set the document title for the PDF */
  report?: ReportMetadata;
  /** Visual variant — "primary" matches the Stitch blue button */
  variant?: "primary" | "ghost";
  className?: string;
}

const VARIANT_CLASS: Record<NonNullable<PdfExportButtonProps["variant"]>, string> = {
  primary:
    "bg-[#005db7] text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:brightness-110 active:scale-95",
  ghost:
    "bg-white text-forest-900 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-slate-50",
};

/**
 * Canonical PDF export button. Always routes through `lib/report/pdf-export`
 * so future swaps (server-side Puppeteer, react-pdf) need to change one
 * implementation, not every call site.
 */
export function PdfExportButton({
  report,
  variant = "primary",
  className,
}: PdfExportButtonProps) {
  return (
    <button
      type="button"
      onClick={() => exportReport(report)}
      className={cn(
        "print:hidden flex items-center gap-2 transition-all",
        VARIANT_CLASS[variant],
        className,
      )}
    >
      <Printer size={16} />
      Exportar PDF
    </button>
  );
}
