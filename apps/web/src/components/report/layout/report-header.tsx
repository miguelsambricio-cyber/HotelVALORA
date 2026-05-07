"use client";

import { Building2, Printer } from "lucide-react";
import { useReport } from "@/components/report/report-context";
import { ExportButton } from "@/components/report/ui/export-button";
import { formatReportDate } from "@/lib/report/formatting";
import { cn } from "@/lib/utils";

const CONFIDENTIALITY_LABELS: Record<string, string | null> = {
  public: null,
  confidential: "Confidencial",
  "strictly-confidential": "Estrictamente Confidencial",
};

interface ReportHeaderProps {
  className?: string;
}

export function ReportHeader({ className }: ReportHeaderProps) {
  const { report, isPrintMode, togglePrintMode } = useReport();

  if (!report) return null;

  const confLabel = CONFIDENTIALITY_LABELS[report.confidentiality];

  return (
    <header
      className={cn(
        "flex items-center justify-between gap-4 px-6 py-3.5 border-b border-slate-200 bg-white shrink-0 print:border-none print:py-2",
        className
      )}
    >
      {/* ── Left: hotel identity ─────────────────────────────────────────── */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-forest-700/10 flex items-center justify-center">
          <Building2 size={18} className="text-forest-700" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-slate-900 truncate leading-none">
            {report.hotelName}
          </h1>
          <p className="text-xs text-slate-500 truncate mt-0.5 flex items-center gap-1.5">
            <span>{report.hotelCity}, {report.hotelCountry}</span>
            {confLabel && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 leading-none">
                {confLabel}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* ── Right: meta + actions ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-shrink-0 print:hidden">
        <div className="hidden lg:flex flex-col items-end">
          <span className="text-[11px] font-semibold text-slate-500">
            {report.reportPeriod} · v{report.version}
          </span>
          <span className="text-[10px] text-slate-400">
            {formatReportDate(report.reportDate)}
          </span>
        </div>

        <div className="w-px h-8 bg-slate-200 hidden lg:block" />

        <button
          type="button"
          onClick={togglePrintMode}
          title={isPrintMode ? "Salir del modo impresión" : "Modo impresión"}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
            isPrintMode
              ? "bg-forest-700 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          )}
        >
          <Printer size={13} />
          <span className="hidden sm:inline">Imprimir</span>
        </button>

        <ExportButton report={report} />
      </div>
    </header>
  );
}
