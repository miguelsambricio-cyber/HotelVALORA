"use client";

import { Building2 } from "lucide-react";
import { FINANCIAL_STRUCTURE_DEFAULTS } from "@/lib/admin/financials/defaults";
import { useDraftedOverrides } from "@/lib/admin/financials/use-overrides";
import { SaveBar } from "./save-bar";

/**
 * Basic financial structure · institutional baseline assumptions.
 * Hold · LTV · cap rate · IRR target · fees.
 *
 * Operator can edit the `value` cell of every row · label / unit /
 * description stay read-only (canonical taxonomy). Edits go to a draft
 * · explicit Save button commits to localStorage.
 */

type FinStructState = Record<string, string>; // id → value override

function buildDefaultFinStructState(): FinStructState {
  const out: FinStructState = {};
  for (const line of FINANCIAL_STRUCTURE_DEFAULTS) out[line.id] = line.value;
  return out;
}

export function FinancialStructureCard() {
  const ov = useDraftedOverrides<FinStructState>(
    "admin.financials.structure.v1",
    buildDefaultFinStructState(),
  );

  function setValue(id: string, value: string) {
    ov.setDraft((prev) => ({ ...prev, [id]: value }));
  }

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div>
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
        </div>
        <SaveBar
          isDirty={ov.isDirty}
          hydrated={ov.hydrated}
          lastSavedAt={ov.lastSavedAt}
          onSave={ov.save}
          onDiscard={ov.discard}
          onReset={ov.reset}
          resetConfirmText="Reset ALL Financial structure overrides and clear local storage?"
        />
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
            {FINANCIAL_STRUCTURE_DEFAULTS.map((line) => {
              const v = ov.draft[line.id] ?? line.value;
              return (
                <tr key={line.id} className="border-t border-slate-800/60">
                  <td className="px-3 py-2.5 font-headline text-[11px] font-bold text-slate-100">{line.label}</td>
                  <td className="px-2 py-1.5 text-right">
                    <input
                      key={`${line.id}-${v}`}
                      type="text"
                      defaultValue={v}
                      onBlur={(e) => setValue(line.id, e.target.value.trim())}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                        if (e.key === "Escape") {
                          (e.target as HTMLInputElement).value = v;
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-mono text-[12px] font-extrabold text-lime-200 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none hover:border-slate-700/60"
                      aria-label={`Value for ${line.label}`}
                    />
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono text-[10.5px] text-slate-400">{line.unit ?? ""}</td>
                  <td className="px-3 py-2.5 font-mono text-[10.5px] leading-relaxed text-slate-400">{line.description}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
