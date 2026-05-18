import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero } from "../primitives/kpi-hero";
import { NarrativeParagraph, NarrativeMetric } from "../primitives/narrative-paragraph";
import { RiskIndicator, parseReconciliationWarning } from "../primitives/risk-indicator";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 01 · Executive Summary · the IC opener.
 *
 * Memorandum architecture · 3 blocks:
 *   A · Investment thesis (narrative + headline KPIs)
 *   B · Returns (Project + Equity IRR + MOIC + composition)
 *   C · Risk indicators (reconciliation warnings as institutional badges)
 *
 * Every output is wired to the engine · no placeholders. The narrative
 * paragraph reads like a Blackstone IC memo opener · short, dense,
 * defendable.
 */
export function ExecutiveSummarySection({ bundle }: { bundle: UnderwritingBundle }) {
  const asset = bundle.inputs.asset;
  const c = bundle.computed;
  const exit = c.exit;
  const inv = c.investment;
  const capExit = c.cap_rate.exit;
  const capEntry = c.cap_rate.entry;
  const stabilisedYield = inv.stabilized_yield_progression[exit.exit_year] ?? 0;
  const confidence = capEntry.dynamic.confidence;

  return (
    <SectionShell
      number={1}
      anchorId="executive-summary"
      title="Executive Summary"
      subtitle={`${asset.hotel_name ?? "Unnamed asset"} · ${asset.submarket} · ${asset.rooms} keys · ${asset.category.replace("star", "*")} ${tierLabel(asset.category)}`}
      status={{ label: "Investment committee draft", tone: "info" }}
      summary={
        <NarrativeParagraph eyebrow="Investment thesis">
          {asset.rooms}-key {tierLabel(asset.category).toLowerCase()} {actionLabel(asset.state)} opportunity in{" "}
          {asset.submarket} targeting stabilised <NarrativeMetric>{fmtPct(stabilisedYield * 100)}</NarrativeMetric>{" "}
          yield and <NarrativeMetric>{fmtPct(exit.equity_irr_pct)}</NarrativeMetric> levered IRR over a{" "}
          <NarrativeMetric>{exit.exit_year}-year</NarrativeMetric> hold. Exit valuation underpinned by a{" "}
          <NarrativeMetric>{fmtPct(capExit.used_pct)}</NarrativeMetric> institutional cap rate with{" "}
          {confidence.band.replace("_", "-")} confidence supported by{" "}
          {capEntry.dynamic.evidence.comp_count} comparable transactions in {asset.submarket}.
        </NarrativeParagraph>
      }
      detail={
        <div className="space-y-6 print:space-y-4">
          <MemorandumBlock number="A" title="Headline metrics" subtitle="Investment composition · pricing · yield">
            <KpiHero
              tiles={[
                { label: "Total Investment", value: fmtEUR(inv.total_building_cost), sub: `${fmtEUR(div(inv.total_building_cost, asset.rooms))} / key`, highlight: true },
                { label: "Equity Investment", value: fmtEUR(exit.equity_investment), sub: `${fmtPct((exit.equity_investment / inv.total_building_cost) * 100)} of total` },
                { label: "Total Debt", value: fmtEUR(c.financing.total_principal), sub: `${fmtPct((c.financing.total_principal / inv.total_building_cost) * 100)} LTC` },
                { label: "Entry Cap Rate", value: fmtPct(capEntry.used_pct), sub: capEntry.source === "dynamic" ? "Dynamic" : "Manual override" },
                { label: "Hold Period", value: `${exit.exit_year} years`, sub: `Exit Y${exit.exit_year}` },
                { label: "Confidence", value: `${confidence.score_0_100.toFixed(0)}/100`, sub: confidence.band.replace("_", " "), tone: confidenceTone(confidence.score_0_100) },
              ]}
            />
          </MemorandumBlock>

          <MemorandumBlock number="B" title="Returns" subtitle="Project · equity · multiple">
            <KpiHero
              tiles={[
                { label: "Project IRR", value: fmtPct(exit.project_irr_pct), sub: "unlevered · pre-tax", tone: irrTone(exit.project_irr_pct, 8) },
                { label: "Equity IRR", value: fmtPct(exit.equity_irr_pct), sub: "levered · post-tax", tone: irrTone(exit.equity_irr_pct, 12), highlight: true },
                { label: "MOIC", value: `${exit.moic.toFixed(2)}×`, sub: "equity multiple", tone: moicTone(exit.moic) },
                { label: "Stabilised Yield", value: fmtPct(stabilisedYield * 100), sub: `Year ${exit.exit_year}` },
                { label: "Exit Cap Rate", value: fmtPct(capExit.used_pct), sub: `Band ${fmtPct(capExit.dynamic.band.low_pct)}–${fmtPct(capExit.dynamic.band.high_pct)}` },
                { label: "Exit Price", value: fmtEUR(exit.exit_price), sub: `${fmtEUR(exit.exit_price_per_room)} / key` },
              ]}
            />
            <div className="grid gap-3 sm:grid-cols-3">
              <DistributionTile label="Equity contributed" value={exit.equity_investment} />
              <DistributionTile label="Net exit proceeds" value={exit.exit_price * (1 - bundle.inputs.exit.fee_pct) - exit.debt_repayment_at_exit + (c.financing.total_eofy_balance[exit.exit_year] ?? 0)} />
              <DistributionTile
                label="Profit share to equity"
                value={exit.profit_share}
                tone={exit.profit_share > 0 ? "ok" : "warn"}
              />
            </div>
          </MemorandumBlock>

          <MemorandumBlock number="C" title="Risk indicators" subtitle="Institutional reconciliation signals">
            <RiskIndicatorsPanel warnings={c.reconciliation.warnings} />
          </MemorandumBlock>
        </div>
      }
    />
  );
}

// ─── Sub-primitives ──────────────────────────────────────────────────

function DistributionTile({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "ok" | "warn" | "neutral" }) {
  const colour = tone === "ok" ? "text-emerald-200 print:text-emerald-700"
    : tone === "warn" ? "text-amber-200 print:text-amber-700"
    : "text-slate-100 print:text-slate-900";
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3 print:border-slate-300 print:bg-white">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">{label}</p>
      <p className={`mt-1 font-mono text-[15px] font-extrabold tabular-nums ${colour}`}>{fmtEUR(value)}</p>
    </div>
  );
}

function RiskIndicatorsPanel({ warnings }: { warnings: string[] }) {
  if (warnings.length === 0) {
    return (
      <div className="flex flex-wrap gap-2">
        <RiskIndicator severity="ok" label="All institutional invariants pass" detail="BS balanced · cash bridge OK · DSCR ≥ 1.0 · DTA ≥ 0 · drawdown ≡ principal · reserves continuous" />
      </div>
    );
  }
  const parsed = warnings.map(parseReconciliationWarning);
  // Group by severity for visual cadence: stress first, then watch, then info.
  const grouped = [...parsed].sort((a, b) => sevOrder(a.severity) - sevOrder(b.severity));
  return (
    <div className="flex flex-wrap gap-2">
      {grouped.map((p, i) => (
        <RiskIndicator key={i} {...p} />
      ))}
    </div>
  );
}

function sevOrder(s: "ok" | "watch" | "stress" | "info"): number {
  return s === "stress" ? 0 : s === "watch" ? 1 : s === "info" ? 2 : 3;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function tierLabel(c: "3star" | "4star" | "5star"): string {
  return c === "5star" ? "Luxury" : c === "4star" ? "Upscale" : "Midscale";
}

function actionLabel(s: "new" | "renovated" | "needs_work"): string {
  return s === "new" ? "newly built" : s === "renovated" ? "repositioning" : "value-add reposition";
}

function confidenceTone(score: number): "ok" | "warn" | "negative" {
  return score >= 70 ? "ok" : score >= 50 ? "warn" : "negative";
}

function irrTone(irr: number, target: number): "ok" | "warn" | "negative" {
  return irr >= target ? "ok" : irr >= target * 0.7 ? "warn" : "negative";
}

function moicTone(moic: number): "ok" | "warn" | "negative" {
  return moic >= 1.8 ? "ok" : moic >= 1.3 ? "warn" : "negative";
}

function fmtPct(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  return `${n.toFixed(2).replace(".", ",")}%`;
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function div(a: number, b: number): number {
  return b > 0 ? a / b : 0;
}
