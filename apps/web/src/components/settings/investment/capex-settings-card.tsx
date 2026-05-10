"use client";

import { Hammer } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestment } from "@/lib/investment";
import type { CapexMode } from "@/lib/investment";
import { SectionHeader } from "./section-header";
import { CapexTable } from "./capex-table";

export function CapexSettingsCard() {
  const { criteria, setCapexMode } = useInvestment();
  const isCustom = criteria.capexMode === "personalizado";

  return (
    <section>
      <SectionHeader icon={<Hammer size={20} />} title="CAPEX Settings" />

      <div className="space-y-6">
        {/* Mode selector — Básico vs Personalizado */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <ModeButton
            label="CAPEX Básico"
            active={criteria.capexMode === "basico"}
            onClick={() => setCapexMode("basico")}
            variant="light"
          />
          <ModeButton
            label="CAPEX Personalizado"
            active={criteria.capexMode === "personalizado"}
            onClick={() => setCapexMode("personalizado")}
            variant="dark"
          />
        </div>

        {/* CAPEX table — visible only in Personalizado mode */}
        {isCustom && <CapexTable />}
      </div>
    </section>
  );
}

interface ModeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  variant: "light" | "dark";
}

function ModeButton({ label, active, onClick, variant }: ModeButtonProps) {
  // Light: white bg + slate border. When active: stays light.
  // Dark: navy/forest bg. When active: stays dark.
  // Inactive variant in either case dims via opacity.
  const isDarkActive = variant === "dark" && active;
  const isLightActive = variant === "light" && active;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border-2 p-4 transition-all",
        isDarkActive &&
          "border-slate-950 bg-slate-950 text-white",
        isLightActive &&
          "border-forest-900 bg-white text-forest-900 shadow-sm",
        !active &&
          "border-slate-200 bg-white text-slate-500 hover:border-forest-900/30",
      )}
    >
      <span className="text-center text-xs font-bold uppercase tracking-tight">
        {label}
      </span>
    </button>
  );
}
