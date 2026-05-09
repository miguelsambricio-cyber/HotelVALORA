import { cn } from "@/lib/utils";
import type { InvestmentChartData } from "@/lib/report/market-overview-data";

export interface InvestmentChartProps {
  data: InvestmentChartData;
  className?: string;
}

/**
 * Small SVG line / area chart used inside the Investment block of every
 * insight card. Two series at most — `primary` is rendered as a solid
 * emerald-700 line with circle nodes, `secondary` as a slate-400 dashed
 * comparison line. Pure SVG (no chart lib) for print fidelity.
 */
export function InvestmentChart({ data, className }: InvestmentChartProps) {
  const { primary, secondary, xLabels, title } = data;

  // Build path strings from raw arrays in 0–40 viewBox space.
  function toPath(series: number[]): string {
    if (series.length === 0) return "";
    const stepX = series.length === 1 ? 0 : 100 / (series.length - 1);
    return series
      .map((y, i) => `${i === 0 ? "M" : "L"}${i * stepX},${y}`)
      .join(" ");
  }

  return (
    <div className={cn(className)}>
      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 print:text-[6px] print:mb-0.5 print:tracking-normal">
        {title}
      </p>
      <div className="h-24 w-full relative pt-2 print:h-9 print:pt-0">
        <svg
          className="w-full h-full"
          preserveAspectRatio="none"
          viewBox="0 0 100 40"
          aria-hidden
        >
          <path
            d={toPath(primary)}
            fill="none"
            stroke="#065f46"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
          {primary.map((y, i) => {
            const stepX = primary.length === 1 ? 0 : 100 / (primary.length - 1);
            return (
              <circle key={i} cx={i * stepX} cy={y} r={1.5} fill="#065f46" />
            );
          })}
          {secondary && secondary.length > 0 && (
            <path
              d={toPath(secondary)}
              fill="none"
              stroke="#94a3b8"
              strokeDasharray="2"
              strokeWidth={1.5}
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
        <div className="flex justify-between mt-1 text-[8px] font-bold text-slate-400 print:mt-0 print:text-[6px]">
          {xLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
