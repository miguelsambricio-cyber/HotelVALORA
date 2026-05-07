"use client";

import { AlertTriangle, CheckCircle, GitMerge, TrendingDown } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { useReviewSummary } from "@/lib/api/review";

interface CardDef {
  label: string;
  valueKey: "open_conflicts" | "low_confidence_aliases" | "pending_merge_recommendations";
  icon: React.ElementType;
  iconClass: string;
  borderClass: string;
}

const CARDS: CardDef[] = [
  {
    label: "Open Conflicts",
    valueKey: "open_conflicts",
    icon: AlertTriangle,
    iconClass: "text-amber-500",
    borderClass: "border-l-4 border-l-amber-400",
  },
  {
    label: "Low Confidence",
    valueKey: "low_confidence_aliases",
    icon: TrendingDown,
    iconClass: "text-rose-500",
    borderClass: "border-l-4 border-l-rose-400",
  },
  {
    label: "Pending Merges",
    valueKey: "pending_merge_recommendations",
    icon: GitMerge,
    iconClass: "text-violet-500",
    borderClass: "border-l-4 border-l-violet-400",
  },
];

export function ReviewSummaryCards() {
  const { data, isLoading } = useReviewSummary();

  return (
    <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
      {CARDS.map(({ label, valueKey, icon: Icon, iconClass, borderClass }) => (
        <Card key={label} className={borderClass}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              <Icon className={`h-4 w-4 ${iconClass}`} />
            </div>
            <p className="mt-2 text-3xl font-bold tabular-nums">
              {isLoading ? "—" : (data?.[valueKey] ?? 0)}
            </p>
          </CardContent>
        </Card>
      ))}

      <Card className="border-l-4 border-l-emerald-400">
        <CardContent className="p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-muted-foreground">Threshold</p>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">
            {isLoading ? "—" : `${((data?.low_confidence_threshold ?? 0.65) * 100).toFixed(0)}%`}
          </p>
          <p className="text-xs text-muted-foreground mt-1">confidence cutoff</p>
        </CardContent>
      </Card>
    </div>
  );
}
