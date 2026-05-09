import { cn } from "@/lib/utils";

export interface MethodologyNoteProps {
  /** Override the inline body text */
  children?: React.ReactNode;
  /** Disable the top border (when stacked under another bordered block) */
  hideTopBorder?: boolean;
  className?: string;
}

const DEFAULT_BODY =
  "Valoración estimada con modelo dinámico v4.1 basado en parámetros operativos del activo y transacciones hoteleras del submercado. Cálculos en EUR y estándar accounting USALI. El Cap. Rate se calcula sobre EBITDA after replacement. Esta valoracion no sustituye un informes RICS-certificied appraisal.";

/**
 * Compact inline methodology note — used inside section column layouts where
 * the existing full-width `MethodologicalNote` (in `components/report/ui/`)
 * would be too tall. Applies the same emerald-accent left-border treatment.
 */
export function MethodologyNote({
  children,
  hideTopBorder = false,
  className,
}: MethodologyNoteProps) {
  return (
    <div
      className={cn(
        "mt-4 pt-3",
        !hideTopBorder && "border-t border-slate-200",
        className,
      )}
    >
      <p className="text-[11px] leading-tight text-slate-500 font-medium border-l-4 border-emerald-500 pl-3 print:text-[9px] print:leading-snug">
        <strong className="text-forest-900 block mb-0.5">Methodological Note:</strong>
        {children ?? DEFAULT_BODY}
      </p>
    </div>
  );
}
