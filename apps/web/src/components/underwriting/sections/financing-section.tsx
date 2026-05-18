import { SectionShell } from "../primitives/section-shell";
import { YearGrid } from "../primitives/year-grid";
import { YearRow } from "../primitives/year-row";
import { SubtotalRow, DivisionRow } from "../primitives/subtotal-row";
import { ReconciliationBadge } from "../primitives/reconciliation-badge";
import { zeroSeries } from "@/lib/underwriting/temporal";
import type { UnderwritingBundle } from "@/lib/underwriting/types";

/**
 * Section 07 · Financing.
 *
 * Tranche-first debt schedule. MVP renders portfolio aggregates · Block
 * 5 ships per-tranche drill-down + DSCR / ICR / LTV. Block 9 adds future
 * tranches (mezzanine, preferred equity, bridge, refinance event).
 */
export function FinancingSection({ bundle }: { bundle: UnderwritingBundle }) {
  const f = bundle.computed.financing;
  const inputs = bundle.inputs.financing;
  const periods = bundle.computed.periods;
  const cols = 1 + periods.length;
  const ratePlaceholder = zeroSeries(periods);
  return (
    <SectionShell
      number={7}
      anchorId="financing"
      title="Financing"
      subtitle={`${f.tranches.length} tranche${f.tranches.length === 1 ? "" : "s"} · Euribor + margin · DSCR per period`}
      status={{ label: "Scaffold · Block 5 ships debt schedule", tone: "info" }}
      summary={
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-4">
            <FinKpi label="Tranches" value={String(f.tranches.length)} />
            <FinKpi label="Total Principal" value={fmtEUR(f.total_principal)} />
            <FinKpi label="Euribor 12m" value={`${inputs.euribor_12m_pct.toFixed(2)}%`} />
            <FinKpi label="Capital Stack" value={f.tranches.map((t) => t.label).join(" · ") || "—"} />
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
        <YearGrid periods={periods} caption="Financing · Portfolio schedule">
          <DivisionRow label="Rate stack" columnCount={cols} />
          <YearRow label="Euribor 12 months" values={ratePlaceholder} format="percent" indent={1} kind="muted" />
          <YearRow label="Margin (blended)" values={ratePlaceholder} format="percent" indent={1} kind="muted" />
          <YearRow label="Effective rate" values={ratePlaceholder} format="percent" indent={1} kind="subgroup" />
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
