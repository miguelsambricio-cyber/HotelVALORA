/**
 * InitialInvestmentBlock · institutional Sources & Uses card.
 *
 * Renders the capital-deployment phase as a discrete block at the top of
 * a capital-side section (Cash Flow · Financing · Investment · Exit).
 * The block lives ABOVE the operating year-grid so the IC reader sees:
 *
 *   Initial Investment  →  Operating Hold  →  Exit
 *
 * which is the standard institutional flow.
 *
 * Layout: white card · slate-200 border · two columns (Uses left, Sources
 * right) on desktop · stacked on mobile. Per-side subtotal in the band
 * footer. Hidden from print only if the section already surfaces the
 * deployment story elsewhere (caller decides).
 *
 * Why this exists: when we filtered acquisition-phase columns out of every
 * year-grid for IC clarity, the capital-side schedules lost their core
 * Y0 information (Acquisition, CAPEX, Debt drawdown, Equity injection).
 * This block recovers that information in a denser, more institutional
 * form than a single Y0 column would ever achieve.
 */

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface InitialInvestmentItem {
  /** Stable id (used as React key + for testing). */
  id: string;
  label: string;
  /** Raw € value · sign-agnostic · the block infers sign from `side`. */
  value: number;
  /** Optional · sub-line shown under the value (e.g. "% of total"). */
  sub?: string;
}

export interface InitialInvestmentBlockProps {
  /** Section eyebrow · default "INITIAL INVESTMENT". Accepts ReactNode so
   *  callers can pass `<EditableText />` for in-page editing. */
  title?: ReactNode;
  /** Smaller mono caption shown on the right of the eyebrow. */
  subtitle?: ReactNode;
  /** Cash outflows · acquisition · CAPEX · fees · taxes. */
  uses: InitialInvestmentItem[];
  /** Cash inflows · debt drawn · equity contributed. */
  sources: InitialInvestmentItem[];
  /** Optional · render the per-side subtotal in the band footer. */
  showSubtotals?: boolean;
  className?: string;
}

export function InitialInvestmentBlock({
  title = "Initial Investment",
  subtitle = "Capital deployment at closing",
  uses,
  sources,
  showSubtotals = true,
  className,
}: InitialInvestmentBlockProps) {
  const usesTotal = uses.reduce((acc, item) => acc + Math.abs(item.value), 0);
  const sourcesTotal = sources.reduce((acc, item) => acc + Math.abs(item.value), 0);
  const showBalance = showSubtotals && uses.length > 0 && sources.length > 0;
  const balance = sourcesTotal - usesTotal;

  return (
    <div
      className={cn(
        "rounded-md border border-slate-200 bg-white p-4 print:break-inside-avoid",
        className,
      )}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <p className="font-headline text-[10px] font-bold uppercase tracking-[0.24em] text-[#005db7]">
          {title}
        </p>
        {subtitle && (
          <span className="font-mono text-[10px] text-slate-500">{subtitle}</span>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {uses.length > 0 && (
          <InitialInvestmentSide
            label="Uses · Outflow"
            tone="outflow"
            items={uses}
            subtotal={showSubtotals ? usesTotal : undefined}
          />
        )}
        {sources.length > 0 && (
          <InitialInvestmentSide
            label="Sources · Funding"
            tone="inflow"
            items={sources}
            subtotal={showSubtotals ? sourcesTotal : undefined}
          />
        )}
      </div>

      {showBalance && (
        <div className="mt-3 flex items-baseline justify-between border-t border-slate-200 pt-2">
          <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-700">
            Sources − Uses
          </span>
          <span
            className={cn(
              "font-mono text-[13px] font-extrabold tabular-nums",
              Math.abs(balance) < 1
                ? "text-slate-500"
                : balance > 0
                  ? "text-emerald-700"
                  : "text-amber-700",
            )}
          >
            {Math.abs(balance) < 1 ? "balanced · 0 €" : fmtSignedEUR(balance)}
          </span>
        </div>
      )}
    </div>
  );
}

function InitialInvestmentSide({
  label,
  tone,
  items,
  subtotal,
}: {
  label: string;
  tone: "outflow" | "inflow";
  items: InitialInvestmentItem[];
  subtotal?: number;
}) {
  const valueClass =
    tone === "outflow"
      ? "text-amber-700"
      : "text-emerald-700";
  return (
    <div>
      <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <ul className="mt-2 space-y-1.5">
        {items.map((item) => (
          <li
            key={item.id}
            className="grid grid-cols-[1fr_auto] items-baseline gap-3 border-b border-slate-100 pb-1 last:border-b-0"
          >
            <div>
              <p className="font-headline text-[10.5px] font-medium text-slate-700">
                {item.label}
              </p>
              {item.sub && (
                <p className="font-mono text-[9.5px] text-slate-500">{item.sub}</p>
              )}
            </div>
            <span className={cn("font-mono text-[12px] font-bold tabular-nums", valueClass)}>
              {fmtEUR(Math.abs(item.value))}
            </span>
          </li>
        ))}
      </ul>
      {subtotal !== undefined && (
        <div className="mt-2 flex items-baseline justify-between border-t border-slate-200 pt-1.5">
          <span className="font-headline text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-900">
            Subtotal
          </span>
          <span className={cn("font-mono text-[13px] font-extrabold tabular-nums", valueClass)}>
            {fmtEUR(Math.abs(subtotal))}
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Formatting helpers ──────────────────────────────────────────────

function fmtEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(Math.round((n / 1_000_000) * 10) / 10).toString().replace(".", ",")}M €`;
  if (abs >= 1_000) return `${(Math.round((n / 1_000) * 10) / 10).toString().replace(".", ",")}k €`;
  return `${new Intl.NumberFormat("es-ES").format(Math.round(n))} €`;
}

function fmtSignedEUR(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  const sign = n > 0 ? "+" : "−";
  return `${sign}${fmtEUR(Math.abs(n))}`;
}
