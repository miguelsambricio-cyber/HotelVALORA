import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const metadata: Metadata = {
  title: "Subscriptions · Admin · HotelVALORA",
  description:
    "Monetization layer — Free · Pro · Premium · Top Promote · Comped · Expired.",
};

export const dynamic = "force-dynamic";

const TIERS = [
  { tier: "free", label: "Free", hint: "Public showcase tier · sample reports + library browse" },
  { tier: "pro", label: "Pro", hint: "Institutional underwriting + advanced CompSet" },
  { tier: "premium", label: "Premium", hint: "Full Intelligence Engine + AI Operations surfaces" },
  { tier: "team", label: "Team", hint: "Workspace + role management (multi-seat)" },
  { tier: "enterprise", label: "Enterprise", hint: "Custom contracts, dedicated support, white-glove onboarding" },
];

export default async function SubscriptionsAdminPage() {
  const sb = getSupabaseAdmin();
  const [
    { count: total },
    { count: active },
    { count: trialing },
    { count: pastDue },
    { count: canceled },
  ] = await Promise.all([
    sb.from("subscriptions").select("id", { count: "exact", head: true }),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "active"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "trialing"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "past_due"),
    sb.from("subscriptions").select("id", { count: "exact", head: true }).eq("status", "canceled"),
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
            Monetization Layer
          </span>
        </div>
        <h1 className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900 sm:text-[34px]">
          Subscriptions
        </h1>
        <p className="max-w-3xl text-[13.5px] leading-relaxed text-slate-600">
          The final node of the conversion arc — active subscribers pay for HOTELVALORA. Schema is live
          (Stripe customer + subscription IDs · per-period billing windows) · the full management UI
          (assign tier · grant Comped · mark Expired · refunds · per-org billing) lands in Phase 2.D.4.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-sm">
        <header className="mb-3 flex items-baseline justify-between">
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Foundation state
          </p>
          <p className="font-mono text-[10.5px] text-slate-400">subscriptions scaffold · 2026-05-12</p>
        </header>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-5">
          <Totem label="Total" value={total ?? 0} />
          <Totem label="Active" value={active ?? 0} severity="ok" />
          <Totem label="Trialing" value={trialing ?? 0} />
          <Totem label="Past due" value={pastDue ?? 0} severity={pastDue && pastDue > 0 ? "warn" : "neutral"} />
          <Totem label="Canceled" value={canceled ?? 0} />
        </dl>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="mb-2 font-headline text-[10px] font-bold uppercase tracking-[0.22em] text-slate-500">
          Plan tiers (schema enum · `user_tier`)
        </p>
        <ul className="space-y-2">
          {TIERS.map((t) => (
            <li key={t.tier} className="flex items-start justify-between gap-4 rounded-md border border-slate-200 bg-slate-50 p-3">
              <div>
                <p className="font-headline text-[12px] font-bold text-forest-900">{t.label}</p>
                <p className="mt-0.5 text-[11px] leading-snug text-slate-500">{t.hint}</p>
              </div>
              <span className="font-mono text-[10px] text-slate-400">{t.tier}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-snug text-slate-500">
          <strong>Comped</strong> + <strong>Expired</strong> + <strong>Top Promote</strong> states are
          modelled in Phase 2.D.4 — they need explicit operator workflows (grant · revoke · monitor
          period end) before they land. <strong>Trial</strong> and <strong>Internal</strong> are
          reserved.
        </p>
      </section>
    </div>
  );
}

function Totem({
  label,
  value,
  severity,
}: {
  label: string;
  value: number;
  severity?: "ok" | "warn" | "neutral";
}) {
  const tone =
    severity === "ok" ? "text-emerald-300"
    : severity === "warn" ? "text-amber-300"
    : "text-lime-300";
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 font-headline text-2xl font-extrabold ${tone}`}>{value}</dd>
    </div>
  );
}
