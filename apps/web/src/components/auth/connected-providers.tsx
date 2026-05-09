import { cn } from "@/lib/utils";

export interface ConnectedProvidersProps {
  className?: string;
}

const PROVIDERS = ["CoStar", "STR", "CBRE", "MSCI"] as const;

/**
 * Institutional data-source banner shown beneath the auth card.
 *
 * Per spec, the providers are surfaced as monochrome text badges (no
 * brand-coloured logos) — keeps the auth experience editorial and avoids
 * suggesting any commercial endorsement before the integration ships.
 *
 * Future: when CoStar / STR / CBRE / MSCI ingestion goes live, swap the
 * badges for actual SVG logos and add per-provider sync status indicators.
 */
export function ConnectedProviders({ className }: ConnectedProvidersProps) {
  return (
    <div className={cn("w-full", className)}>
      {/* Section divider — small uppercase header centered between two rules */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Connected Data Providers
          </span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {PROVIDERS.map((p) => (
          <div
            key={p}
            className={cn(
              "flex items-center justify-center rounded-md border border-slate-200 bg-slate-50 px-3 py-2.5",
              "text-[11px] font-bold uppercase tracking-wider text-slate-500",
              "transition-colors hover:border-forest-900/30 hover:bg-white hover:text-forest-900",
            )}
          >
            {p}
          </div>
        ))}
      </div>
    </div>
  );
}
