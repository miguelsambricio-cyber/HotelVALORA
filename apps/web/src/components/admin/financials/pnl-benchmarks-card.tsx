import { LineChart } from "lucide-react";
import {
  PNL_BENCHMARKS,
  STAR_CATEGORIES,
  type PnlLine,
} from "@/lib/admin/financials/defaults";

const GROUP_LABELS: Record<PnlLine["group"], string> = {
  revenue: "Revenue mix",
  departmental: "Departmental costs",
  undistributed: "Undistributed expenses",
  fixed: "Fixed costs",
  result: "Result lines",
};

const GROUP_NOTE: Record<PnlLine["group"], string> = {
  revenue: "% of total revenue · sums to 100%",
  departmental: "% of department's own revenue · NOT total",
  undistributed: "% of total revenue",
  fixed: "% of total revenue",
  result: "% of total revenue · derived",
};

export function PnlBenchmarksCard() {
  const groupOrder: PnlLine["group"][] = ["revenue", "departmental", "undistributed", "fixed", "result"];

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4">
        <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          <LineChart size={11} />
          P&L benchmarks · CoStar STR
        </p>
        <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
          Hotel P&L · % of revenue · 3 vs 4 vs 5 stars
        </h2>
        <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
          European urban hotel benchmarks · CoStar STR median by class. Per-asset actuals
          replace these once Statement of Operations is captured. Departmental cost lines
          are % of <em>own</em> revenue · everything else is % of total revenue.
        </p>
      </header>

      {groupOrder.map((g) => (
        <div key={g} className="mb-4 last:mb-0">
          <div className="mb-2 flex items-baseline justify-between">
            <p className="font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
              {GROUP_LABELS[g]}
            </p>
            <p className="font-mono text-[9.5px] text-slate-600">{GROUP_NOTE[g]}</p>
          </div>
          <div className="overflow-x-auto rounded-md border border-slate-800/60">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-900/60 text-left text-slate-400">
                  <th className="w-[34%] px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">Line</th>
                  {STAR_CATEGORIES.map((cat) => (
                    <th key={cat.id} className="w-[12%] px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">
                      <span className="block text-slate-500">{cat.positioning}</span>
                      <span className="block text-slate-300">{cat.label}</span>
                    </th>
                  ))}
                  <th className="px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">Description</th>
                </tr>
              </thead>
              <tbody>
                {PNL_BENCHMARKS.filter((l) => l.group === g).map((line) => {
                  const isResult = g === "result";
                  return (
                    <tr key={line.id} className={`border-t border-slate-800/60 ${isResult ? "bg-lime-300/5" : ""}`}>
                      <td className={`px-3 py-2.5 font-headline text-[11px] ${isResult ? "font-extrabold text-lime-200" : "font-bold text-slate-100"}`}>
                        {line.label}
                      </td>
                      {STAR_CATEGORIES.map((cat) => (
                        <td key={`${line.id}-${cat.id}`} className={`px-3 py-2.5 text-right font-mono text-[12px] ${isResult ? "font-extrabold text-lime-200" : line.polarity === "negative" ? "text-amber-200/80" : "text-slate-200"}`}>
                          {line.pct[cat.id]}%
                        </td>
                      ))}
                      <td className="px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-slate-400">{line.description}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </section>
  );
}
