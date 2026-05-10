"use client";

import { SettingsHeader } from "@/components/settings";
import { InvestmentTabs } from "@/components/settings/investment";
import {
  ExitInvestmentSection,
  FinanceStructureSection,
  PlForecastSection,
  PremiumSubscriptionCard,
  ProSubscriptionCard,
  RentFactorSection,
  SiteAcquisitionSection,
} from "@/components/settings/investment/value";
import { useInvestmentStore } from "@/lib/investment";

/**
 * Investment Requirements / Hotel Value — third tab in the criteria
 * engine. Captures the investor's financial criteria across 5 sections:
 *
 *   1. Site Acquisition  — asking price, acquisition costs, total invest
 *   2. Exit Investment   — exit price, cap rate scenario, return targets
 *   3. Rent Factor       — fixed/variable rent split (off by default)
 *   4. Finance Structure — debt parameters (8 sliders)
 *   5. P&L Forecast      — TTM, mgmt fee, marketing royalty, FF&E reserve
 *
 * Right sidebar surfaces tier feature gates: PREMIUM (active, dark) +
 * PRO (included, light disabled).
 *
 * v1: pure capture + persistence. Match engine, DCF, IRR, debt sizing,
 * exit yield logic remain stubs (see lib/investment).
 */
export default function InvestmentValuePage() {
  const commit = useInvestmentStore((s) => s.commit);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await commit();
  };

  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Investment Requirements"
        subtitle="Define your Hotel Investment criteria"
      />

      <InvestmentTabs />

      <form onSubmit={handleSave} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* MAIN COLUMN — 5 sections inside one editorial card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)] md:p-10">
          <div className="space-y-12">
            <SiteAcquisitionSection />
            <ExitInvestmentSection />
            <RentFactorSection />
            <FinanceStructureSection />
            <PlForecastSection />
          </div>

          {/* SAVE PREFERENCES — centered */}
          <div className="mt-12 flex justify-center border-t border-slate-100 pt-10">
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-xl bg-forest-900 px-12 py-3.5 text-sm font-bold uppercase tracking-[0.18em] text-white shadow-md transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          <PremiumSubscriptionCard />
          <ProSubscriptionCard />
        </aside>
      </form>
    </div>
  );
}
