"use client";

import { cn } from "@/lib/utils";

interface ActionBarProps {
  currentPage?: number;
  totalPages?: number;
  className?: string;
}

export function ActionBar({
  currentPage = 1,
  totalPages = 1,
  className,
}: ActionBarProps) {
  return (
    <div
      className={cn(
        "grid grid-cols-3 h-16 shadow-lg border border-slate-200 rounded-xl overflow-hidden print:hidden",
        className
      )}
    >
      {/* FAVORITOS */}
      <button
        type="button"
        className="flex flex-col items-center justify-center gap-0.5 font-black uppercase text-[11px] tracking-widest text-slate-700 bg-white hover:bg-slate-50 transition-colors border-r border-slate-200"
      >
        FAVORITOS
      </button>

      {/* GUARDAR */}
      <button
        type="button"
        className="flex flex-col items-center justify-center gap-0.5 font-black uppercase text-[11px] tracking-widest text-slate-700 bg-white hover:bg-slate-50 transition-colors border-r border-slate-200"
      >
        GUARDAR
        <span className="text-[8px] font-normal normal-case tracking-normal text-slate-400">
          Página {currentPage} de {totalPages}
        </span>
      </button>

      {/* UPGRADE */}
      <button
        type="button"
        className="flex flex-col items-center justify-center gap-0.5 font-black uppercase text-[11px] tracking-widest text-white bg-[#005db7] hover:brightness-110 transition-all"
      >
        UPGRADE
      </button>
    </div>
  );
}
