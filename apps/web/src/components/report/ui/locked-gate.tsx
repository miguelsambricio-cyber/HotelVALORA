import { Fragment } from "react";
import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LockedGateProps {
  /** Labels for the blurred premium rows */
  rows: string[];
  tier?: "PRO" | "PREMIUM";
  className?: string;
}

export function LockedGate({ rows, tier = "PREMIUM", className }: LockedGateProps) {
  return (
    <div
      className={cn(
        "relative mt-4 border border-slate-300 rounded-md overflow-hidden print:hidden",
        className
      )}
    >
      {/* Blurred preview grid */}
      <div className="grid grid-cols-2 gap-px bg-slate-300">
        {rows.map((row) => (
          <Fragment key={row}>
            <div className="bg-white p-2 font-bold text-xs uppercase text-slate-500">
              {row}
            </div>
            <div className="bg-white p-2 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full border border-slate-800" />
            </div>
          </Fragment>
        ))}
      </div>

      {/* Lock overlay — CSS hover only, no JS needed */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[1px] flex items-center justify-center print:hidden group cursor-pointer">
        <div className="bg-white px-4 py-2 rounded-full shadow-2xl border-2 border-forest-900 flex items-center gap-2 transition-transform group-hover:scale-105 select-none">
          <Lock size={14} className="text-forest-900" strokeWidth={2.5} />
          <span className="text-[11px] font-black text-forest-900 tracking-wider uppercase">
            Upgrade to {tier}
          </span>
        </div>
      </div>
    </div>
  );
}
