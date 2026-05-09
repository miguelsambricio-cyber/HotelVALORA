import { cn } from "@/lib/utils";

export interface DynamicsLineChartProps {
  /** Y values in 0..40 viewBox space — see `getDynamicsChart` */
  values: number[];
  /** CSS hex stroke colour (e.g. emerald-600 or teal-700 per Stitch pattern) */
  color: string;
  className?: string;
}

/**
 * Minimalist single-series line chart for Market Dynamics. Pure SVG with a
 * 3-line horizontal grid and a smooth quadratic-bezier curve in 100×50
 * viewBox space — matches the Stitch reference exactly (no axis labels,
 * no legend, just the curve and grid).
 *
 * The curve is smoothed with mid-point Q-control points so the path flows
 * like the Stitch design. `vector-effect="non-scaling-stroke"` keeps the
 * stroke crisp at any output size, including PDF/print.
 */
export function DynamicsLineChart({
  values,
  color,
  className,
}: DynamicsLineChartProps) {
  return (
    <div
      className={cn(
        "relative h-full w-full overflow-hidden rounded-lg border border-slate-100 bg-slate-50 print:rounded-sm",
        className,
      )}
    >
      <svg
        className="h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 50"
        aria-hidden
      >
        {/* Three horizontal grid lines */}
        <line
          x1="0"
          x2="100"
          y1="10"
          y2="10"
          stroke="#e2e8f0"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          x2="100"
          y1="25"
          y2="25"
          stroke="#e2e8f0"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />
        <line
          x1="0"
          x2="100"
          y1="40"
          y2="40"
          stroke="#e2e8f0"
          strokeWidth="0.5"
          vectorEffect="non-scaling-stroke"
        />

        {/* Smooth Q-curve — empty path when values is empty */}
        <path
          d={smoothPath(values)}
          fill="none"
          stroke={color}
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/**
 * Convert N points into a smooth path: line to first point, then a quadratic
 * Bezier from each point to the next using the previous-point Y as control.
 * Y coordinates are flipped (45 - y) so larger raw values rise visually.
 */
function smoothPath(values: number[]): string {
  if (values.length === 0) return "";
  const stepX = values.length === 1 ? 0 : 100 / (values.length - 1);
  const flip = (y: number) => 45 - y;

  let path = `M 0 ${flip(values[0]).toFixed(2)}`;
  for (let i = 1; i < values.length; i++) {
    const x = (i * stepX).toFixed(2);
    const y = flip(values[i]).toFixed(2);
    const cpX = ((i - 0.5) * stepX).toFixed(2);
    const cpY = flip(values[i - 1]).toFixed(2);
    path += ` Q ${cpX} ${cpY} ${x} ${y}`;
  }
  return path;
}
