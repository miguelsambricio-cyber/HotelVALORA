"use client";

import { useState } from "react";
import { Construction, RotateCcw } from "lucide-react";
import {
  CAPEX_DEFAULTS,
  ROOM_TIERS,
  STAR_CATEGORIES,
  type CapexLine,
  type RoomTierId,
  type StarCategoryId,
} from "@/lib/admin/financials/defaults";

/**
 * CAPEX defaults matrix · 12 line items · 9 cells (3 key tiers × 3 star
 * categories) · per-row unit selector · all cells editable.
 *
 * State is ephemeral · session-scoped · resets on hard reload. Future
 * Phase D may persist edits per operator or as portfolio defaults.
 */

type CapexUnit = "total" | "per_key" | "per_m2" | "percent";

const UNIT_LABELS: Record<CapexUnit, string> = {
  total: "€ total",
  per_key: "€ per key",
  per_m2: "€ per m²",
  percent: "% total",
};

/** Cell key: `${lineId}::${tierId}::${catId}` · flat keyspace for one Map. */
type CellKey = string;
const cellKey = (lineId: string, tierId: RoomTierId, catId: StarCategoryId): CellKey =>
  `${lineId}::${tierId}::${catId}`;

export function CapexDefaultsCard() {
  // Per-row unit · default per_key (matches the seeded values in defaults.ts).
  const [units, setUnits] = useState<Record<string, CapexUnit>>(() =>
    Object.fromEntries(CAPEX_DEFAULTS.map((l) => [l.id, "per_key" as CapexUnit])),
  );
  // Per-cell value · seeded from defaults.ts.
  const [values, setValues] = useState<Record<CellKey, number>>(() => {
    const out: Record<CellKey, number> = {};
    for (const line of CAPEX_DEFAULTS) {
      for (const tier of ROOM_TIERS) {
        for (const cat of STAR_CATEGORIES) {
          out[cellKey(line.id, tier.id, cat.id)] = line.defaults[tier.id][cat.id];
        }
      }
    }
    return out;
  });

  function setUnit(lineId: string, unit: CapexUnit) {
    setUnits((prev) => ({ ...prev, [lineId]: unit }));
  }

  function setCell(lineId: string, tierId: RoomTierId, catId: StarCategoryId, raw: number) {
    setValues((prev) => ({ ...prev, [cellKey(lineId, tierId, catId)]: raw }));
  }

  function resetRow(line: CapexLine) {
    setUnit(line.id, "per_key");
    setValues((prev) => {
      const next = { ...prev };
      for (const tier of ROOM_TIERS) {
        for (const cat of STAR_CATEGORIES) {
          next[cellKey(line.id, tier.id, cat.id)] = line.defaults[tier.id][cat.id];
        }
      }
      return next;
    });
  }

  /** Sum across all line items per (tier, cat) cell · respects current edits. */
  function totalFor(tier: RoomTierId, cat: StarCategoryId): number {
    return CAPEX_DEFAULTS.reduce(
      (sum, line) => sum + (values[cellKey(line.id, tier, cat)] ?? 0),
      0,
    );
  }

  const groups: Array<{ id: CapexLine["group"]; label: string }> = [
    { id: "hard", label: "Hard cost" },
    { id: "soft", label: "Soft cost" },
    { id: "project", label: "Project costs" },
  ];

  return (
    <section className="rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-4">
        <p className="flex items-center gap-1.5 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          <Construction size={11} />
          CAPEX
        </p>
        <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
          CAPEX
        </h2>
        <p className="mt-1 max-w-3xl font-mono text-[11px] text-slate-400">
          Pick a unit per line · edit cell values inline · session-scoped (resets
          on hard reload). Values default to € per key for European urban refurb.
        </p>
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
                  <Th className="w-[14%]">Unit</Th>
                  <Th className="w-[24%]">Line item</Th>
                  {ROOM_TIERS.flatMap((tier) =>
                    STAR_CATEGORIES.map((cat) => (
                      <Th key={`${tier.id}-${cat.id}`} className="w-[7%] text-right">
                        <span className="block font-headline text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                          {tier.label}
                        </span>
                        <span className="block font-mono text-[10px] text-slate-300">
                          {cat.label}
                        </span>
                      </Th>
                    )),
                  )}
                  <Th className="w-[4%] text-center">·</Th>
                </tr>
              </thead>
              <tbody>
                {CAPEX_DEFAULTS.filter((l) => l.group === g.id).map((line) => (
                  <tr key={line.id} className="border-t border-slate-800/60 align-top">
                    <td className="px-2 py-2.5">
                      <select
                        value={units[line.id]}
                        onChange={(e) => setUnit(line.id, e.target.value as CapexUnit)}
                        className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-1.5 py-1 font-mono text-[10.5px] text-lime-200 focus:border-lime-300/60 focus:outline-none"
                        aria-label={`Unit for ${line.label}`}
                      >
                        {(Object.keys(UNIT_LABELS) as CapexUnit[]).map((u) => (
                          <option key={u} value={u}>{UNIT_LABELS[u]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2.5">
                      <p className="font-headline text-[11px] font-bold text-slate-200">{line.label}</p>
                      <p className="mt-0.5 font-mono text-[9.5px] leading-relaxed text-slate-500">
                        {line.description}
                      </p>
                    </td>
                    {ROOM_TIERS.flatMap((tier) =>
                      STAR_CATEGORIES.map((cat) => {
                        const k = cellKey(line.id, tier.id, cat.id);
                        return (
                          <td key={k} className="px-1 py-2">
                            <input
                              type="number"
                              inputMode="numeric"
                              value={values[k]}
                              min={0}
                              onChange={(e) => {
                                const n = Number(e.target.value);
                                if (Number.isFinite(n) && n >= 0) setCell(line.id, tier.id, cat.id, n);
                              }}
                              className="w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-right font-mono text-[11px] text-slate-200 focus:border-lime-300/40 focus:bg-slate-900/60 focus:outline-none hover:border-slate-700/60"
                              aria-label={`${line.label} · ${tier.label} · ${cat.label}`}
                            />
                          </td>
                        );
                      }),
                    )}
                    <td className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => resetRow(line)}
                        aria-label={`Reset ${line.label} to defaults`}
                        title="Reset row to defaults"
                        className="rounded p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
                      >
                        <RotateCcw size={11} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}

      <div className="mt-4 rounded-md border border-lime-300/30 bg-lime-300/5 p-3">
        <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-lime-300">
          Total raw inputs · sum of cells per (tier, *) · operator owns interpretation when units mixed
        </p>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-9">
          {ROOM_TIERS.flatMap((tier) =>
            STAR_CATEGORIES.map((cat) => (
              <div key={`total-${tier.id}-${cat.id}`} className="rounded bg-slate-900/60 p-2">
                <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.18em] text-slate-500">
                  {tier.label} · {cat.label}
                </p>
                <p className="mt-1 font-mono text-[14px] font-extrabold text-lime-200">
                  {fmt(totalFor(tier.id, cat.id))}
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
  return new Intl.NumberFormat("es-ES").format(Math.round(n));
}
