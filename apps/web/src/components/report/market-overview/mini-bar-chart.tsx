import { cn } from "@/lib/utils";
import type { MiniBarChartData } from "@/lib/report/market-overview-data";

export interface MiniBarChartProps {
  data: MiniBarChartData;
  /** Bar colour palette — emerald scales for Stitch parity, slate for variants */
  palette?: "emerald" | "slate";
  className?: string;
}

const PALETTES: Record<NonNullable<MiniBarChartProps["palette"]>, string[]> = {
  emerald: [
    "bg-emerald-800",
    "bg-emerald-700/80",
    "bg-emerald-600/60",
    "bg-slate-300",
  ],
  slate: [
    "bg-slate-400",
    "bg-slate-400/80",
    "bg-slate-400/60",
    "bg-slate-300",
  ],
};

/**
 * Compact 4-bar chart inside a slate-50 framed card. Bars share the height
 * track but their fill heights come from `data.items[i].pct` (0–100). Labels
 * sit slightly below the chart for institutional density.
 */
export function MiniBarChart({
  data,
  palette = "emerald",
  className,
}: MiniBarChartProps) {
  const colours = PALETTES[palette];

  return (
    <div
      className={cn(
        "bg-slate-50 rounded-lg p-3 border border-slate-100 print:p-1 print:rounded-sm",
        className,
      )}
    >
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-3 print:text-[6px] print:mb-1 print:tracking-normal">
        {data.title}
      </p>
      <div className="flex items-end gap-2 h-16 w-full px-1 print:h-7 print:gap-1 print:px-0">
        {data.items.map((item, idx) => (
          <div
            key={item.label}
            className={cn(
              "w-1/4 rounded-t-sm relative",
              colours[idx] ?? colours[colours.length - 1],
            )}
            style={{ height: `${item.pct}%` }}
          >
            <span className="absolute -bottom-4 text-[8px] font-bold text-slate-500 w-full text-center print:-bottom-2.5 print:text-[6px]">
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
