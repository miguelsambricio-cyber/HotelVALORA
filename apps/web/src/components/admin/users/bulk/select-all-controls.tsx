"use client";

import { useUsersBulkSelection } from "./bulk-selection-context";
import { cn } from "@/lib/utils";

export function UsersSelectAllControls({
  pageIds,
  filteredTotal,
}: {
  pageIds: string[];
  filteredTotal: number;
}) {
  const sel = useUsersBulkSelection();
  const pageAllSelected = pageIds.length > 0 && pageIds.every((id) => sel.isSelected(id));
  const filteredOn = sel.mode === "filtered";

  return (
    <div className="flex flex-wrap items-center gap-2 px-2 pb-2 text-[10.5px]">
      <Btn
        active={!filteredOn && pageAllSelected}
        onClick={() => (pageAllSelected ? sel.clearPage(pageIds) : sel.selectPage(pageIds))}
        label={pageAllSelected ? `Clear page (${pageIds.length})` : `Select page (${pageIds.length})`}
      />
      <Btn
        active={filteredOn}
        onClick={() => (filteredOn ? sel.clear() : sel.selectFiltered())}
        label={
          filteredOn
            ? `All filtered selected · ${filteredTotal.toLocaleString()}`
            : `Select all filtered (~${filteredTotal.toLocaleString()})`
        }
        tone="lime"
      />
      {sel.count > 0 && (
        <button
          type="button"
          onClick={sel.clear}
          className="ml-2 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 hover:text-slate-300"
        >
          clear all
        </button>
      )}
      <span className="ml-auto font-mono text-[10.5px] text-slate-400">
        {sel.count} selected
      </span>
    </div>
  );
}

function Btn({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "lime";
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        active
          ? (tone === "lime"
              ? "bg-lime-300/30 text-lime-100 ring-lime-300/50"
              : "bg-emerald-500/20 text-emerald-100 ring-emerald-500/40")
          : "bg-slate-800/60 text-slate-300 ring-slate-700/60 hover:text-slate-100",
      )}
    >
      {label}
    </button>
  );
}
