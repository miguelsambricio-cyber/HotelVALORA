import Link from "next/link";
import { Link as LinkIcon, Mail } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UserRow } from "@/lib/admin/users/live";
import { UsersSelectionCheckbox } from "@/components/admin/users/bulk/selection-checkbox";

export function UsersTable({
  rows,
  total,
  page,
  pageSize,
}: {
  rows: UserRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
      <header className="mb-3 flex items-center justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
          Users · {rows.length} of {total}
        </p>
        <p className="font-mono text-[10.5px] text-slate-400">
          page {page + 1} of {Math.max(1, Math.ceil(total / pageSize))}
        </p>
      </header>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-slate-700/50 bg-slate-900/40 p-4 text-[12px] leading-relaxed text-slate-400">
          No platform users match the current filters. HOTELVALORA is in
          public beta — the first onboarded operators land here as invites
          + signups flow through the campaigns layer.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="text-left text-slate-500">
                <Th></Th>
                <Th>User</Th>
                <Th>Company / Org</Th>
                <Th>Role</Th>
                <Th>Linked contact</Th>
                <Th right>Status</Th>
                <Th right>Tier</Th>
                <Th right>Subscription</Th>
                <Th>Promo</Th>
                <Th right>Last seen</Th>
                <Th right>Created</Th>
                <Th>Owner</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => <Row key={u.id} user={u} />)}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({ children, right }: { children?: React.ReactNode; right?: boolean }) {
  return (
    <th
      className={cn(
        "px-2 py-2 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em]",
        right && "text-right",
      )}
    >
      {children}
    </th>
  );
}

function Row({ user }: { user: UserRow }) {
  const name = user.full_name || user.email.split("@")[0];
  const expiringSoon = user.subscription_current_period_end
    ? new Date(user.subscription_current_period_end).getTime() - Date.now() < 7 * 86_400_000
    : false;
  return (
    <tr className={cn(
      "border-t border-slate-800/60 align-top",
      expiringSoon && user.subscription_status === "active" && "ring-1 ring-inset ring-amber-500/30",
    )}>
      <td className="px-2 py-3 align-middle">
        <UsersSelectionCheckbox id={user.id} />
      </td>
      <td className="px-2 py-3">
        <p className="font-headline font-bold text-white">{name}</p>
        <a
          href={`mailto:${user.email}`}
          className="mt-0.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-lime-300/80 hover:text-lime-200"
        >
          <Mail size={9} aria-hidden /> {user.email}
        </a>
      </td>
      <td className="px-2 py-3">
        <p className="font-headline text-[11.5px] font-bold text-slate-200">
          {user.organization_name || "—"}
        </p>
        {user.organization_plan && (
          <p className="mt-0.5 font-mono text-[10px] text-slate-500">
            org plan: {user.organization_plan}
          </p>
        )}
      </td>
      <td className="px-2 py-3">
        <span className="inline-flex items-center rounded bg-slate-800/60 px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] text-slate-300 ring-1 ring-slate-700/60">
          {user.role}
        </span>
      </td>
      <td className="px-2 py-3">
        {user.linked_contact_id ? (
          <Link
            href={`/user/admin/contacts?selected=${user.linked_contact_id}`}
            className="inline-flex flex-col items-start text-left"
          >
            <span className="inline-flex items-center gap-1 font-headline text-[11px] font-bold text-emerald-200 hover:text-emerald-100">
              <LinkIcon size={9} /> {user.linked_contact_full_name || user.linked_contact_master_id || "linked"}
            </span>
            {user.linked_contact_company && (
              <span className="font-mono text-[10px] text-slate-500">
                {user.linked_contact_company}
              </span>
            )}
          </Link>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">unlinked</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <InvitationBadge status={user.invitation_status} />
      </td>
      <td className="px-2 py-3 text-right">
        <TierBadge tier={user.tier} />
      </td>
      <td className="px-2 py-3 text-right">
        {user.subscription_status ? (
          <div>
            <p className="font-mono text-[11px] text-slate-300">{user.subscription_tier}</p>
            <p className="mt-0.5 font-mono text-[9.5px] text-slate-500">{user.subscription_status}</p>
            {user.subscription_current_period_end && (
              <p className={cn(
                "mt-0.5 font-mono text-[9.5px]",
                expiringSoon ? "text-amber-300" : "text-slate-500",
              )}>
                exp · {user.subscription_current_period_end.slice(0, 10)}
              </p>
            )}
          </div>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
      <td className="px-2 py-3">
        {user.promo_code ? (
          <span className="inline-flex items-center rounded bg-lime-300/15 px-2 py-0.5 font-mono text-[10px] text-lime-200 ring-1 ring-lime-300/30">
            {user.promo_code}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
      <td className="px-2 py-3 text-right">
        <span className="font-mono text-[10.5px] text-slate-400">
          {user.last_seen_at ? user.last_seen_at.slice(0, 10) : "—"}
        </span>
      </td>
      <td className="px-2 py-3 text-right">
        <span className="font-mono text-[10.5px] text-slate-400">
          {user.created_at.slice(0, 10)}
        </span>
      </td>
      <td className="px-2 py-3">
        {user.relationship_owner_email ? (
          <span className="font-mono text-[10px] text-slate-400">
            {user.relationship_owner_email}
          </span>
        ) : (
          <span className="font-mono text-[10px] text-slate-600">—</span>
        )}
      </td>
    </tr>
  );
}

function InvitationBadge({ status }: { status: UserRow["invitation_status"] }) {
  const tone = (() => {
    switch (status) {
      case "active":
        return "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40";
      case "onboarding":
        return "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30";
      case "invited":
        return "bg-lime-300/20 text-lime-200 ring-lime-300/40";
      case "inactive":
        return "bg-amber-500/15 text-amber-200 ring-amber-500/40";
      case "churn_risk":
        return "bg-rose-500/20 text-rose-200 ring-rose-500/40";
      default:
        return "bg-slate-700/40 text-slate-300 ring-slate-600/40";
    }
  })();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {status === "churn_risk" ? "churn risk" : status}
    </span>
  );
}

function TierBadge({ tier }: { tier: UserRow["tier"] }) {
  const tone = (() => {
    switch (tier) {
      case "enterprise":
      case "team":
        return "bg-emerald-500/20 text-emerald-200 ring-emerald-500/40";
      case "premium":
        return "bg-lime-300/20 text-lime-200 ring-lime-300/40";
      case "pro":
        return "bg-slate-700/40 text-slate-200 ring-slate-600/40";
      default:
        return "bg-slate-800/60 text-slate-400 ring-slate-700/60";
    }
  })();
  return (
    <span
      className={cn(
        "inline-flex items-center rounded px-1.5 py-0.5 font-headline text-[9.5px] font-bold uppercase tracking-[0.18em] ring-1",
        tone,
      )}
    >
      {tier}
    </span>
  );
}
