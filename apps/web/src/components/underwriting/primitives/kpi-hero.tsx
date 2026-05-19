/**
 * KPI hero · institutional underwriting page primitive.
 *
 * Corporate light theme · white tile · slate-200 border · black value.
 * `highlight` renders a subtle forest/emerald accent for the section's
 * protagonist KPI · `tone` shifts the value colour for risk signalling.
 *
 * Editable assumptions are NEVER rendered through this primitive ·
 * `EditableTile` owns the blue (#005db7) "I can edit" treatment.
 */

export type KpiTone = "neutral" | "ok" | "warn" | "negative";

export interface KpiTileProps {
  label: string;
  value: string;
  sub?: string;
  tone?: KpiTone;
  highlight?: boolean;
}

export function KpiHero({ tiles }: { tiles: KpiTileProps[] }) {
  const cols = tiles.length >= 6 ? "lg:grid-cols-6" : tiles.length >= 4 ? "lg:grid-cols-4" : "lg:grid-cols-3";
  return (
    <div className={`grid gap-3 grid-cols-2 ${cols} print:break-inside-avoid`}>
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </div>
  );
}

export function KpiTile({ label, value, sub, tone = "neutral", highlight = false }: KpiTileProps) {
  const valueTone =
    tone === "ok" ? "text-emerald-700"
    : tone === "warn" ? "text-amber-700"
    : tone === "negative" ? "text-rose-700"
    : highlight ? "text-forest-900"
    : "text-slate-900";

  const containerClass = highlight
    ? "rounded-md border-2 border-forest-900/30 bg-forest-50 p-3 print:bg-emerald-50 print:border-emerald-500"
    : "rounded-md border border-slate-200 bg-white p-3";

  return (
    <div className={containerClass + " print:break-inside-avoid"}>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className={`mt-1 font-mono text-[16px] font-extrabold tabular-nums leading-tight sm:text-[17px] ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{sub}</p>}
    </div>
  );
}
