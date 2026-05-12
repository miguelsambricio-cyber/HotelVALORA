import Link from "next/link";
import { X, AlertTriangle, EyeOff, Eye, Archive } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SubscriptionProduct } from "@/lib/admin/subscriptions/products/live";
import {
  createProductAction,
  updateProductAction,
  setProductVisibilityAction,
} from "@/lib/admin/subscriptions/products/mutations";

/**
 * Phase 2.D.7 · Product form drawer (create + edit).
 *
 * Server component · form actions bind to server actions in
 * mutations.ts. Layout matches the campaigns form drawer for visual
 * consistency. Features are entered as a textarea with one "title|true"
 * or "title|false" per line — minimises mobile keyboard friction.
 */
export function ProductFormDrawer({
  product,
  closeHref,
  errorMessage,
}: {
  product: SubscriptionProduct | null; // null = create mode
  closeHref: string;
  errorMessage?: string | null;
}) {
  const isCreate = product === null;
  const p = product as SubscriptionProduct;

  const featuresText = product?.features.map((f) => `${f.title}|${f.included ? "true" : "false"}`).join("\n") ?? "";

  return (
    <aside className="rounded-2xl border border-lime-300/40 bg-gradient-to-b from-forest-900 to-slate-950 p-5 shadow-2xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
      <header className="space-y-2 border-b border-slate-800/60 pb-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-headline text-[9px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
              {isCreate ? "New product" : `Edit · ${p.slug}`}
            </p>
            <h2 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-white">
              {isCreate ? "Create subscription product" : p.name}
            </h2>
            {!isCreate && p.subtitle && (
              <p className="mt-0.5 text-[11.5px] text-slate-400">{p.subtitle}</p>
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

      <form action={isCreate ? createProductAction : updateProductAction} className="space-y-3 pt-4">
        {!isCreate && <input type="hidden" name="productId" value={p.id} />}

        <Grid>
          <Field label="Slug" name="slug" required defaultValue={p?.slug ?? ""} placeholder="lowercase-dashes" pattern="^[a-z0-9][a-z0-9\\-_]*$" />
          <Field label="Name" name="name" required defaultValue={p?.name ?? ""} />
        </Grid>
        <Field label="Subtitle" name="subtitle" defaultValue={p?.subtitle ?? ""} placeholder="One-line positioning" />
        <Textarea label="Description (optional)" name="description" rows={2} defaultValue={p?.description ?? ""} />

        <Grid columns={3}>
          <Select label="Currency" name="currency" defaultValue={p?.currency ?? "EUR"} options={[
            { value: "EUR", label: "EUR" }, { value: "USD", label: "USD" }, { value: "GBP", label: "GBP" },
          ]} />
          <Field label="Monthly price" name="monthly_price" type="number" min={0} step="0.01" defaultValue={p?.monthly_price?.toString() ?? ""} placeholder="0 = free" />
          <Field label="Yearly price" name="yearly_price" type="number" min={0} step="0.01" defaultValue={p?.yearly_price?.toString() ?? ""} placeholder="optional" />
        </Grid>

        <Grid columns={3}>
          <Select label="VAT display" name="vat_display" defaultValue={p?.vat_display ?? "inclusive"} options={[
            { value: "inclusive", label: "VAT inclusive" },
            { value: "exclusive", label: "+ VAT" },
            { value: "none", label: "No VAT display" },
          ]} />
          <Field label="Badge (optional)" name="badge" defaultValue={p?.badge ?? ""} placeholder="e.g. Most popular" />
          <Field label="CTA label" name="cta_label" defaultValue={p?.cta_label ?? "Get started"} />
        </Grid>

        <Grid columns={3}>
          <Select label="Color theme" name="color_theme" defaultValue={p?.color_theme ?? "lime"} options={[
            { value: "lime", label: "Lime" }, { value: "emerald", label: "Emerald" },
            { value: "amber", label: "Amber" }, { value: "rose", label: "Rose" },
            { value: "slate", label: "Slate" }, { value: "forest", label: "Forest" },
          ]} />
          <Field label="Display order" name="display_order" type="number" min={0} step={10} defaultValue={(p?.display_order ?? 100).toString()} />
          <Select label="Visibility" name="visibility" defaultValue={p?.visibility ?? "visible"} options={[
            { value: "visible", label: "Visible" },
            { value: "hidden", label: "Hidden" },
            { value: "archived", label: "Archived" },
          ]} />
        </Grid>

        <Textarea
          label="Features · one per line · format: title|true or title|false"
          name="features"
          rows={6}
          defaultValue={featuresText}
          placeholder={"Full library + favourites|true\nPremium analytics|true\nAI Operations access|false"}
        />

        <Field label="Tier enum (backward compat · optional)" name="tier_enum" defaultValue={p?.tier_enum ?? ""} placeholder="free / pro / premium / top_promote / comped" />

        <div className="flex items-center justify-end gap-2 border-t border-slate-800/60 pt-3">
          <Link href={closeHref} className="rounded-md border border-slate-700 bg-slate-900/60 px-3 py-1.5 font-headline text-[10.5px] font-bold uppercase tracking-[0.2em] text-slate-300 hover:text-slate-100">
            Cancel
          </Link>
          <button type="submit" className="rounded-md bg-lime-300 px-3 py-1.5 font-headline text-[10.5px] font-extrabold uppercase tracking-[0.2em] text-forest-900 hover:bg-lime-200">
            {isCreate ? "Create product" : "Save changes"}
          </button>
        </div>
      </form>

      {!isCreate && (
        <div className="mt-5 border-t border-slate-800/60 pt-4">
          <p className="mb-2 font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-lime-300/80">
            Visibility quick actions
          </p>
          <div className="flex flex-wrap gap-2">
            <VisibilityForm productId={p.id} target="visible" current={p.visibility} icon={<Eye size={11} />} label="Make visible" tone="ok" />
            <VisibilityForm productId={p.id} target="hidden" current={p.visibility} icon={<EyeOff size={11} />} label="Hide" tone="warn" />
            <VisibilityForm productId={p.id} target="archived" current={p.visibility} icon={<Archive size={11} />} label="Archive" tone="error" />
          </div>
        </div>
      )}
    </aside>
  );
}

function VisibilityForm({
  productId, target, current, icon, label, tone,
}: {
  productId: string; target: string; current: string;
  icon: React.ReactNode; label: string; tone: "ok" | "warn" | "error";
}) {
  if (current === target) return null;
  const t =
    tone === "ok" ? "bg-emerald-500/20 text-emerald-100 ring-emerald-500/40 hover:bg-emerald-500/30"
    : tone === "warn" ? "bg-amber-500/15 text-amber-200 ring-amber-500/30 hover:bg-amber-500/25"
    : "bg-rose-500/15 text-rose-200 ring-rose-500/30 hover:bg-rose-500/25";
  return (
    <form action={setProductVisibilityAction}>
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="visibility" value={target} />
      <button
        type="submit"
        className={cn(
          "inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
          t,
        )}
      >
        {icon} {label}
      </button>
    </form>
  );
}

function Grid({ columns, children }: { columns?: 2 | 3; children: React.ReactNode }) {
  return (
    <div className={cn(
      "grid grid-cols-1 gap-3",
      columns === 3 ? "sm:grid-cols-3" : "sm:grid-cols-2",
    )}>{children}</div>
  );
}

function Field({
  label, name, defaultValue, type, min, step, placeholder, required, pattern,
}: {
  label: string; name: string; defaultValue: string; type?: string;
  min?: number; step?: number | string; placeholder?: string;
  required?: boolean; pattern?: string;
}) {
  return (
    <label className="block">
      <span className="block font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">{label}</span>
      <input
        name={name} type={type ?? "text"} defaultValue={defaultValue}
        min={min} step={step} placeholder={placeholder} required={required} pattern={pattern}
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
        className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900/60 px-2.5 py-1.5 font-mono text-[11px] leading-relaxed text-slate-100 placeholder:text-slate-600 focus:border-lime-300/50 focus:outline-none"
      />
    </label>
  );
}

function Select({
  label, name, defaultValue, options,
}: {
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
