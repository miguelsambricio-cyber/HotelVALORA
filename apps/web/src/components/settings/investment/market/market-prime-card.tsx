"use client";

import { CheckCircle2, ShieldCheck, Sparkles } from "lucide-react";

const BULLETS = [
  "ADR & OCC Growth customized",
  "Revenue (P&L) optimization active",
];

/**
 * Right-sidebar premium tier card — "Market Prime". Dark forest surface,
 * yellow accents, PRIME corner badge, shield watermark. CTA upgrades the
 * tenant to the premium market tier (no-op v1; wires to billing in v2).
 */
export function MarketPrimeCard() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-forest-900 p-6 shadow-lg">
      {/* PRIME corner badge */}
      <div className="absolute -right-1 -top-1 rounded-bl-xl bg-yellow-300 px-3 py-1 font-headline text-[10px] font-black tracking-[0.2em] text-forest-900 shadow-sm">
        PRIME
      </div>

      <header className="mb-4 flex items-center gap-2 text-yellow-300">
        <Sparkles size={20} />
        <h3 className="font-headline text-lg font-extrabold text-white">
          Market Prime
        </h3>
      </header>

      <ul className="mt-4 space-y-3">
        {BULLETS.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-yellow-300" />
            <span className="text-sm font-medium text-emerald-50/90">{b}</span>
          </li>
        ))}
      </ul>

      {/* Watermark */}
      <ShieldCheck
        size={48}
        className="pointer-events-none absolute -bottom-2 -right-2 rotate-12 text-yellow-300/30"
        aria-hidden
      />

      <button
        type="button"
        className="mt-6 w-full rounded-xl bg-yellow-300 py-3 font-headline text-sm font-extrabold uppercase tracking-[0.16em] text-forest-900 transition-colors hover:bg-yellow-200"
      >
        Activate
      </button>
    </section>
  );
}
