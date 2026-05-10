"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { ForecastGrowth } from "@/lib/investment";
import { SectionHeader } from "../section-header";

export interface ForecastGrowthCardProps {
  title: string;
  icon: ReactNode;
  value: ForecastGrowth;
  onChange: (next: ForecastGrowth) => void;
}

/**
 * Reusable forecast-growth section card. Renders an institutional
 * SectionHeader (icon + title + ON/OFF toggle), then two mode cards
 * (CONSTANT with slider · CUSTOM dark tile). When CUSTOM is active a
 * 4-column Year 1–4 input grid appears below.
 *
 * Used twice on the Hotel Market page — once for ADR Forecast Growth and
 * once for OCC Forecast Growth — with identical visual rhythm.
 */
export function ForecastGrowthCard({
  title,
  icon,
  value,
  onChange,
}: ForecastGrowthCardProps) {
  const setMode = (mode: ForecastGrowth["mode"]) =>
    onChange({ ...value, mode });
  const setEnabled = (enabled: boolean) => onChange({ ...value, enabled });
  const setConstant = (constant: number) => onChange({ ...value, constant });
  const setCustom = (idx: 0 | 1 | 2 | 3, n: number) => {
    const next = [...value.custom] as [number, number, number, number];
    next[idx] = n;
    onChange({ ...value, custom: next });
  };

  const isConstant = value.mode === "constant";
  const isCustom = value.mode === "custom";

  return (
    <section>
      <SectionHeader
        icon={icon}
        title={title}
        rightSlot={<MasterToggle checked={value.enabled} onChange={setEnabled} />}
      />

      <div
        className={cn(
          "space-y-6 transition-opacity",
          !value.enabled && "pointer-events-none opacity-60",
        )}
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ConstantTile
            active={isConstant}
            value={value.constant}
            onActivate={() => setMode("constant")}
            onSliderChange={setConstant}
          />
          <CustomTile active={isCustom} onActivate={() => setMode("custom")} />
        </div>

        {isCustom && (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {(["Year 1", "Year 2", "Year 3", "Year 4"] as const).map((label, i) => (
              <PercentInput
                key={label}
                label={label}
                value={value.custom[i as 0 | 1 | 2 | 3]}
                onChange={(n) => setCustom(i as 0 | 1 | 2 | 3, n)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface ConstantTileProps {
  active: boolean;
  value: number;
  onActivate: () => void;
  onSliderChange: (v: number) => void;
}

function ConstantTile({
  active,
  value,
  onActivate,
  onSliderChange,
}: ConstantTileProps) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border-2 p-4 text-left transition-all",
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white hover:bg-slate-50",
      )}
    >
      <div className="mb-3 flex w-full items-center justify-between">
        <span
          className={cn(
            "text-xs font-bold uppercase",
            active ? "text-white" : "text-slate-800 group-hover:text-forest-900",
          )}
        >
          Constant
        </span>
        <span
          className={cn(
            "rounded-md px-2 py-1 text-xs font-bold",
            active ? "bg-white/10 text-emerald-200" : "bg-slate-100 text-slate-500",
          )}
        >
          {value.toFixed(1)}%
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={10}
        step={0.1}
        value={value}
        onChange={(e) => onSliderChange(Number(e.target.value))}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "h-1.5 w-full cursor-pointer appearance-none rounded-lg",
          active ? "accent-emerald-300 bg-white/10" : "accent-forest-900 bg-slate-200",
        )}
      />
    </button>
  );
}

function CustomTile({
  active,
  onActivate,
}: {
  active: boolean;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      className={cn(
        "flex h-full w-full items-center justify-center rounded-xl border-2 p-4 text-center transition-all",
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-800 hover:bg-slate-50 hover:text-forest-900",
      )}
    >
      <span className="text-xs font-bold uppercase">Custom</span>
    </button>
  );
}

function MasterToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
        checked ? "bg-forest-900" : "bg-slate-300",
      )}
    >
      <span
        className={cn(
          "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
          checked ? "translate-x-5" : "translate-x-0",
        )}
      />
    </button>
  );
}

interface PercentInputProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
}

function PercentInput({ label, value, onChange }: PercentInputProps) {
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => {
            const raw = e.target.value.trim().replace(",", ".");
            if (raw === "") return onChange(0);
            const parsed = parseFloat(raw);
            if (!Number.isNaN(parsed)) onChange(parsed);
          }}
          placeholder="0.00"
          className="w-full rounded-lg border border-transparent bg-slate-50 px-4 py-3 pr-8 text-sm text-slate-800 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-0"
        />
        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-500">
          %
        </span>
      </div>
    </div>
  );
}
