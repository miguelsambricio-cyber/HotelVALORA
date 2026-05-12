import Link from "next/link";
import { X, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CampaignDetail } from "@/lib/admin/campaigns/live";
import {
  createCampaignAction,
  updateCampaignAction,
  archiveCampaignAction,
  restoreCampaignAction,
} from "@/lib/admin/campaigns/mutations";

/**
 * Campaign form drawer · handles both Create (when detail=null) and
 * Edit (when detail is loaded). Read-only fields don't exist here —
 * campaign data is small, the whole row is a single form.
 */
export function CampaignFormDrawer({
  detail,
  closeHref,
  errorMessage,
}: {
  detail: CampaignDetail | null;  // null = creating
  closeHref: string;
  errorMessage?: string | null;
}) {
  const isCreate = detail === null;
  // Local non-null alias used inside the create==false branches. TS sees
  // the narrowing only when we read the boolean directly, so we re-cast.
  const c = detail as CampaignDetail;

  return (
    <aside className="rounded-2xl border border-lime-300/40 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <header className="space-y-2 border-b border-slate-800/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
              {isCreate ? "New campaign" : `Edit · ${c.slug}`}
            </p>
            <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
              {isCreate ? "Create campaign" : c.name}
            </h2>
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

      <form action={isCreate ? createCampaignAction : updateCampaignAction} className="space-y-3 pt-4">
        {!isCreate && <input type="hidden" name="campaignId" value={c.id} />}

        <Grid>
          <Field label="Name" name="name" required defaultValue={c?.name ?? ""} />
          <Field label="Slug" name="slug" required defaultValue={c?.slug ?? ""} pattern="^[a-z0-9][a-z0-9\\-_]*$" placeholder="lowercase-dashes" />
        </Grid>
        <Grid>
          <Select label="Kind" name="kind" defaultValue={c?.kind ?? "custom"} options={[
            { value: "investor_outreach", label: "Investor outreach" },
            { value: "operator_onboarding", label: "Operator onboarding" },
            { value: "beta_invite", label: "Beta invite" },
            { value: "top_promote_rollout", label: "Top Promote rollout" },
            { value: "lender_campaign", label: "Lender campaign" },
            { value: "newsletter", label: "Newsletter" },
            { value: "partnership", label: "Partnership" },
            { value: "custom", label: "Custom" },
          ]} />
          <Select label="Status" name="status" defaultValue={c?.status ?? "draft"} options={[
            { value: "draft", label: "Draft" },
            { value: "running", label: "Running" },
            { value: "paused", label: "Paused" },
            { value: "completed", label: "Completed" },
            { value: "archived", label: "Archived" },
          ]} />
        </Grid>
        <Grid>
          <Field label="Owner email" name="owner_email" type="email" defaultValue={c?.owner_email ?? ""} />
          <Field label="Channel" name="channel" defaultValue={c?.channel ?? "email"} />
        </Grid>
        <Grid>
          <Field label="Conversion target (optional · int)" name="conversion_target" type="number" min={0} defaultValue={c?.conversion_target?.toString() ?? ""} />
          <Field label="Target audience" name="target_audience" defaultValue={c?.target_audience ?? ""} placeholder="e.g. EU institutional · Tier 1 buyers" />
        </Grid>
        <Textarea label="Description" name="description" rows={3} defaultValue={c?.description ?? ""} />
        <Textarea label="Notes (operator-private)" name="notes" rows={3} defaultValue={c?.notes ?? ""} />

        <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
          <Link href={closeHref} className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-100">
            Cancel
          </Link>
          <button type="submit" className="rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 hover:bg-lime-200">
            {isCreate ? "Create campaign" : "Save changes"}
          </button>
        </div>
      </form>

      {!isCreate && (
        <div className="mt-5 border-t border-slate-800/60 pt-4">
          <h3 className="mb-2 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Funnel · this campaign
          </h3>
          <dl className="grid grid-cols-4 gap-x-3">
            <Stat label="Active" value={c.invitations_active} />
            <Stat label="Converted" value={c.invitations_converted} tone="ok" />
            <Stat label="Failed" value={c.invitations_failed} tone="error" />
            <Stat label="Subs" value={c.subscriptions_active} tone="ok" />
          </dl>

          <div className="mt-4 flex items-center gap-2 border-t border-slate-800/60 pt-3">
            {c.archived_at ? (
              <form action={restoreCampaignAction}>
                <input type="hidden" name="campaignId" value={c.id} />
                <button type="submit" className="rounded-md bg-lime-300/20 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-lime-200 ring-1 ring-lime-300/40 hover:bg-lime-300/30">
                  Restore campaign
                </button>
              </form>
            ) : (
              <form action={archiveCampaignAction}>
                <input type="hidden" name="campaignId" value={c.id} />
                <button type="submit" className="rounded-md bg-rose-500/20 px-3 py-1.5 font-headline text-[10px] font-bold uppercase tracking-[0.2em] text-rose-200 ring-1 ring-rose-500/40 hover:bg-rose-500/30">
                  Archive campaign
                </button>
              </form>
            )}
          </div>

          {c.invitations.length > 0 && (
            <div className="mt-4 border-t border-slate-800/60 pt-3">
              <p className="mb-2 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
                Invitations · last {c.invitations.length}
              </p>
              <ul className="space-y-1">
                {c.invitations.slice(0, 25).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 rounded-md bg-slate-900/40 px-2.5 py-1.5 font-mono text-[10.5px] ring-1 ring-slate-700/40">
                    <span className="truncate text-slate-300">{i.invited_email}</span>
                    <span className={cn("font-headline text-[9px] font-bold uppercase tracking-[0.18em]",
                      ["accepted","converted"].includes(i.status) ? "text-emerald-300"
                      : ["bounced","declined"].includes(i.status) ? "text-rose-300"
                      : "text-lime-300/80")}>
                      {i.status}
                    </span>
                    <span className="text-slate-500">{(i.sent_at ?? i.created_at).slice(0, 10)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label, name, defaultValue, type, min, placeholder, required, pattern,
}: {
  label: string; name: string; defaultValue: string; type?: string; min?: number;
  placeholder?: string; required?: boolean; pattern?: string;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        name={name} type={type ?? "text"} defaultValue={defaultValue} min={min}
        placeholder={placeholder} required={required} pattern={pattern}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Textarea({ label, name, defaultValue, rows }: {
  label: string; name: string; defaultValue: string; rows?: number;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <textarea
        name={name} defaultValue={defaultValue} rows={rows ?? 3}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Select({ label, name, defaultValue, options }: {
  label: string; name: string; defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <select
        name={name} defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11.5px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "error" }) {
  const t = tone === "ok" ? "text-emerald-300" : tone === "error" ? "text-rose-300" : "text-lime-300";
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</dt>
      <dd className={cn("mt-0.5 font-headline text-lg font-extrabold", t)}>{value}</dd>
    </div>
  );
}
