import { Compass } from "lucide-react";
import { SettingsHeader } from "@/components/settings";
import { InvestmentTabs } from "@/components/settings/investment";

/**
 * Hotel Value tab — placeholder until the valuation-criteria spec lands.
 * Kept as a real route so the InvestmentTabs link doesn't 404 and the
 * navigation surface stays complete.
 */
export default function InvestmentValuePage() {
  return (
    <div className="space-y-8">
      <SettingsHeader
        title="Investment Requirements"
        subtitle="Define your Hotel Investment criteria"
      />
      <InvestmentTabs />
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-300 bg-white py-24 text-center">
        <Compass size={36} className="text-forest-700" />
        <h2 className="font-headline text-xl font-bold text-forest-900">
          Hotel Value criteria — coming soon
        </h2>
        <p className="max-w-md text-sm text-slate-500">
          Valuation thresholds (entry yield, exit cap, IRR floor, equity
          multiple) will live here. The shape feeds directly into the
          Underwriting and Investment Committee surfaces.
        </p>
      </div>
    </div>
  );
}
