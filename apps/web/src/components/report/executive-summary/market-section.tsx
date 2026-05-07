import { SubSectionHeading } from "./sub-section-heading";
import { LockedGate } from "@/components/report/ui/locked-gate";
import { ReportMap } from "@/components/report/ui/report-map";
import {
  fmtADR,
  fmtOccupancy,
  fmtRevPAR,
  type MarketMetricsData,
} from "@/lib/report/executive-summary-data";

function MarketMetricsTable({ data }: { data: MarketMetricsData }) {
  const rows = [
    { label: "ADR (€)",       value: fmtADR(data.adr)             },
    { label: "Occupancy (%)", value: fmtOccupancy(data.occupancy) },
    { label: "RevPAR",        value: fmtRevPAR(data.revpar)       },
  ];

  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="border-b border-slate-200">
            <td className="py-2.5 w-8">
              <div className="w-4 h-4 rounded-full border border-slate-400" />
            </td>
            <td className="py-2.5 font-medium text-slate-600">{row.label}</td>
            <td className="py-2.5 font-bold text-right text-forest-900 text-lg">
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface MarketSectionProps {
  data: MarketMetricsData;
}

export function MarketSection({ data }: MarketSectionProps) {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-8 print:gap-4 items-start">

        <div className="md:col-span-7 print:col-span-7">
          <SubSectionHeading title="EXECUTIVE SUMMARY: MARKET OVERVIEW" />
          <MarketMetricsTable data={data} />
          <LockedGate
            rows={["Hotel & Market Overview", "Projects", "Transactions"]}
            tier="PRO"
          />
        </div>

        <div className="md:col-span-5 print:col-span-5 pt-10 print:pt-0">
          {/* Map is capped at h-36 in print — aspect-video would be too tall at 960px canvas */}
          <ReportMap className="aspect-video w-full rounded-lg border border-slate-200 shadow-sm overflow-hidden print:aspect-auto print:h-36" />
        </div>

      </div>
    </section>
  );
}
