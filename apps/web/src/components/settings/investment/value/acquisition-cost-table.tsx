"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ACQUISITION_COST_LINES,
  CAPEX_UNIT_LABELS,
  useInvestmentStore,
} from "@/lib/investment";
import type {
  AcquisitionCostEntry,
  BasicPremiumMode,
  CapexUnit,
} from "@/lib/investment";

export interface AcquisitionCostTableProps {
  mode: BasicPremiumMode;
}

/**
 * Acquisition Cost editor — gated by `mode`:
 *   • basic    → locked-content placeholder (lock icon + upgrade prompt)
 *   • premium  → editable table with a dark forest header + 5 line rows
 *
 * Each row carries a value input + unit select. v2: plug into the Excel
 * underwriting workbook by line `id`.
 */
export function AcquisitionCostTable({ mode }: AcquisitionCostTableProps) {
  if (mode === "basic") return <LockedPanel />;
  return <PremiumTable />;
}

function LockedPanel() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-12 text-center">
      <Lock size={36} className="mb-2 text-slate-400" strokeWidth={1.5} />
      <p className="text-lg font-bold tracking-tight text-forest-900">
        Locked content
      </p>
      <p className="max-w-xs text-sm text-slate-500">
        Upgrade to Premium to access and customize acquisition costs
      </p>
    </div>
  );
}

function PremiumTable() {
  const header = useInvestmentStore(
    (s) => s.criteria.value.siteAcquisition.acquisitionCostHeader,
  );
  const lines = useInvestmentStore(
    (s) => s.criteria.value.siteAcquisition.acquisitionCostLines,
  );
  const setHeader = useInvestmentStore((s) => s.setAcquisitionCostHeader);
  const setLine = useInvestmentStore((s) => s.setAcquisitionCostLine);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left text-xs">
        <tbody className="divide-y divide-slate-100 text-slate-800">
          {/* Dark header total row */}
          <tr className="bg-forest-900 text-white">
            <td className="px-4 py-4 text-sm font-bold uppercase tracking-tight">
              Acquisition Cost
            </td>
            <td className="px-4 py-4">
              <NumberInput
                value={header.value}
                onChange={(v) => setHeader({ ...header, value: v })}
                inverted
              />
            </td>
            <td className="px-4 py-4">
              <UnitSelect
                value={header.unit}
                onChange={(u) => setHeader({ ...header, unit: u })}
                options={["total", "per_room", "per_m2", "percent"]}
                inverted
              />
            </td>
          </tr>

          {ACQUISITION_COST_LINES.map((line) => {
            const entry = lines[line.id] ?? {
              value: null,
              unit: line.defaultUnit,
            };
            return (
              <tr
                key={line.id}
                className="transition-colors hover:bg-slate-50"
              >
                <td className="px-4 py-3 font-bold text-forest-900">
                  {line.label}
                </td>
                <td className="px-4 py-3">
                  <NumberInput
                    value={entry.value}
                    onChange={(v) => setLine(line.id, { ...entry, value: v })}
                  />
                </td>
                <td className="px-4 py-3">
                  <UnitSelect
                    value={entry.unit}
                    onChange={(u) => setLine(line.id, { ...entry, unit: u })}
                    options={line.availableUnits}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

interface NumberInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  inverted?: boolean;
}
function NumberInput({ value, onChange, inverted }: NumberInputProps) {
  return (
    <input
      type="text"
      inputMode="decimal"
      value={value ?? ""}
      onChange={(e) => {
        const raw = e.target.value.trim().replace(",", ".");
        if (raw === "") return onChange(null);
        const parsed = parseFloat(raw);
        onChange(Number.isNaN(parsed) ? null : parsed);
      }}
      placeholder="0.00"
      className={cn(
        "w-full rounded px-3 py-1.5 text-right text-[11px] font-bold focus:outline-none focus:ring-0",
        inverted
          ? "border border-white/20 bg-white/10 text-white placeholder-white/50 focus:border-white/50"
          : "border border-transparent bg-slate-50 text-slate-800",
      )}
    />
  );
}

interface UnitSelectProps {
  value: CapexUnit;
  onChange: (u: CapexUnit) => void;
  options: readonly CapexUnit[];
  inverted?: boolean;
}
function UnitSelect({ value, onChange, options, inverted }: UnitSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CapexUnit)}
      className={cn(
        "w-full appearance-none rounded px-2 py-1 text-[10px] font-bold focus:outline-none",
        inverted
          ? "border border-white/20 bg-white/10 text-white"
          : "border border-transparent bg-slate-50 text-slate-700",
      )}
    >
      {options.map((u) => (
        <option key={u} value={u} className="text-slate-800">
          {CAPEX_UNIT_LABELS[u]}
        </option>
      ))}
    </select>
  );
}
