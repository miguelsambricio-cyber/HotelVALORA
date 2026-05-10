"use client";

import { BarChart3, CheckCircle2 } from "lucide-react";

const BULLETS = [
  "Market Trends Insight",
  "Comparable Hotel Transactions",
  "Local Hotel Projects",
];

/**
 * Right-sidebar feature gate — "Market Overview". White card listing
 * what's bundled in the market analytics package; INCLUDED CTA confirms
 * coverage at the current tier. v2: the CTA toggles add-on activation
 * once the billing surface ships.
 */
export function MarketOverviewCard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <header className="mb-4 flex items-center gap-2 text-forest-900">
        <BarChart3 size={20} />
        <h3 className="font-headline text-lg font-extrabold">Market Overview</h3>
      </header>
      <p className="mb-6 text-xs text-slate-500">
        Access detailed intelligence for your targeted submarkets.
      </p>
      <ul className="mb-8 space-y-3">
        {BULLETS.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-forest-900" />
            <span className="text-sm font-medium text-slate-800">{b}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="w-full rounded-xl border-2 border-forest-900 bg-white py-3 text-sm font-bold uppercase tracking-wider text-forest-900 transition-colors hover:bg-forest-900/5"
      >
        Included
      </button>
    </section>
  );
}
