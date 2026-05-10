"use client";

import { LogOut } from "lucide-react";
import { useInvestmentStore } from "@/lib/investment";
import {
  InstitutionalToggle,
  SectionHeader,
} from "@/components/settings/investment";
import { CapRatePicker } from "./cap-rate-picker";
import { LabeledSlider } from "./labeled-slider";
import { SavedScenarioList } from "./saved-scenario-list";
import { UnderwritingSlider } from "./underwriting-slider";

/**
 * Exit Investment — second section on the Hotel Value page.
 *
 *   • Exit Price slider + Guardar (adds to exit scenarios)
 *   • Cap Rate Scenario picker (Conservador / Mercado / Optimista)
 *   • Yield Target / IRR Project / IRR Equity sliders
 */
export function ExitInvestmentSection() {
  const exit = useInvestmentStore((s) => s.criteria.value.exitInvestment);
  const setEnabled = useInvestmentStore((s) => s.setExitEnabled);
  const setExitPrice = useInvestmentStore((s) => s.setExitPrice);
  const setExitPriceMode = useInvestmentStore((s) => s.setExitPriceMode);
  const addExitScenario = useInvestmentStore((s) => s.addExitScenario);
  const removeExitScenario = useInvestmentStore((s) => s.removeExitScenario);
  const setCapRateScenario = useInvestmentStore((s) => s.setCapRateScenario);
  const setYieldTarget = useInvestmentStore((s) => s.setYieldTarget);
  const setIrrProject = useInvestmentStore((s) => s.setIrrProject);
  const setIrrEquity = useInvestmentStore((s) => s.setIrrEquity);

  return (
    <section>
      <SectionHeader
        icon={<LogOut size={20} />}
        title="Exit Investment"
        rightSlot={<InstitutionalToggle checked={exit.enabled} onChange={setEnabled} />}
      />

      <div
        className={
          exit.enabled ? "space-y-8" : "pointer-events-none space-y-8 opacity-60"
        }
      >
        <div className="space-y-2">
          <UnderwritingSlider
            label="Exit Price"
            value={exit.exitPriceEur}
            min={0}
            max={60_000_000}
            step={100_000}
            onChange={setExitPrice}
            mode={exit.exitPriceMode}
            onModeChange={setExitPriceMode}
            onSave={addExitScenario}
          />
          <SavedScenarioList
            title="Saved Scenarios"
            scenarios={exit.savedScenarios}
            onRemove={removeExitScenario}
          />
        </div>

        <div className="space-y-3">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Scenario Cap Rate
          </label>
          <CapRatePicker
            value={exit.capRateScenario}
            onChange={setCapRateScenario}
          />
        </div>

        <LabeledSlider
          label="Yield Target"
          value={exit.yieldTargetPct}
          min={0}
          max={15}
          step={0.1}
          onChange={setYieldTarget}
          displayValue={`${exit.yieldTargetPct.toFixed(1)}%`}
        />
        <LabeledSlider
          label="IRR Project Target"
          value={exit.irrProjectPct}
          min={0}
          max={30}
          step={0.1}
          onChange={setIrrProject}
          displayValue={`${exit.irrProjectPct.toFixed(1)}%`}
        />
        <LabeledSlider
          label="IRR Equity Target"
          value={exit.irrEquityPct}
          min={0}
          max={30}
          step={0.1}
          onChange={setIrrEquity}
          displayValue={`${exit.irrEquityPct.toFixed(1)}%`}
        />
      </div>
    </section>
  );
}
