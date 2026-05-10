"use client";

import { Building } from "lucide-react";
import { useInvestment } from "@/lib/investment";
import type {
  BrandManagement,
  OwnershipInterest,
  YearBuildBand,
} from "@/lib/investment";
import { SectionHeader } from "./section-header";
import { SliderField } from "./slider-field";

const YEAR_BANDS: { id: YearBuildBand; label: string }[] = [
  { id: "any", label: "Any Year" },
  { id: "after-2000", label: "After 2000" },
  { id: "after-2010", label: "After 2010" },
  { id: "after-2020", label: "After 2020" },
];

const OWNERSHIPS: { id: OwnershipInterest; label: string }[] = [
  { id: "freehold", label: "Freehold" },
  { id: "leasehold", label: "Leasehold" },
  { id: "mixed", label: "Mixed" },
];

const BRANDS: { id: BrandManagement; label: string }[] = [
  { id: "unencumbered", label: "Unencumbered" },
  { id: "branded", label: "Branded" },
  { id: "owner-operated", label: "Owner Operated" },
];

export function PropertySpecsCard() {
  const { criteria, setField } = useInvestment();

  return (
    <section>
      <SectionHeader icon={<Building size={20} />} title="Property Specs" />

      <div className="grid grid-cols-1 gap-7 md:grid-cols-2">
        <SliderField
          label="Distance to Center"
          min={0}
          max={50}
          step={0.5}
          value={criteria.distanceToCenterKm}
          onChange={(v) => setField("distanceToCenterKm", v)}
          formatValue={(v) => `${v} km`}
        />

        <Selector
          label="Year to Build"
          value={criteria.yearToBuild}
          onChange={(v) => setField("yearToBuild", v as YearBuildBand)}
          options={YEAR_BANDS}
        />

        <SliderField
          label="Gross Building"
          min={100}
          max={10000}
          step={100}
          value={criteria.grossBuildingM2}
          onChange={(v) => setField("grossBuildingM2", v)}
          formatValue={(v) => `${v.toLocaleString()} m²`}
        />

        <SliderField
          label="Lot Size"
          min={100}
          max={10000}
          step={100}
          value={criteria.lotSizeM2}
          onChange={(v) => setField("lotSizeM2", v)}
          formatValue={(v) => `${v.toLocaleString()} m²`}
        />

        <Selector
          label="Ownership Interest"
          value={criteria.ownershipInterest}
          onChange={(v) => setField("ownershipInterest", v as OwnershipInterest)}
          options={OWNERSHIPS}
        />

        <Selector
          label="Brand / Management"
          value={criteria.brandManagement}
          onChange={(v) => setField("brandManagement", v as BrandManagement)}
          options={BRANDS}
        />
      </div>
    </section>
  );
}

interface SelectorProps<T extends string> {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
}

function Selector<T extends string>({
  label,
  value,
  onChange,
  options,
}: SelectorProps<T>) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="w-full rounded-lg border border-transparent bg-slate-50 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
