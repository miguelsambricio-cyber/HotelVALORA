import type { Metadata } from "next";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { RevParChart } from "@/components/dashboard/revpar-chart";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { PortfolioMap } from "@/components/dashboard/portfolio-map";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight">Portfolio Overview</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Real-time intelligence across your hotel & flex living portfolio
        </p>
      </div>

      {/* KPI row */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total Assets" value="42" delta="+3 YTD" positive />
        <KpiCard label="Portfolio RevPAR" value="$118.40" delta="+6.2%" positive />
        <KpiCard label="Avg Occupancy" value="73.1%" delta="-0.8pp" positive={false} />
        <KpiCard label="Concluded Value" value="$1.24B" delta="+4.1%" positive />
      </div>

      {/* Charts */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevParChart />
        </div>
        <RecentTransactions />
      </div>

      <PortfolioMap />
    </div>
  );
}
