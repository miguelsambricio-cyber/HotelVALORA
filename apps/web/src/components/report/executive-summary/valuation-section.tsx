import { SubSectionHeading } from "./sub-section-heading";
import { SparklineGroup } from "./sparkline-group";
import { LockedGate } from "@/components/report/ui/locked-gate";
import {
  fmtPercent,
  fmtMillionsEUR,
  fmtThousandsEUR,
  fmtEURPerSqm,
  type ValuationData,
  type ChartSeriesData,
} from "@/lib/report/executive-summary-data";
import { cn } from "@/lib/utils";

interface ValuationRow {
  label: string;
  value: string;
  highlight?: boolean;
  separator?: "light" | "strong";
  muted?: boolean;
}

function ValuationTable({ data }: { data: ValuationData }) {
  const low  = fmtMillionsEUR(data.valuationRangeLow);
  const high = fmtMillionsEUR(data.valuationRangeHigh);
  // When both bounds are null (non-ES hotel, no market coverage), render a
  // single "—" instead of "— — —". Honest absence beats fabricated range.
  const rangeValue =
    data.valuationRangeLow === null && data.valuationRangeHigh === null
      ? "—"
      : `${low} — ${high}`;

  const rows: ValuationRow[] = [
    { label: "Gross Operating Profit (G.O.P)",  value: fmtPercent(data.gopMargin)                   },
    { label: "EBITDA after replacement",         value: fmtMillionsEUR(data.ebitdaAfterReplacement),  separator: "strong" },
    { label: "Cap. Rate",                        value: fmtPercent(data.capRate, 2)                  },
    { label: "Exit Year",                        value: data.exitYear                                },
    { label: "Escenario",                        value: data.scenario,                                separator: "strong" },
    { label: "Hotel Market Valuation",           value: rangeValue,                                  highlight: true     },
    { label: "Hotel Valor estimado",             value: fmtMillionsEUR(data.estimatedValue)          },
    { label: "Hotel por habitación",             value: fmtThousandsEUR(data.perRoom)                },
    { label: "Hotel por m²",                     value: fmtEURPerSqm(data.perSqmHotel),              separator: "strong" },
    { label: "Residential por m²",               value: fmtEURPerSqm(data.perSqmResidential),        muted: true         },
    { label: "Office por m²",                    value: fmtEURPerSqm(data.perSqmOffice),             muted: true         },
  ];

  return (
    <table className="w-full text-xs border-collapse bg-white/50">
      <tbody>
        {rows.map((row) => (
          <tr
            key={row.label}
            className={cn(
              row.separator === "strong" ? "border-b border-slate-300" : "border-b border-slate-100",
              row.highlight && "bg-emerald-50/50"
            )}
          >
            <td
              className={cn(
                "py-1.5 pl-4",
                row.highlight && "font-bold text-forest-900",
                row.muted ? "text-slate-400 italic" : "text-slate-600"
              )}
            >
              {row.label}
            </td>
            <td
              className={cn(
                "py-1.5 pr-4 font-bold text-right",
                row.highlight && "text-xl font-extrabold text-forest-900",
                row.muted && "text-slate-400"
              )}
            >
              {row.value}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface ValuationSectionProps {
  valuation: ValuationData;
  charts: ChartSeriesData;
}

export function ValuationSection({ valuation, charts }: ValuationSectionProps) {
  return (
    <section>
      <div className="grid grid-cols-1 md:grid-cols-12 print:grid-cols-12 gap-8 print:gap-4 items-start">

        <div className="md:col-span-7 print:col-span-7">
          <SubSectionHeading title="EXECUTIVE SUMMARY: HOTEL VALUATION" />
          <ValuationTable data={valuation} />
          <LockedGate
            rows={["P&L Premium", "Underwriting & IRR Equity"]}
            tier="PREMIUM"
          />
        </div>

        <div className="md:col-span-5 print:col-span-5 pt-4 print:pt-0">
          <SparklineGroup charts={charts} />
        </div>

      </div>
    </section>
  );
}
