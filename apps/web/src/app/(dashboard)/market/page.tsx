import type { Metadata } from "next";
import { MarketDashboard } from "@/components/market/market-dashboard";

export const metadata: Metadata = { title: "Market Intelligence" };

export default function MarketPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Market Intelligence</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Supply & demand trends, RevPAR benchmarking, and pipeline analysis
        </p>
      </div>
      <MarketDashboard />
    </div>
  );
}
