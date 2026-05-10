"use client";

import { Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestment } from "@/lib/investment";
import type { TernaryYesNo } from "@/lib/investment";
import { SectionHeader } from "./section-header";
import { SliderField } from "./slider-field";

const COUNTRIES = ["Spain", "Portugal", "Italy", "France"];
const MARKETS = ["Madrid", "Barcelona", "Sevilla", "Valencia", "Other Primary Cities"];
const SUBMARKETS = ["Salamanca", "Chamberí", "Retiro", "City Center"];

export function LocationTargetsCard() {
  const { criteria, setField } = useInvestment();

  return (
    <section>
      <SectionHeader icon={<Map size={20} />} title="Location Targets" />

      <div className="mb-7 grid grid-cols-1 gap-5 md:grid-cols-3">
        <Selector
          label="Country"
          value={criteria.country}
          onChange={(v) => setField("country", v)}
          options={COUNTRIES}
        />
        <Selector
          label="Market Target"
          value={criteria.marketTarget}
          onChange={(v) => setField("marketTarget", v)}
          options={MARKETS}
        />
        <Selector
          label="Submarket"
          value={criteria.submarket}
          onChange={(v) => setField("submarket", v)}
          options={SUBMARKETS}
        />
      </div>

      <div className="space-y-7">
        {/* Centro Histórico toggle */}
        <ToggleRow
          title="Centro Histórico"
          description="Target assets located within historical district boundaries"
          checked={criteria.centroHistorico}
          onChange={(v) => setField("centroHistorico", v)}
        />

        {/* Score sliders */}
        <SliderField
          label="Target Location Score"
          min={0}
          max={10}
          step={0.1}
          value={criteria.targetLocationScore}
          onChange={(v) => setField("targetLocationScore", v)}
          formatValue={(v) => `${v.toFixed(1)}+`}
        />
        <SliderField
          label="Comfort Score for Renovation"
          min={0}
          max={10}
          step={0.1}
          value={criteria.comfortScoreRenovation}
          onChange={(v) => setField("comfortScoreRenovation", v)}
          formatValue={(v) => v.toFixed(1)}
        />

        {/* For Renovation YES/NO */}
        <YesNoRow
          title="For Renovation"
          description="Specify if seeking assets requiring renovation"
          value={criteria.forRenovation}
          onChange={(v) => setField("forRenovation", v)}
        />
      </div>
    </section>
  );
}

// ── Internals ──────────────────────────────────────────────────────────────

interface SelectorProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}

function Selector({ label, value, onChange, options }: SelectorProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-transparent bg-slate-50 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
      <div className="min-w-0">
        <span className="block text-sm font-bold text-forest-900">{title}</span>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
          checked ? "bg-forest-700" : "bg-slate-300",
        )}
      >
        <span
          className={cn(
            "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
            checked ? "translate-x-5" : "translate-x-0",
          )}
        />
      </button>
    </div>
  );
}

function YesNoRow({
  title,
  description,
  value,
  onChange,
}: {
  title: string;
  description: string;
  value: TernaryYesNo;
  onChange: (v: TernaryYesNo) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">
      <div className="min-w-0">
        <span className="block text-sm font-bold text-forest-900">{title}</span>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
      <div className="flex gap-2">
        {(["yes", "no"] as TernaryYesNo[]).map((opt) => {
          const isActive = value === opt;
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onChange(opt)}
              className={cn(
                "rounded-lg border px-4 py-2 text-xs font-bold uppercase transition-all",
                isActive
                  ? "border-forest-900 bg-forest-900 text-white"
                  : "border-slate-200 bg-white text-slate-500 hover:border-forest-900/30",
              )}
            >
              {opt === "yes" ? "Sí" : "No"}
            </button>
          );
        })}
      </div>
    </div>
  );
}
