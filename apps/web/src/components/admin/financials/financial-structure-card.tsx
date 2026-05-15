import { Building2 } from "lucide-react";
import { FINANCIAL_STRUCTURE_DEFAULTS } from "@/lib/admin/financials/defaults";

/**
 * Basic financial structure · institutional baseline assumptions.
 * Hold · LTV · cap rate · IRR target · fees.
 */
export function FinancialStructureCard() {
  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4">
        <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          <Building2 size={11} />
          Financial structure
        </p>
        <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
          Institutional baseline · capital stack · target returns
        </h2>
        <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
          Default assumptions for European value-add hospitality. Per-asset overrides
          live in the underwriting workbook · these power the screening scenario only.
        </p>
      </header>

      <div className="overflow-x-auto rounded-md border border-slate-800/60">
        <table className="w-full border-collapse text-[11.5px]">
          <thead>
            <tr className="bg-slate-900/60 text-left text-slate-400">
              <th className="w-[28%] px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">
                Parameter
              </th>
              <th className="w-[18%] px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">
                Value
              </th>
              <th className="w-[10%] px-3 py-2 text-right font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">
                Unit
              </th>
              <th className="px-3 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em]">
                Notes
              </th>
            </tr>
          </thead>
          <tbody>
            {FINANCIAL_STRUCTURE_DEFAULTS.map((line) => (
              <tr key={line.id} className="border-t border-slate-800/60">
                <td className="px-3 py-2.5 font-headline text-[11px] font-bold text-slate-100">{line.label}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[12px] font-extrabold text-lime-200">{line.value}</td>
                <td className="px-3 py-2.5 text-right font-mono text-[10.5px] text-slate-400">{line.unit ?? ""}</td>
                <td className="px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-slate-400">{line.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
