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
import { useScenario } from "@/lib/underwriting/scenario";
import {
  canEditAssumptions,
  canViewFinancials,
  useTier,
} from "@/lib/report/use-tier";

/**
 * P&L body — reads the active scenario from the global underwriting store
 * and re-projects the per-hotel assumptions through it on every render.
 *
 * The local `assumptions` state holds the hotel-specific operating ratios
 * (rooms, ADR, expense %, etc.) — the scenario lens is global and lives
 * in `useScenarioStore` so the future IRR / debt / sensitivity pages see
 * the exact same lens without needing local state.
 */
export function PLContent() {
  const tier = useTier();
  const editable = canEditAssumptions(tier);
  const canView = canViewFinancials(tier);

  const [scenario] = useScenario();
  const [assumptions, setAssumptions] = useState<PLAssumptions>(() =>
    getDefaultAssumptions(),
  );
  const computed = useMemo(
    () => computePL(assumptions, scenario),
    [assumptions, scenario],
  );

  const handleLineItemChange = (id: PLLineItemId, next: number) => {
    setAssumptions((a) => applyAssumptionChange(a, id, next));
  };

  if (!canView) return <FreeTierGate />;

  return (
    <div className="space-y-8 print:space-y-3">
      {/* TOP STRIP — 3 institutional summary cards.
          RevparScenarioCard is now a read-only readout — the scenario itself
          is changed via the global toggle in the report header. */}
      <FinancialSummaryStrip>
        <RevparScenarioCard scenario={scenario} />
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
