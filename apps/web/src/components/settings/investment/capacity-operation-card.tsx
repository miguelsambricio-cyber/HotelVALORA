"use client";

import { Activity } from "lucide-react";
import { useInvestment } from "@/lib/investment";
import { DualRangeSlider } from "./dual-range-slider";
import { SliderField } from "./slider-field";
import { SectionHeader } from "./section-header";

export function CapacityOperationCard() {
  const { criteria, setField } = useInvestment();

  return (
    <section>
      <SectionHeader icon={<Activity size={20} />} title="Capacity & Operation" />

      <div className="space-y-8">
        {/* Min/Max rooms */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Min. / Max. Number of Rooms
            </label>
            <span className="text-sm font-bold text-forest-900">
              {criteria.minRooms} Min – {criteria.maxRooms} Max Units
            </span>
          </div>
          <DualRangeSlider
            min={0}
            max={500}
            step={5}
            minGap={10}
            minValue={criteria.minRooms}
            maxValue={criteria.maxRooms}
            onMinChange={(v) => setField("minRooms", v)}
            onMaxChange={(v) => setField("maxRooms", v)}
          />
          <div className="flex justify-between pt-1 text-[10px] font-bold uppercase tracking-tight text-slate-400">
            <span>No minimum</span>
            <span>No maximum</span>
          </div>
        </div>

        {/* Days opened yearly */}
        <SliderField
          label="Days Opened Yearly"
          min={0}
          max={365}
          value={criteria.daysOpenYearly}
          onChange={(v) => setField("daysOpenYearly", v)}
          formatValue={(v) => `${v} Days`}
        />
      </div>
    </section>
  );
}
