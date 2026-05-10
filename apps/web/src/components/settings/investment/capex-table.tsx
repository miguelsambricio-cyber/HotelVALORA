"use client";

import { useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CAPEX_TREE,
  CAPEX_UNIT_LABELS,
  useInvestment,
} from "@/lib/investment";
import type { CapexUnit } from "@/lib/investment";

/**
 * Editable CAPEX breakdown table — Hard / Soft / Project Costs.
 * Group rows are clickable to expand/collapse their children. Each line
 * (group + child) carries its own value + unit selector. Top "TOTAL
 * CAPEX" row is always visible with a dark forest-900 surface.
 *
 * Mock data only — values write to the persisted investment store.
 * v2: hydrate from the Excel underwriting workbook by line id.
 */
export function CapexTable() {
  const { criteria, setCapexValue, setCapexUnit } = useInvestment();
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    new Set(CAPEX_TREE.map((g) => g.id)),
  );

  const toggleGroup = (id: string) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalEntry = criteria.capexValues["total-capex"];

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full border-collapse text-left">
        <tbody className="divide-y divide-slate-100 text-xs font-medium text-slate-800">
          {/* TOTAL CAPEX row */}
          <tr className="bg-forest-900 text-white">
            <td className="px-4 py-4 font-bold uppercase tracking-tight">
              Total CAPEX
            </td>
            <td className="px-4 py-4">
              <NumberInput
                value={totalEntry?.value ?? null}
                onChange={(v) => setCapexValue("total-capex", v)}
                placeholder="0.00"
                className="bg-white/95 text-slate-800"
              />
            </td>
            <td className="px-4 py-4">
              <UnitSelect
                value={totalEntry?.unit ?? "total"}
                onChange={(u) => setCapexUnit("total-capex", u)}
                options={["total", "per_room", "per_m2"]}
                inverted
              />
            </td>
          </tr>

          {CAPEX_TREE.map((group) => {
            const isOpen = openGroups.has(group.id);
            const groupEntry = criteria.capexValues[group.id];
            return (
              <FragmentRow key={group.id}>
                {/* Group row */}
                <tr
                  className="cursor-pointer transition-colors hover:bg-forest-900/5"
                  onClick={() => toggleGroup(group.id)}
                >
                  <td className="px-4 py-3 font-bold text-forest-900">
                    <span className="flex items-center gap-2">
                      {isOpen ? (
                        <ChevronDown size={16} className="text-forest-700" />
                      ) : (
                        <ChevronRight size={16} className="text-forest-700" />
                      )}
                      {group.label}
                    </span>
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <NumberInput
                      value={groupEntry?.value ?? null}
                      onChange={(v) => setCapexValue(group.id, v)}
                      className="bg-slate-50"
                    />
                  </td>
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <UnitSelect
                      value={groupEntry?.unit ?? group.defaultUnit}
                      onChange={(u) => setCapexUnit(group.id, u)}
                      options={group.availableUnits}
                    />
                  </td>
                </tr>

                {/* Child rows */}
                {isOpen &&
                  group.children.map((child) => {
                    const childEntry = criteria.capexValues[child.id];
                    return (
                      <tr
                        key={child.id}
                        className="transition-colors hover:bg-white"
                      >
                        <td className="px-10 py-2 italic text-slate-500">
                          {child.label}
                        </td>
                        <td className="px-4 py-2">
                          <NumberInput
                            value={childEntry?.value ?? null}
                            onChange={(v) => setCapexValue(child.id, v)}
                            className="bg-slate-50 text-[10px]"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <UnitSelect
                            value={childEntry?.unit ?? child.defaultUnit}
                            onChange={(u) => setCapexUnit(child.id, u)}
                            options={child.availableUnits}
                          />
                        </td>
                      </tr>
                    );
                  })}
              </FragmentRow>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────

/** React.Fragment doesn't render <tr> directly — use a no-op wrapper */
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

interface NumberInputProps {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
}

function NumberInput({ value, onChange, placeholder, className }: NumberInputProps) {
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.trim();
    if (raw === "") return onChange(null);
    const parsed = parseFloat(raw.replace(",", "."));
    onChange(Number.isNaN(parsed) ? null : parsed);
  };
  return (
    <input
      type="text"
      value={value ?? ""}
      onChange={handleChange}
      placeholder={placeholder}
      className={cn(
        "w-full rounded border border-slate-200 px-3 py-1.5 text-xs text-slate-800",
        "focus:border-blue-500 focus:outline-none focus:ring-0",
        className,
      )}
    />
  );
}

interface UnitSelectProps {
  value: CapexUnit;
  onChange: (u: CapexUnit) => void;
  options: readonly CapexUnit[];
  /** Dark inverted variant for the Total CAPEX row */
  inverted?: boolean;
}

function UnitSelect({ value, onChange, options, inverted }: UnitSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as CapexUnit)}
      className={cn(
        "w-full appearance-none rounded px-2 py-1 text-[10px] font-bold focus:outline-none",
        inverted
          ? "border border-white/20 bg-white/10 text-white"
          : "border border-transparent bg-slate-50 text-slate-700",
      )}
    >
      {options.map((u) => (
        <option key={u} value={u} className="text-slate-800">
          {CAPEX_UNIT_LABELS[u]}
        </option>
      ))}
    </select>
  );
}
