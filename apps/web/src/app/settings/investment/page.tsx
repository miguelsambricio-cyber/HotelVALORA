import type { Metadata } from "next";
import { Briefcase } from "lucide-react";
import { SettingsHeader } from "@/components/settings";

export const metadata: Metadata = {
  title: "Investment — HotelVALORA",
};

export default function InvestmentPage() {
  return (
    <div className="space-y-6">
      <SettingsHeader
        title="Investment Profile"
        subtitle="Underwriting preferences, risk appetite, and target returns."
      />

      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 px-6 py-20 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
          <Briefcase size={28} className="text-forest-900" strokeWidth={2} />
        </div>
        <h3 className="font-headline text-lg font-extrabold uppercase tracking-tight text-forest-900">
          Coming Soon
        </h3>
        <p className="max-w-md text-sm text-slate-500">
          Investment profile lets you declare hold-period, target IRR, debt
          structure preferences and exit cap assumptions — these will become
          the default underwriting inputs across every report.
        </p>
      </div>
    </div>
  );
}
