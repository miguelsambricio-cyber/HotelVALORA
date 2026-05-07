"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import type { ReportMetadata } from "@/types/report";
import { exportReportToPDF } from "@/lib/report/pdf-export";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  report: ReportMetadata;
  className?: string;
}

export function ExportButton({ report, className }: ExportButtonProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await exportReportToPDF(report, {
        format: "pdf",
        includeCharts: true,
        includeAppendix: false,
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={exporting}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
        "bg-forest-700 text-white hover:bg-forest-900",
        "disabled:opacity-60 disabled:cursor-not-allowed",
        className
      )}
    >
      <Download size={13} />
      {exporting ? "Exportando..." : "PDF"}
    </button>
  );
}
