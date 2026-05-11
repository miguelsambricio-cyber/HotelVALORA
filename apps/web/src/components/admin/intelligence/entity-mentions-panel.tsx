import { Building2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { EntityMentionsRow } from "@/lib/admin/intelligence";

/**
 * Trending entities panel — investors + operators ranked by mentions
 * in the last 7d. The "who is moving" view alongside the "what" view.
 */
export function EntityMentionsPanel({ rows }: { rows: EntityMentionsRow[] }) {
  const investors = rows.filter((r) => r.kind === "investor").sort((a, b) => b.mentions7d - a.mentions7d);
  const operators = rows.filter((r) => r.kind === "operator").sort((a, b) => b.mentions7d - a.mentions7d);
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="border-b border-slate-800/60 px-5 py-3.5">
        <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
          Trending Entities · 7d
        </h3>
      </header>
      <div className="grid divide-y divide-slate-800/60 md:grid-cols-2 md:divide-x md:divide-y-0">
        <Column icon={<Users size={12} aria-hidden />} title="Investors / Capital" rows={investors} />
        <Column icon={<Building2 size={12} aria-hidden />} title="Operators / Brands" rows={operators} />
      </div>
    </section>
  );
}

function Column({
  icon,
  title,
  rows,
}: {
  icon: React.ReactNode;
  title: string;
  rows: EntityMentionsRow[];
}) {
  return (
    <div className="p-5">
      <p className="mb-3 flex items-center gap-2 font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        <span className="text-slate-400">{icon}</span>
        {title}
      </p>
      <ul className="space-y-2.5">
        {rows.length === 0 ? (
          <li className="text-[13px] text-slate-500">No mentions in the window.</li>
        ) : (
          rows.map((r, i) => (
            <li key={i} className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="font-mono text-[10.5px] text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className="truncate font-headline text-[13px] font-extrabold text-white">{r.name}</p>
                  <p className="font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
                    Last seen · {formatRelativeUtc(r.lastSeenAt)} · role {r.role.replace("_", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[12px] text-lime-300">{r.mentions7d}</span>
                <span className={cn("font-mono text-[10px]", r.trend.startsWith("+") ? "text-emerald-400" : r.trend === "stable" ? "text-slate-500" : "text-rose-400")}>
                  {r.trend}
                </span>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

function formatRelativeUtc(iso: string): string {
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "—";
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
