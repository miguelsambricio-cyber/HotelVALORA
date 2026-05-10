"use client";

import { Check, ShieldCheck } from "lucide-react";

const FEATURES = [
  "Hotel Asset Info",
  "CompSET PRO",
  "Market Overview",
  "Hotel Transactions Comparable",
  "Local Hotel Projects",
  "IRR Project",
  "Informe Privado",
];

/**
 * Right-sidebar PRO-tier card — sibling of `PremiumSubscriptionCard`.
 * White surface, primary forest accents, INCLUDED CTA disabled (no-op
 * action — the user already has access at PRO tier).
 */
export function ProSubscriptionCard() {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <header className="mb-6 flex items-center gap-2">
        <ShieldCheck size={18} className="text-forest-900" strokeWidth={2.5} />
        <h3 className="font-headline text-sm font-extrabold uppercase tracking-[0.18em] text-forest-900">
          Pro Subscription Included
        </h3>
      </header>

      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
        Included Features
      </p>
      <ul className="space-y-2">
        {FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-xs font-medium text-slate-800"
          >
            <Check size={14} className="shrink-0 text-forest-900" />
            {f}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled
        className="mt-6 w-full cursor-not-allowed rounded-xl bg-slate-100 py-3 font-headline text-sm font-extrabold uppercase tracking-[0.2em] text-slate-500"
      >
        Included
      </button>
    </section>
  );
}
