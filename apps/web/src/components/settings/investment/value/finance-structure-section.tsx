"use client";

import { Banknote } from "lucide-react";
import { useInvestmentStore } from "@/lib/investment";
import type { FinanceStructureAssumptions } from "@/lib/investment";
import {
  InstitutionalToggle,
  SectionHeader,
} from "@/components/settings/investment";
import { LabeledSlider } from "./labeled-slider";

interface FieldDef {
  key: keyof Omit<FinanceStructureAssumptions, "enabled">;
  label: string;
  min: number;
  max: number;
  step: number;
  rangeHint: string;
  format: (v: number) => string;
}

const FIELDS: FieldDef[] = [
  {
    key: "acquisitionDebtPct",
    label: "Acquisition Debt",
    min: 0,
    max: 100,
    step: 1,
    rangeHint: "(0–100%)",
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    key: "capexDebtPct",
    label: "Capex Debt",
    min: 0,
    max: 100,
    step: 1,
    rangeHint: "(0–100%)",
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    key: "interestRatePct",
    label: "Interest Rate",
    min: 0,
    max: 15,
    step: 0.25,
    rangeHint: "(0–15%)",
    format: (v) => `${v.toFixed(2)}%`,
  },
  {
    key: "amortAssetYears",
    label: "Amortization Asset",
    min: 10,
    max: 30,
    step: 1,
    rangeHint: "(10–30 years)",
    format: (v) => `${v.toFixed(0)} Years`,
  },
  {
    key: "gracePeriodYears",
    label: "Grace Period",
    min: 0,
    max: 5,
    step: 1,
    rangeHint: "(0–5 years)",
    format: (v) => `${v.toFixed(0)} Years`,
  },
  {
    key: "amortCapexYears",
    label: "Amortization Capex",
    min: 0,
    max: 15,
    step: 1,
    rangeHint: "(0–15 years)",
    format: (v) => `${v.toFixed(0)} Years`,
  },
  {
    key: "bulletPaymentPct",
    label: "Bullet Payment",
    min: 0,
    max: 100,
    step: 1,
    rangeHint: "(0–100%)",
    format: (v) => `${v.toFixed(0)}%`,
  },
  {
    key: "openingFeePct",
    label: "Opening Fee",
    min: 0,
    max: 3,
    step: 0.1,
    rangeHint: "(0–3%)",
    format: (v) => `${v.toFixed(1)}%`,
  },
];

/**
 * Finance Structure — fourth section. 8 institutional sliders in a
 * 2-column grid covering acquisition + CAPEX debt parameters. Maps
 * directly to the underwriting workbook's Debt sheet.
 */
export function FinanceStructureSection() {
  const finance = useInvestmentStore((s) => s.criteria.value.financeStructure);
  const setEnabled = useInvestmentStore((s) => s.setFinanceEnabled);
  const setField = useInvestmentStore((s) => s.setFinanceField);

  return (
    <section>
      <SectionHeader
        icon={<Banknote size={20} />}
        title="Finance Structure"
        rightSlot={<InstitutionalToggle checked={finance.enabled} onChange={setEnabled} />}
      />

      <div
        className={
          finance.enabled
            ? "grid grid-cols-1 gap-6 md:grid-cols-2"
            : "pointer-events-none grid grid-cols-1 gap-6 opacity-60 md:grid-cols-2"
        }
      >
        {FIELDS.map((f) => {
          const v = finance[f.key];
          return (
            <LabeledSlider
              key={f.key}
              label={f.label}
              value={v}
              min={f.min}
              max={f.max}
              step={f.step}
              onChange={(n) => setField(f.key, n)}
              displayValue={f.format(v)}
              rangeHint={f.rangeHint}
            />
          );
        })}
      </div>
    </section>
  );
}
