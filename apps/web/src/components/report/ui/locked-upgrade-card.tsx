import { Fragment } from "react";
import { Lock } from "lucide-react";

interface LockedUpgradeCardProps {
  rows: string[];
  tier?: "PRO" | "PREMIUM";
}

export function LockedUpgradeCard({ rows, tier = "PREMIUM" }: LockedUpgradeCardProps) {
  return (
    <div className="mt-4 relative overflow-hidden border border-slate-300 rounded-md print:hidden">
      {/* Preview rows — blurred by the overlay */}
      <div className="grid grid-cols-2 gap-px bg-slate-300">
        {rows.map((row) => (
          <Fragment key={row}>
            <div className="bg-white p-2 font-bold text-xs uppercase text-slate-500">
              {row}
            </div>
            <div className="bg-white p-2 flex justify-center items-center">
              <div className="w-3 h-3 rounded-full border border-black" />
            </div>
          </Fragment>
        ))}
      </div>

      {/* Overlay — backdrop-filter blurs what's behind the overlay, not the badge itself */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center z-10 print:hidden group cursor-pointer">
        <div className="bg-white px-4 py-2 rounded-full shadow-2xl border-2 border-forest-900 flex items-center gap-2 transition-transform group-hover:scale-105 select-none">
          <Lock size={14} className="text-forest-900 font-bold" strokeWidth={2.5} />
          <span className="text-xs font-black text-forest-900 tracking-wider uppercase antialiased">
            Upgrade to {tier}
          </span>
        </div>
      </div>
    </div>
  );
}
