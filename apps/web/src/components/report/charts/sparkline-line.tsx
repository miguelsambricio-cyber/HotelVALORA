import { cn } from "@/lib/utils";

interface SparklineLineProps {
  data: number[];
  strokeColor?: string;
  showArea?: boolean;
  /** Unique id for the SVG gradient — required when showArea is true */
  gradientId?: string;
  className?: string;
}

const W = 220;
const H = 60;
const PAD = 4;

function buildLinePath(data: number[]): string {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const n = data.length;

  return data
    .map((v, i) => {
      const x = (i / (n - 1)) * W;
      const y = PAD + ((1 - (v - min) / range) * (H - PAD * 2));
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export function SparklineLine({
  data,
  strokeColor = "#0E4B31",
  showArea = false,
  gradientId,
  className,
}: SparklineLineProps) {
  const linePath = buildLinePath(data);
  const areaPath =
    showArea && gradientId
      ? `${linePath} L${W},${H} L0,${H} Z`
      : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={cn("w-full h-full", className)}
    >
      {showArea && gradientId && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={1} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0} />
          </linearGradient>
        </defs>
      )}
      {areaPath && (
        <path
          d={areaPath}
          fill={`url(#${gradientId})`}
          opacity={0.1}
        />
      )}
      <path
        d={linePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
