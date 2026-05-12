"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const STATUSES = ["draft", "running", "paused", "completed", "archived"] as const;
const KINDS = [
  "investor_outreach", "operator_onboarding", "beta_invite",
  "top_promote_rollout", "lender_campaign", "partnership",
  "newsletter", "custom",
] as const;

export function CampaignsFilters({ current }: {
  current: { status: string; kind: string; archived: string; search: string; sort: string };
}) {
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
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Status</span>
        <Chip active={current.status === "all"} onClick={() => update({ status: "all" })} label="All" />
        {STATUSES.map((s) => (
          <Chip
            key={s}
            active={current.status === s}
            onClick={() => update({ status: s })}
            label={s.charAt(0).toUpperCase() + s.slice(1)}
            tone={s === "running" ? "emerald" : s === "paused" ? "amber" : s === "archived" ? "rose" : undefined}
          />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <span className="font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Kind</span>
        <Chip active={current.kind === "all"} onClick={() => update({ kind: "all" })} label="All" />
        {KINDS.map((k) => (
          <Chip key={k} active={current.kind === k} onClick={() => update({ kind: k })} label={prettyKind(k)} />
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-800/60 pt-3">
        <Chip
          active={current.archived === "include"}
          onClick={() => update({ archived: current.archived === "include" ? "exclude" : "include" })}
          label={current.archived === "include" ? "Showing archived" : "Hide archived"}
          tone="amber"
        />
        <span className="ml-auto flex items-center gap-2">
          <span className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">Sort</span>
          <SortChip current={current.sort} value="recent" label="Recent" onUpdate={update} />
          <SortChip current={current.sort} value="name" label="A–Z" onUpdate={update} />
          <SortChip current={current.sort} value="status" label="Status" onUpdate={update} />
        </span>
      </div>
      <div className="mt-3 border-t border-slate-800/60 pt-3">
        <input
          type="search"
          defaultValue={current.search}
          placeholder="Search by name or slug"
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

function prettyKind(k: string): string {
  return k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function Chip({ active, onClick, label, tone }: {
  active: boolean; onClick: () => void; label: string;
  tone?: "emerald" | "amber" | "rose";
}) {
  const t =
    tone === "emerald" ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
    : tone === "amber" ? "bg-amber-500/20 text-amber-200 ring-amber-500/40"
    : tone === "rose" ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
    : "bg-lime-300/20 text-lime-200 ring-lime-300/40";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        active ? t : "bg-slate-900/60 text-slate-400 ring-slate-700/60 hover:text-slate-200",
      )}
    >
      {label}
    </button>
  );
}

function SortChip({
  current, value, label, onUpdate,
}: {
  current: string; value: string; label: string;
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
