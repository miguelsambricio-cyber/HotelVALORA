import { ReportTopNav } from "./report-top-nav";
import { ReportSidebar } from "./report-sidebar";
import { ReportFooter } from "./report-footer";

interface ReportShellProps {
  children: React.ReactNode;
}

export function ReportShell({ children }: ReportShellProps) {
  return (
    <div className="min-h-screen bg-slate-50 print:min-h-0 print:bg-white">
      <ReportTopNav />

      {/* Push content below fixed nav — collapsed in print (nav is hidden) */}
      <div className="pt-20 print:pt-0">
        <div className="max-w-screen-2xl mx-auto px-6 lg:px-8 print:px-0 print:max-w-none">
          {/* Sidebar hidden in print; flex collapses to block so main fills full width */}
          <div className="flex gap-8 items-start py-10 print:block print:py-0">
            <ReportSidebar />

            <main className="flex-1 min-w-0 report-print-canvas">
              {children}
            </main>
          </div>
        </div>

        <ReportFooter />
      </div>
    </div>
  );
}
