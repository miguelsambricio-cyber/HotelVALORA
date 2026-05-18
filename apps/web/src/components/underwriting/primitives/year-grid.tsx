import { cn } from "@/lib/utils";
import type { Period } from "@/lib/underwriting/temporal";

/**
 * Reusable period grid for underwriting schedules.
 *
 * Block 2 refactor (2026-05-18):
 *   · accepts arbitrary `periods: Period[]` · no hardcoded 11 columns
 *   · ready for monthly / quarterly toggle (Block 4+)
 *
 * Architecture invariants:
 *   · sticky header (top inside the scroll container)
 *   · sticky first column (label · stays visible on horizontal scroll)
 *   · zero financial logic · this is presentation only
 *   · accepts arbitrary rows (YearRow / SubtotalRow / DivisionRow)
 *
 * Designed for landscape print · global CSS handles the page size.
 */
export function YearGrid({
  periods,
  caption,
  assumptionCol = false,
  children,
}: {
  /** Column axis · MVP is YEARLY_PERIODS_Y0_Y10. */
  periods: Period[];
  /** Optional small caption above the table · context for the table. */
  caption?: string;
  /** When true, reserve a "Assump." column between label and the first period. */
  assumptionCol?: boolean;
  children: React.ReactNode;
}) {
  const cols = periods.length;
  const conceptWidthClass = assumptionCol ? "w-[24%]" : "w-[26%]";
  const periodWidthPct = (assumptionCol ? 66 : 74) / Math.max(cols, 1);

  return (
    <div className="overflow-x-auto rounded-md border border-slate-800/60">
      {caption && (
        <p className="border-b border-slate-800/60 bg-slate-900/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {caption}
        </p>
      )}
      <table className="w-full border-collapse text-[11px]">
        <thead>
          <tr className="bg-slate-900/60 text-left text-slate-400">
            <th className={cn(
              "sticky left-0 z-10 bg-slate-900/60 px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]",
              conceptWidthClass,
            )}>
              Concept
            </th>
            {assumptionCol && (
              <th className="w-[10%] px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
                Assump.
              </th>
            )}
            {periods.map((p) => (
              <th
                key={p.id}
                style={{ width: `${periodWidthPct}%` }}
                className="px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]"
              >
                {p.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
