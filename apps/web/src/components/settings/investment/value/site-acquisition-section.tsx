"use client";

import { Coins } from "lucide-react";
import { useInvestmentStore } from "@/lib/investment";
import {
  InstitutionalToggle,
  SectionHeader,
} from "@/components/settings/investment";
import { AcquisitionCostTable } from "./acquisition-cost-table";
import { BasicPremiumPicker } from "./basic-premium-picker";
import { SavedScenarioList } from "./saved-scenario-list";
import { UnderwritingSlider } from "./underwriting-slider";

/**
 * Site Acquisition — first section on the Hotel Value page.
 *
 *   • Master toggle (whole section ON/OFF)
 *   • Asking Price Target — slider + input + €/$ + display modes
 *   • Acquisition Cost — Basic/Premium picker + table
 *   • Total Investment (incl. CAPEX) — slider + input + Guardar
 *   • Saved Scenarios list (collapsible, with delete)
 */
export function SiteAcquisitionSection() {
  const site = useInvestmentStore((s) => s.criteria.value.siteAcquisition);
  const setEnabled = useInvestmentStore((s) => s.setSiteAcqEnabled);
  const setAskingPrice = useInvestmentStore((s) => s.setAskingPrice);
  const setAskingPriceMode = useInvestmentStore((s) => s.setAskingPriceMode);
  const setAskingPriceCurrency = useInvestmentStore((s) => s.setAskingPriceCurrency);
  const setAcquisitionCostMode = useInvestmentStore((s) => s.setAcquisitionCostMode);
  const setTotalInvestment = useInvestmentStore((s) => s.setTotalInvestment);
  const setTotalInvestmentMode = useInvestmentStore((s) => s.setTotalInvestmentMode);
  const addScenario = useInvestmentStore((s) => s.addSiteScenario);
  const removeScenario = useInvestmentStore((s) => s.removeSiteScenario);

  return (
    <section>
      <SectionHeader
        icon={<Coins size={20} />}
        title="Site Acquisition"
        rightSlot={<InstitutionalToggle checked={site.enabled} onChange={setEnabled} />}
      />

      <div
        className={
          site.enabled ? "space-y-10" : "pointer-events-none space-y-10 opacity-60"
        }
      >
        {/* Asking Price Target */}
        <UnderwritingSlider
          label="Asking Price Target (€)"
          value={site.askingPriceEur}
          min={0}
          max={50_000_000}
          step={100_000}
          onChange={setAskingPrice}
          mode={site.askingPriceMode}
          onModeChange={setAskingPriceMode}
          currency={site.askingPriceCurrency}
          onCurrencyChange={setAskingPriceCurrency}
        />

        {/* Acquisition Cost block */}
        <div className="space-y-6">
          <h3 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase tracking-wider text-forest-900">
            Acquisition Cost
          </h3>
          <BasicPremiumPicker
            value={site.acquisitionCostMode}
            onChange={setAcquisitionCostMode}
          />
          <AcquisitionCostTable mode={site.acquisitionCostMode} />
        </div>

        {/* Total Investment */}
        <div className="space-y-2">
          <UnderwritingSlider
            label="Total Investment (incl. CAPEX)"
            value={site.totalInvestmentEur}
            min={0}
            max={60_000_000}
            step={100_000}
            onChange={setTotalInvestment}
            mode={site.totalInvestmentMode}
            onModeChange={setTotalInvestmentMode}
            onSave={addScenario}
          />
          <SavedScenarioList
            title="Saved Scenarios"
            scenarios={site.savedScenarios}
            onRemove={removeScenario}
          />
        </div>
      </div>
    </section>
  );
}
