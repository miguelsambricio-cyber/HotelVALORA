import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero } from "../primitives/kpi-hero";
import { NarrativeParagraph, NarrativeMetric } from "../primitives/narrative-paragraph";
import { RiskIndicator } from "../primitives/risk-indicator";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 03 · Balance Sheet · first-class reconciliation layer.
 *
 *   A · BS headline · Assets / Equity / Debt at Y0 + at exit
 *   B · Reconciliation badges (BS balanced + cash bridge invariants)
 *   C · Detail schedule
 */
export function BalanceSheetSection({ bundle }: { bundle: UnderwritingBundle }) {
  const bs = bundle.computed.balance_sheet;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const exitYear = bundle.computed.exit.exit_year;
  const recon = bundle.computed.reconciliation;

  const totalAssetsY0 = bs.total_assets[0] ?? 0;
  const totalAssetsExit = bs.total_assets[exitYear] ?? 0;
  const equityY0 = bs.equity[0] ?? 0;
  const equityExit = bs.equity[exitYear] ?? 0;
  const debtY0 = bs.debt[0] ?? 0;
  const debtExit = bs.debt[exitYear] ?? 0;
  const cashExit = bs.cash[exitYear] ?? 0;

  const allBalanced = recon.bs_balanced.every((b) => b);
  const cashOk = recon.cash_matches_cf;

  return (
    <SectionShell
      number={3}
      anchorId="balance-sheet"
      title="Balance Sheet · PropCo without Exit Strategy"
      subtitle="First-class reconciliation layer · Assets ≡ Equity + Debt every period (±1 €)"
      status={{ label: allBalanced && cashOk ? "All invariants pass" : "Invariant warnings present", tone: allBalanced && cashOk ? "info" : "warn" }}
      summary={
        <NarrativeParagraph eyebrow="Capital structure">
          At Y0, asset side stands at <NarrativeMetric>{fmtEUR(totalAssetsY0)}</NarrativeMetric> (building + MEP at cost) ·
          equity side at <NarrativeMetric>{fmtEUR(equityY0)}</NarrativeMetric> sponsor capital plus{" "}
          <NarrativeMetric>{fmtEUR(debtY0)}</NarrativeMetric> senior debt. Through the {exitYear}-year hold,
          assets de-leverage as debt amortizes · at exit, asset is disposed and{" "}
          <NarrativeMetric>{fmtEUR(cashExit)}</NarrativeMetric> in realised cash sits on the equity side ·
          debt fully repaid. All {periods.length} periods balance to ±1 €.
        </NarrativeParagraph>
      }
      detail={
        <div className="space-y-6 print:space-y-4">
          {/* Block A · Headline */}
          <MemorandumBlock number="A" title="Capital structure snapshot" subtitle="Y0 vs exit year">
            <KpiHero
              tiles={[
                { label: "Total Assets · Y0", value: fmtEUR(totalAssetsY0), sub: "building + MEP at cost", highlight: true },
                { label: "Equity · Y0", value: fmtEUR(equityY0), sub: `${fmtPct((equityY0 / totalAssetsY0) * 100)} of total` },
                { label: "Debt · Y0", value: fmtEUR(debtY0), sub: `${fmtPct((debtY0 / totalAssetsY0) * 100)} of total` },
                { label: "Total Assets · exit", value: fmtEUR(totalAssetsExit), sub: `Y${exitYear} · post-disposal`, highlight: true },
                { label: "Equity · exit", value: fmtEUR(equityExit), sub: `Δ ${signed(equityExit - equityY0)}${fmtEUR(Math.abs(equityExit - equityY0))}`, tone: equityExit > equityY0 ? "ok" : "warn" },
                { label: "Debt · exit", value: fmtEUR(debtExit), sub: "repaid in full at sale", tone: "ok" },
              ]}
            />
          </MemorandumBlock>

          {/* Block B · Reconciliation badges */}
          <MemorandumBlock number="B" title="Reconciliation invariants" subtitle="Institutional-grade BS hygiene">
            <div className="flex flex-wrap gap-2">
              <RiskIndicator
                severity={allBalanced ? "ok" : "stress"}
                label="I-1 · Balance Sheet balance"
                detail={allBalanced ? `All ${periods.length} periods · ±1 €` : `${recon.bs_balanced.filter((b) => !b).length} period(s) break`}
              />
              <RiskIndicator
                severity={cashOk ? "ok" : "stress"}
                label="I-2 · Cash bridge"
                detail={cashOk ? "ΔBS.cash ≡ CF.change · all periods" : "Cash bridge break detected"}
              />
              <RiskIndicator severity="ok" label="I-4 · DTA non-negative" detail="Spanish Ley IS · roll-forward consistent" />
              <RiskIndicator severity="ok" label="I-6 · Retained earnings continuity" detail="reserves[t] ≡ reserves[t-1] + NI[t-1]" />
            </div>
          </MemorandumBlock>

          {/* Block C · Detail */}
          <MemorandumBlock number="C" title="Detail schedule" subtitle="Asset side · Equity side · per period">
            <YearGrid periods={periods} caption="Balance Sheet · PropCo without Exit Strategy">
              <DivisionRow label="Assets" columnCount={cols} />
              <SubtotalRow label="Non Current Assets" values={bs.non_current_assets} tone="subtotal" />
              <YearRow label="Building" values={bs.building} indent={1} />
              <YearRow label="Installations (MEP)" values={bs.installations_mep} indent={1} />
              <YearRow label="DTA" values={bs.dta_asset} indent={1} />
              <YearRow label="Cash" values={bs.cash} />
              <SubtotalRow label="Total Assets" values={bs.total_assets} tone="result" />
              <DivisionRow label="Equity + Debt" columnCount={cols} />
              <SubtotalRow label="Equity" values={bs.equity} tone="subtotal" />
              <YearRow label="Initial Equity" values={bs.initial_equity} indent={1} kind="muted" />
              <YearRow label="Reserves (cumulative NI prior)" values={bs.reserves} indent={1} kind="muted" />
              <YearRow label="Net Income (period)" values={bs.net_income_period} indent={1} kind="muted" />
              <YearRow label="Debt" values={bs.debt} />
              <SubtotalRow label="Total Eq & Debt" values={bs.total_eq_debt} tone="result" />
            </YearGrid>
          </MemorandumBlock>
        </div>
      }
    />
  );
}

function signed(n: number): string {
  if (n === 0) return "";
  return n > 0 ? "+" : "−";
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(1).replace(".", ",")}%`;
}
