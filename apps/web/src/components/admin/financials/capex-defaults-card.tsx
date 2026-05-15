import { Construction } from "lucide-react";
import {
  CAPEX_DEFAULTS,
  ROOM_TIERS,
  STAR_CATEGORIES,
  capexTotalForCell,
  type CapexLine,
} from "@/lib/admin/financials/defaults";

/**
 * CAPEX defaults matrix · 12 line items · 3 room tiers · 3 star categories.
 * Indicative European urban hotel renovation values (€/room).
 */
export function CapexDefaultsCard() {
  const groups: Array<{ id: CapexLine["group"]; label: string }> = [
    { id: "hard", label: "Hard cost" },
    { id: "soft", label: "Soft cost" },
    { id: "project", label: "Project costs" },
  ];

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            <Construction size={11} />
            CAPEX defaults
          </p>
          <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
            Refurbishment €/room · 3 room tiers × 3 star categories
          </h2>
          <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
            Indicative European urban refurb benchmarks (NOT new-build · multiply Hard Cost
            by 4–6× for ground-up). Operator overrides per asset in the underwriting workbook.
          </p>
        </div>
      </header>

      {groups.map((g) => (
        <div key={g.id} className="mb-5 last:mb-0">
          <p className="mb-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
            {g.label}
          </p>
          <div className="overflow-x-auto rounded-md border border-slate-800/60">
            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr className="bg-slate-900/60 text-left text-slate-400">
                  <Th className="w-[28%]">Line item</Th>
                  {ROOM_TIERS.flatMap((tier) =>
                    STAR_CATEGORIES.map((cat) => (
                      <Th key={`${tier.id}-${cat.id}`} className="w-[8%] text-right">
                        <span className="block font-headline text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {tier.label}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-300">
                          {cat.label}
                        </span>
                      </Th>
                    )),
                  )}
                </tr>
              </thead>
              <tbody>
                {CAPEX_DEFAULTS.filter((l) => l.group === g.id).map((line) => (
                  <tr key={line.id} className="border-t border-slate-800/60 align-top">
                    <td className="px-2 py-2.5">
                      <p className="font-headline text-[11px] font-bold text-slate-200">{line.label}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] leading-relaxed text-slate-500">
                        {line.description}
                      </p>
                    </td>
                    {ROOM_TIERS.flatMap((tier) =>
                      STAR_CATEGORIES.map((cat) => (
                        <td key={`${line.id}-${tier.id}-${cat.id}`} className="px-2 py-2.5 text-right font-mono text-[11px] text-slate-200">
                          {fmt(line.defaults[tier.id][cat.id])}
                        </td>
                      )),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-md border border-lime-300/30 bg-lime-300/5 p-3">
        <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-lime-300">
          Total CAPEX €/room · all line items
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {ROOM_TIERS.flatMap((tier) =>
            STAR_CATEGORIES.map((cat) => (
              <div key={`total-${tier.id}-${cat.id}`} className="rounded bg-slate-900/60 p-2">
                <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {tier.label.replace("rooms", "rm")} · {cat.label}
                </p>
                <p className="mt-1 font-mono text-[14px] font-extrabold text-lime-200">
                  {fmt(capexTotalForCell(tier.id, cat.id))}
                </p>
              </div>
            )),
          )}
        </div>
      </div>
    </section>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return <th className={`px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ${className ?? ""}`}>{children}</th>;
}

function fmt(n: number): string {
  return new Intl.NumberFormat("es-ES").format(n);
}
