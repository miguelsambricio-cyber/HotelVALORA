"use client";

import { useState } from "react";
import { Plus, ShoppingBag } from "lucide-react";

interface PackOption {
  id: string;
  label: string;
  monthlyEur: number;
}

const DEFAULT_PACKS: PackOption[] = [
  { id: "transactions", label: "+2 packs Transactions", monthlyEur: 4.9 },
  { id: "hotel-projects", label: "+2 packs Hotel Projects", monthlyEur: 4.9 },
];

/**
 * Yellow-surface upsell card — analyst can stack additional analytics
 * packs (Transactions, Hotel Projects) on top of their plan. Total at
 * the bottom recomputes from selected packs. v1: pure UI. v2: posts to
 * billing on commit.
 */
export function ExtraPackagesCard() {
  const [selected, setSelected] = useState<Set<string>>(
    new Set(["transactions", "hotel-projects"]),
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const total = DEFAULT_PACKS.filter((p) => selected.has(p.id)).reduce(
    (s, p) => s + p.monthlyEur,
    0,
  );

  return (
    <section className="rounded-2xl bg-yellow-300 p-6 text-forest-900 shadow-sm">
      <header className="mb-4 flex items-center gap-2">
        <ShoppingBag size={20} />
        <h3 className="font-headline text-lg font-extrabold uppercase tracking-tight">
          Add Extra Packages
        </h3>
      </header>

      <div className="mb-6 space-y-3">
        {DEFAULT_PACKS.map((p) => {
          const isSelected = selected.has(p.id);
          return (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-lg bg-white/40 p-2"
            >
              <span className="pl-2 text-sm font-bold">{p.label}</span>
              <button
                type="button"
                onClick={() => toggle(p.id)}
                aria-pressed={isSelected}
                aria-label={isSelected ? "Remove pack" : "Add pack"}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-forest-900 text-white transition-colors hover:bg-forest-700"
              >
                <Plus
                  size={16}
                  className={isSelected ? "rotate-45 transition-transform" : "transition-transform"}
                />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-end justify-between border-t border-forest-900/20 pt-4">
        <span className="text-xs font-bold uppercase tracking-wider">Total</span>
        <span className="font-headline text-2xl font-black">
          €{total.toFixed(1)}
          <span className="text-sm font-bold">/mo</span>
        </span>
      </div>
    </section>
  );
}
