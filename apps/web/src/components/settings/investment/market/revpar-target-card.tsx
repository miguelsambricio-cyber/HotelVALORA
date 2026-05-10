"use client";

import { Flag } from "lucide-react";
import { useInvestment } from "@/lib/investment";
import { SectionHeader } from "../section-header";

export function RevparTargetCard() {
  const { criteria, setRevparTarget } = useInvestment();
  const v = criteria.market.revparTargetEur;

  return (
    <section>
      <SectionHeader icon={<Flag size={20} />} title="RevPAR Target" />

      <div className="flex items-center justify-between gap-4 rounded-xl border border-forest-900/10 bg-forest-900/5 p-6">
        <div className="min-w-0">
          <h3 className="mb-1 text-sm font-bold text-forest-900">RevPAR Target</h3>
          <p className="text-xs text-slate-500">
            Define el precio medio por habitación objetivo para la inversión.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-forest-900/20 bg-white px-4 py-2">
          <input
            type="text"
            inputMode="decimal"
            value={Number.isFinite(v) ? v : ""}
            onChange={(e) => {
              const raw = e.target.value.trim().replace(",", ".");
              if (raw === "") return setRevparTarget(0);
              const parsed = parseFloat(raw);
              if (!Number.isNaN(parsed)) setRevparTarget(parsed);
            }}
            placeholder="0"
            className="w-20 border-none bg-transparent p-0 text-right text-sm font-bold text-forest-900 focus:outline-none focus:ring-0"
          />
          <span className="whitespace-nowrap text-sm font-bold text-forest-900">
            € / habitación
          </span>
        </div>
      </div>
    </section>
  );
}
