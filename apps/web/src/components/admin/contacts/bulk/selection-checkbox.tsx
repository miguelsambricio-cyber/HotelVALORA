"use client";

import { useBulkSelection } from "./bulk-selection-context";

/**
 * Per-row checkbox. Reads + writes selection state via context. When
 * `filtered` mode is on, every row is implicitly selected so the
 * checkbox renders disabled-checked to communicate the override.
 */
export function SelectionCheckbox({ id }: { id: string }) {
  const sel = useBulkSelection();
  const filtered = sel.mode === "filtered";
  const checked = filtered || sel.isSelected(id);
  return (
    <label className="inline-flex cursor-pointer items-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={checked}
        disabled={filtered}
        onChange={() => sel.toggle(id)}
        aria-label={`Select contact ${id}`}
        className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-900/60 text-lime-300 focus:ring-1 focus:ring-lime-300 disabled:opacity-60"
      />
    </label>
  );
}
