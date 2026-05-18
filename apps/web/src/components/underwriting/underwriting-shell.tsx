"use client";

import { useMemo, useState } from "react";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import { SCENARIO_CATALOG, buildBundleForScenario, type UnderwritingInputOverrides } from "@/lib/underwriting/defaults";
import { FloatingKpiStrip, type KpiItem } from "./primitives/floating-kpi-strip";
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

  const kpiItems = useMemo(() => buildKpiItems(bundle), [bundle]);

  return (
    <div className="space-y-6">
      <FloatingKpiStrip items={kpiItems} />

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
      <FinancingSection bundle={bundle} />
      <ExitSection bundle={bundle} onOverrideChange={onOverrideChange} />
    </div>
  );
}

// ─── KPI strip wired to real engine outputs ──────────────────────────

function buildKpiItems(bundle: UnderwritingBundle): KpiItem[] {
  const c = bundle.computed;
  const exitYear = c.exit.exit_year;
  const dscrSlice = c.financing.dscr.slice(1, Math.max(2, exitYear + 1)).filter((v) => Number.isFinite(v) && v > 0);
  const avgDscr = dscrSlice.length > 0 ? dscrSlice.reduce((a, b) => a + b, 0) / dscrSlice.length : 0;
  const ltvY1 = (c.financing.ltv_pct[1] ?? 0) * 100;

  return [
    { label: "Project IRR", value: fmtPct(c.exit.project_irr_pct), sub: `exit Y${exitYear}`, tone: c.exit.project_irr_pct >= 8 ? "ok" : "info" },
    { label: "Equity IRR", value: fmtPct(c.exit.equity_irr_pct), sub: `${fmtMoic(c.exit.moic)} MOIC`, tone: c.exit.equity_irr_pct >= 15 ? "ok" : c.exit.equity_irr_pct >= 10 ? "info" : "warn" },
    { label: "MOIC", value: fmtMoic(c.exit.moic), sub: "× equity" },
    { label: "Avg DSCR", value: avgDscr > 0 ? avgDscr.toFixed(2).replace(".", ",") : "—", sub: `Y1–Y${exitYear}`, tone: avgDscr >= 1.2 ? "ok" : avgDscr >= 1.0 ? "info" : "warn" },
    { label: "LTV", value: ltvY1 > 0 ? `${ltvY1.toFixed(1).replace(".", ",")}%` : "—", sub: "Y1 · senior" },
    { label: "Cap rate", value: `${c.cap_rate.entry.used_pct.toFixed(2).replace(".", ",")}%`, sub: c.cap_rate.entry.source === "dynamic" ? "Dynamic · entry" : "Override · entry", tone: "ok" },
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
