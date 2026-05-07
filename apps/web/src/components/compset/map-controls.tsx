"use client";

import { Compass, Utensils, Plus, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

interface MapControlsProps {
  className?: string;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
}

export function MapControls({ className, onZoomIn, onZoomOut }: MapControlsProps) {
  const controls = [
    { icon: Compass,  title: "Heatmap Turístico",   onClick: undefined  },
    { icon: Utensils, title: "Heatmap Restaurantes", onClick: undefined  },
    { icon: Plus,     title: "Acercar",              onClick: onZoomIn   },
    { icon: Minus,    title: "Alejar",               onClick: onZoomOut  },
  ] as const;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {controls.map(({ icon: Icon, title, onClick }) => (
        <button
          key={title}
          type="button"
          title={title}
          aria-label={title}
          onClick={onClick}
          className="w-10 h-10 glass-overlay rounded-lg flex items-center justify-center text-forest-900 shadow-sm hover:bg-white transition-colors border border-white/50"
        >
          <Icon size={20} />
        </button>
      ))}
    </div>
  );
}
