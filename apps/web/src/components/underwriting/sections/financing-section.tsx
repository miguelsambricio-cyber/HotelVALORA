import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 07 · Financing.
 *
 * 3-tranche debt schedule (asset · capex · bullet) with EUR/Euribor +
 * Margin rate, BoFY → Payment → Interest → Principal → EoFY mechanics,
 * RCSD/DSCR per year. Block 5 ships the engine. Block 9 adds future
 * tranches (mezzanine, preferred equity, bridge, refinance event).
 */
export function FinancingSection({ bundle }: { bundle: UnderwritingBundle }) {
  const f = bundle.computed.financing;
  return (
    <SectionShell
      number={7}
      anchorId="financing"
      title="Financing"
      subtitle="Senior debt · capex tranche · bullet · Euribor + margin · DSCR per year"
      status={{ label: "Scaffold · Block 5 ships debt schedule", tone: "info" }}
      summary={
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <FinKpi label="Total Asset Costs" value={fmtEUR(f.total_asset_costs)} />
            <FinKpi label="Total LTV" value={`${(f.total_ltv_pct * 100).toFixed(0)}%`} />
            <FinKpi label="Total Debt" value={fmtEUR(f.total_debt)} />
            <FinKpi label="Bullet" value={`${(f.bullet_pct * 100).toFixed(0)}%`} sub={fmtEUR(f.bullet_amount)} />
          </div>
          <p className="font-mono text-[11px] text-slate-400">
            Future-proof for mezzanine · preferred equity · bridge financing · refinance events · lender covenant testing · DSCR triggers.
          </p>
          <div className="flex flex-wrap gap-2">
            <ReconciliationBadge status="info" label="DSCR check" detail="Engine pending" />
            <ReconciliationBadge status="info" label="Debt waterfall" detail="Block 5" />
          </div>
        </div>
      }
      detail={
        <YearGrid caption="Financing · Debt schedule">
          <DivisionRow label="Rate stack" />
          <YearRow label="Euribor 12 months" values={f.bofy_balance.map(() => 0) as never} format="percent" indent={1} kind="muted" />
          <YearRow label="Margin" values={f.bofy_balance.map(() => 0) as never} format="percent" indent={1} kind="muted" />
          <YearRow label="Interest Rate" values={f.bofy_balance.map(() => 0) as never} format="percent" indent={1} kind="subgroup" />
          <DivisionRow label="Debt service" />
          <YearRow label="BoFY Balance" values={f.bofy_balance} />
          <SubtotalRow label="Payment" values={f.payment} tone="subtotal" />
          <YearRow label="Interest Expense" values={f.interest_expense} kind="negative" indent={1} />
          <YearRow label="Loan Principal" values={f.loan_principal} kind="negative" indent={1} />
          <YearRow label="Loan CAPEX" values={f.loan_capex} kind="negative" indent={1} />
          <YearRow label="Bullet Principal" values={f.bullet_principal} kind="negative" indent={1} />
          <SubtotalRow label="EoFY Balance" values={f.eofy_balance} tone="result" />
          <DivisionRow label="Covenants" />
          <YearRow label="RCSD / DSCR" values={f.rcsd} format="ratio" kind="subgroup" />
        </YearGrid>
      }
    />
  );
}

function FinKpi({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-md border border-slate-800/60 bg-slate-900/40 p-2.5">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 font-mono text-[14px] font-extrabold tabular-nums text-slate-100">{value}</p>
      {sub && <p className="font-mono text-[9.5px] text-slate-500">{sub}</p>}
    </div>
  );
}

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}
