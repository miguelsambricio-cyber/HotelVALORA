import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: string;
  delta: string;
  positive: boolean;
}

export function KpiCard({ label, value, delta, positive }: KpiCardProps) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className="mt-2 font-display text-2xl font-bold">{value}</p>
        <div
          className={cn(
            "mt-1 flex items-center gap-1 text-xs font-medium",
            positive ? "text-emerald-600" : "text-red-500"
          )}
        >
          {positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {delta}
        </div>
      </CardContent>
    </Card>
  );
}
