import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Campaigns · Admin · HotelVALORA",
  description:
    "Lightweight activation campaigns — investor outreach, operator onboarding, beta invites, Top Promote rollouts.",
};

export const dynamic = "force-dynamic";

const PLANNED_KINDS = [
  { kind: "investor_outreach", label: "Investor outreach", hint: "Curated invite waves for Tier 1 institutional buyers" },
  { kind: "operator_onboarding", label: "Operator onboarding", hint: "Hotel chains + management companies activation" },
  { kind: "beta_invite", label: "Beta invites", hint: "Closed-beta drops to qualified contacts" },
  { kind: "top_promote_rollout", label: "Top Promote rollout", hint: "Curated visibility upgrade waves" },
  { kind: "lender_campaign", label: "Lender campaign", hint: "Banks + debt funds outreach loop" },
  { kind: "partnership", label: "Partnership", hint: "Brokers, advisors, ecosystem partners" },
  { kind: "newsletter", label: "Newsletter", hint: "Periodic intelligence digest to opted-in contacts" },
];

export default async function CampaignsAdminPage() {
  const sb = getSupabaseAdmin();
  const [{ count: campaignCount }, { count: pendingInvites }, { count: sentInvites }] = await Promise.all([
    sb.from("campaigns").select("id", { count: "exact", head: true }),
    sb.from("contact_invitations").select("id", { count: "exact", head: true }).eq("status", "pending"),
    sb.from("contact_invitations").select("id", { count: "exact", head: true }).in("status", ["sent", "delivered", "opened"]),
  ]);

  return (
    <div className="space-y-6">
      <Link
        href="/user/admin"
        className="inline-flex items-center gap-1.5 font-headline text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500 hover:text-forest-900"
      >
        <ArrowLeft size={12} /> Executive Control Room
      </Link>

      <header className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="rounded-md bg-slate-200 px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-slate-700">
            Scaffold
          </span>
          <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-slate-500">
            Activation Layer
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Campaigns
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          Lightweight activation campaigns convert contacts into users. Outbound = Resend +
          deterministic templates. <strong>NOT a CRM, NOT email sequencing, NOT AI orchestration</strong> —
          short, purposeful waves the operator runs manually with full audit. Schema + tables shipped
          today (Phase 2.D.1) · CRUD + execution UI lands in Phase 2.D.4.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between">
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Foundation state
          </p>
          <p className="font-mono text-[10.5px] text-slate-400">campaigns scaffold · 2026-05-12</p>
        </header>
        <dl className="grid grid-cols-3 gap-x-6 gap-y-4">
          <Totem label="Campaigns defined" value={campaignCount ?? 0} />
          <Totem label="Pending invitations" value={pendingInvites ?? 0} />
          <Totem label="Sent · in flight" value={sentInvites ?? 0} />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Planned campaign kinds (schema enum)
        </p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {PLANNED_KINDS.map((k) => (
            <li
              key={k.kind}
              className="flex items-start gap-3 rounded-md border border-slate-200 bg-slate-50 p-3"
            >
              <Megaphone size={14} className="mt-0.5 text-forest-900" />
              <div>
                <p className="font-headline text-[12px] font-bold text-forest-900">{k.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{k.hint}</p>
                <p className="mt-1 font-mono text-[10px] text-slate-400">kind = {k.kind}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Totem({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-1 font-headline text-2xl font-extrabold text-lime-300">{value}</dd>
    </div>
  );
}
