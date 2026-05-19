"use client";

import { useMemo, useState } from "react";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import { SCENARIO_CATALOG, buildBundleForScenario, type UnderwritingInputOverrides } from "@/lib/underwriting/defaults";
import { FloatingKpiStrip, type KpiItem } from "./primitives/floating-kpi-strip";
import { PrintKpiBlock } from "./primitives/print-kpi-block";
import { EditModeBar } from "./edit/edit-mode-bar";
import { ExecutiveSummarySection } from "./sections/executive-summary-section";
import { PnlSection } from "./sections/pnl-section";
import { BalanceSheetSection } from "./sections/balance-sheet-section";
import { CashFlowSection } from "./sections/cash-flow-section";
import { DtaSection } from "./sections/dta-section";
import { InvestmentSection } from "./sections/investment-section";
import { FinancingSection } from "./sections/financing-section";
import { ExitSection } from "./sections/exit-section";

/**
 * UnderwritingShell · single-scroll investment-memo layout.
 *
 * No left rail · no sticky nav · the page is a continuous scroll where
 * the 8 sections render top-to-bottom. The operator scrolls naturally
 * the same way they would read an IC memo or a lender deck.
 *
 * Owns the live engine inputs the operator can drive from inside the
 * memo flow:
 *   · scenarioId         · Conservador / Mercado / Optimista (lives inside Block B Returns)
 *   · assetOverrides     · per-driver overrides (e.g. N° Keys edited inline in Block A)
 *
 * Both flow through `buildBundleForScenario` which re-runs the engine
 * deterministically.
 */

export function UnderwritingShell({ bundle: initialBundle }: { bundle: UnderwritingBundle }) {
  const [scenarioId, setScenarioId] = useState<string>(initialBundle.inputs.scenario_id || "base");
  const [overrides, setOverrides] = useState<UnderwritingInputOverrides>({});

  const hasOverrides = Object.keys(overrides).length > 0;
  const bundle = useMemo(() => {
    if (scenarioId === initialBundle.inputs.scenario_id && !hasOverrides) return initialBundle;
    return buildBundleForScenario(scenarioId, hasOverrides ? overrides : undefined);
  }, [scenarioId, overrides, hasOverrides, initialBundle]);

  const onOverrideChange = (patch: UnderwritingInputOverrides) =>
    setOverrides((prev) => ({ ...prev, ...patch }));

  const kpiItems = useMemo(
    () => buildKpiItems(bundle, scenarioId, setScenarioId),
    [bundle, scenarioId, setScenarioId],
  );

  return (
    <div className="space-y-6">
      <FloatingKpiStrip items={kpiItems} />
      <PrintKpiBlock items={kpiItems} />

      <ExecutiveSummarySection
        bundle={bundle}
        scenarioId={scenarioId}
        scenarioCatalog={SCENARIO_CATALOG}
        onScenarioChange={setScenarioId}
        onOverrideChange={onOverrideChange}
      />
      <PnlSection bundle={bundle} onOverrideChange={onOverrideChange} />
      <BalanceSheetSection bundle={bundle} />
      <CashFlowSection bundle={bundle} />
      <DtaSection bundle={bundle} onOverrideChange={onOverrideChange} />
      <InvestmentSection bundle={bundle} onOverrideChange={onOverrideChange} />
      <FinancingSection bundle={bundle} onOverrideChange={onOverrideChange} />
      <ExitSection bundle={bundle} onOverrideChange={onOverrideChange} />

      <EditModeBar />
    </div>
  );
}

// ─── KPI strip wired to real engine outputs ──────────────────────────
//
// Operator-trimmed lineup (2026-05-19):
//   · Project IRR · Equity IRR · MOIC · Cap Rate scenario picker
// Avg DSCR + LTV dropped from the sticky strip · they live in the
// Financing section schedule (DSCR row + LTV row + per-tranche tiles).

function buildKpiItems(
  bundle: UnderwritingBundle,
  scenarioId: string,
  onScenarioChange: (id: string) => void,
): KpiItem[] {
  const c = bundle.computed;
  const exitYear = c.exit.exit_year;
  const capRatePct = c.cap_rate.entry.used_pct;

  return [
    {
      label: "Project IRR",
      value: fmtPct(c.exit.project_irr_pct),
      sub: `Unlevered · pre-tax · Y${exitYear}`,
      tone: c.exit.project_irr_pct >= 8 ? "ok" : "info",
    },
    {
      label: "Equity IRR",
      value: fmtPct(c.exit.equity_irr_pct),
      sub: `Levered · post-tax · ${fmtMoic(c.exit.moic)} MOIC`,
      tone: c.exit.equity_irr_pct >= 15 ? "ok" : c.exit.equity_irr_pct >= 10 ? "info" : "warn",
    },
    {
      label: "MOIC",
      value: fmtMoic(c.exit.moic),
      sub: "× equity",
    },
    {
      label: "Cap Rate",
      value: "", // rendered by the scenario picker
      sub: `${capRatePct.toFixed(2).replace(".", ",")}% · entry`,
      scenarioPicker: {
        options: SCENARIO_CATALOG.map((s) => ({ id: s.id, label: s.label })),
        activeId: scenarioId,
        onSelect: onScenarioChange,
      },
    },
  ];
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtMoic(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2).replace(".", ",")}x`;
}
