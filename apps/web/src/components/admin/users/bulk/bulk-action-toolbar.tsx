"use client";

import { useState } from "react";
import { CreditCard, Sparkles, AlertCircle, RefreshCw, Ban, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUsersBulkSelection } from "./bulk-selection-context";
import {
  bulkAssignSubscriptionAction,
  bulkCompSubscriptionAction,
  bulkExpireSubscriptionAction,
  bulkReplaceProductAction,
  bulkRevokeSubscriptionAction,
} from "@/lib/admin/subscriptions/bulk";

export interface ProductPickerItem {
  id: string;
  slug: string;
  name: string;
  tier_enum: string | null;
  monthly_price: number | null;
  currency: string;
  badge: string | null;
}

/**
 * Phase 2.D.6 · Users surface bulk action toolbar.
 *
 * Subscription-focused, mirrors the contacts toolbar visual contract.
 * Three actions:
 *   - Assign     · grant any tier with optional expires + campaign
 *   - Comp       · shortcut: tier=comped, status=active
 *   - Expire     · flip latest sub to status=expired (non-Stripe only)
 *
 * Selection state is injected into every form as hidden inputs:
 *   sel_mode  = 'explicit' | 'filtered'
 *   user_ids  = csv of user uuids (when explicit)
 *   filter_qs = current users-page filter querystring (when filtered)
 *   origin    = 'users' (so the action knows where to redirect back)
 */
export function UsersBulkActionToolbar({
  filterQs,
  campaigns,
  products,
}: {
  filterQs: string;
  campaigns: Array<{ id: string; name: string }>;
  products: ProductPickerItem[];
}) {
  const sel = useUsersBulkSelection();
  const [active, setActive] = useState<ActiveAction>(null);

  if (sel.count === 0) return null;

  const filtered = sel.mode === "filtered";

  return (
    <div className="sticky bottom-3 z-30 mt-3">
      {active && (
        <BulkActionPanel
          active={active}
          filterQs={filterQs}
          campaigns={campaigns}
          products={products}
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
          <ToolBtn icon={<CreditCard size={11} />} label="Assign product" onClick={() => setActive("assign")} tone="lime" />
          <ToolBtn icon={<RefreshCw size={11} />} label="Replace" onClick={() => setActive("replace")} />
          <ToolBtn icon={<Sparkles size={11} />} label="Comp" onClick={() => setActive("comp")} tone="lime" />
          <ToolBtn icon={<AlertCircle size={11} />} label="Expire" onClick={() => setActive("expire")} tone="rose" />
          <ToolBtn icon={<Ban size={11} />} label="Revoke" onClick={() => setActive("revoke")} tone="rose" />
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

type ActiveAction = null | "assign" | "replace" | "comp" | "expire" | "revoke";

const LABELS: Record<Exclude<ActiveAction, null>, string> = {
  assign: "Assign subscription product",
  replace: "Replace product on latest active subscription",
  comp: "Grant Comped access",
  expire: "Expire current subscription",
  revoke: "Revoke subscription",
};

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
  products,
  selMode,
  idsCsv,
  close,
}: {
  active: Exclude<ActiveAction, null>;
  filterQs: string;
  campaigns: Array<{ id: string; name: string }>;
  products: ProductPickerItem[];
  selMode: "explicit" | "filtered";
  idsCsv: string;
  close: () => void;
}) {
  const productOptions = products.map((p) => ({
    value: p.id,
    label: `${p.name}${p.monthly_price !== null && p.monthly_price > 0 ? ` · ${p.currency} ${p.monthly_price}/mo` : (p.monthly_price === 0 ? " · Free" : "")}${p.badge ? ` · ${p.badge}` : ""}`,
  }));
  const defaultProduct = products.find((p) => p.slug === "pro")?.id
    ?? products.find((p) => p.tier_enum === "pro")?.id
    ?? products[0]?.id
    ?? "";

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

      {active === "assign" && (
        <BulkForm action={bulkAssignSubscriptionAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs} columns={3}>
          <Select label="Product" name="product_id" required defaultValue={defaultProduct} options={productOptions} />
          <Select label="Status" name="status" defaultValue="active" options={[
            { value: "active", label: "Active" },
            { value: "trialing", label: "Trialing" },
            { value: "incomplete", label: "Incomplete" },
          ]} />
          <Field label="Expires at" name="expires_at" type="date" />
          <Select label="Source campaign" name="source_campaign_id" defaultValue="none" options={[
            { value: "none", label: "No campaign" },
            ...campaigns.map((c) => ({ value: c.id, label: c.name })),
          ]} />
          <Field label="Notes (optional)" name="notes" placeholder="comped for partnership · period ends 2026-12-31" />
          <p className="col-span-full font-mono text-[10.5px] leading-relaxed text-slate-400">
            Creates a new `subscriptions` row per user · backward-compat: `subscriptions.tier` is derived from the
            product's `tier_enum`. Use Replace to flip the existing latest sub in-place instead of stacking history.
          </p>
          <Submit label="Assign product to selection" tone="lime" />
        </BulkForm>
      )}

      {active === "replace" && (
        <BulkForm action={bulkReplaceProductAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs} columns={2}>
          <Select label="New product" name="product_id" required defaultValue={defaultProduct} options={productOptions} />
          <p className="col-span-full font-mono text-[10.5px] leading-relaxed text-slate-400">
            UPDATEs the latest active subscription of each selected user to the new product in-place (no new row).
            Stripe-backed subs are skipped. Use for clean upgrade / downgrade.
          </p>
          <Submit label="Replace product on selection" tone="lime" />
        </BulkForm>
      )}

      {active === "comp" && (
        <BulkForm action={bulkCompSubscriptionAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs} columns={2}>
          <Field label="Expires at (optional)" name="expires_at" type="date" />
          <Select label="Source campaign" name="source_campaign_id" defaultValue="none" options={[
            { value: "none", label: "No campaign" },
            ...campaigns.map((c) => ({ value: c.id, label: c.name })),
          ]} />
          <Field label="Notes (optional)" name="notes" placeholder="e.g. partnership · advisory comp · investor preview" />
          <p className="col-span-full font-mono text-[10.5px] leading-relaxed text-slate-400">
            Assigns the seeded `comped` product (status=active). Falls back to legacy tier=comped if the comped
            product is archived. Source campaign attribution preserved in the audit trail.
          </p>
          <Submit label="Grant Comped access" tone="lime" />
        </BulkForm>
      )}

      {active === "expire" && (
        <BulkForm action={bulkExpireSubscriptionAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <p className="font-mono text-[10.5px] leading-relaxed text-slate-400">
            Flips the latest subscription of each selected user to <code className="text-rose-200">status=expired</code>{" "}
            with <code className="text-rose-200">expires_at=now()</code>. Stripe-backed subscriptions are skipped —
            cancel those via the Stripe Dashboard so the webhook stays authoritative.
          </p>
          <Submit label="Expire selection" tone="rose" />
        </BulkForm>
      )}

      {active === "revoke" && (
        <BulkForm action={bulkRevokeSubscriptionAction} selMode={selMode} idsCsv={idsCsv} filterQs={filterQs}>
          <Field label="Reason (operator-private, optional · ≤ 500 chars)" name="reason" placeholder="e.g. partnership ended · misuse · access withdrawn" />
          <p className="font-mono text-[10.5px] leading-relaxed text-slate-400">
            Flips the latest non-Stripe subscription to <code className="text-rose-200">status=canceled</code> +{" "}
            <code className="text-rose-200">cancel_at_period_end=true</code>. Records the reason in notes + audit
            row metadata. Stripe-backed subs are skipped.
          </p>
          <Submit label="Revoke selection" tone="rose" />
        </BulkForm>
      )}
    </div>
  );
}

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
      <input type="hidden" name="user_ids" value={idsCsv} />
      <input type="hidden" name="filter_qs" value={filterQs} />
      <input type="hidden" name="origin" value="users" />
      {children}
    </form>
  );
}

function Field({
  label, name, type, placeholder,
}: {
  label: string; name: string; type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        name={name} type={type ?? "text"} placeholder={placeholder}
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Select({
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

function Submit({ label, tone }: { label: string; tone?: "lime" | "rose" }) {
  const t =
    tone === "lime" ? "bg-lime-300 text-forest-900 hover:bg-lime-200"
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
