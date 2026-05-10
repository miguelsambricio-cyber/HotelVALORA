"use client";

import { Cog, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestment } from "@/lib/investment";
import type { AssetClass, AssetType } from "@/lib/investment";
import { SectionHeader } from "./section-header";

const ASSET_TYPES: { id: AssetType; label: string }[] = [
  { id: "hotel", label: "Hotel" },
  { id: "hotel-project", label: "Hotel Project" },
  { id: "tourist-apartment", label: "Tourist Apartment" },
];

const ASSET_CLASSES: { id: AssetClass; label: string }[] = [
  { id: "midscale", label: "Midscale" },
  { id: "upscale", label: "Upscale" },
  { id: "upper-upscale", label: "Upper Upscale" },
  { id: "luxury", label: "Luxury" },
];

export function MyPropertyParametersCard() {
  const { criteria, setField } = useInvestment();

  return (
    <section>
      <SectionHeader icon={<Cog size={20} />} title="MyProperty Parameters" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Asset Type
          </label>
          <select
            value={criteria.assetType}
            onChange={(e) => setField("assetType", e.target.value as AssetType)}
            className="w-full rounded-lg border border-transparent bg-slate-50 px-4 py-3 text-sm transition-all focus:border-blue-500 focus:bg-white focus:outline-none"
          >
            {ASSET_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Star Category
          </label>
          <div className="flex h-[50px] items-center gap-1 rounded-lg bg-slate-50 px-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setField("starCategory", n)}
                aria-label={`${n} star${n > 1 ? "s" : ""}`}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={20}
                  className={
                    n <= criteria.starCategory
                      ? "fill-yellow-300 text-yellow-300"
                      : "text-slate-300"
                  }
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
            Asset Class
          </label>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {ASSET_CLASSES.map((c) => {
              const isActive = criteria.assetClass === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setField("assetClass", c.id)}
                  className={cn(
                    "rounded-lg border-2 px-2 py-3 text-xs font-bold uppercase tracking-tight transition-all",
                    isActive
                      ? "border-forest-900 bg-forest-900 text-white"
                      : "border-slate-200 text-slate-500 hover:border-forest-900/30",
                  )}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
