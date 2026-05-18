import { SectionShell } from "../primitives/section-shell";
import { MemorandumBlock } from "../primitives/memorandum-block";
import { KpiHero, KpiTile } from "../primitives/kpi-hero";
import { NarrativeParagraph, NarrativeMetric } from "../primitives/narrative-paragraph";
import { RiskIndicator } from "../primitives/risk-indicator";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { zeroSeries } from "@/lib/underwriting/temporal";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 07 · Financing · lender memorandum view.
 *
 *   A · Debt stack composition (visual hierarchy · per-tranche tiles)
 *   B · Rate stack + portfolio amortization narrative
 *   C · Covenant health (DSCR / ICR / LTV per period)
 *   D · Detail schedule (full per-period table)
 *
 * Reads like a debt-committee underwriting page · not a spreadsheet.
 */
export function FinancingSection({ bundle }: { bundle: UnderwritingBundle }) {
  const f = bundle.computed.financing;
  const inputs = bundle.inputs.financing;
  const periods = bundle.computed.periods;
  const asset = bundle.inputs.asset;
  const investment = bundle.computed.investment;
  const cols = 1 + periods.length;
  const ratePlaceholder = zeroSeries(periods);

  const blendedRate = f.tranches.length > 0
    ? f.tranches.reduce((acc, t) => acc + (t.effective_rate_pct[0] ?? 0) * t.principal_amount, 0) / Math.max(1, f.total_principal)
    : 0;

  // Find the worst DSCR + LTV pre-exit (excluding post-exit zeros)
  const exitYear = bundle.computed.exit.exit_year || periods.length - 1;
  let worstDscr = Number.POSITIVE_INFINITY;
  let worstDscrPeriod = -1;
  for (let t = 1; t <= exitYear; t++) {
    if (f.dscr[t] > 0 && f.dscr[t] < worstDscr) {
      worstDscr = f.dscr[t];
      worstDscrPeriod = t;
    }
  }
  const peakLtv = f.ltv_pct[0] ?? 0;

  const totalDebtPct = investment.total_building_cost > 0 ? f.total_principal / investment.total_building_cost : 0;

  return (
    <SectionShell
      number={7}
      anchorId="financing"
      title="Financing"
      subtitle={`${f.tranches.length} tranche${f.tranches.length === 1 ? "" : "s"} · ${fmtEUR(f.total_principal)} aggregate principal · Euribor 12M ${inputs.euribor_12m_pct.toFixed(2)}%`}
      status={{ label: "Debt-committee ready", tone: "info" }}
      summary={
        <NarrativeParagraph eyebrow="Capital stack">
          Senior secured debt of <NarrativeMetric>{fmtEUR(f.total_principal)}</NarrativeMetric>{" "}
          across <NarrativeMetric>{f.tranches.length}</NarrativeMetric> tranche{f.tranches.length === 1 ? "" : "s"}{" "}
          delivers <NarrativeMetric>{fmtPct(totalDebtPct * 100)}</NarrativeMetric> Loan-to-Cost at a blended effective rate of{" "}
          <NarrativeMetric>{fmtPct(blendedRate)}</NarrativeMetric> (Euribor 12M + margin).{" "}
          {worstDscrPeriod > 0
            ? <>Coverage tightens to <NarrativeMetric>{worstDscr.toFixed(2)}× DSCR</NarrativeMetric> in Y{worstDscrPeriod} during peak amortization · operator should validate against the {(inputs.tranches.find((t) => t.covenants?.length) ? "configured covenants" : "lender's 1.20× covenant default")}.</>
            : <>Coverage holds above 1.0× DSCR through exit · institutional buffer absorbed by stabilising EBITDA.</>}
        </NarrativeParagraph>
      }
      detail={
        <div className="space-y-6 print:space-y-4">
          {/* Block A · Debt stack composition */}
          <MemorandumBlock number="A" title="Debt stack" subtitle="Tranche hierarchy · principal at origination">
            <DebtStackVisualization tranches={f.tranches} totalPrincipal={f.total_principal} totalInvestment={investment.total_building_cost} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {f.tranches.map((t) => (
                <TrancheTile key={t.tranche_id} tranche={t} totalPrincipal={f.total_principal} />
              ))}
            </div>
          </MemorandumBlock>

          {/* Block B · Rate stack + portfolio amortization */}
          <MemorandumBlock number="B" title="Rate stack & amortization" subtitle="Floating-rate composition · debt service profile">
            <div className="grid gap-3 sm:grid-cols-4">
              <KpiTile label="Euribor 12M" value={fmtPct(inputs.euribor_12m_pct)} sub="reference rate" />
              <KpiTile label="Blended margin" value={fmtPct(blendedRate - inputs.euribor_12m_pct)} sub="spread over Euribor" />
              <KpiTile label="Blended effective" value={fmtPct(blendedRate)} sub="weighted by principal" highlight />
              <KpiTile label="Interest Y1" value={fmtEUR(f.total_interest_expense[1] ?? 0)} sub="grace year · interest only" />
            </div>
            <PortfolioScheduleSummary financing={f} exitYear={exitYear} />
          </MemorandumBlock>

          {/* Block C · Covenant health */}
          <MemorandumBlock number="C" title="Covenant health" subtitle="DSCR · ICR · LTV per period · pre-exit only">
            <div className="grid gap-3 sm:grid-cols-3">
              <KpiTile label="Worst DSCR" value={worstDscrPeriod > 0 ? `${worstDscr.toFixed(2)}×` : "—"} sub={worstDscrPeriod > 0 ? `Y${worstDscrPeriod}` : "above 1.0× throughout"} tone={worstDscr >= 1.2 ? "ok" : worstDscr >= 1.0 ? "warn" : "negative"} />
              <KpiTile label="Peak LTV" value={fmtPct(peakLtv * 100)} sub="origination · de-leverages over time" tone={peakLtv <= 0.65 ? "ok" : peakLtv <= 0.75 ? "warn" : "negative"} />
              <KpiTile label="ICR Y1" value={`${(f.icr[1] ?? 0).toFixed(2)}×`} sub="interest cover · stabilising" tone={(f.icr[1] ?? 0) >= 2 ? "ok" : "warn"} />
            </div>
            <CovenantStrip dscr={f.dscr} icr={f.icr} ltv={f.ltv_pct} exitYear={exitYear} />
          </MemorandumBlock>

          {/* Block D · Detail schedule */}
          <MemorandumBlock number="D" title="Portfolio schedule" subtitle="Full per-period debt-service table">
            <YearGrid periods={periods} caption="Financing · Portfolio schedule">
              <DivisionRow label="Rate stack" columnCount={cols} />
              <YearRow label="Euribor 12 months" values={ratePlaceholder.map(() => inputs.euribor_12m_pct / 100)} format="percent" indent={1} kind="muted" />
              <YearRow label="Blended effective" values={ratePlaceholder.map(() => blendedRate / 100)} format="percent" indent={1} kind="subgroup" />
              <DivisionRow label="Debt service · portfolio" columnCount={cols} />
              <YearRow label="BoFY Balance" values={f.total_bofy_balance} />
              <SubtotalRow label="Payment" values={f.total_payment} tone="subtotal" />
              <YearRow label="Interest Expense" values={f.total_interest_expense} kind="negative" indent={1} />
              <YearRow label="Loan Principal" values={f.total_loan_principal} kind="negative" indent={1} />
              <YearRow label="Bullet Principal" values={f.total_bullet_principal} kind="negative" indent={1} />
              <YearRow label="Drawdown" values={f.total_drawdown} kind="positive" indent={1} />
              <SubtotalRow label="EoFY Balance" values={f.total_eofy_balance} tone="result" />
              <DivisionRow label="Covenants" columnCount={cols} />
              <YearRow label="DSCR" values={f.dscr} format="ratio" kind="subgroup" />
              <YearRow label="ICR" values={f.icr} format="ratio" kind="subgroup" />
              <YearRow label="LTV" values={f.ltv_pct} format="percent" kind="subgroup" />
            </YearGrid>
          </MemorandumBlock>

          {/* Refinance readiness placeholder · Block 9+ */}
          <div className="flex flex-wrap gap-2 border-t border-slate-800/60 pt-3 print:border-slate-300">
            <RiskIndicator severity="info" label="Refinance readiness" detail="Bullet repayment scheduled at maturity · refinance modelling in Block 9" />
            <RiskIndicator severity="info" label={`Asset · ${asset.submarket}`} detail={`${asset.rooms} keys · ${asset.category.replace("star", "*")}`} />
          </div>
        </div>
      }
    />
  );
}

// ─── Sub-primitives ──────────────────────────────────────────────────

function DebtStackVisualization({
  tranches,
  totalPrincipal,
  totalInvestment,
}: {
  tranches: UnderwritingBundle["computed"]["financing"]["tranches"];
  totalPrincipal: number;
  totalInvestment: number;
}) {
  const equity = Math.max(0, totalInvestment - totalPrincipal);
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-4 print:border-slate-300 print:bg-white">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400 print:text-slate-700">
          Capital stack
        </p>
        <span className="font-mono text-[10px] text-slate-500 print:text-slate-600">
          Total · {fmtEUR(totalInvestment)}
        </span>
      </div>
      <div className="flex h-8 overflow-hidden rounded-md border border-slate-800/60 print:border-slate-400">
        {tranches.map((t) => {
          const pct = totalInvestment > 0 ? (t.principal_amount / totalInvestment) * 100 : 0;
          const colourClass =
            t.kind === "senior_secured" ? "bg-lime-400/80 print:bg-emerald-600"
            : t.kind === "senior_capex" ? "bg-lime-300/60 print:bg-emerald-500"
            : t.kind === "mezzanine" ? "bg-amber-400/80 print:bg-amber-500"
            : t.kind === "bridge" ? "bg-sky-400/80 print:bg-sky-500"
            : t.kind === "preferred_equity" ? "bg-fuchsia-400/80 print:bg-fuchsia-500"
            : "bg-slate-500/80 print:bg-slate-500";
          return (
            <div
              key={t.tranche_id}
              className={`flex items-center justify-center ${colourClass}`}
              style={{ width: `${pct}%` }}
              title={`${t.label} · ${fmtEUR(t.principal_amount)} · ${pct.toFixed(1)}%`}
            >
              {pct > 8 && (
                <span className="font-headline text-[9px] font-bold text-slate-900">{fmtPct(pct)}</span>
              )}
            </div>
          );
        })}
        <div
          className="flex items-center justify-center bg-slate-800 print:bg-slate-200"
          style={{ width: `${(equity / Math.max(1, totalInvestment)) * 100}%` }}
          title={`Equity · ${fmtEUR(equity)}`}
        >
          {(equity / totalInvestment) * 100 > 8 && (
            <span className="font-headline text-[9px] font-bold text-slate-300 print:text-slate-700">
              {fmtPct((equity / totalInvestment) * 100)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-3 text-[10px]">
        {tranches.map((t) => (
          <StackLegend
            key={t.tranche_id}
            colour={
              t.kind === "senior_secured" ? "bg-lime-400/80 print:bg-emerald-600"
              : t.kind === "senior_capex" ? "bg-lime-300/60 print:bg-emerald-500"
              : t.kind === "mezzanine" ? "bg-amber-400/80 print:bg-amber-500"
              : t.kind === "bridge" ? "bg-sky-400/80 print:bg-sky-500"
              : t.kind === "preferred_equity" ? "bg-fuchsia-400/80 print:bg-fuchsia-500"
              : "bg-slate-500/80 print:bg-slate-500"
            }
            label={t.label}
            value={fmtEUR(t.principal_amount)}
          />
        ))}
        <StackLegend colour="bg-slate-800 print:bg-slate-200" label="Equity" value={fmtEUR(equity)} />
      </div>
    </div>
  );
}

function StackLegend({ colour, label, value }: { colour: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className={`h-2 w-2 rounded-sm ${colour}`} />
      <span className="text-slate-300 print:text-slate-700">{label}</span>
      <span className="text-slate-500 print:text-slate-600">· {value}</span>
    </span>
  );
}

function TrancheTile({
  tranche,
  totalPrincipal,
}: {
  tranche: UnderwritingBundle["computed"]["financing"]["tranches"][number];
  totalPrincipal: number;
}) {
  const sharePct = totalPrincipal > 0 ? (tranche.principal_amount / totalPrincipal) * 100 : 0;
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-3 print:border-slate-300 print:bg-white">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        {tranche.kind.replaceAll("_", " ")}
      </p>
      <p className="mt-1 font-headline text-[12.5px] font-extrabold text-slate-100 print:text-slate-900">{tranche.label}</p>
      <p className="mt-1 font-mono text-[16px] font-extrabold tabular-nums text-lime-200 print:text-emerald-700">
        {fmtEUR(tranche.principal_amount)}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-slate-400 print:text-slate-600">
        {fmtPct(sharePct)} of stack · {fmtPct(tranche.effective_rate_pct[0] ?? 0)} effective
      </p>
    </div>
  );
}

function PortfolioScheduleSummary({
  financing,
  exitYear,
}: {
  financing: UnderwritingBundle["computed"]["financing"];
  exitYear: number;
}) {
  const totalInterestPaid = financing.total_interest_expense.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);
  const totalPrincipalRepaid = financing.total_loan_principal.slice(0, exitYear + 1).reduce((a, b) => a + b, 0)
    + financing.total_bullet_principal.slice(0, exitYear + 1).reduce((a, b) => a + b, 0);
  const balanceAtExit = financing.total_eofy_balance[exitYear] ?? 0;
  return (
    <div className="rounded-md border border-slate-800/40 bg-slate-900/30 p-3 print:border-slate-300 print:bg-white">
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400 print:text-slate-700">
        Amortization narrative
      </p>
      <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
        <SummaryItem label="Interest paid (hold)" value={fmtEUR(totalInterestPaid)} />
        <SummaryItem label="Principal repaid scheduled" value={fmtEUR(totalPrincipalRepaid)} />
        <SummaryItem label="Balance at exit (payoff)" value={fmtEUR(balanceAtExit)} tone="warn" />
      </ul>
    </div>
  );
}

function SummaryItem({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warn" }) {
  const colour = tone === "warn" ? "text-amber-200 print:text-amber-700" : "text-slate-100 print:text-slate-900";
  return (
    <li className="flex flex-col">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500 print:text-slate-600">{label}</span>
      <span className={`font-mono text-[13px] font-extrabold tabular-nums ${colour}`}>{value}</span>
    </li>
  );
}

function CovenantStrip({
  dscr,
  icr,
  ltv,
  exitYear,
}: {
  dscr: number[];
  icr: number[];
  ltv: number[];
  exitYear: number;
}) {
  const years = Array.from({ length: Math.min(exitYear, 10) }, (_, i) => i + 1);
  return (
    <div className="overflow-x-auto rounded-md border border-slate-800/40 bg-slate-900/30 p-3 print:border-slate-300 print:bg-white">
      <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-400 print:text-slate-700">
        Covenant strip · Y1 → Y{exitYear}
      </p>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="text-slate-500 print:text-slate-600">
            <th className="py-1 pr-2 text-left font-headline text-[9px] font-bold uppercase tracking-[0.18em]">Metric</th>
            {years.map((y) => (
              <th key={y} className="px-2 py-1 text-right font-headline text-[9px] font-bold uppercase tracking-[0.18em]">
                Y{y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <CovenantRow label="DSCR" series={dscr} years={years} formatter={(v) => `${v.toFixed(2)}×`} thresholdGood={1.2} thresholdWarn={1.0} />
          <CovenantRow label="ICR" series={icr} years={years} formatter={(v) => `${v.toFixed(2)}×`} thresholdGood={2.0} thresholdWarn={1.5} />
          <CovenantRow label="LTV" series={ltv} years={years} formatter={(v) => `${(v * 100).toFixed(1)}%`} thresholdGood={0.65} thresholdWarn={0.75} reverse />
        </tbody>
      </table>
    </div>
  );
}

function CovenantRow({
  label,
  series,
  years,
  formatter,
  thresholdGood,
  thresholdWarn,
  reverse = false,
}: {
  label: string;
  series: number[];
  years: number[];
  formatter: (v: number) => string;
  thresholdGood: number;
  thresholdWarn: number;
  /** When true, LOWER is better (LTV) so the comparison flips. */
  reverse?: boolean;
}) {
  return (
    <tr className="border-t border-slate-800/40 print:border-slate-200">
      <td className="py-1 pr-2 font-headline text-[11px] font-bold text-slate-200 print:text-slate-900">{label}</td>
      {years.map((y) => {
        const v = series[y] ?? 0;
        const isGood = reverse ? v <= thresholdGood : v >= thresholdGood;
        const isWarn = reverse ? v <= thresholdWarn : v >= thresholdWarn;
        const colour =
          v === 0 ? "text-slate-600"
          : isGood ? "text-emerald-200 print:text-emerald-700"
          : isWarn ? "text-amber-200 print:text-amber-700"
          : "text-rose-200 print:text-rose-700";
        return (
          <td key={y} className={`px-2 py-1 text-right font-mono text-[10.5px] tabular-nums ${colour}`}>
            {v === 0 ? "·" : formatter(v)}
          </td>
        );
      })}
    </tr>
  );
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
  return `${n.toFixed(2).replace(".", ",")}%`;
}
