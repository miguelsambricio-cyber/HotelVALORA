"use client";

import { useMemo, useState } from "react";
import { Lock } from "lucide-react";
import {
  EbitdaStabilizedCard,
  ExpenseInflationCard,
  FinancialSummaryStrip,
  PLTable,
  RevparScenarioCard,
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
 * P&L body — owns the per-hotel assumption store and recomputes
 * `PLComputed` on every change. Three scenario rates live inside the
 * assumption store; the live P&L uses the `base` (Mercado) rate.
 */
export function PLContent() {
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

  if (!canView) return <FreeTierGate />;

  // EBITDA Stabilized = derived from Year-3 of the computed P&L
  // (index 2 = Year 3 in the 5-year FiveYears tuple)
  const year3EbitdaMargin = computed.results.ebitdaMargin[2];

  return (
    <div className="space-y-8 print:space-y-3">
      {/* TOP STRIP — 3 institutional summary cards */}
      <FinancialSummaryStrip>
        <RevparScenarioCard
          active={assumptions.activeScenario}
          editable={editable}
          onChange={(activeScenario) =>
            setAssumptions((a) => ({ ...a, activeScenario }))
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
          margin={year3EbitdaMargin}
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
    </div>
  );
}

// ── Full-section gate for FREE tier ─────────────────────────────────────────

function FreeTierGate() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-6 py-16 text-center print:hidden">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-forest-900/10">
        <Lock size={26} className="text-forest-900" strokeWidth={2.2} />
      </div>
      <div className="space-y-1">
        <h3 className="font-headline text-xl font-extrabold uppercase tracking-tight text-forest-900">
          5-Year P&amp;L Forecast — Premium feature
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
