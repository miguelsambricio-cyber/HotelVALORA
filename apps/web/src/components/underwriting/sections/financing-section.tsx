import { SectionShell } from "../primitives/section-shell";
import { KpiTile } from "../primitives/kpi-hero";
import { EditableTile } from "../primitives/editable-tile";
import { RiskIndicator } from "../primitives/risk-indicator";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { SortableGrid } from "../edit/sortable-grid";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { zeroSeries } from "@/lib/underwriting/temporal";
import type { UnderwritingBundle } from "@/lib/underwriting/types";
import type { UnderwritingInputOverrides } from "@/lib/underwriting/defaults";

/**
 * Section 07 · Financing · lender memorandum view.
 *
 * Corporate light theme · debt-stack visualisation uses the report's
 * canonical forest / amber / sky / fuchsia palette on a white canvas;
 * each tranche tile carries a slate-200 border so the per-tranche
 * hierarchy stays readable without dark-mode chrome.
 */
export function FinancingSection({
  bundle,
  onOverrideChange,
}: {
  bundle: UnderwritingBundle;
  onOverrideChange: (patch: UnderwritingInputOverrides) => void;
}) {
  const f = bundle.computed.financing;
  const inputs = bundle.inputs.financing;
  const periods = bundle.computed.periods;
  const asset = bundle.inputs.asset;
  const investment = bundle.computed.investment;
  const exitYear = bundle.computed.exit.exit_year;
  // Operating schedule · acquisition phase hidden · Concept + visible periods.
  const operatingCols = periods
    .slice(0, exitYear + 1)
    .filter((pd) => (pd.phase ?? "operating") !== "acquisition").length;
  const cols = 1 + operatingCols;
  const ratePlaceholder = zeroSeries(periods);

  const blendedRate = f.tranches.length > 0
    ? f.tranches.reduce((acc, t) => acc + (t.effective_rate_pct[0] ?? 0) * t.principal_amount, 0) / Math.max(1, f.total_principal)
    : 0;

  const senior = inputs.tranches.find((t) => t.kind === "senior_secured");
  const capex = inputs.tranches.find((t) => t.kind === "senior_capex");
  const seniorLtvPct = senior && senior.principal.kind === "ltv_of_value" ? senior.principal.ltv_pct : 0;
  const seniorYears = senior?.amortization.years ?? 0;
  const seniorBulletPct = senior?.amortization.kind === "bullet" ? (senior.amortization.bullet_pct ?? 0) : 0;
  const seniorGrace = senior?.grace_periods ?? 0;
  const capexLtcPct = capex && capex.principal.kind === "ltc_of_total" ? capex.principal.ltc_pct : 0;
  const capexYears = capex?.amortization.years ?? 0;
  const seniorMarginPct = senior?.rate.kind === "floating" ? senior.rate.margin_pct : 0;

  return (
    <SectionShell
      number={7}
      anchorId="financing"
      title="Financing"
      subtitle={`${f.tranches.length} tranche${f.tranches.length === 1 ? "" : "s"} · ${fmtEUR(f.total_principal)} aggregate principal · Euribor 12M ${inputs.euribor_12m_pct.toFixed(2)}%`}
      status={{ label: "Debt-committee ready", tone: "info" }}
      summary={
        <div className="space-y-6 print:space-y-4">
          {/* Headline · 8 editable debt parameters · 4 per row · same size as Section 06 */}
          <SortableGrid
            gridId="financing.headline"
            className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4"
            items={[
              { id: "senior-acq-pct", content: (
                <EditableTile label="Senior Acquisition %" value={seniorLtvPct} format="percent" min={0} max={100}
                  onCommit={(ltv_pct) => onOverrideChange({ ltv_pct })} sub="LTV of hotel value" />
              ) },
              { id: "asset-loan-years", content: (
                <EditableTile label="Asset loan years" value={seniorYears} format="years" min={1} max={30}
                  onCommit={(senior_years) => onOverrideChange({ senior_years })} sub="maturity · senior" />
              ) },
              { id: "senior-capex-pct", content: (
                <EditableTile label="Senior CAPEX %" value={capexLtcPct} format="percent" min={0} max={100}
                  onCommit={(ltc_pct) => onOverrideChange({ ltc_pct })} sub="LTC of CAPEX only" />
              ) },
              { id: "capex-loan-years", content: (
                <EditableTile label="CAPEX loan years" value={capexYears} format="years" min={1} max={20}
                  onCommit={(capex_years) => onOverrideChange({ capex_years })} sub="maturity · CAPEX line" />
              ) },
              { id: "euribor", content: (
                <EditableTile label="Euribor 12M" value={inputs.euribor_12m_pct} format="percent" min={0} max={20}
                  onCommit={(euribor_pct) => onOverrideChange({ euribor_pct })} sub="reference rate" />
              ) },
              { id: "interest-rate", content: (
                <EditableTile label="Interest rate" value={seniorMarginPct} format="percent" min={0} max={20}
                  onCommit={(senior_margin_pct) => onOverrideChange({ senior_margin_pct })}
                  sub={`+ Euribor · effective ${fmtPct(blendedRate)}`} />
              ) },
              { id: "bullet", content: (
                <EditableTile label="Bullet" value={seniorBulletPct} format="percent" min={0} max={100}
                  onCommit={(senior_bullet_pct) => onOverrideChange({ senior_bullet_pct })} sub={`Y${seniorYears} · senior`} />
              ) },
              { id: "grace-period", content: (
                <EditableTile label="Grace period" value={seniorGrace} format="years" min={0} max={10}
                  onCommit={(senior_grace_periods) => onOverrideChange({ senior_grace_periods })} sub="no principal · interest only" />
              ) },
            ]}
          />

          <DebtStackVisualization tranches={f.tranches} totalPrincipal={f.total_principal} totalInvestment={investment.total_building_cost} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {f.tranches.map((t) => (
              <TrancheTile key={t.tranche_id} tranche={t} totalPrincipal={f.total_principal} />
            ))}
            <AggregateLtvCard
              totalPrincipal={f.total_principal}
              hotelValue={investment.hotel_value}
            />
          </div>

          <PortfolioScheduleSummary financing={f} exitYear={exitYear} />

          <YearGrid
            periods={periods}
            displayThroughIndex={exitYear}
            kind="operating"
            excludeAcquisition
            caption="Operating Hold · Portfolio debt service Y1 → Y{exit}"
          >
            <DivisionRow label="Rate stack" columnCount={cols} />
            <YearRow label="Euribor 12 months" values={ratePlaceholder.map(() => inputs.euribor_12m_pct / 100)} format="percent" indent={1} kind="muted" />
            <YearRow label="Blended effective" values={ratePlaceholder.map(() => blendedRate / 100)} format="percent" indent={1} kind="subgroup" />
            <DivisionRow label="Debt service · portfolio" columnCount={cols} />
            <YearRow label="BoFY Balance" values={f.total_bofy_balance} />
            <SubtotalRow label="Payment" values={f.total_payment} tone="subtotal" />
            <YearRow label={`Upfront Fee · ${(inputs.upfront_fee_pct ?? 0.5).toFixed(2).replace(".", ",")}% · one-time Y1`} values={f.total_upfront_fee_amortized} kind="negative" indent={1} />
            <YearRow label="Interest Expense" values={f.total_interest_expense} kind="negative" indent={1} />
            <YearRow label="Loan Principal" values={f.total_loan_principal} kind="negative" indent={1} />
            <YearRow label="Bullet / Exit Payoff" values={buildBulletWithExitPayoff(f, exitYear)} kind="negative" indent={1} />
            <SubtotalRow label="EoFY Balance" values={f.total_eofy_balance} tone="result" />
            <DivisionRow label="Covenants · min thresholds" columnCount={cols} />
            <YearRow
              label="DSCR"
              labelNode={
                <CovenantLabel
                  name="DSCR"
                  fullName="Debt Service Coverage Ratio"
                  description="Measures the cash-flow cushion available to service debt obligations · institutional hospitality convention uses Gross Operating Profit as numerator (excludes FF&E reserve · operator-discretionary)."
                  formula="DSCR = Gross Operating Profit / (Interest + Principal + Bullet)"
                  threshold="≥ 1,10×"
                  source="admin/financials · financial structure"
                />
              }
              values={f.dscr}
              format="ratio"
              kind="subgroup"
            />
            <YearRow
              label="DYR"
              labelNode={
                <CovenantLabel
                  name="DYR"
                  fullName="Debt Yield Ratio"
                  description="Stress threshold independent of cap-rate compression · lender focuses on what the property earns relative to the loan balance, regardless of market valuation cycles."
                  formula="DYR = Gross Operating Profit / EoFY Debt Balance"
                  threshold="≥ 7,50%"
                  source="admin/financials · financial structure"
                />
              }
              values={f.debt_yield_pct}
              format="percent"
              kind="subgroup"
            />
            <YearRow
              label="ICR"
              labelNode={
                <CovenantLabel
                  name="ICR"
                  fullName="Interest Coverage Ratio"
                  description="Cash-flow cushion over interest service only · ignores principal amortization · useful during interest-only / grace periods."
                  formula="ICR = Gross Operating Profit / Interest Expense"
                  threshold="≥ 2,00×"
                  source="institutional reference"
                />
              }
              values={f.icr}
              format="ratio"
              kind="subgroup"
            />
            <YearRow
              label="LTV"
              labelNode={
                <CovenantLabel
                  name="LTV"
                  fullName="Loan-to-Value Ratio"
                  description="Aggregate debt balance as a share of the underlying asset value · institutional lender covenant for re-margin events."
                  formula="LTV = Total Debt Balance / Asset Value"
                  threshold="≤ 65,00%"
                  source="admin/financials · financial structure"
                />
              }
              values={f.ltv_pct}
              format="percent"
              kind="subgroup"
            />
          </YearGrid>

          <div className="flex flex-wrap gap-2 border-t border-slate-200 pt-3">
            <RiskIndicator severity="info" label="Refinance readiness" detail="Bullet repayment scheduled at maturity · refinance modelling in Block 9" />
            <RiskIndicator severity="info" label={`Asset · ${asset.submarket}`} detail={`${asset.rooms} keys · ${asset.category.replace("star", "*")}`} />
          </div>
        </div>
      }
    />
  );
}

// ─── Sub-primitives ──────────────────────────────────────────────────

/** Aggregate LTV card · sits to the right of the Senior CAPEX tranche
 *  tile (in the per-tranche grid below the capital stack) and explains
 *  how the headline LTV is built — senior secured + senior CAPEX
 *  divided by hotel value. Surfaces ~65.7% in the base scenario. */
function AggregateLtvCard({
  totalPrincipal,
  hotelValue,
}: {
  totalPrincipal: number;
  hotelValue: number;
}) {
  const ltvPct = hotelValue > 0 ? (totalPrincipal / hotelValue) * 100 : 0;
  return (
    <div className="rounded-md border-2 border-forest-900/30 bg-forest-50 p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-forest-900">
        Aggregate
      </p>
      <p className="mt-1 font-headline text-[12.5px] font-extrabold text-slate-900">
        LTV %
      </p>
      <p className="mt-1 font-mono text-[16px] font-extrabold tabular-nums text-forest-900">
        {ltvPct.toFixed(1).replace(".", ",")}%
      </p>
      <p className="mt-0.5 font-mono text-[10px] leading-tight text-slate-600">
        Deuda total / Hotel value
      </p>
    </div>
  );
}

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
    <div className="rounded-md border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-slate-700">
          Capital stack
        </p>
        <span className="font-mono text-[10px] text-slate-500">
          Total · {fmtEUR(totalInvestment)}
        </span>
      </div>
      <div className="flex h-8 overflow-hidden rounded-md border border-slate-200">
        {tranches.map((t) => {
          const pct = totalInvestment > 0 ? (t.principal_amount / totalInvestment) * 100 : 0;
          const colourClass =
            t.kind === "senior_secured" ? "bg-forest-900"
            : t.kind === "senior_capex" ? "bg-forest-700"
            : t.kind === "mezzanine" ? "bg-amber-500"
            : t.kind === "bridge" ? "bg-sky-500"
            : t.kind === "preferred_equity" ? "bg-fuchsia-500"
            : "bg-slate-500";
          return (
            <div
              key={t.tranche_id}
              className={`flex items-center justify-center ${colourClass}`}
              style={{ width: `${pct}%` }}
              title={`${t.label} · ${fmtEUR(t.principal_amount)} · ${pct.toFixed(1)}%`}
            >
              {pct > 8 && (
                <span className="font-headline text-[9px] font-bold text-white">{fmtPct(pct)}</span>
              )}
            </div>
          );
        })}
        <div
          className="flex items-center justify-center bg-slate-300"
          style={{ width: `${(equity / Math.max(1, totalInvestment)) * 100}%` }}
          title={`Equity · ${fmtEUR(equity)}`}
        >
          {(equity / totalInvestment) * 100 > 8 && (
            <span className="font-headline text-[9px] font-bold text-slate-700">
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
              t.kind === "senior_secured" ? "bg-forest-900"
              : t.kind === "senior_capex" ? "bg-forest-700"
              : t.kind === "mezzanine" ? "bg-amber-500"
              : t.kind === "bridge" ? "bg-sky-500"
              : t.kind === "preferred_equity" ? "bg-fuchsia-500"
              : "bg-slate-500"
            }
            label={t.label}
            value={fmtEUR(t.principal_amount)}
          />
        ))}
        <StackLegend colour="bg-slate-300" label="Equity" value={fmtEUR(equity)} />
      </div>
    </div>
  );
}

function StackLegend({ colour, label, value }: { colour: string; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 font-mono">
      <span className={`h-2 w-2 rounded-sm ${colour}`} />
      <span className="text-slate-700">{label}</span>
      <span className="text-slate-500">· {value}</span>
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
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {tranche.kind.replaceAll("_", " ")}
      </p>
      <p className="mt-1 font-headline text-[12.5px] font-extrabold text-slate-900">{tranche.label}</p>
      <p className="mt-1 font-mono text-[16px] font-extrabold tabular-nums text-forest-900">
        {fmtEUR(tranche.principal_amount)}
      </p>
      <p className="mt-0.5 font-mono text-[10px] text-slate-500">
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
    <div className="rounded-md border border-slate-200 bg-white p-3">
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-700">
        Amortization narrative
      </p>
      <ul className="mt-2 grid gap-1.5 grid-cols-1 sm:grid-cols-3">
        <SummaryItem label="Interest paid (hold)" value={fmtEUR(totalInterestPaid)} />
        <SummaryItem label="Principal repaid scheduled" value={fmtEUR(totalPrincipalRepaid)} />
        <SummaryItem label="Balance at exit (payoff)" value={fmtEUR(balanceAtExit)} tone="warn" />
      </ul>
    </div>
  );
}

function SummaryItem({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "warn" }) {
  const colour = tone === "warn" ? "text-amber-700" : "text-slate-900";
  return (
    <li className="flex flex-col">
      <span className="font-headline text-[9px] font-bold uppercase tracking-[0.2em] text-slate-500">{label}</span>
      <span className={`font-mono text-[13px] font-extrabold tabular-nums ${colour}`}>{value}</span>
    </li>
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

/** Combines scheduled bullet principal with the exit-year debt payoff.
 *  Makes the row meaningful in the operating-only view (Y1..Y{exit})
 *  even when the scheduled bullet maturity sits beyond the hold period. */
function buildBulletWithExitPayoff(f: UnderwritingBundle["computed"]["financing"], exitYear: number): number[] {
  return f.total_bullet_principal.map((v, t) => {
    if (t !== exitYear) return v;
    // At exit year · add the residual EoFY balance as the payoff
    const payoff = f.total_eofy_balance[exitYear] ?? 0;
    return v + payoff;
  });
}

/**
 * CovenantLabel · clickable name + expandable info card with description,
 * formula and threshold. Replaces the inline-formula label pattern with a
 * cleaner institutional surface. Click closes on outside mousedown.
 */
function CovenantLabel({
  name,
  fullName,
  description,
  formula,
  threshold,
  source,
}: {
  name: string;
  fullName: string;
  description: string;
  formula: string;
  threshold: string;
  source: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-covenant-label]")) setOpen(false);
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span className="relative inline-block" data-covenant-label>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-expanded={open}
        title={fullName}
        className={cn(
          "inline-flex items-center gap-1 rounded-sm px-0.5 font-headline text-[11px] font-extrabold uppercase tracking-[0.06em] transition-colors",
          open ? "text-[#005db7]" : "text-slate-900 hover:text-[#005db7]",
        )}
      >
        <span>{name}</span>
        {open ? <ChevronUp size={11} strokeWidth={2.5} /> : <ChevronDown size={11} strokeWidth={2.5} />}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-30 mt-1 w-72 rounded-md border border-slate-200 bg-white p-3 shadow-xl ring-1 ring-black/5">
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#005db7]">
            {name} · {fullName}
          </p>
          <p className="mt-2 font-mono text-[10.5px] leading-relaxed text-slate-700">
            {description}
          </p>
          <div className="mt-3 border-t border-slate-100 pt-2">
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Formula</p>
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-900">{formula}</p>
          </div>
          <div className="mt-2">
            <p className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Threshold</p>
            <p className="mt-0.5 font-mono text-[11px] font-bold text-forest-900">{threshold}</p>
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 font-mono text-[9.5px] text-slate-500">
            Source · {source}
          </p>
        </div>
      )}
    </span>
  );
}
