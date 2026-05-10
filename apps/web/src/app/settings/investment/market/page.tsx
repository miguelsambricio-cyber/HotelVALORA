"use client";

import { Bed, BarChart3, TrendingUp } from "lucide-react";
import { SettingsHeader } from "@/components/settings";
import { InvestmentTabs, SectionHeader } from "@/components/settings/investment";
import {
  ExtraPackagesCard,
  ForecastGrowthCard,
  MarketCoverageCard,
  MarketOverviewCard,
  MarketPrimeCard,
  RevparTargetCard,
} from "@/components/settings/investment/market";
import { RevparScenarioCard } from "@/components/report/financials";
import { useInvestment } from "@/lib/investment";

/**
 * Investment Requirements / Hotel Market — the criteria-engine tab that
 * captures market-level assumptions:
 *
 *   • ADR Forecast Growth     (constant or per-year custom)
 *   • OCC Forecast Growth     (constant or per-year custom)
 *   • RevPAR Scenario         (DOWN / BASE / UP — visual selector reused
 *                              from /report/financials/pl; KPI tables
 *                              live in lib/investment/market-scenarios)
 *   • RevPAR Target           (€/room hurdle for the investment thesis)
 *
 * Every input persists to the investment store. v2: feed P&L /
 * Underwriting / DCF re-projection from these assumptions and hydrate
 * default values from CoStar / STR market exports.
 */
export default function InvestmentMarketPage() {
  const {
    criteria,
    setAdrGrowth,
    setOccGrowth,
    setRevparScenario,
    resetMarket,
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
        subtitle="Define your Hotel Investment criteria"
      />

      <InvestmentTabs />

      <form onSubmit={handleSave} className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* MAIN COLUMN */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_8px_24px_rgba(0,51,30,0.04)] md:p-10">
          <div className="space-y-12">
            <ForecastGrowthCard
              title="ADR Forecast Growth"
              icon={<TrendingUp size={20} />}
              value={criteria.market.adrGrowth}
              onChange={setAdrGrowth}
            />

            <ForecastGrowthCard
              title="OCC Forecast Growth"
              icon={<Bed size={20} />}
              value={criteria.market.occGrowth}
              onChange={setOccGrowth}
            />

            {/* RevPAR Scenario — reuses the canonical 3-button selector
                from the P&L page so the institutional rhythm matches. */}
            <section>
              <SectionHeader icon={<BarChart3 size={20} />} title="RevPAR Scenario" />
              <RevparScenarioCard
                active={criteria.market.revparScenario}
                editable
                onChange={setRevparScenario}
              />
            </section>

            <RevparTargetCard />
          </div>

          {/* Bottom actions — Discard left, Save right */}
          <div className="mt-12 flex items-center justify-between gap-4 border-t border-slate-100 pt-8">
            <button
              type="button"
              onClick={resetMarket}
              className="rounded-xl px-6 py-3 text-sm font-bold text-slate-500 transition-colors hover:bg-slate-100 hover:text-forest-900"
            >
              Discard Changes
            </button>
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
          <MarketCoverageCard />
          <MarketPrimeCard />
          <MarketOverviewCard />
          <ExtraPackagesCard />
        </aside>
      </form>
    </div>
  );
}
