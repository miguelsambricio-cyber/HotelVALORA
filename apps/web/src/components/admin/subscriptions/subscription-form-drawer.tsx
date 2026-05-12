import Link from "next/link";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionRow } from "@/lib/admin/subscriptions/live";
import {
  assignSubscriptionAction,
  updateSubscriptionAction,
  expireSubscriptionAction,
} from "@/lib/admin/subscriptions/mutations";

/**
 * Subscription form drawer · single component handling both Assign
 * (when row=null) and Update (when row is loaded). Layout mirrors the
 * campaigns form drawer for visual consistency.
 */
export function SubscriptionFormDrawer({
  row,
  closeHref,
  errorMessage,
  users,
  campaigns,
}: {
  row: SubscriptionRow | null;
  closeHref: string;
  errorMessage?: string | null;
  users: Array<{ id: string; email: string; full_name: string | null }>;
  campaigns: Array<{ id: string; name: string }>;
}) {
  const isCreate = row === null;
  const r = row as SubscriptionRow;

  return (
    <aside className="rounded-2xl border border-lime-300/40 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <header className="space-y-2 border-b border-slate-800/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
              {isCreate ? "Assign subscription" : `Update · ${r.id.slice(0, 8)}`}
            </p>
            <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
              {isCreate
                ? "Grant a tier to an existing user"
                : (r.user_full_name || r.user_email || r.user_id.slice(0, 8))}
            </h2>
            {!isCreate && r.user_email && (
              <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">{r.user_email}</p>
            )}
          </div>
          <Link href={closeHref} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200">
            <X size={16} />
          </Link>
        </div>
        {errorMessage && (
          <div className="flex items-start gap-2 rounded-md border border-rose-500/40 bg-rose-500/10 p-2.5">
            <AlertTriangle size={12} className="mt-0.5 text-rose-300" />
            <p className="font-mono text-[10.5px] leading-relaxed text-rose-200">{errorMessage}</p>
          </div>
        )}
      </header>

      <form action={isCreate ? assignSubscriptionAction : updateSubscriptionAction} className="space-y-3 pt-4">
        {!isCreate && <input type="hidden" name="subscriptionId" value={r.id} />}

        {isCreate && (
          <Select label="User" name="user_id" required defaultValue="">
            <option value="">Pick a user…</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ? `${u.full_name} · ${u.email}` : u.email}
              </option>
            ))}
          </Select>
        )}

        <Grid>
          <Select label="Tier" name="tier" required defaultValue={r?.tier ?? "comped"}>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
            <option value="top_promote">Top Promote</option>
            <option value="comped">Comped</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          <Select label="Status" name="status" defaultValue={r?.status ?? "active"}>
            <option value="active">Active</option>
            <option value="trialing">Trialing</option>
            <option value="past_due">Past due</option>
            <option value="canceled">Canceled</option>
            <option value="expired">Expired</option>
            <option value="incomplete">Incomplete</option>
          </Select>
        </Grid>
        <Grid>
          <Field
            label="Expires at"
            name="expires_at"
            type="date"
            defaultValue={r?.expires_at ? r.expires_at.slice(0, 10) : ""}
          />
          <Select label="Source campaign" name="source_campaign_id" defaultValue={r?.source_campaign_id ?? ""}>
            <option value="">No campaign</option>
            {campaigns.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Grid>
        <Textarea
          label="Notes (operator-private)"
          name="notes"
          rows={3}
          defaultValue={r?.notes ?? ""}
          placeholder="e.g. comped for partnership · grant period ends 2026-12-31"
        />

        <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
          <Link href={closeHref} className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-100">
            Cancel
          </Link>
          <button type="submit" className="rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 hover:bg-lime-200">
            {isCreate ? "Assign subscription" : "Save changes"}
          </button>
        </div>
      </form>

      {!isCreate && r.status !== "expired" && r.status !== "canceled" && (
        <div className="mt-4 border-t border-slate-800/60 pt-4">
          <h3 className="mb-2 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-rose-300/80">
            Quick actions
          </h3>
          <form action={expireSubscriptionAction}>
            <input type="hidden" name="subscriptionId" value={r.id} />
            <button
              type="submit"
              className="rounded-md bg-rose-500/20 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/30"
            >
              Expire now · status=expired
            </button>
            <p className="mt-1 font-mono text-[10px] leading-relaxed text-slate-500">
              Stamps `expires_at = now()` and flips status. Use for natural-end or partnership withdrawal. Stripe-backed
              subs should be canceled via the Stripe dashboard.
            </p>
          </form>
        </div>
      )}

      {!isCreate && r.stripe_subscription_id && (
        <div className="mt-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-2.5">
          <p className="font-mono text-[10.5px] text-amber-200">
            Stripe-backed subscription · operator edits should flow through the Stripe dashboard so the webhook stays
            authoritative.
          </p>
        </div>
      )}
    </aside>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label, name, defaultValue, type, placeholder, required,
}: {
  label: string; name: string; defaultValue: string; type?: string;
  placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        name={name} type={type ?? "text"} defaultValue={defaultValue}
        placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Textarea({ label, name, defaultValue, rows, placeholder }: {
  label: string; name: string; defaultValue: string; rows?: number; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <textarea
        name={name} defaultValue={defaultValue} rows={rows ?? 3} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Select({
  label, name, defaultValue, required, children,
}: {
  label: string; name: string; defaultValue: string; required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <select
        name={name} defaultValue={defaultValue} required={required}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}
