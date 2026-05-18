/**
 * KPI hero · institutional underwriting page primitive.
 *
 * Renders a strip of headline KPIs · uniformly sized tiles · the FIRST
 * thing an IC reader processes after the section title + narrative.
 *
 * Convention:
 *   · 4-6 tiles per row · responsive grid
 *   · `highlight` flag for the section's protagonist KPI (lime band)
 *   · `tone` for risk signalling (ok / warn / neutral)
 *   · sub-line for context (units, time frame, sample asking)
 *
 * Print discipline · dark→light inversion · break-inside-avoid.
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
    <div className={`grid gap-3 sm:grid-cols-2 ${cols} print:break-inside-avoid`}>
      {tiles.map((t) => (
        <KpiTile key={t.label} {...t} />
      ))}
    </div>
  );
}

export function KpiTile({ label, value, sub, tone = "neutral", highlight = false }: KpiTileProps) {
  const valueTone =
    tone === "ok" ? "text-emerald-200 print:text-emerald-700"
    : tone === "warn" ? "text-amber-200 print:text-amber-700"
    : tone === "negative" ? "text-rose-200 print:text-rose-700"
    : highlight ? "text-lime-200 print:text-emerald-700"
    : "text-slate-100 print:text-slate-900";

  const containerClass = highlight
    ? "rounded-md border-2 border-lime-300/40 bg-lime-300/5 p-3 print:border-emerald-500 print:bg-emerald-50"
    : "rounded-md border border-slate-800/60 bg-slate-900/40 p-3 print:border-slate-300 print:bg-white";

  return (
    <div className={containerClass}>
      <p className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500 print:text-slate-600">
        {label}
      </p>
      <p className={`mt-1 font-mono text-[18px] font-extrabold tabular-nums leading-tight ${valueTone}`}>{value}</p>
      {sub && <p className="mt-0.5 font-mono text-[9.5px] text-slate-500 print:text-slate-600">{sub}</p>}
    </div>
  );
}
