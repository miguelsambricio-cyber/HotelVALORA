import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CapexDefaultsCard } from "@/components/admin/financials/capex-defaults-card";
import { FinancialStructureCard } from "@/components/admin/financials/financial-structure-card";
import { PnlBenchmarksCard } from "@/components/admin/financials/pnl-benchmarks-card";

export const metadata: Metadata = {
  title: "Financial defaults · Admin · HotelVALORA",
  description:
    "HotelVALORA institutional defaults · CAPEX matrix · capital structure · P&L benchmarks · operator-validatable.",
};

export const dynamic = "force-static";

export default function FinancialsPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-forest-900 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300">
            Reference
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            Institutional Financial Defaults
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Financials
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          HotelVALORA's baseline assumptions for European urban hospitality underwriting.
          These defaults power the screening scenario shown to operators across
          asset analysis, CAPEX, and the financials report sections — until per-asset
          values are captured and override them.
        </p>
        <p className="max-w-3xl text-[12px] leading-relaxed text-slate-500">
          Three reference layers below: <strong>CAPEX defaults</strong> (refurb €/room
          per room-tier × star category), <strong>basic financial structure</strong>
          (capital stack · target returns · fees), and <strong>P&L benchmarks</strong>
          (CoStar STR median % of revenue per star class). All values are indicative
          and operator-editable.
        </p>
      </header>

      <CapexDefaultsCard />
      <FinancialStructureCard />
      <PnlBenchmarksCard />

      <footer className="rounded-md border border-slate-700/60 bg-slate-900/40 p-3 font-mono text-[10.5px] leading-relaxed text-slate-400">
        <p>
          <strong className="text-slate-200">Source-of-truth:</strong>{" "}
          <code>apps/web/src/lib/admin/financials/defaults.ts</code> · single TypeScript
          file · 130+ defaults across 3 domains. Edit there to update the displayed
          baselines · changes propagate to this page on next deploy. Future Phase D may
          surface inline editing for senior operators.
        </p>
      </footer>
    </div>
  );
}
