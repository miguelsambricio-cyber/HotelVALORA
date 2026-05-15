"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * URL-driven filter chip strip · server reads searchParams · no client
 * state. Each chip click pushes new searchParams · server re-renders.
 *
 * Quick filters cover the institutional priorities the operator
 * explicitly asked for: Active · Strategic · Investors · Operators ·
 * Lenders · Recently active · plus the "Show invalid" escape hatch.
 */
export interface ContactsFiltersProps {
  current: {
    band: string;
    investor_type: string;
    hide_invalid: boolean;
    recently_active_only: boolean;
    search: string;
    sort: string;
  };
}

export function ContactsFilters({ current }: ContactsFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [, startTransition] = useTransition();

  function update(patch: Record<string, string | boolean | undefined>): void {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === "" || v === false || v === "all") {
        next.delete(k);
      } else if (typeof v === "boolean") {
        next.set(k, "1");
      } else {
        next.set(k, v);
      }
    }
    next.delete("page"); // reset pagination on filter change
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Band
        </span>
        <Chip
          active={current.band === "all"}
          onClick={() => update({ band: "all" })}
          label="All"
        />
        <Chip
          active={current.band === "active"}
          onClick={() => update({ band: "active" })}
          label="Active"
          tone="emerald"
        />
        <Chip
          active={current.band === "strategic"}
          onClick={() => update({ band: "strategic" })}
          label="Strategic"
          tone="emerald"
        />
        <Chip
          active={current.band === "warm"}
          onClick={() => update({ band: "warm" })}
          label="Warm"
          tone="amber"
        />
        <Chip
          active={current.band === "cold"}
          onClick={() => update({ band: "cold" })}
          label="Cold"
        />
        <Chip
          active={current.band === "dormant"}
          onClick={() => update({ band: "dormant" })}
          label="Dormant"
          tone="rose"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Relationship type
        </span>
        <Chip
          active={current.investor_type === "all"}
          onClick={() => update({ investor_type: "all" })}
          label="All"
        />
        {([
          ["principals",   "Principals"],
          ["broker",       "Broker"],
          ["lender",       "Lender"],
          ["operator",     "Operator"],
          ["developer",    "Developer"],
          ["hotel_supply", "Hotel Supply"],
          ["ia_supply",    "IA Supply"],
        ] as Array<[string, string]>).map(([value, label]) => (
          <Chip
            key={value}
            active={current.investor_type === value}
            onClick={() => update({ investor_type: value })}
            label={label}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Quality + Sort
        </span>
        <ToggleChip
          on={!current.hide_invalid}
          onToggle={() => update({ hide_invalid: current.hide_invalid })}
          labelOn="Showing invalid"
          labelOff="Hide invalid"
        />
        <ToggleChip
          on={current.recently_active_only}
          onToggle={() => update({ recently_active_only: !current.recently_active_only })}
          labelOn="Recently active · 90d"
          labelOff="Recently active · 90d"
        />
        <span className="ml-auto flex items-center gap-2">
          <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
            Sort
          </span>
          <SortChip current={current.sort} value="collab" label="Collab" onUpdate={update} />
          <SortChip current={current.sort} value="strength" label="Strength" onUpdate={update} />
          <SortChip current={current.sort} value="last_email" label="Recent" onUpdate={update} />
          <SortChip current={current.sort} value="name" label="A–Z" onUpdate={update} />
        </span>
      </div>

      <div className="mt-3 border-t border-slate-800/60 pt-3">
        <input
          type="search"
          defaultValue={current.search}
          placeholder="Search name · email · company"
          onChange={(e) => {
            const value = e.currentTarget.value;
            const timer = setTimeout(() => update({ search: value }), 350);
            return () => clearTimeout(timer);
          }}
          className="w-full rounded-md border border-slate-700 bg-slate-900/60 px-3 py-2 font-mono text-[12px] text-slate-200 placeholder:text-slate-500 focus:border-lime-300/50 focus:outline-none"
        />
      </div>
    </section>
  );
}

function Chip({
  active,
  onClick,
  label,
  tone,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const activeTone =
    tone === "emerald"
      ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
      : tone === "amber"
        ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
        : tone === "rose"
          ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
          : "bg-lime-300/20 text-lime-200 ring-lime-300/40";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        active ? activeTone : "bg-slate-900/60 text-slate-400 ring-slate-700/60 hover:text-slate-200 hover:ring-slate-500/60",
      )}
    >
      {label}
    </button>
  );
}

function ToggleChip({
  on,
  onToggle,
  labelOn,
  labelOff,
}: {
  on: boolean;
  onToggle: () => void;
  labelOn: string;
  labelOff: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        on
          ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
          : "bg-slate-900/60 text-slate-400 ring-slate-700/60 hover:text-slate-200",
      )}
    >
      {on ? labelOn : labelOff}
    </button>
  );
}

function SortChip({
  current,
  value,
  label,
  onUpdate,
}: {
  current: string;
  value: string;
  label: string;
  onUpdate: (patch: Record<string, string | boolean | undefined>) => void;
}) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onUpdate({ sort: active ? "collab" : value })}
      className={cn(
        "inline-flex items-center rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        active
          ? "bg-lime-300/20 text-lime-200 ring-lime-300/40"
          : "bg-slate-900/60 text-slate-400 ring-slate-700/60 hover:text-slate-200",
      )}
    >
      {label}
    </button>
  );
}
