import { KPICard } from "./kpi-card";
import type { KPIValue } from "@/types/report";
import { cn } from "@/lib/utils";

interface KPIGridProps {
  kpis: KPIValue[];
  columns?: 2 | 3 | 4 | 5;
  isLoading?: boolean;
  className?: string;
}

const GRID_COLS: Record<number, string> = {
  2: "grid-cols-1 sm:grid-cols-2",
  3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
  5: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5",
};

export function KPIGrid({
  kpis,
  columns = 4,
  isLoading = false,
  className,
}: KPIGridProps) {
  return (
    <div className={cn("grid gap-4", GRID_COLS[columns], className)}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} {...kpi} isLoading={isLoading} />
      ))}
    </div>
  );
}
