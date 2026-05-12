"use client";

import { useState } from "react";
import { Mail, Tag, UserCheck, Megaphone, CheckCircle, AlertCircle, ArchiveX, EyeOff, FileDown, X, CreditCard, Ban } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBulkSelection } from "./bulk-selection-context";
import {
  bulkAddTagAction,
  bulkAssignOwnerAction,
  bulkAssignCampaignAction,
  bulkExportCsvAction,
  bulkInviteAction,
  bulkMarkContactedAction,
  bulkMarkInactiveAction,
  bulkMarkInvalidAction,
  bulkSuppressOutreachAction,
} from "@/lib/admin/contacts/bulk";
import {
  bulkAssignSubscriptionAction,
  bulkRevokeInvitationsAction,
} from "@/lib/admin/subscriptions/bulk";

/**
 * Sticky bottom action bar · client component. Appears when there is
 * an active selection. Each action button toggles an inline form panel
 * above the bar. Forms post to the matching server action; the action
 * redirects back with a result banner read by the page.
 *
 * Selection state is injected into every form as hidden inputs:
 *   sel_mode   = 'explicit' | 'filtered'
 *   ids        = csv of contact ids (when explicit)
 *   filter_qs  = current page filter querystring (when filtered)
 */
export function BulkActionToolbar({
  filterQs,
  campaigns,
}: {
  filterQs: string;
  campaigns: Array<{ id: string; name: string }>;
}) {
  // Reused below for the subscription + revoke actions which need
  // to scope back to the contacts surface via `origin=contacts`.
  const sel = useBulkSelection();
  const [active, setActive] = useState<ActiveAction>(null);

  if (sel.count === 0) return null;

  const filtered = sel.mode === "filtered";

  return (
    <div className="sticky bottom-3 z-30 mt-3">
      {/* Inline action panel (form fields specific to the chosen action) */}
      {active && (
        <BulkActionPanel
          active={active}
          filterQs={filterQs}
          campaigns={campaigns}
          selMode={filtered ? "filtered" : "explicit"}
          idsCsv={sel.idsCsv}
          close={() => setActive(null)}
        />
      )}

      <div className="rounded-2xl border border-lime-300/40 bg-gradient-to-r from-forest-900 via-slate-950 to-forest-900 p-3 shadow-2xl ring-1 ring-lime-300/20">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-headline text-[10.5px] font-extrabold uppercase tracking-[0.22em] text-lime-300">
            {filtered ? `All filtered · ~${sel.filteredCount.toLocaleString()}` : `${sel.count} selected`}
          </p>
          <span className="font-mono text-[10px] text-slate-500">·</span>
          <ToolBtn icon={<Mail size={11} />} label="Invite" onClick={() => setActive("invite")} tone="lime" />
          <ToolBtn icon={<CreditCard size={11} />} label="Subscribe" onClick={() => setActive("subscribe")} tone="lime" />
          <ToolBtn icon={<Tag size={11} />} label="Tag" onClick={() => setActive("tag")} />
          <ToolBtn icon={<UserCheck size={11} />} label="Owner" onClick={() => setActive("owner")} />
          <ToolBtn icon={<Megaphone size={11} />} label="Campaign" onClick={() => setActive("campaign")} />
          <ToolBtn icon={<CheckCircle size={11} />} label="Contacted" onClick={() => setActive("contacted")} />
          <ToolBtn icon={<Ban size={11} />} label="Revoke invite" onClick={() => setActive("revoke")} tone="amber" />
          <ToolBtn icon={<ArchiveX size={11} />} label="Inactive" onClick={() => setActive("inactive")} tone="amber" />
          <ToolBtn icon={<AlertCircle size={11} />} label="Invalid" onClick={() => setActive("invalid")} tone="rose" />
          <ToolBtn icon={<EyeOff size={11} />} label="Suppress" onClick={() => setActive("suppress")} tone="amber" />
          <ToolBtn icon={<FileDown size={11} />} label="Export CSV" onClick={() => setActive("export")} />
          <button
            type="button"
            onClick={sel.clear}
            aria-label="Clear selection"
            className="ml-auto rounded-md p-1 text-slate-500 hover:bg-slate-800/60 hover:text-slate-200"
          >
            <X size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

type ActiveAction =
  | null
  | "invite" | "subscribe" | "tag" | "owner" | "campaign"
  | "contacted" | "revoke" | "inactive" | "invalid" | "suppress" | "export";

function ToolBtn({
  icon,
  label,
  onClick,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "lime" | "amber" | "rose";
}) {
  const t =
    tone === "lime" ? "bg-lime-300/20 text-lime-100 ring-lime-300/40 hover:bg-lime-300/30"
    : tone === "amber" ? "bg-amber-500/15 text-amber-200 ring-amber-500/30 hover:bg-amber-500/25"
    : tone === "rose" ? "bg-rose-500/15 text-rose-200 ring-rose-500/30 hover:bg-rose-500/25"
    : "bg-slate-800/60 text-slate-200 ring-slate-700/60 hover:bg-slate-700/60";
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-2 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
        t,
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function BulkActionPanel({
  active,
  filterQs,
  campaigns,
  selMode,
  idsCsv,
  close,
}: {
  active: Exclude<ActiveAction, null>;
  filterQs: string;
  campaigns: Array<{ id: string; name: string }>;
  selMode: "explicit" | "filtered";
  idsCsv: string;
  close: () => void;
}) {
  return (
    <div className="mb-2 rounded-2xl border border-slate-800/60 bg-slate-950/95 p-4 shadow-2xl">
      <div className="mb-3 flex items-center justify-between">
        <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.22em] text-lime-300/80">
          {LABELS[active]}
        </p>
        <button type="button" onClick={close} aria-label="Close panel" className="text-slate-500 hover:text-slate-300">
          <X size={13} />
        </button>
      </div>

      {active === "tag" && (
        <BulkForm action={bulkAddTagAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Input name="tag" placeholder="tag name · letters · dash · 1–80 chars" required maxLength={80} />
          <Submit label="Apply tag to selection" />
        </BulkForm>
      )}

      {active === "owner" && (
        <BulkForm action={bulkAssignOwnerAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Input
            name="relationship_owner_email"
            type="email"
            placeholder="owner email · leave empty to clear"
            maxLength={320}
          />
          <Submit label="Assign owner to selection" />
        </BulkForm>
      )}

      {active === "campaign" && (
        <BulkForm action={bulkAssignCampaignAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Select name="campaign_id" required>
            <option value="">Pick a campaign…</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <Submit label="Assign campaign · pending invitations" />
        </BulkForm>
      )}

      {active === "contacted" && (
        <BulkForm action={bulkMarkContactedAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <p className="font-mono text-[10.5px] text-slate-400">
            Stamps `last_contacted_at = now()` on every selected contact. No email send.
          </p>
          <Submit label="Mark selection contacted" />
        </BulkForm>
      )}

      {active === "inactive" && (
        <BulkForm action={bulkMarkInactiveAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <p className="font-mono text-[10.5px] text-slate-400">
            Sets `bucket=dormant-archive` · `relationship_band=dormant` · `archived_at=now()`. Selection drops from
            the default "active" view but stays queryable.
          </p>
          <Submit label="Move selection to dormant-archive" />
        </BulkForm>
      )}

      {active === "invalid" && (
        <BulkForm action={bulkMarkInvalidAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Input name="reason" placeholder="reason (optional) · ≤ 500 chars" maxLength={500} />
          <Submit label="Mark emails invalid · DATASITE-CORREGIR" tone="rose" />
        </BulkForm>
      )}

      {active === "suppress" && (
        <BulkForm action={bulkSuppressOutreachAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Input name="reason" placeholder="reason (optional) · ≤ 500 chars" maxLength={500} />
          <Submit label="Suppress outreach to selection" tone="amber" />
        </BulkForm>
      )}

      {active === "invite" && (
        <BulkForm action={bulkInviteAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs} columns={3}>
          <Select name="default_subscription_tier">
            <option value="">No tier hint</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
            <option value="premium">Premium</option>
            <option value="top_promote">Top Promote</option>
            <option value="comped">Comped</option>
            <option value="team">Team</option>
            <option value="enterprise">Enterprise</option>
          </Select>
          <Input name="promo_code" placeholder="promo code (optional)" maxLength={80} />
          <Select name="campaign_id">
            <option value="none">No campaign</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </Select>
          <p className="col-span-full font-mono text-[10.5px] leading-relaxed text-slate-400">
            Excludes suppressed contacts, invalid emails, and contacts with no email on file. Each send creates a
            `contact_invitations` row + an `activity_log` entry. The invitation id is the invite token.
          </p>
          <Submit label="Send invites · selection" tone="lime" />
        </BulkForm>
      )}

      {active === "export" && (
        <BulkForm action={bulkExportCsvAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <p className="font-mono text-[10.5px] text-slate-400">
            Streams a CSV of the selected contacts with the canonical column set. Capped at 500 rows per export.
          </p>
          <Submit label="Download CSV" />
        </BulkForm>
      )}

      {active === "subscribe" && (
        <form action={bulkAssignSubscriptionAction} className="grid gap-2 sm:grid-cols-3">
          <input type="hidden" name="sel_mode" value="contacts" />
          <input type="hidden" name="contact_ids" value={idsCsv} />
          <input type="hidden" name="filter_qs" value={filterQs} />
          <input type="hidden" name="origin" value="contacts" />
          <SubSelect label="Tier" name="tier" required defaultValue="pro" options={[
            { value: "free", label: "Free" }, { value: "pro", label: "Pro" },
            { value: "premium", label: "Premium" }, { value: "top_promote", label: "Top Promote" },
            { value: "comped", label: "Comped" }, { value: "team", label: "Team" },
            { value: "enterprise", label: "Enterprise" },
          ]} />
          <SubInput label="Expires at" name="expires_at" type="date" />
          <SubSelect label="Source campaign" name="source_campaign_id" defaultValue="none" options={[
            { value: "none", label: "No campaign" },
            ...campaigns.map((c) => ({ value: c.id, label: c.name })),
          ]} />
          <p className="col-span-full font-mono text-[10.5px] leading-relaxed text-slate-400">
            Resolves each selected contact's `linked_user_id` and bootstraps a subscription. Contacts that have
            not yet onboarded are silently skipped — invite them first via the Invite action.
          </p>
          <SubSubmit label="Assign subscription to linked users" tone="lime" />
        </form>
      )}

      {active === "revoke" && (
        <form action={bulkRevokeInvitationsAction} className="grid gap-2">
          <input type="hidden" name="sel_mode" value="explicit" />
          <input type="hidden" name="contact_ids" value={idsCsv} />
          <input type="hidden" name="filter_qs" value={filterQs} />
          <p className="font-mono text-[10.5px] leading-relaxed text-slate-400">
            Flips every PENDING / SENT / DELIVERED / OPENED / CLICKED / BOUNCED invitation for the selected
            contacts to <code className="text-rose-200">status=revoked</code>. Already-accepted invitations are
            never touched — the funnel-closed state is preserved.
          </p>
          <SubSubmit label="Revoke selection's pending invitations" tone="amber" />
        </form>
      )}
    </div>
  );
}

function SubInput({ label, name, type }: { label: string; name: string; type?: string }) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        name={name}
        type={type ?? "text"}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function SubSelect({
  label, name, required, defaultValue, options,
}: {
  label: string; name: string; required?: boolean; defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <select
        name={name} required={required} defaultValue={defaultValue}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
      >
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

function SubSubmit({ label, tone }: { label: string; tone?: "lime" | "amber" | "rose" }) {
  const t =
    tone === "lime" ? "bg-lime-300 text-forest-900 hover:bg-lime-200"
    : tone === "amber" ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-500/50 hover:bg-amber-500/35"
    : tone === "rose" ? "bg-rose-500/30 text-rose-100 ring-1 ring-rose-500/50 hover:bg-rose-500/40"
    : "bg-slate-200 text-forest-900 hover:bg-white";
  return (
    <div className="col-span-full">
      <button
        type="submit"
        className={cn(
          "inline-flex items-center rounded-md px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] shadow-sm",
          t,
        )}
      >
        {label}
      </button>
    </div>
  );
}

const LABELS: Record<Exclude<ActiveAction, null>, string> = {
  tag: "Add operator tag",
  owner: "Assign relationship owner",
  campaign: "Assign to campaign",
  contacted: "Mark contacted",
  inactive: "Move to dormant-archive",
  invalid: "Mark email invalid",
  suppress: "Suppress outreach",
  invite: "Send invitations via Resend",
  subscribe: "Assign subscription to onboarded users",
  revoke: "Revoke pending invitations",
  export: "Export CSV",
};

function BulkForm({
  action,
  selMode,
  idsCsv,
  filterQs,
  columns,
  children,
}: {
  action: (formData: FormData) => Promise<void>;
  selMode: "explicit" | "filtered";
  idsCsv: string;
  filterQs: string;
  columns?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  return (
    <form
      action={action}
      className={cn(
        "grid gap-2",
        columns === 3 ? "sm:grid-cols-3" : columns === 2 ? "sm:grid-cols-2" : "grid-cols-1",
      )}
    >
      <input type="hidden" name="sel_mode" value={selMode} />
      <input type="hidden" name="ids" value={idsCsv} />
      <input type="hidden" name="filter_qs" value={filterQs} />
      {children}
    </form>
  );
}

function Input({
  name,
  placeholder,
  type,
  required,
  maxLength,
}: {
  name: string;
  placeholder?: string;
  type?: string;
  required?: boolean;
  maxLength?: number;
}) {
  return (
    <input
      name={name}
      type={type ?? "text"}
      placeholder={placeholder}
      required={required}
      maxLength={maxLength}
      className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
    />
  );
}

function Select({
  name,
  required,
  children,
}: {
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <select
      name={name}
      required={required}
      defaultValue=""
      className="rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 focus:border-lime-300/50 focus:outline-none"
    >
      {children}
    </select>
  );
}

function Submit({ label, tone }: { label: string; tone?: "lime" | "rose" | "amber" }) {
  const t =
    tone === "lime" ? "bg-lime-300 text-forest-900 hover:bg-lime-200"
    : tone === "rose" ? "bg-rose-500/30 text-rose-100 ring-1 ring-rose-500/50 hover:bg-rose-500/40"
    : tone === "amber" ? "bg-amber-500/25 text-amber-100 ring-1 ring-amber-500/50 hover:bg-amber-500/35"
    : "bg-slate-200 text-forest-900 hover:bg-white";
  return (
    <div className="col-span-full">
      <button
        type="submit"
        className={cn(
          "inline-flex items-center rounded-md px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] shadow-sm",
          t,
        )}
      >
        {label}
      </button>
    </div>
  );
}
