"use client";

import { cn } from "@/lib/utils";
import { useInvestment } from "@/lib/investment";
import type { InvestmentTab } from "@/lib/investment";

const TABS: { id: InvestmentTab; label: string }[] = [
  { id: "asset", label: "Hotel Asset" },
  { id: "market", label: "Hotel Market" },
  { id: "value", label: "Hotel Value" },
];

/**
 * Top sub-tabs within the Investment Requirements page. Hotel Asset is
 * shipped today; Market + Value tabs are present in the registry so the
 * navigation surface is complete, but switching to them is a no-op for
 * v1 (page content is the Asset criteria for now).
 */
export function InvestmentTabs() {
  const { activeTab, setTab } = useInvestment();
  return (
    <div className="flex gap-8 border-b border-slate-200">
      {TABS.map((t) => {
        const isActive = activeTab === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "relative -mb-px px-1 pb-4 text-sm font-bold transition-colors font-headline",
              isActive
                ? "border-b-2 border-forest-900 text-forest-900"
                : "border-b-2 border-transparent text-slate-500 hover:text-forest-900",
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
