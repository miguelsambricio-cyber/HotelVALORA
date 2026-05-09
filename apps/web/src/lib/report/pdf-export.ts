import type { ExportOptions, ReportMetadata } from "@/types/report";

// Phase 1: client-side `window.print()` with a temporarily-swapped document
//          title, so the browser's "Save as PDF" dialog suggests a useful name.
// Phase 2: swap the body of `exportReport` for a server-side PDF generator
//          (Puppeteer or react-pdf) without changing call sites.
//
// All UI buttons funnel through `exportReport` so the impl swap stays cheap.

export interface ExportReportInput {
  /** Optional metadata used to set the document title for the PDF dialog */
  report?: ReportMetadata;
  /** Optional explicit options (kept for the future server-side path) */
  options?: ExportOptions;
}

function makeFileTitle(meta: ReportMetadata): string {
  return `${meta.hotelName} — Informe ${meta.reportPeriod} v${meta.version}`;
}

/**
 * Canonical PDF export entry point. Accepts optional metadata; if absent,
 * triggers the print dialog with the page's current title untouched.
 */
export async function exportReport(report?: ReportMetadata): Promise<void> {
  if (typeof window === "undefined") return;

  if (!report) {
    window.print();
    return;
  }

  const previousTitle = document.title;
  document.title = makeFileTitle(report);

  // Yield one tick so the browser commits the title before the dialog opens.
  await new Promise<void>((resolve) => setTimeout(resolve, 50));

  try {
    window.print();
  } finally {
    document.title = previousTitle;
  }
}

/**
 * @deprecated Use `exportReport` — kept only so legacy call sites compile.
 */
export async function exportReportToPDF(
  report: ReportMetadata,
  _options?: ExportOptions,
): Promise<void> {
  return exportReport(report);
}

export function isExportAvailable(): boolean {
  return typeof window !== "undefined";
}

// ── Future hooks ──────────────────────────────────────────────────────────────
// When switching to server-side PDF generation, implement the request below
// and route `exportReport` through it. Wire an API route at
// POST /api/v1/reports/{reportId}/export.

export interface ServerExportResult {
  url: string;
  expiresAt: string;
}

export async function requestServerExport(
  _reportId: string,
  _options: ExportOptions,
): Promise<ServerExportResult> {
  throw new Error("Server-side export not implemented yet");
}
