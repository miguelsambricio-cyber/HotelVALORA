import type { ExportOptions, ReportMetadata } from "@/types/report";

// Phase 1: browser print dialog (window.print)
// Phase 2: swap in react-pdf/renderer or a puppeteer webhook
//          without changing the call sites — just replace the body of exportReportToPDF.

export async function exportReportToPDF(
  report: ReportMetadata,
  _options: ExportOptions
): Promise<void> {
  if (typeof window === "undefined") return;

  const prevTitle = document.title;
  document.title = `${report.hotelName} — Informe ${report.reportPeriod} v${report.version}`;

  // Give the browser a tick to update the title before the dialog opens
  await new Promise((r) => setTimeout(r, 50));
  window.print();

  document.title = prevTitle;
}

export function isExportAvailable(): boolean {
  return typeof window !== "undefined";
}

// ── Future hooks ──────────────────────────────────────────────────────────────
// When switching to server-side PDF generation, implement these and wire up
// an API route at POST /api/v1/reports/[reportId]/export.

export type ServerExportResult = {
  url: string;
  expiresAt: string;
};

export async function requestServerExport(
  _reportId: string,
  _options: ExportOptions
): Promise<ServerExportResult> {
  throw new Error("Server-side export not implemented yet");
}
