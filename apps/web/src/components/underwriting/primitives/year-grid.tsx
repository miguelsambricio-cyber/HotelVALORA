import { cn } from "@/lib/utils";
import { YEAR_LABELS } from "@/lib/underwriting/types";

/**
 * Reusable 11-col year grid for underwriting schedules.
 *
 * Architecture invariants:
 *   · sticky years header (top inside the scroll container)
 *   · sticky first column (label · stays visible on horizontal scroll)
 *   · zero financial logic · this is presentation only
 *   · accepts arbitrary rows (YearRow / SubtotalRow / DivisionRow)
 *
 * The grid is designed to print landscape · the global print CSS
 * (report-print-canvas-landscape) handles the page size.
 */

export function YearGrid({
  caption,
  assumptionCol = false,
  children,
}: {
  /** Optional small caption above the table · context for the table. */
  caption?: string;
  /** When true, reserve a "Assump." column between label and Y0. */
  assumptionCol?: boolean;
  children: React.ReactNode;
}) {
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
              assumptionCol ? "w-[24%]" : "w-[26%]",
            )}>
              Concept
            </th>
            {assumptionCol && (
              <th className="w-[10%] px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]">
                Assump.
              </th>
            )}
            {YEAR_LABELS.map((y) => (
              <th
                key={y}
                className={cn(
                  "px-2 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]",
                  assumptionCol ? "w-[6%]" : "w-[6.7%]",
                )}
              >
                {y}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
