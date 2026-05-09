import { ReportTopNav } from "./report-top-nav";
import { ReportSidebar } from "./report-sidebar";
import { ReportFooter } from "./report-footer";
import { cn } from "@/lib/utils";

export interface ReportShellProps {
  children: React.ReactNode;
  /**
   * Print canvas orientation. Defaults to "portrait" (A4 portrait, 960 px
   * canvas, zoom 0.74). "landscape" switches to A4 landscape (1400 px
   * canvas, zoom 0.76 + named-page rule). Used by Market Overview.
   */
  printOrientation?: "portrait" | "landscape";
}

export function ReportShell({
  children,
  printOrientation = "portrait",
}: ReportShellProps) {
  const canvasClass =
    printOrientation === "landscape"
      ? "report-print-canvas-landscape"
      : "report-print-canvas";

  return (
    <div className="min-h-screen bg-slate-50 print:min-h-0 print:bg-white">
      <ReportTopNav />

      {/* Header is sticky (in-flow) — no top padding compensation needed.
          Print: header is hidden, padding stays collapsed. */}
      <div className="print:pt-0">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 print:px-0 print:max-w-none">
          {/* Sidebar hidden in print; flex collapses to block so main fills full width */}
          <div className="flex gap-8 items-start py-10 print:block print:py-0">
            <ReportSidebar />

            <main className={cn("flex-1 min-w-0", canvasClass)}>
              {children}
            </main>
          </div>
        </div>

        <ReportFooter />
      </div>
    </div>
  );
}
