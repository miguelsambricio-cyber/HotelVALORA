"use client";

import { useMemo, useState } from "react";
import type { UnderwritingBundle, UnderwritingInputs } from "@/lib/underwriting/types";
import { SCENARIO_CATALOG, buildBundleForScenario } from "@/lib/underwriting/defaults";
import { StickySectionNav, type NavItem } from "./primitives/sticky-section-nav";
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
 * Owns the live engine inputs the operator can drive from inside the
 * memo flow:
 *   · scenarioId         · Conservador / Mercado / Optimista (lives inside Block B Returns)
 *   · assetOverrides     · per-driver overrides (e.g. N° Keys edited inline in Block A)
 *
 * Both flow through `buildBundleForScenario` which re-runs the engine
 * deterministically. No floating toolbar · the controls live inside the
 * relevant memorandum blocks so the page reads as one institutional
 * narrative rather than a SaaS dashboard.
 */

const NAV_ITEMS: NavItem[] = [
  { number: 1, label: "Executive Summary", anchorId: "executive-summary", hint: "Drivers · returns · risk" },
  { number: 2, label: "P&L", anchorId: "pnl", hint: "PropCo without Exit Strategy · Y0–Y10" },
  { number: 3, label: "Balance Sheet", anchorId: "balance-sheet", hint: "Assets · Equity · Debt · reconciled" },
  { number: 4, label: "Cash Flow", anchorId: "cash-flow", hint: "Operating · Investment · Financing · Equity" },
  { number: 5, label: "DTA", anchorId: "dta", hint: "Tax shield · Ley IS · EBITDA 30% limit" },
  { number: 6, label: "Investment · CAPEX", anchorId: "investment", hint: "Acquisition · CAPEX · D&A · Dynamic Cap Rate" },
  { number: 7, label: "Financing", anchorId: "financing", hint: "Senior · CAPEX tranche · bullet · DSCR" },
  { number: 8, label: "Exit Strategy", anchorId: "exit", hint: "Terminal · Project IRR · Equity IRR" },
];

export function UnderwritingShell({ bundle: initialBundle }: { bundle: UnderwritingBundle }) {
  const [scenarioId, setScenarioId] = useState<string>(initialBundle.inputs.scenario_id || "base");
  const [assetOverrides, setAssetOverrides] = useState<Partial<UnderwritingInputs["asset"]>>({});

  const hasOverrides = Object.keys(assetOverrides).length > 0;
  const bundle = useMemo(() => {
    if (scenarioId === initialBundle.inputs.scenario_id && !hasOverrides) return initialBundle;
    return buildBundleForScenario(scenarioId, hasOverrides ? assetOverrides : undefined);
  }, [scenarioId, assetOverrides, hasOverrides, initialBundle]);

  const kpiItems = useMemo(() => buildKpiItems(bundle), [bundle]);

  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="min-w-0">
        <StickySectionNav items={NAV_ITEMS} />
      </aside>

      <div className="min-w-0 space-y-6">
        <FloatingKpiStrip items={kpiItems} />

        <ExecutiveSummarySection
          bundle={bundle}
          scenarioId={scenarioId}
          scenarioCatalog={SCENARIO_CATALOG}
          onScenarioChange={setScenarioId}
          onAssetChange={(patch) => setAssetOverrides((prev) => ({ ...prev, ...patch }))}
        />
        <PnlSection bundle={bundle} />
        <BalanceSheetSection bundle={bundle} />
        <CashFlowSection bundle={bundle} />
        <DtaSection bundle={bundle} />
        <InvestmentSection bundle={bundle} />
        <FinancingSection bundle={bundle} />
        <ExitSection bundle={bundle} />
      </div>
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
