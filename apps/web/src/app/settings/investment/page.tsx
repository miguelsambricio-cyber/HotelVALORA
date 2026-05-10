"use client";

import { Lightbulb, Target, BarChart3 } from "lucide-react";
import { SettingsHeader } from "@/components/settings";
import {
  CapacityOperationCard,
  CapexSettingsCard,
  CoverageCard,
  FacilitiesCard,
  InvestmentTabs,
  LocationTargetsCard,
  MyPropertyParametersCard,
  PropertySpecsCard,
  RenderSelectorCard,
  SliderField,
} from "@/components/settings/investment";
import { useInvestment } from "@/lib/investment";

/**
 * Investment Requirements — the criteria engine that defines what the
 * user wants to acquire. Drives the future match engine that scores
 * hotels (🟢/🟡/🔴) on every analytical surface (Executive Summary,
 * CompSet, Underwriting, Deal Screening, IC reports).
 *
 * v1: every input persisted to localStorage via `useInvestmentStore`.
 * Match engine + Excel ingestion stubbed (see lib/investment/match-engine
 * and capex.ts comments).
 */
export default function InvestmentPage() {
  const {
    criteria,
    setField,
    toggleMyPropertyFacility,
    toggleCompsetFacility,
    commit,
  } = useInvestment();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await commit();
  };

  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Investment Requirements"
        subtitle="Define your hotel investment criteria."
      />

      <InvestmentTabs />

      <form onSubmit={handleSave} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* MAIN COLUMN — 6 sections inside one editorial card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)] md:p-10">
          <div className="space-y-12">
            <MyPropertyParametersCard />
            <CapacityOperationCard />
            <LocationTargetsCard />
            <PropertySpecsCard />
            <CapexSettingsCard />
            <RenderSelectorCard />
          </div>

          {/* Save Preferences CTA — institutional centered button */}
          <div className="mt-12 flex justify-center border-t border-slate-100 pt-10">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-forest-900 px-12 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR — Facilities + CompSet + Coverage */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <FacilitiesCard
            title="MyProperty Facilities"
            icon={<Target size={20} />}
            selected={criteria.myPropertyFacilities}
            onToggle={toggleMyPropertyFacility}
            bottomSlot={
              <div className="mt-8 rounded-xl border border-forest-900/10 bg-forest-900/5 p-5">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb size={14} className="text-forest-900" />
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-forest-900">
                    Institutional Intelligence
                  </span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600">
                  &ldquo;Hotels with dedicated Meeting &amp; Events spaces show a
                  12% higher ADR during off-season cycles in urban
                  markets.&rdquo;
                </p>
              </div>
            }
          />

          <FacilitiesCard
            title="CompSet Facilities"
            icon={<BarChart3 size={20} />}
            selected={criteria.compsetFacilities}
            onToggle={toggleCompsetFacility}
            bottomSlot={
              <div className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                <SliderField
                  label="CompSet Distance"
                  min={0.5}
                  max={5}
                  step={0.1}
                  value={criteria.compsetDistanceKm}
                  onChange={(v) => setField("compsetDistanceKm", v)}
                  formatValue={(v) => `${v.toFixed(1)} km`}
                  hintLeft="500 m"
                  hintRight="5 km"
                />
              </div>
            }
          />

          <CoverageCard />
        </aside>
      </form>
    </div>
  );
}
