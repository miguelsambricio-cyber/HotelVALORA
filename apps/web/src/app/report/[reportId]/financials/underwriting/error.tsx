"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";

/**
 * /report/[reportId]/financials/underwriting/error.tsx
 *
 * Institutional error boundary for the underwriting route. Catches any
 * RSC or client-component throw inside the route segment — including
 * engine recompute failures inside UnderwritingShell — and renders a
 * graceful memorandum-style fallback instead of the Next.js default
 * 500 chrome.
 *
 * Moved here from `app/report/financials/underwriting/` on 2026-05-25
 * when the route migrated to `[reportId]/...`. Sibling of the canonical
 * page · NOT of the legacy bridge.
 */

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function UnderwritingErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[underwriting] route-level error:", error);
  }, [error]);

  return (
    <ReportShell printOrientation="landscape">
      <ReportPaper
        sectionLabel="hotel valuation"
        title="Underwriting"
        titleSize="4xl"
        headerLayout="stacked"
        closed
      >
        <div className="px-4 py-12 sm:px-6 lg:px-8 print:px-3 print:py-6">
          <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-500">
              Recoverable condition
            </p>
            <h2 className="mt-3 font-headline text-2xl font-extrabold tracking-tight text-slate-900">
              Unable to render the underwriting memorandum
            </h2>
            <p className="mt-3 font-mono text-[12px] leading-relaxed text-slate-600">
              The engine returned an unexpected condition while computing this
              scenario. No state has been lost. Try again, or return to the
              financials index.
            </p>

            {error.digest && (
              <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Reference · {error.digest}
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => reset()}
                className="rounded-md bg-forest-900 px-4 py-2 font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-white shadow-sm transition-opacity hover:opacity-90"
              >
                Recompute scenario
              </button>
              <Link
                href="/report/financials"
                className="font-headline text-[11px] font-bold uppercase tracking-[0.18em] text-slate-700 underline-offset-4 hover:underline"
              >
                Back to financials
              </Link>
            </div>
          </div>
        </div>
      </ReportPaper>
    </ReportShell>
  );
}
