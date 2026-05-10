"use client";

import { useInvestmentStore } from "@/lib/investment";

const YEARS: ("Year 1" | "Year 2" | "Year 3" | "Year 4")[] = [
  "Year 1",
  "Year 2",
  "Year 3",
  "Year 4",
];

/**
 * 4-column grid of Y1-Y4 sliders for the FF&E Reserve sub-block on the
 * P&L Forecast section. Each year carries an independent percentage
 * slider (0-10% range, 0.1% step).
 */
export function FfeReserveYears() {
  const values = useInvestmentStore(
    (s) => s.criteria.value.plForecast.ffeReserveByYear,
  );
  const setYear = useInvestmentStore((s) => s.setFfeReserveYear);

  return (
    <div>
      <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-forest-900">
        FF&amp;E Reserve
      </h3>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {YEARS.map((label, i) => {
          const v = values[i as 0 | 1 | 2 | 3];
          return (
            <div key={label} className="space-y-2 text-center">
              <div className="mb-2 flex items-center justify-between px-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  {label}
                </label>
                <span className="text-[10px] font-bold text-forest-900">
                  {v.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={0.1}
                value={v}
                onChange={(e) =>
                  setYear(i as 0 | 1 | 2 | 3, Number(e.target.value))
                }
                className="w-full accent-forest-900"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
