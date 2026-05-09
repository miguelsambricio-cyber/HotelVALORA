import { cn } from "@/lib/utils";
import type { DynamicsSeries } from "@/lib/report/market-dynamics-data";

export interface DynamicsLineChartProps {
  series: DynamicsSeries[];
  /** X-axis labels — width is divided evenly across them */
  xLabels: string[];
  className?: string;
}

/**
 * Pure-SVG line chart used by every Market Dynamics card. Renders 1–2 series
 * over a 3-line horizontal grid in a 100×50 viewBox. No chart lib so the
 * print engine can scale it without rasterisation.
 *
 * Each series declares its own `startIndex` so a forecast tail can begin at
 * the last historical point without overlapping the solid path.
 */
export function DynamicsLineChart({
  series,
  xLabels,
  className,
}: DynamicsLineChartProps) {
  // Number of x-axis "slots" — series may extend beyond the historical range
  const totalPoints = Math.max(
    xLabels.length,
    ...series.map((s) => (s.startIndex ?? 0) + s.values.length),
  );
  const stepX = totalPoints <= 1 ? 0 : 100 / (totalPoints - 1);

  function pathFor(s: DynamicsSeries): string {
    const start = s.startIndex ?? 0;
    return s.values
      .map((y, i) => {
        const x = (start + i) * stepX;
        // Y axis is inverted (0 at top, 40 at bottom in a 50-tall viewBox
        // with 5 padding top/bottom)
        return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${(45 - y).toFixed(2)}`;
      })
      .join(" ");
  }

  // Legend — show only series with a label, deduped
  const legend = series
    .filter((s) => s.label)
    .map((s) => ({ label: s.label!, color: s.color, style: s.style }));

  return (
    <div className={cn("flex h-full w-full flex-col", className)}>
      {/* Chart surface — fills available height */}
      <div className="relative flex-1 w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50 print:rounded-sm">
        <svg
          className="h-full w-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 50"
          aria-hidden
        >
          {/* Horizontal grid lines */}
          <line
            x1="0"
            x2="100"
            y1="10"
            y2="10"
            stroke="#e2e8f0"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2="100"
            y1="25"
            y2="25"
            stroke="#e2e8f0"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />
          <line
            x1="0"
            x2="100"
            y1="40"
            y2="40"
            stroke="#e2e8f0"
            strokeWidth="0.4"
            vectorEffect="non-scaling-stroke"
          />

          {/* Series — drawn back-to-front (last in array on top) */}
          {series.map((s, idx) => (
            <path
              key={idx}
              d={pathFor(s)}
              fill="none"
              stroke={s.color}
              strokeWidth={1.6}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={s.style === "dashed" ? "3 2" : undefined}
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>

      {/* X-axis labels */}
      <div className="mt-2 flex justify-between px-1 text-[9px] font-bold uppercase tracking-wider text-slate-400 print:mt-1 print:text-[7px] print:tracking-normal">
        {xLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      {/* Legend (only when 2+ labelled series) */}
      {legend.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[10px] font-semibold text-slate-500 print:text-[7px] print:gap-2 print:mt-1">
          {legend.map((item) => (
            <span key={item.label} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-[2px] w-3"
                style={{
                  backgroundColor: item.color,
                  borderTop:
                    item.style === "dashed"
                      ? `1.5px dashed ${item.color}`
                      : undefined,
                  background:
                    item.style === "dashed" ? "transparent" : item.color,
                }}
              />
              {item.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
