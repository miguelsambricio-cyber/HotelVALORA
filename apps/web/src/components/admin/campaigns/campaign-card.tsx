import Link from "next/link";
import { Megaphone, Sparkles, Users2, CheckCircle2, AlertCircle, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignRow } from "@/lib/admin/campaigns/live";

/**
 * Phase 2.D.7 · Campaign card.
 *
 * Visual operational card. Replaces the table-row primary view.
 * Compact funnel metrics (sent · converted · failed · attributed
 * subs), kind/status badges, owner, promo tag, mobile-first tap target.
 */
export function CampaignCard({
  campaign,
  editHref,
}: {
  campaign: CampaignRow;
  editHref: string;
}) {
  const tone = statusTone(campaign.status, !!campaign.archived_at);

  return (
    <Link
      href={editHref}
      scroll={false}
      className={cn(
        "group relative flex flex-col rounded-2xl border bg-white shadow-sm transition-all",
        "hover:-translate-y-0.5 hover:shadow-lg",
        tone.border,
      )}
    >
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={cn("font-headline text-[10px] font-extrabold uppercase tracking-[0.25em]", tone.label)}>
              {prettyKind(campaign.kind)}
            </p>
            <h3 className="mt-1 truncate font-headline text-lg font-extrabold tracking-tight text-forest-900">
              {campaign.name}
            </h3>
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">{campaign.slug}</p>
          </div>
          <StatusPill status={campaign.status} archived={!!campaign.archived_at} />
        </div>

        {campaign.description && (
          <p className="mt-3 line-clamp-2 text-[12.5px] leading-snug text-slate-600">
            {campaign.description}
          </p>
        )}

        {/* Funnel quick-strip */}
        <dl className="mt-4 grid grid-cols-4 gap-1.5 border-t border-slate-100 pt-3">
          <Metric icon={<Megaphone size={11} />} label="Active" value={campaign.invitations_active} tone="neutral" />
          <Metric icon={<CheckCircle2 size={11} />} label="Converted" value={campaign.invitations_converted} tone="ok" />
          <Metric icon={<AlertCircle size={11} />} label="Failed" value={campaign.invitations_failed} tone="error" />
          <Metric icon={<Users2 size={11} />} label="Subs" value={campaign.subscriptions_active} tone="lime" />
        </dl>

        {/* Footer chips */}
        <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
          {campaign.owner_email && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              owner · {truncate(campaign.owner_email, 24)}
            </span>
          )}
          {campaign.channel && campaign.channel !== "email" && (
            <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
              {campaign.channel}
            </span>
          )}
          {campaign.conversion_target && campaign.conversion_target > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-1.5 py-0.5 font-mono text-[10px] text-emerald-800">
              target · {campaign.conversion_target}
            </span>
          )}
          <span className="ml-auto inline-flex items-center gap-1 font-headline text-[9.5px] font-bold uppercase tracking-[0.2em] text-slate-400 transition-colors group-hover:text-forest-900">
            <Pencil size={9} /> Manage
          </span>
        </div>
      </div>
    </Link>
  );
}

export function NewCampaignCard({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="group flex min-h-[240px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 p-6 text-center transition-colors hover:border-lime-400 hover:bg-lime-50/60"
    >
      <div className="rounded-full bg-forest-900 p-3 text-lime-300 shadow-sm transition-transform group-hover:scale-110">
        <Sparkles size={20} />
      </div>
      <p className="mt-3 font-headline text-[13px] font-extrabold uppercase tracking-[0.2em] text-forest-900">
        New campaign
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        Investor outreach · operator onboarding · beta invite · Top Promote rollout · partnership · custom
      </p>
    </Link>
  );
}

function Metric({
  icon, label, value, tone,
}: {
  icon: React.ReactNode; label: string; value: number;
  tone: "ok" | "error" | "neutral" | "lime";
}) {
  const t =
    tone === "ok" ? "text-emerald-600"
    : tone === "error" ? "text-rose-500"
    : tone === "lime" ? "text-lime-600"
    : "text-slate-500";
  return (
    <div>
      <dt className="flex items-center gap-1 font-headline text-[8.5px] font-bold uppercase tracking-[0.2em] text-slate-400">
        {icon}
      </dt>
      <dd className={cn("mt-0.5 font-headline text-[13px] font-extrabold", t)}>{value}</dd>
      <p className="font-headline text-[8.5px] font-bold uppercase tracking-[0.2em] text-slate-400">{label}</p>
    </div>
  );
}

function StatusPill({ status, archived }: { status: string; archived: boolean }) {
  const tone = (() => {
    if (archived) return "bg-slate-200 text-slate-600";
    switch (status) {
      case "running": return "bg-emerald-100 text-emerald-700";
      case "draft": return "bg-lime-100 text-lime-800";
      case "paused": return "bg-amber-100 text-amber-800";
      case "completed": return "bg-slate-200 text-slate-700";
      default: return "bg-slate-100 text-slate-500";
    }
  })();
  return (
    <span className={cn(
      "inline-flex items-center rounded-full px-2 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.2em]",
      tone,
    )}>
      {archived ? "archived" : status}
    </span>
  );
}

function statusTone(status: string, archived: boolean): { border: string; label: string } {
  if (archived) return { border: "border-slate-200 opacity-70", label: "text-slate-500" };
  switch (status) {
    case "running": return { border: "border-emerald-200", label: "text-emerald-700" };
    case "draft": return { border: "border-lime-200", label: "text-lime-700" };
    case "paused": return { border: "border-amber-200", label: "text-amber-700" };
    case "completed": return { border: "border-slate-200", label: "text-slate-500" };
    default: return { border: "border-slate-200", label: "text-slate-500" };
  }
}

function prettyKind(k: string): string {
  return k.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
