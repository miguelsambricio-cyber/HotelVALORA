import type { UnderwritingBundle } from "@/lib/underwriting/types";
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
 *   Desktop (lg+):
 *     ┌──────┬──────────────────────────────────────┐
 *     │ nav  │  FloatingKpiStrip (sticky top)        │
 *     │ (sti │  ───────────────────────────────────  │
 *     │ cky) │  Section 01 · Executive Summary       │
 *     │      │  Section 02 · P&L                     │
 *     │      │  Section 03 · Balance Sheet           │
 *     │      │  Section 04 · Cash Flow               │
 *     │      │  Section 05 · DTA                     │
 *     │      │  Section 06 · Investment · CAPEX      │
 *     │      │  Section 07 · Financing               │
 *     │      │  Section 08 · Exit Strategy           │
 *     └──────┴──────────────────────────────────────┘
 *
 *   Mobile (< lg): nav collapses to horizontal scroll chips.
 *
 * Single source of truth · the UnderwritingBundle. Every section reads
 * from `bundle.computed.*` · zero engine logic in components.
 */

const NAV_ITEMS: NavItem[] = [
  { number: 1, label: "Executive Summary", anchorId: "executive-summary", hint: "Hero metrics · IRR · DSCR · LTV" },
  { number: 2, label: "P&L", anchorId: "pnl", hint: "PropCo without Exit Strategy · Y0–Y10" },
  { number: 3, label: "Balance Sheet", anchorId: "balance-sheet", hint: "Assets · Equity · Debt · reconciled" },
  { number: 4, label: "Cash Flow", anchorId: "cash-flow", hint: "Operating · Investment · Financing · Equity" },
  { number: 5, label: "DTA", anchorId: "dta", hint: "Tax shield · Ley IS · EBITDA 30% limit" },
  { number: 6, label: "Investment · CAPEX", anchorId: "investment", hint: "Acquisition · CAPEX · D&A · Dynamic Cap Rate" },
  { number: 7, label: "Financing", anchorId: "financing", hint: "Senior · CAPEX tranche · bullet · DSCR" },
  { number: 8, label: "Exit Strategy", anchorId: "exit", hint: "Terminal · Project IRR · Equity IRR" },
];

const KPI_PLACEHOLDERS: KpiItem[] = [
  { label: "Project IRR", value: "—", sub: "engine pending", tone: "info" },
  { label: "Equity IRR", value: "—", sub: "engine pending", tone: "info" },
  { label: "MOIC", value: "—", sub: "× equity" },
  { label: "Avg DSCR", value: "—", sub: "trailing 12m" },
  { label: "LTV", value: "—", sub: "senior" },
  { label: "Cap Rate", value: "—", sub: "Dynamic" },
];

export function UnderwritingShell({ bundle }: { bundle: UnderwritingBundle }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)]">
      <aside className="min-w-0">
        <StickySectionNav items={NAV_ITEMS} />
      </aside>

      <div className="min-w-0 space-y-6">
        <FloatingKpiStrip items={KPI_PLACEHOLDERS} />

        <ExecutiveSummarySection bundle={bundle} />
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
