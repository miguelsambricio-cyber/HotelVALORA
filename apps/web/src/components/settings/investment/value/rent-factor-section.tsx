"use client";

import { Building2 } from "lucide-react";
import { useInvestmentStore } from "@/lib/investment";
import type { RentBasis } from "@/lib/investment";
import {
  InstitutionalToggle,
  SectionHeader,
} from "@/components/settings/investment";
import { DisplayModeToggle } from "./display-mode-toggle";

const RENT_BASIS_OPTIONS: { id: RentBasis; label: string }[] = [
  { id: "revenue", label: "% Revenue" },
  { id: "gop", label: "% GOP" },
  { id: "ebitdar", label: "% EBITDAR" },
];

/**
 * Rent Factor — third section. Captures the operator-rent split between
 * fixed and variable components. Off by default per Stitch reference;
 * enabling reveals 3 input rows: € Rent, % Fixed Rent, % Variable Rent.
 */
export function RentFactorSection() {
  const rent = useInvestmentStore((s) => s.criteria.value.rentFactor);
  const setEnabled = useInvestmentStore((s) => s.setRentEnabled);
  const setRentEur = useInvestmentStore((s) => s.setRentEur);
  const setRentMode = useInvestmentStore((s) => s.setRentMode);
  const setFixedRentPct = useInvestmentStore((s) => s.setFixedRentPct);
  const setFixedRentBasis = useInvestmentStore((s) => s.setFixedRentBasis);
  const setVariableRentPct = useInvestmentStore((s) => s.setVariableRentPct);
  const setVariableRentBasis = useInvestmentStore((s) => s.setVariableRentBasis);

  const handleNumeric = (raw: string, onChange: (n: number) => void) => {
    const cleaned = raw.replace(",", ".");
    if (cleaned === "") return onChange(0);
    const parsed = parseFloat(cleaned);
    if (!Number.isNaN(parsed)) onChange(parsed);
  };

  return (
    <section>
      <SectionHeader
        icon={<Building2 size={20} />}
        title="Rent Factor"
        rightSlot={<InstitutionalToggle checked={rent.enabled} onChange={setEnabled} />}
      />

      <div
        className={
          rent.enabled ? "space-y-6" : "pointer-events-none space-y-6 opacity-60"
        }
      >
        {/* € Rent */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            € Rent
          </label>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={rent.rentEur}
                onChange={(e) => handleNumeric(e.target.value, setRentEur)}
                className="w-full rounded-lg border-transparent bg-slate-50 py-2 pl-3 pr-8 text-right text-sm transition-all focus:border-forest-900 focus:outline-none focus:ring-0"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                €
              </span>
            </div>
            <DisplayModeToggle value={rent.rentMode} onChange={setRentMode} />
          </div>
        </div>

        {/* % Fixed Rent */}
        <PercentRow
          label="% Fixed Rent"
          value={rent.fixedRentPct}
          basis={rent.fixedRentBasis}
          onValueChange={setFixedRentPct}
          onBasisChange={setFixedRentBasis}
        />

        {/* % Variable Rent */}
        <PercentRow
          label="% Variable Rent"
          value={rent.variableRentPct}
          basis={rent.variableRentBasis}
          onValueChange={setVariableRentPct}
          onBasisChange={setVariableRentBasis}
        />
      </div>
    </section>
  );
}

interface PercentRowProps {
  label: string;
  value: number;
  basis: RentBasis;
  onValueChange: (n: number) => void;
  onBasisChange: (b: RentBasis) => void;
}

function PercentRow({
  label,
  value,
  basis,
  onValueChange,
  onBasisChange,
}: PercentRowProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <div className="flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={value}
          onChange={(e) => onValueChange(Number(e.target.value))}
          className="w-full accent-forest-900"
        />
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={value.toFixed(1)}
            onChange={(e) => {
              const cleaned = e.target.value.replace(",", ".");
              const parsed = parseFloat(cleaned);
              if (!Number.isNaN(parsed)) onValueChange(parsed);
            }}
            className="w-24 rounded-lg border-transparent bg-slate-50 px-3 py-2 text-right text-sm font-bold text-forest-900 focus:outline-none focus:ring-0"
          />
          <select
            value={basis}
            onChange={(e) => onBasisChange(e.target.value as RentBasis)}
            className="w-32 cursor-pointer rounded-lg border-transparent bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-0"
          >
            {RENT_BASIS_OPTIONS.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
