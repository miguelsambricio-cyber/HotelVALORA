"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export interface UsersFiltersProps {
  current: {
    invitation_status: string;
    tier: string;
    linked_only: boolean;
    search: string;
    sort: string;
  };
}

const STATUSES = ["invited", "onboarding", "active", "inactive", "churn_risk"] as const;
const TIERS = ["free", "pro", "premium", "team", "enterprise"] as const;

export function UsersFilters({ current }: UsersFiltersProps) {
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
    next.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Status
        </span>
        <Chip
          active={current.invitation_status === "all"}
          onClick={() => update({ invitation_status: "all" })}
          label="All"
        />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            active={current.invitation_status === s}
            onClick={() => update({ invitation_status: s })}
            label={s === "churn_risk" ? "Churn risk" : s.charAt(0).toUpperCase() + s.slice(1)}
            tone={
              s === "active" || s === "onboarding" ? "emerald"
              : s === "invited" ? "lime"
              : s === "inactive" ? "amber"
              : "rose"
            }
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Plan
        </span>
        <Chip
          active={current.tier === "all"}
          onClick={() => update({ tier: "all" })}
          label="All"
        />
        {TIERS.map((t) => (
          <Chip
            key={t}
            active={current.tier === t}
            onClick={() => update({ tier: t })}
            label={t.charAt(0).toUpperCase() + t.slice(1)}
          />
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
          Sort
        </span>
        <Chip
          active={current.linked_only}
          onClick={() => update({ linked_only: !current.linked_only })}
          label={current.linked_only ? "Linked from contacts only" : "Linked from contacts"}
          tone="lime"
        />
        <span className="ml-auto flex items-center gap-2">
          <SortChip current={current.sort} value="recent" label="Recent" onUpdate={update} />
          <SortChip current={current.sort} value="last_seen" label="Last seen" onUpdate={update} />
          <SortChip current={current.sort} value="name" label="A–Z" onUpdate={update} />
          <SortChip current={current.sort} value="tier" label="Tier" onUpdate={update} />
        </span>
      </div>

      <div className="mt-3 border-t border-slate-800/60 pt-3">
        <input
          type="search"
          defaultValue={current.search}
          placeholder="Search name · email"
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
  tone?: "emerald" | "amber" | "rose" | "lime";
}) {
  const activeTone =
    tone === "emerald" ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
    : tone === "amber"   ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
    : tone === "rose"    ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
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
      onClick={() => onUpdate({ sort: active ? "recent" : value })}
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
