"use client";

import { useState } from "react";
import { LineChart, Save } from "lucide-react";
import {
  PNL_FORECAST_5Y,
  PNL_FORECAST_SECTIONS,
  PNL_GEO_FILTERS,
  type PnlForecastRow,
} from "@/lib/admin/financials/defaults";
import { useOverrides, formatSavedAt } from "@/lib/admin/financials/use-overrides";

/**
 * P&L Forecast COSTAR · ASSUMPTIONS-ONLY view (3 cols).
 * Operator edits the per-line assumption values (% of revenue,
 * % of own dept, etc.) · these power downstream 5-year forecast
 * regeneration. Filter chips above scope geography + class · future-
 * wired to CoStar API. Persistence via localStorage (Phase D moves
 * to Supabase admin_financial_settings).
 *
 * Hidden in this view: subtotals (Total Revenue, GOP, EBITDA,
 * % Margin) and rows without an assumption (Rooms count, RevPAR ·
 * derived). Those are computed downstream and don't need editing.
 */

interface PnlAssumption {
  value: string;
  sub: string;
}

type PnlState = Record<string, PnlAssumption>;

function buildDefaultPnlState(): PnlState {
  const out: PnlState = {};
  for (const row of PNL_FORECAST_5Y) {
    if (!row.assump) continue;
    out[row.id] = {
      value: row.assump.value,
      sub: row.assump.sub ?? "",
    };
  }
  return out;
}

export function PnlBenchmarksCard() {
  const [country, setCountry] = useState("España");
  const [market, setMarket] = useState("Madrid");
  const [submarket, setSubmarket] = useState("Madrid Centro");
  const [klass, setKlass] = useState("Upscale");

  const ov = useOverrides<PnlState>("admin.financials.pnl.v1", buildDefaultPnlState());

  function setField(rowId: string, field: keyof PnlAssumption, value: string) {
    ov.set((prev) => ({
      ...prev,
      [rowId]: { ...(prev[rowId] ?? { value: "", sub: "" }), [field]: value },
    }));
  }

  // Only rows that HAVE an assumption (skip subtotals + computed lines)
  const editableRows = PNL_FORECAST_5Y.filter((r) => !!r.assump && !r.highlight);

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            <LineChart size={11} />
            P&L Forecast COSTAR
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            P&L Forecast COSTAR
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
            CoStar STR median assumptions by geography + class · feeds the 5-year forecast.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-slate-700/60">
            <Save size={10} className={ov.lastSavedAt ? "text-lime-300" : "text-slate-600"} />
            {ov.hydrated
              ? ov.lastSavedAt
                ? `Saved on this device · ${formatSavedAt(ov.lastSavedAt)}`
                : "Defaults · no edits saved"
              : "…"}
          </span>
          {ov.lastSavedAt && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm("Reset ALL P&L assumption overrides and clear local storage?")) ov.reset();
              }}
              className="font-mono text-[10px] text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline"
            >
              Reset all to defaults
            </button>
          )}
        </div>
      </header>

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
              <Th className="w-[36%]">P&L USALI</Th>
              <Th className="w-[18%] text-right">Assumption</Th>
              <Th>Description</Th>
            </tr>
          </thead>
          <tbody>
            {PNL_FORECAST_SECTIONS.map((sec) => {
              const rows = editableRows.filter((r) => r.section === sec.id);
              if (rows.length === 0) return null;
              return (
                <>
                  <tr key={`hdr-${sec.id}`}>
                    <td colSpan={3} className="border-t border-slate-800/60 bg-slate-900/40 px-3 py-1.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
                      {sec.label}
                    </td>
                  </tr>
                  {rows.map((row) => (
                    <PnlAssumptionRow
                      key={row.id}
                      row={row}
                      assumption={ov.state[row.id] ?? { value: row.assump?.value ?? "", sub: row.assump?.sub ?? "" }}
                      onChange={(field, v) => setField(row.id, field, v)}
                    />
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

function PnlAssumptionRow({
  row,
  assumption,
  onChange,
}: {
  row: PnlForecastRow;
  assumption: PnlAssumption;
  onChange: (field: keyof PnlAssumption, value: string) => void;
}) {
  return (
    <tr className="border-t border-slate-800/60 align-top">
      <td className="px-3 py-2.5">
        <p className="font-headline text-[11px] font-bold text-slate-200">{row.label}</p>
      </td>
      <td className="px-2 py-2 text-right">
        <input
          key={`val-${row.id}-${assumption.value}`}
          type="text"
          inputMode="decimal"
          defaultValue={assumption.value}
          onBlur={(e) => onChange("value", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              (e.target as HTMLInputElement).value = assumption.value;
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-mono text-[11.5px] font-bold text-lime-200 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none hover:border-slate-700/60"
          aria-label={`Assumption value for ${row.label}`}
        />
      </td>
      <td className="px-2 py-2">
        <input
          key={`sub-${row.id}-${assumption.sub}`}
          type="text"
          defaultValue={assumption.sub}
          placeholder="—"
          onBlur={(e) => onChange("sub", e.target.value.trim())}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") {
              (e.target as HTMLInputElement).value = assumption.sub;
              (e.target as HTMLInputElement).blur();
            }
          }}
          className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 font-mono text-[10.5px] text-slate-400 placeholder:text-slate-600 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none hover:border-slate-700/60"
          aria-label={`Description for ${row.label}`}
        />
      </td>
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
