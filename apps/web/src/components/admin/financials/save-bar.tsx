"use client";

import { Check, Save } from "lucide-react";
import { formatSavedAt } from "@/lib/admin/financials/use-overrides";

/**
 * Save bar · header-corner control for drafted-overrides cards.
 * Renders one of three states:
 *   1. Hydrating ("…")
 *   2. Clean (saved or defaults · neutral indicator)
 *   3. Dirty (lime "Save changes" button + "Discard" link)
 */
export function SaveBar({
  isDirty,
  hydrated,
  lastSavedAt,
  onSave,
  onDiscard,
  onReset,
  resetConfirmText,
}: {
  isDirty: boolean;
  hydrated: boolean;
  lastSavedAt: Date | null;
  onSave: () => void;
  onDiscard: () => void;
  onReset: () => void;
  resetConfirmText: string;
}) {
  if (!hydrated) {
    return (
      <span className="rounded-md bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-500 ring-1 ring-slate-700/60">…</span>
    );
  }

  if (isDirty) {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onSave}
          className="inline-flex items-center gap-1.5 rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 shadow-sm hover:bg-lime-200"
        >
          <Save size={11} />
          Save changes
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="font-mono text-[10px] text-slate-500 underline-offset-2 hover:text-amber-200 hover:underline"
        >
          Discard
        </button>
      </div>
    );
  }

  // Clean state · either saved or defaults
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="inline-flex items-center gap-1 rounded-md bg-slate-900/60 px-2 py-1 font-mono text-[10px] text-slate-400 ring-1 ring-slate-700/60">
        <Check size={10} className={lastSavedAt ? "text-lime-300" : "text-slate-600"} />
        {lastSavedAt ? `Saved · ${formatSavedAt(lastSavedAt)}` : "Defaults"}
      </span>
      {lastSavedAt && (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(resetConfirmText)) onReset();
          }}
          className="font-mono text-[10px] text-slate-500 underline-offset-2 hover:text-rose-300 hover:underline"
        >
          Reset all to defaults
        </button>
      )}
    </div>
  );
}
