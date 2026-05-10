"use client";

import { TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestmentStore } from "@/lib/investment";
import type { RentBasis } from "@/lib/investment";
import {
  InstitutionalToggle,
  SectionHeader,
} from "@/components/settings/investment";
import { BasicPremiumPicker } from "./basic-premium-picker";
import { FfeReserveYears } from "./ffe-reserve-years";
import { LabeledSlider } from "./labeled-slider";

const BASIS_OPTIONS: { id: RentBasis; label: string }[] = [
  { id: "revenue", label: "% Revenue" },
  { id: "gop", label: "% GOP" },
  { id: "ebitdar", label: "% EBITDAR" },
];

/**
 * P&L Forecast — fifth and final section. Captures TTM, management fee
 * structure (Basic/Premium gated), marketing royalty, and FF&E reserve
 * by year (Y1-Y4).
 */
export function PlForecastSection() {
  const pl = useInvestmentStore((s) => s.criteria.value.plForecast);
  const setEnabled = useInvestmentStore((s) => s.setPlEnabled);
  const setTtm = useInvestmentStore((s) => s.setTtm);
  const setMgmtFeeMode = useInvestmentStore((s) => s.setMgmtFeeMode);
  const setBaseFeePct = useInvestmentStore((s) => s.setBaseFeePct);
  const setBaseFeeBasis = useInvestmentStore((s) => s.setBaseFeeBasis);
  const setIncentiveFeePct = useInvestmentStore((s) => s.setIncentiveFeePct);
  const setIncentiveFeeBasis = useInvestmentStore((s) => s.setIncentiveFeeBasis);
  const setMarketingRoyalty = useInvestmentStore((s) => s.setMarketingRoyalty);

  return (
    <section>
      <SectionHeader
        icon={<TrendingUp size={20} />}
        title="P&L Forecast"
        rightSlot={<InstitutionalToggle checked={pl.enabled} onChange={setEnabled} />}
      />

      <div
        className={
          pl.enabled ? "space-y-8" : "pointer-events-none space-y-8 opacity-60"
        }
      >
        {/* TTM */}
        <LabeledSlider
          label="TTM"
          value={pl.ttm}
          min={0}
          max={20}
          step={1}
          onChange={setTtm}
          displayValue={pl.ttm.toString()}
        />

        {/* Management Fee */}
        <div>
          <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-forest-900">
            Management Fee
          </h3>
          <BasicPremiumPicker
            value={pl.mgmtFeeMode}
            onChange={setMgmtFeeMode}
            className="mb-6"
          />
          {pl.mgmtFeeMode === "premium" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FeeBlock
                label="Base Fee"
                pct={pl.baseFeePct}
                basis={pl.baseFeeBasis}
                onPctChange={setBaseFeePct}
                onBasisChange={setBaseFeeBasis}
                max={10}
              />
              <FeeBlock
                label="Incentive Fee"
                pct={pl.incentiveFeePct}
                basis={pl.incentiveFeeBasis}
                onPctChange={setIncentiveFeePct}
                onBasisChange={setIncentiveFeeBasis}
                max={20}
              />
            </div>
          )}
        </div>

        {/* Marketing - Royalty */}
        <div>
          <h3 className="mb-4 border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-forest-900">
            Marketing &mdash; Royalty
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="relative w-24">
                  <input
                    type="text"
                    inputMode="decimal"
                    value={pl.marketingRoyaltyPct.toFixed(1)}
                    onChange={(e) => {
                      const v = parseFloat(e.target.value.replace(",", "."));
                      if (!Number.isNaN(v)) setMarketingRoyalty(v);
                    }}
                    className="w-full rounded-lg border-transparent bg-slate-50 py-2 pl-3 pr-8 text-right text-sm font-bold text-forest-900 focus:outline-none focus:ring-0"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">
                    %
                  </span>
                </div>
                <span className="text-sm text-slate-500">from Room Revenue</span>
              </div>
              <span className="text-sm font-bold text-forest-900">
                {pl.marketingRoyaltyPct.toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              step={0.1}
              value={pl.marketingRoyaltyPct}
              onChange={(e) => setMarketingRoyalty(Number(e.target.value))}
              className="w-full accent-forest-900"
            />
          </div>
        </div>

        {/* FF&E Reserve */}
        <FfeReserveYears />
      </div>
    </section>
  );
}

interface FeeBlockProps {
  label: string;
  pct: number;
  basis: RentBasis;
  onPctChange: (n: number) => void;
  onBasisChange: (b: RentBasis) => void;
  max: number;
}

function FeeBlock({
  label,
  pct,
  basis,
  onPctChange,
  onBasisChange,
  max,
}: FeeBlockProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
          {label}
        </label>
        <span className="text-sm font-bold text-forest-900">{pct.toFixed(1)}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={max}
        step={0.1}
        value={pct}
        onChange={(e) => onPctChange(Number(e.target.value))}
        className="w-full accent-forest-900"
      />
      <div className="inline-flex w-fit rounded-lg bg-slate-50 p-1">
        {BASIS_OPTIONS.map((o) => {
          const isActive = o.id === basis;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onBasisChange(o.id)}
              className={cn(
                "rounded-md px-3 py-1 text-[10px] font-bold transition-all",
                isActive
                  ? "bg-white text-forest-900 shadow-sm"
                  : "text-slate-500 hover:text-forest-900",
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
