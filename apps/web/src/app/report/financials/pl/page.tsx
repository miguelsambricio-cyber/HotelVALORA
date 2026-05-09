"use client";

import { Suspense, useMemo, useState } from "react";
import { Lock } from "lucide-react";
import { ReportShell } from "@/components/report/shell/report-shell";
import { ReportPaper } from "@/components/report/shell/report-paper";
import { ActionBar } from "@/components/report/executive-summary/action-bar";
import { HotelToggle } from "../../asset-analysis/hotel-toggle";
import {
  EbitdaStabilizedCard,
  ExpenseInflationCard,
  FinancialSummaryStrip,
  PLTable,
  RevparGrowthCard,
  applyAssumptionChange,
} from "@/components/report/financials";
import {
  computePL,
  getDefaultAssumptions,
  type PLAssumptions,
  type PLLineItemId,
} from "@/lib/report/financials";
import {
  canEditAssumptions,
  canViewFinancials,
  useTier,
} from "@/lib/report/use-tier";

/**
 * Page wrapper. The Suspense boundary is required because `useTier` reads
 * `useSearchParams()` (Next 14 forces opt-in for static prerender bailout).
 * Falls back to a transparent placeholder so the page still renders the
 * shell instantly during the brief client-only resolve.
 */
export default function PLPage() {
  return (
    <Suspense fallback={null}>
      <PLPageContent />
    </Suspense>
  );
}

function PLPageContent() {
  const tier = useTier();
  const editable = canEditAssumptions(tier);
  const canView = canViewFinancials(tier);

  const [assumptions, setAssumptions] = useState<PLAssumptions>(() =>
    getDefaultAssumptions(),
  );
  const computed = useMemo(() => computePL(assumptions), [assumptions]);

  const handleLineItemChange = (id: PLLineItemId, next: number) => {
    setAssumptions((a) => applyAssumptionChange(a, id, next));
  };

  const headerActions = (
    <div className="flex items-center gap-4">
      <span className="text-xl font-bold text-slate-700 font-headline">
        Prime
      </span>
      <HotelToggle />
    </div>
  );

  return (
    <ReportShell>
      <div className="space-y-6 print:space-y-3">
        <ReportPaper
          sectionLabel="hotel valuation"
          title="P&L 5 Years"
          titleSize="4xl"
          headerLayout="stacked"
          closed
          actions={headerActions}
        >
          <div className="px-8 py-6 space-y-8 print:px-3 print:py-2 print:space-y-3">
            {!canView ? (
              <FreeTierGate />
            ) : (
              <>
                {/* TOP STRIP — 3 institutional summary cards */}
                <FinancialSummaryStrip>
                  <RevparGrowthCard
                    values={assumptions.revparGrowth}
                    editable={editable}
                    onChange={(revparGrowth) =>
                      setAssumptions((a) => ({ ...a, revparGrowth }))
                    }
                  />
                  <ExpenseInflationCard
                    values={assumptions.expenseInflation}
                    editable={editable}
                    onChange={(expenseInflation) =>
                      setAssumptions((a) => ({ ...a, expenseInflation }))
                    }
                  />
                  <EbitdaStabilizedCard
                    target={assumptions.ebitdaStabilizedTarget}
                    staffCostShare={assumptions.staffCostShare}
                    currency={assumptions.currency}
                  />
                </FinancialSummaryStrip>

                {/* USALI 5-YEAR P&L TABLE */}
                <PLTable
                  editable={editable}
                  assumptions={assumptions}
                  computed={computed}
                  onAssumptionChange={handleLineItemChange}
                />
              </>
            )}
          </div>
        </ReportPaper>

        <ActionBar currentPage={1} totalPages={1} />
      </div>
    </ReportShell>
  );
}

// ── Full-section gate for FREE tier ─────────────────────────────────────────
//
// FREE users only have access to the Executive Summary. The P&L is a
// PREMIUM-only feature; PRO sees it readonly. This card replaces the entire
// P&L body when the tier check fails so the user sees a clean upgrade CTA
// rather than a half-rendered table.
function FreeTierGate() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center print:hidden">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-900/10">
        <Lock size={26} className="text-forest-900" strokeWidth={2.2} />
      </div>
      <div className="space-y-1">
        <h3 className="font-headline text-xl font-extrabold uppercase tracking-tight text-forest-900">
          P&amp;L 5 Years — Premium feature
        </h3>
        <p className="max-w-md text-sm text-slate-600">
          The institutional 5-year USALI P&amp;L with editable assumptions is
          available on the PRO and PREMIUM tiers. Upgrade to access the full
          underwriting model and PDF export of your financial snapshot.
        </p>
      </div>
      <a
        href="#upgrade"
        className="mt-2 inline-flex items-center gap-2 rounded-lg bg-[#005db7] px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-white shadow-md transition-all hover:brightness-110 active:scale-95"
      >
        <Lock size={14} strokeWidth={2.5} />
        Upgrade to PRO
      </a>
      <p className="text-[10px] uppercase tracking-widest text-slate-400">
        FREE tier · view-only Executive Summary
      </p>
    </div>
  );
}
