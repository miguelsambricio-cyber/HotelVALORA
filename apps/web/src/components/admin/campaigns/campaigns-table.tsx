import Link from "next/link";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignRow } from "@/lib/admin/campaigns/live";

export function CampaignsTable({
  rows,
  total,
  page,
  pageSize,
  selectedId,
  baseSearchParams,
}: {
  rows: CampaignRow[];
  total: number;
  page: number;
  pageSize: number;
  selectedId: string | null;
  baseSearchParams: string;
}) {
  const sep = baseSearchParams ? "&" : "";
  const newHref = `/user/admin/campaigns?${baseSearchParams}${sep}selected=new`;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Campaigns · {rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10.5px] text-slate-400">
            page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <Link
            href={newHref}
            className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-2 py-1 font-headline text-[10px] font-extrabold uppercase tracking-[0.18em] text-forest-900 hover:bg-lime-200"
          >
            <Plus size={11} /> New
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
          No campaigns match the filter. Create the first campaign with the New button above.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                <Th>Name</Th>
                <Th>Kind</Th>
                <Th>Status</Th>
                <Th>Owner</Th>
                <Th right>Sent</Th>
                <Th right>Converted</Th>
                <Th right>Failed</Th>
                <Th right>Active subs</Th>
                <Th right>Created</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => (
                <Row
                  key={c.id}
                  row={c}
                  selected={selectedId === c.id}
                  baseSearchParams={baseSearchParams}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th className={cn("px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]", right && "text-right")}>
      {children}
    </th>
  );
}

function Row({ row, selected, baseSearchParams }: {
  row: CampaignRow; selected: boolean; baseSearchParams: string;
}) {
  const sep = baseSearchParams ? "&" : "";
  const detailHref = `/user/admin/campaigns?${baseSearchParams}${sep}selected=${row.id}`;
  return (
    <tr className={cn(
      "border-t border-slate-800/60 align-top transition-colors",
      selected ? "bg-lime-300/10" : "hover:bg-slate-800/30 focus-within:bg-slate-800/30",
    )}>
      <td className="px-2 py-3">
        <Link href={detailHref} scroll={false} className="block focus:outline-none">
          <p className="font-headline font-bold text-white hover:text-lime-200">{row.name}</p>
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">{row.slug}</p>
        </Link>
      </td>
      <td className="px-2 py-3 font-mono text-[10.5px] text-slate-300">{prettyKind(row.kind)}</td>
      <td className="px-2 py-3"><StatusBadge status={row.status} archived={!!row.archived_at} /></td>
      <td className="px-2 py-3 font-mono text-[10.5px] text-slate-400">{row.owner_email ?? "—"}</td>
      <td className="px-2 py-3 text-right font-mono text-[11px] text-slate-300">{row.invitations_active}</td>
      <td className="px-2 py-3 text-right font-mono text-[11px] text-emerald-300">{row.invitations_converted}</td>
      <td className="px-2 py-3 text-right font-mono text-[11px] text-rose-300">{row.invitations_failed}</td>
      <td className="px-2 py-3 text-right font-mono text-[11px] text-lime-300">{row.subscriptions_active}</td>
      <td className="px-2 py-3 text-right font-mono text-[10px] text-slate-500">{row.created_at.slice(0,10)}</td>
    </tr>
  );
}

function prettyKind(k: string): string {
  return k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function StatusBadge({ status, archived }: { status: string; archived: boolean }) {
  const tone =
    archived ? "bg-slate-700/40 text-slate-400 ring-slate-600/40"
    : status === "running" ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
    : status === "draft" ? "bg-lime-300/20 text-lime-200 ring-lime-300/40"
    : status === "paused" ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
    : status === "completed" ? "bg-slate-700/40 text-slate-300 ring-slate-600/40"
    : status === "archived" ? "bg-slate-700/40 text-slate-400 ring-slate-600/40"
    : "bg-slate-700/40 text-slate-300 ring-slate-600/40";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1", tone)}>
      {archived ? "archived" : status}
    </span>
  );
}
