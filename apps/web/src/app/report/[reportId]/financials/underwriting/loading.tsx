import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";

/**
 * /report/[reportId]/financials/underwriting/loading.tsx
 *
 * Institutional fallback while the underwriting route streams in.
 * Reuses the page chrome (ReportShell + ReportPaper · landscape) so the
 * transition is invisible during fast loads and tasteful during slow
 * ones. No spinner · no marketing copy.
 *
 * Moved here from `app/report/financials/underwriting/` on 2026-05-25
 * when the route migrated to `[reportId]/...`. Sibling of the canonical
 * page · NOT of the legacy bridge (which redirects · loading.tsx as a
 * sibling of a redirecting page commits the HTML stream before the
 * redirect fires · cancels the redirect).
 */
export default function UnderwritingLoading() {
  return (
    <ReportShell printOrientation="landscape">
      <ReportPaper
        sectionLabel="hotel valuation"
        title="Underwriting"
        titleSize="4xl"
        headerLayout="stacked"
        closed
      >
        <div className="px-4 py-6 sm:px-6 lg:px-8 print:px-3 print:py-2">
          <div className="space-y-6">
            {/* KPI strip placeholder */}
            <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="min-w-0">
                    <div className="h-2 w-16 animate-pulse rounded bg-slate-200" />
                    <div className="mt-1 h-4 w-24 animate-pulse rounded bg-slate-200" />
                  </div>
                ))}
              </div>
            </div>

            {/* Section placeholders · 8 memo bands */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white p-5"
              >
                <div className="flex items-baseline gap-3">
                  <div className="h-3 w-6 animate-pulse rounded bg-slate-200" />
                  <div className="h-3 w-40 animate-pulse rounded bg-slate-200" />
                </div>
                <div className="mt-4 h-2 w-full max-w-md animate-pulse rounded bg-slate-100" />
                <div className="mt-2 h-2 w-full max-w-sm animate-pulse rounded bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </ReportPaper>
    </ReportShell>
  );
}
