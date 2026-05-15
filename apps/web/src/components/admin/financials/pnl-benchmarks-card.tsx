"use client";

import { useState } from "react";
import { LineChart } from "lucide-react";
import {
  PNL_FORECAST_5Y,
  PNL_FORECAST_SECTIONS,
  PNL_GEO_FILTERS,
  type PnlForecastRow,
} from "@/lib/admin/financials/defaults";

/**
 * P&L Forecast COSTAR · 5-year USALI table.
 * Filter chips above (País / Mercado / Submercado / Class) · placeholder
 * dropdowns · future-wired to CoStar geography selectors.
 */
export function PnlBenchmarksCard() {
  const [country, setCountry] = useState("España");
  const [market, setMarket] = useState("Madrid");
  const [submarket, setSubmarket] = useState("Madrid Centro");
  const [klass, setKlass] = useState("Upscale");

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4">
        <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          <LineChart size={11} />
          P&L Forecast COSTAR
        </p>
        <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
          P&L Forecast COSTAR
        </h2>
        <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
          5-year USALI · CoStar STR median by geography + class.
        </p>
      </header>

      {/* Filter chips · país · mercado · submercado · class */}
      <div className="mb-4 grid gap-2 sm:grid-cols-4">
        <FilterSelect label="País" value={country} onChange={setCountry} options={PNL_GEO_FILTERS.countries} />
        <FilterSelect label="Mercado" value={market} onChange={setMarket} options={PNL_GEO_FILTERS.markets} />
        <FilterSelect label="Submercado" value={submarket} onChange={setSubmarket} options={PNL_GEO_FILTERS.submarkets} />
        <FilterSelect label="Class" value={klass} onChange={setKlass} options={PNL_GEO_FILTERS.classes} />
      </div>

      <div className="overflow-x-auto rounded-md border border-slate-800/60">
        <table className="w-full border-collapse text-[11px]">
          <thead>
            <tr className="bg-slate-900/60 text-left text-slate-400">
              <Th className="w-[28%]">P&L USALI</Th>
              <Th className="w-[12%] text-right">Assump.</Th>
              {[1, 2, 3, 4, 5].map((y) => (
                <Th key={y} className="w-[12%] text-right">Year {y}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PNL_FORECAST_SECTIONS.map((sec) => {
              const rows = PNL_FORECAST_5Y.filter((r) => r.section === sec.id);
              return (
                <>
                  <tr key={`hdr-${sec.id}`}>
                    <td colSpan={7} className="border-t border-slate-800/60 bg-slate-900/40 px-3 py-1.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      {sec.label}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <PnlRow key={row.id} row={row} />
                  ))}
                </>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PnlRow({ row }: { row: PnlForecastRow }) {
  const isSubtotal = row.highlight === "subtotal";
  const isFinal = row.highlight === "final";
  const isMargin = row.highlight === "margin";
  const rowCls =
    isFinal ? "bg-lime-300/10 border-lime-300/30"
    : isSubtotal ? "bg-slate-800/40"
    : isMargin ? "bg-lime-300/5 border-lime-300/20"
    : "";
  const labelCls =
    isFinal ? "font-headline text-[12px] font-extrabold text-lime-200"
    : isSubtotal ? "font-headline text-[11.5px] font-extrabold text-slate-100"
    : isMargin ? "font-headline text-[11px] font-bold text-lime-300"
    : "font-headline text-[11px] font-bold text-slate-200";
  const cellCls =
    isFinal ? "font-mono text-[12px] font-extrabold text-lime-200"
    : isSubtotal ? "font-mono text-[12px] font-extrabold text-slate-100"
    : isMargin ? "font-mono text-[11.5px] font-bold text-lime-300"
    : "font-mono text-[11px] text-slate-200";
  return (
    <tr className={`border-t border-slate-800/60 align-top ${rowCls}`}>
      <td className="px-3 py-2.5">
        <p className={labelCls}>{row.label}</p>
      </td>
      <td className="px-2 py-2.5 text-right">
        {row.assump ? (
          <>
            <p className="font-mono text-[11px] font-bold text-slate-200">{row.assump.value}</p>
            {row.assump.sub && (
              <p className="font-mono text-[9.5px] text-slate-500">{row.assump.sub}</p>
            )}
          </>
        ) : (
          <span className="font-mono text-[10px] text-slate-700">—</span>
        )}
      </td>
      {row.years.map((cell, i) => (
        <td key={i} className="px-2 py-2.5 text-right">
          <p className={cellCls}>{cell.value}</p>
          {cell.delta && (
            <p className="font-mono text-[9.5px] text-slate-500">{cell.delta}</p>
          )}
        </td>
      ))}
    </tr>
  );
}

function FilterSelect({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em] ${className ?? ""}`}>
      {children}
    </th>
  );
}
