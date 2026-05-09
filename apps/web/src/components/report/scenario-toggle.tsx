"use client";

import { Suspense } from "react";
import { cn } from "@/lib/utils";
import {
  SCENARIO_OPTIONS,
  useScenario,
  type UnderwritingScenario,
} from "@/lib/underwriting/scenario";
import { canEditAssumptions, useTier } from "@/lib/report/use-tier";

/**
 * Global underwriting scenario toggle. Lives in the report header and
 * drives the entire financial model — every page that depends on the
 * scenario (P&L, future IRR / debt / sensitivity) reads the same store.
 *
 * Visible at every tier; only PREMIUM can change the active scenario
 * (PRO and FREE see the active button highlighted but cannot click).
 *
 * Internal Suspense because `useTier` reads `useSearchParams` for the
 * `?tier=` override — the boundary keeps the rest of the page statically
 * pre-rendered.
 */
export function ScenarioToggle({ className }: { className?: string }) {
  return (
    <Suspense fallback={<ScenarioToggleSkeleton className={className} />}>
      <ScenarioToggleInner className={className} />
    </Suspense>
  );
}

function ScenarioToggleInner({ className }: { className?: string }) {
  const tier = useTier();
  const editable = canEditAssumptions(tier);
  const [scenario, setScenario] = useScenario();

  return (
    <div className={cn("flex flex-col items-end gap-1.5 print:gap-0.5", className)}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 print:text-[7px]">
        Scenario
      </span>
      <ScenarioPillRow
        active={scenario}
        editable={editable}
        onChange={setScenario}
      />
    </div>
  );
}

function ScenarioToggleSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("flex flex-col items-end gap-1.5", className)}>
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
        Scenario
      </span>
      <div className="h-9 w-[290px] animate-pulse rounded-lg border border-slate-200 bg-slate-50" />
    </div>
  );
}

// ── Internal pill row (also reused as a presentational primitive) ───────────

interface ScenarioPillRowProps {
  active: UnderwritingScenario;
  editable: boolean;
  onChange: (next: UnderwritingScenario) => void;
}

function ScenarioPillRow({
  active,
  editable,
  onChange,
}: ScenarioPillRowProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Underwriting scenario"
      className={cn(
        "inline-flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1",
        "print:border-slate-200 print:p-0.5",
      )}
    >
      {SCENARIO_OPTIONS.map((opt) => {
        const isActive = opt.id === active;
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-disabled={!editable}
            disabled={!editable && !isActive}
            onClick={() => editable && onChange(opt.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider transition-all",
              "print:py-0.5 print:text-[7px] print:px-2 print:tracking-normal",
              isActive
                ? "bg-forest-900 text-white shadow-sm"
                : "text-slate-500",
              editable && !isActive && "hover:bg-white hover:text-slate-700 cursor-pointer",
              !editable && !isActive && "cursor-default opacity-60",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
