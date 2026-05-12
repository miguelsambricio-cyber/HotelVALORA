import Link from "next/link";
import { Plus, Mail, Megaphone } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionRow } from "@/lib/admin/subscriptions/live";

export function SubscriptionsTable({
  rows,
  total,
  page,
  pageSize,
  selectedId,
  baseSearchParams,
}: {
  rows: SubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  selectedId: string | null;
  baseSearchParams: string;
}) {
  const sep = baseSearchParams ? "&" : "";
  const newHref = `/user/admin/subscriptions?${baseSearchParams}${sep}selected=new`;
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Subscriptions · {rows.length} of {total}
        </p>
        <div className="flex items-center gap-2">
          <p className="font-mono text-[10.5px] text-slate-400">
            page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
          </p>
          <Link
            href={newHref}
            className="inline-flex items-center gap-1 rounded-md bg-lime-300 px-2 py-1 font-headline text-[10px] font-extrabold uppercase tracking-[0.18em] text-forest-900 hover:bg-lime-200"
          >
            <Plus size={11} /> Assign
          </Link>
        </div>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
          No subscriptions match the filter. Use Assign to grant a tier to an existing user (Free / Pro / Premium /
          Top Promote / Comped).
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                <Th>User</Th>
                <Th>Tier</Th>
                <Th>Status</Th>
                <Th right>Expires</Th>
                <Th>Source campaign</Th>
                <Th>Assigned by</Th>
                <Th right>Created</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => (
                <Row
                  key={s.id}
                  row={s}
                  selected={selectedId === s.id}
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
  row: SubscriptionRow; selected: boolean; baseSearchParams: string;
}) {
  const sep = baseSearchParams ? "&" : "";
  const detailHref = `/user/admin/subscriptions?${baseSearchParams}${sep}selected=${row.id}`;
  const displayName = row.user_full_name || row.user_email?.split("@")[0] || row.user_id.slice(0, 8);
  return (
    <tr className={cn(
      "border-t border-slate-800/60 align-top transition-colors",
      selected ? "bg-lime-300/10" : "hover:bg-slate-800/30 focus-within:bg-slate-800/30",
    )}>
      <td className="px-2 py-3">
        <Link href={detailHref} scroll={false} className="block focus:outline-none">
          <p className="font-headline font-bold text-white hover:text-lime-200">{displayName}</p>
          {row.user_email && (
            <p className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10px] text-slate-500">
              <Mail size={9} /> {row.user_email}
            </p>
          )}
        </Link>
      </td>
      <td className="px-2 py-3"><TierBadge tier={row.tier} /></td>
      <td className="px-2 py-3"><StatusBadge status={row.status} /></td>
      <td className="px-2 py-3 text-right font-mono text-[10.5px] text-slate-400">
        {row.expires_at ? row.expires_at.slice(0, 10) : (row.current_period_end ? row.current_period_end.slice(0, 10) : "—")}
      </td>
      <td className="px-2 py-3">
        {row.source_campaign_name ? (
          <Link
            href={`/user/admin/campaigns?selected=${row.source_campaign_id}`}
            className="inline-flex items-center gap-1 font-mono text-[10.5px] text-emerald-200 hover:text-emerald-100"
          >
            <Megaphone size={10} /> {row.source_campaign_name}
          </Link>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">direct</span>
        )}
      </td>
      <td className="px-2 py-3 font-mono text-[10.5px] text-slate-400">{row.assigned_by_email ?? "—"}</td>
      <td className="px-2 py-3 text-right font-mono text-[10px] text-slate-500">{row.created_at.slice(0, 10)}</td>
    </tr>
  );
}

function TierBadge({ tier }: { tier: SubscriptionRow["tier"] }) {
  const tone = (() => {
    switch (tier) {
      case "enterprise":
      case "team": return "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40";
      case "premium":
      case "top_promote": return "bg-lime-300/20 text-lime-200 ring-lime-300/40";
      case "comped": return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
      case "pro": return "bg-slate-700/40 text-slate-200 ring-slate-600/40";
      default: return "bg-slate-800/60 text-slate-400 ring-slate-700/60";
    }
  })();
  const label = tier === "top_promote" ? "Top Promote" : tier.charAt(0).toUpperCase() + tier.slice(1);
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1", tone)}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: SubscriptionRow["status"] }) {
  const tone =
    status === "active" ? "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40"
    : status === "trialing" ? "bg-lime-300/20 text-lime-200 ring-lime-300/40"
    : status === "past_due" ? "bg-amber-500/15 text-amber-200 ring-amber-500/40"
    : status === "expired" ? "bg-rose-500/20 text-rose-200 ring-rose-500/40"
    : status === "canceled" ? "bg-slate-700/40 text-slate-400 ring-slate-600/40"
    : "bg-slate-800/60 text-slate-300 ring-slate-700/60";
  return (
    <span className={cn("inline-flex items-center rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1", tone)}>
      {status === "past_due" ? "past due" : status}
    </span>
  );
}
