"use client";

import { useState } from "react";
import { ClipboardList } from "lucide-react";

import { ConflictQueue } from "@/components/review/conflict-queue";
import { LowConfidenceQueue } from "@/components/review/low-confidence-queue";
import { MergeQueue } from "@/components/review/merge-queue";
import { ReviewSummaryCards } from "@/components/review/summary-cards";
import { useReviewSummary } from "@/lib/api/review";

type Tab = "conflicts" | "low-confidence" | "merges";

const TABS: {
  id: Tab;
  label: string;
  countKey: "open_conflicts" | "low_confidence_aliases" | "pending_merge_recommendations";
}[] = [
  { id: "conflicts", label: "Alias Conflicts", countKey: "open_conflicts" },
  { id: "low-confidence", label: "Low Confidence", countKey: "low_confidence_aliases" },
  { id: "merges", label: "Merge Recommendations", countKey: "pending_merge_recommendations" },
];

export default function ReviewPage() {
  const [activeTab, setActiveTab] = useState<Tab>("conflicts");
  const { data: summary } = useReviewSummary();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-muted-foreground" />
            <h1 className="font-display text-2xl font-bold tracking-tight">Review Queue</h1>
          </div>
          <p className="text-muted-foreground text-sm mt-1">
            Alias conflicts, low-confidence matches, and duplicate recommendations needing attention
          </p>
        </div>
      </div>

      {/* Summary KPIs */}
      <ReviewSummaryCards />

      {/* Tabs */}
      <div>
        <div className="border-b flex gap-0">
          {TABS.map(({ id, label, countKey }) => {
            const count = summary?.[countKey] ?? 0;
            const active = activeTab === id;
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {label}
                {count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-xs font-semibold ${
                      active
                        ? "bg-brand-100 text-brand-700"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {activeTab === "conflicts" && <ConflictQueue />}
          {activeTab === "low-confidence" && <LowConfidenceQueue />}
          {activeTab === "merges" && <MergeQueue />}
        </div>
      </div>
    </div>
  );
}
