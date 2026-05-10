"use client";

import { CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";

const FEATURES = [
  "Hotel Personalizado",
  "CompSET Premium",
  "CAPEX & Renders",
  "P&L Forecast",
  "Financial Strategy",
  "Underwriting & IRR Equity",
  "AI Imágenes",
  "Chatbot P&L Premium",
];

/**
 * Right-sidebar premium tier card on /settings/investment/value. Uses
 * the same dark-forest gradient + yellow-accent treatment as the Hotel
 * Market page's `MarketPrimeCard` but enumerates the full Premium
 * feature catalogue (8 bundled features) and is footed with a
 * "Valora Prime" sparkle label.
 */
export function PremiumSubscriptionCard() {
  return (
    <section className="overflow-hidden rounded-2xl border border-yellow-300/20 bg-gradient-to-br from-forest-900 to-[#062418] p-8 shadow-xl">
      <header className="mb-6 flex items-center gap-2">
        <ShieldCheck size={18} className="text-yellow-300" strokeWidth={2.5} />
        <h3 className="font-headline text-sm font-extrabold uppercase tracking-[0.18em] text-white">
          Premium Subscription Active
        </h3>
      </header>

      <p className="mb-4 text-[10px] font-bold uppercase tracking-[0.2em] text-yellow-300/80">
        Included Features
      </p>
      <ul className="space-y-2">
        {FEATURES.map((f) => (
          <li
            key={f}
            className="flex items-center gap-2 text-xs font-medium text-white/90"
          >
            <CheckCircle2 size={14} className="shrink-0 text-yellow-300" />
            {f}
          </li>
        ))}
      </ul>

      <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4">
        <span className="text-[10px] font-bold uppercase text-yellow-300">
          Valora Prime
        </span>
        <Sparkles size={14} className="text-white/40" />
      </div>

      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-yellow-300 py-3 font-headline text-sm font-extrabold uppercase tracking-[0.2em] text-black transition-opacity hover:opacity-90"
      >
        Activate
      </button>
    </section>
  );
}
