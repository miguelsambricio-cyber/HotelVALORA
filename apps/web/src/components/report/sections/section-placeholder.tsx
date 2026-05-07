import { Construction } from "lucide-react";
import type { ReportSection } from "@/types/report";

interface SectionPlaceholderProps {
  section: ReportSection;
}

export function SectionPlaceholder({ section }: SectionPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
        <Construction size={22} className="text-amber-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-700 mb-1.5">
        Sección en desarrollo
      </h3>
      <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
        El contenido de <strong className="text-slate-600">{section.label}</strong> se
        añadirá al importar el diseño Stitch correspondiente.
      </p>
    </div>
  );
}
