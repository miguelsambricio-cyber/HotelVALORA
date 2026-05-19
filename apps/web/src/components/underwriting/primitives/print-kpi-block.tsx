import { cn } from "@/lib/utils";
import type { KpiItem } from "./floating-kpi-strip";

/**
 * Print-only headline KPI block · institutional opening for the PDF.
 *
 * Hidden on screen (`hidden print:block`) so it complements the
 * FloatingKpiStrip (`print:hidden`) rather than replacing it. The two
 * are mirror surfaces: the strip is the on-screen sticky summary, the
 * block is the static memo opening that an investment committee reader
 * sees on page 1 of the printed memorandum.
 *
 * Designed to feel like an IC memo "Key Metrics" header — claridad ·
 * jerarquía · breathing room — NOT a dashboard export. No icons, no
 * colour-coded backgrounds, no badges. Just label · value · sub for
 * each cell, separated by a forest-tinted hairline.
 *
 * Consumes the same `KpiItem[]` shape that drives the FloatingKpiStrip
 * so the two surfaces never drift. Scenario-picker cells render as
 * plain readouts in print (no dropdown affordance) since the PDF is a
 * static artefact.
 */

export interface PrintKpiBlockProps {
  items: KpiItem[];
}

export function PrintKpiBlock({ items }: PrintKpiBlockProps) {
  if (items.length === 0) return null;

  return (
    <section
      aria-label="Key metrics · printed memorandum opening"
      className="hidden print:block"
    >
      <div className="border-t border-b border-slate-200 py-4">
        <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.28em] text-slate-500">
          Key Metrics
        </p>
        <p className="mt-1 font-headline text-[10px] font-medium tracking-[0.06em] text-slate-600">
          Investment-committee snapshot · top-of-memorandum reference
        </p>

        <div
          className={cn(
            "mt-4 grid gap-x-6 gap-y-3",
            items.length === 2 && "grid-cols-2",
            items.length === 3 && "grid-cols-3",
            items.length >= 4 && "grid-cols-4",
          )}
        >
          {items.map((item) => (
            <PrintKpiCell key={item.label} item={item} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PrintKpiCell({ item }: { item: KpiItem }) {
  // For scenario-picker cells (e.g. Cap Rate dropdown) the `value` is
  // empty by convention; we synthesise a static readout from the
  // active scenario label so the printed cell still has a primary line.
  const isPicker = Boolean(item.scenarioPicker);
  const primary =
    item.value && item.value.length > 0
      ? item.value
      : isPicker
        ? item.scenarioPicker?.options.find((o) => o.id === item.scenarioPicker?.activeId)?.label ?? "—"
        : "—";

  const valueTone =
    item.tone === "ok"
      ? "text-emerald-800"
      : item.tone === "warn"
        ? "text-amber-800"
        : item.tone === "info"
          ? "text-[#005db7]"
          : "text-forest-900";

  return (
    <div className="min-w-0">
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {item.label}
      </p>
      <p
        className={cn(
          "mt-1 truncate font-mono text-[16px] font-extrabold tabular-nums leading-tight",
          valueTone,
        )}
      >
        {primary}
      </p>
      {item.sub && (
        <p className="mt-0.5 truncate font-mono text-[9.5px] leading-snug text-slate-600">
          {item.sub}
        </p>
      )}
    </div>
  );
}
