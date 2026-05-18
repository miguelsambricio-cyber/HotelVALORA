import type { Metadata } from "next";
import { ReportShell } from "@/components/report/shell/report-shell";
import { UnderwritingShell } from "@/components/underwriting/underwriting-shell";
import { SCENARIO_BASE } from "@/lib/underwriting/defaults";

export const metadata: Metadata = {
  title: "Underwriting · Financials · HotelVALORA",
  description:
    "Institutional underwriting operating system · P&L · Balance Sheet · Cash Flow · DTA · Investment & CAPEX · Financing · Exit Strategy with Project & Equity IRR.",
};

/**
 * /report/financials/underwriting
 *
 * Block 1 scaffold · ReportShell carries the landscape print canvas
 * (year grids need horizontal real estate). UnderwritingShell holds
 * the single-scroll memo layout with sticky section nav + 8 sections.
 *
 * Data flows in via the SCENARIO_BASE bundle for now. Block 8 wires
 * Supabase-backed scenarios (Base · Upside · Downside · Stress · etc.)
 * and the URL becomes /report/financials/underwriting/[scenarioId].
 */
export default function UnderwritingPage() {
  return (
    <ReportShell printOrientation="landscape">
      <UnderwritingShell bundle={SCENARIO_BASE} />
    </ReportShell>
  );
}
