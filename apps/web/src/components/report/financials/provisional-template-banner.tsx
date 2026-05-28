import { Info } from "lucide-react";

/**
 * Informational banner shown on `/report/.../financials/pl` when the
 * underlying CoStar USALI template doesn't correspond to the hotel's
 * (submarket × class). Renders in the visual flow between the header
 * and the financial summary strip.
 *
 * The banner is informational (not error). Sober palette, visible but
 * non-alarmist · communicates honesty about data coverage without
 * undermining the report's usability.
 *
 * Auto-retires when `isProvisionalTemplate(hotel) === false` (i.e. when
 * new CoStar templates are ingested for the hotel's segment).
 */
export function ProvisionalTemplateBanner() {
  return (
    <div
      role="note"
      className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3 text-[13px] leading-snug text-amber-950 print:break-inside-avoid"
    >
      <Info
        size={18}
        strokeWidth={2.2}
        className="mt-[1px] flex-shrink-0 text-amber-700"
        aria-hidden="true"
      />
      <div className="space-y-1">
        <p className="font-bold uppercase tracking-wide text-[11px] text-amber-900">
          Plantilla USALI provisional · cobertura CoStar pendiente
        </p>
        <p className="text-[12.5px] text-amber-950/90">
          Los porcentajes base aplicados corresponden a Madrid Centro Upper-Upscale.
          La valoración se recalibrará automáticamente cuando se carguen los datos
          segmentados de CoStar para el submercado y la clase de este activo.
        </p>
      </div>
    </div>
  );
}
