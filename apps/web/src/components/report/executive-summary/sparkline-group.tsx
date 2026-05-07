import { SparklineBar } from "@/components/report/charts/sparkline-bar";
import { SparklineLine } from "@/components/report/charts/sparkline-line";
import type { ChartSeriesData } from "@/lib/report/executive-summary-data";

interface SparklineGroupProps {
  charts: ChartSeriesData;
}

function ChartLabel({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-end pr-1 mt-1.5">
      <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </span>
    </div>
  );
}

function MiniChartCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-24 w-full border border-slate-200 rounded bg-white shadow-sm relative overflow-hidden">
      {children}
    </div>
  );
}

export function SparklineGroup({ charts }: SparklineGroupProps) {
  return (
    <div className="space-y-6">
      {/* Occupancy — bar chart */}
      <div>
        <MiniChartCard>
          <SparklineBar data={charts.occupancyTTM} />
        </MiniChartCard>
        <ChartLabel label="% Occupancy TTM" />
      </div>

      {/* ADR — line chart */}
      <div>
        <MiniChartCard>
          <div className="w-full h-full p-2 pt-4">
            <SparklineLine
              data={charts.adrTTM}
              strokeColor="#005db7"
            />
          </div>
        </MiniChartCard>
        <ChartLabel label="ADR TTM (€)" />
      </div>

      {/* RevPAR — area line chart */}
      <div>
        <MiniChartCard>
          <div className="w-full h-full p-2 pt-4">
            <SparklineLine
              data={charts.revparTTM}
              strokeColor="#0E4B31"
              showArea
              gradientId="revpar-grad"
            />
          </div>
        </MiniChartCard>
        <div className="flex flex-col gap-1.5 mt-1.5">
          <ChartLabel label="RevPAR TTM (€)" />
          <p className="text-right text-[8px] text-slate-300 uppercase tracking-wide leading-tight pr-1">
            Data sources include STR, Real Capital Analytics, and proprietary HotelVALORA benchmarks.
            Valuation figures are indicative and subject to due diligence.
          </p>
        </div>
      </div>
    </div>
  );
}
