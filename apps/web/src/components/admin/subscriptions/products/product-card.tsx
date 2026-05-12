import Link from "next/link";
import { Check, X, EyeOff, Eye, Archive, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProductWithMetrics } from "@/lib/admin/subscriptions/products/live";
import { setProductVisibilityAction } from "@/lib/admin/subscriptions/products/mutations";

/**
 * Phase 2.D.7 · Subscription product card.
 *
 * Stripe/Notion-style pricing card with an operator-only metric strip
 * (active users + MRR + total subs) layered on top. Tap the card body
 * to edit · the price block shows monthly · per-year is surfaced via
 * the subtitle line.
 *
 * Mobile-first: cards are full-width on small screens, 2-col at sm,
 * 4-col at lg. Touch targets are >= 44px.
 */
export function ProductCard({
  product,
  editHref,
}: {
  product: ProductWithMetrics;
  editHref: string;
}) {
  const isHidden = product.visibility === "hidden";
  const isArchived = product.visibility === "archived";
  const accent = themeClasses(product.color_theme);
  const isFree = (product.monthly_price ?? 0) === 0;

  // Inline visibility toggle target — Hidden ↔ Visible. Archived stays
  // out of this quick-action (irreversible-ish state).
  const nextVisibility = isHidden ? "visible" : "hidden";

  return (
    <div className={cn(
      "group relative flex h-full flex-col rounded-2xl border bg-white shadow-sm transition-all",
      "hover:-translate-y-0.5 hover:shadow-lg",
      accent.border,
      isHidden && "opacity-70",
      isArchived && "opacity-50",
    )}>
      <Link
        href={editHref}
        scroll={false}
        aria-label={`Edit ${product.name}`}
        className="absolute inset-0 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-lime-300"
      />

      {product.badge && (
        <div className={cn(
          "pointer-events-none absolute -top-2 left-4 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-headline text-[9px] font-extrabold uppercase tracking-[0.22em] shadow",
          accent.badge,
        )}>
          <Sparkles size={9} /> {product.badge}
        </div>
      )}

      {/* Visibility flag · top-right corner (display + inline toggle) */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
        {isArchived && (
          <span className="pointer-events-none inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 font-headline text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <Archive size={9} /> Archived
          </span>
        )}
        {!isArchived && (
          <form action={setProductVisibilityAction}>
            <input type="hidden" name="productId" value={product.id} />
            <input type="hidden" name="visibility" value={nextVisibility} />
            <button
              type="submit"
              aria-label={isHidden ? "Make visible" : "Hide"}
              title={isHidden ? "Make visible" : "Hide"}
              className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-1 font-headline text-[9px] font-bold uppercase tracking-[0.18em] ring-1 transition-colors",
                isHidden
                  ? "bg-amber-100 text-amber-700 ring-amber-200 hover:bg-amber-200"
                  : "bg-white/0 text-slate-400 ring-transparent hover:bg-slate-100 hover:text-slate-600 hover:ring-slate-200",
              )}
            >
              {isHidden ? <Eye size={11} /> : <EyeOff size={11} />}
              {isHidden && <span>Hidden</span>}
            </button>
          </form>
        )}
      </div>

      <div className="relative z-[1] pointer-events-none p-5 [&_a]:pointer-events-auto [&_button]:pointer-events-auto [&_form]:pointer-events-auto">
        <p className={cn("font-headline text-[10px] font-extrabold uppercase tracking-[0.25em]", accent.label)}>
          {product.slug}
        </p>
        <h3 className="mt-1 font-headline text-xl font-extrabold tracking-tight text-forest-900">
          {product.name}
        </h3>
        {product.subtitle && (
          <p className="mt-1 text-[12.5px] leading-snug text-slate-500">{product.subtitle}</p>
        )}

        {/* Price block */}
        <div className="mt-4">
          {isFree ? (
            <p className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900">
              Free
            </p>
          ) : (
            <div className="flex items-baseline gap-1">
              <span className="font-headline text-3xl font-extrabold tracking-tighter text-forest-900">
                {formatCurrency(product.monthly_price ?? 0, product.currency)}
              </span>
              <span className="font-mono text-[10.5px] text-slate-500">/ month</span>
            </div>
          )}
          {!isFree && product.yearly_price !== null && (
            <p className="mt-0.5 font-mono text-[10.5px] text-slate-500">
              or {formatCurrency(product.yearly_price ?? 0, product.currency)} / year{" "}
              <span className="text-emerald-600">({yearlyDiscount(product)})</span>
            </p>
          )}
          {product.vat_display !== "none" && !isFree && (
            <p className="mt-0.5 font-mono text-[9.5px] text-slate-400">
              {product.vat_display === "inclusive" ? "VAT included" : "+ VAT"}
            </p>
          )}
        </div>

        {/* Feature bullets · max 4 surfaced */}
        {product.features.length > 0 && (
          <ul className="mt-5 space-y-1.5">
            {product.features.slice(0, 6).map((f, i) => (
              <li
                key={i}
                className={cn(
                  "flex items-start gap-2 text-[12px] leading-snug",
                  f.included ? "text-slate-700" : "text-slate-400 line-through",
                )}
              >
                {f.included ? (
                  <Check size={12} className={cn("mt-0.5 shrink-0", accent.check)} />
                ) : (
                  <X size={12} className="mt-0.5 shrink-0 text-slate-300" />
                )}
                <span>{f.title}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Operator-only metric strip — only operator sees this surface */}
      <div className={cn("relative z-[1] pointer-events-none mt-auto rounded-b-2xl border-t bg-slate-50 px-5 py-3", accent.footer)}>
        <dl className="grid grid-cols-3 gap-3 text-center">
          <Metric label="Active" value={product.metrics.active_users} />
          <Metric
            label="MRR"
            value={product.metrics.mrr > 0
              ? formatCurrency(product.metrics.mrr, product.currency)
              : "—"}
          />
          <Metric label="Total" value={product.metrics.total_subscriptions} />
        </dl>
      </div>
    </div>
  );
}

export function NewProductCard({ href }: { href: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      className="group flex min-h-[280px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-white/40 p-6 text-center transition-colors hover:border-lime-400 hover:bg-lime-50/60"
    >
      <div className="rounded-full bg-forest-900 p-3 text-lime-300 shadow-sm transition-transform group-hover:scale-110">
        <Sparkles size={20} />
      </div>
      <p className="mt-3 font-headline text-[13px] font-extrabold uppercase tracking-[0.2em] text-forest-900">
        New product
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500">
        Define a new tier · monthly / yearly price · feature list · color theme · campaign attribution
      </p>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="font-headline text-[8.5px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className="mt-0.5 font-headline text-[13px] font-extrabold text-forest-900">{value}</dd>
    </div>
  );
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-IE", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function yearlyDiscount(p: ProductWithMetrics): string {
  if (!p.monthly_price || !p.yearly_price) return "";
  const annualised = p.monthly_price * 12;
  if (annualised <= p.yearly_price) return "";
  const pct = Math.round(((annualised - p.yearly_price) / annualised) * 100);
  if (pct < 1) return "";
  return `save ${pct}%`;
}

function themeClasses(theme: string): {
  border: string;
  badge: string;
  label: string;
  check: string;
  footer: string;
} {
  switch (theme) {
    case "emerald":
      return {
        border: "border-emerald-200",
        badge: "bg-emerald-100 text-emerald-700",
        label: "text-emerald-600",
        check: "text-emerald-500",
        footer: "border-emerald-100/60",
      };
    case "amber":
      return {
        border: "border-amber-200",
        badge: "bg-amber-100 text-amber-800",
        label: "text-amber-700",
        check: "text-amber-500",
        footer: "border-amber-100/60",
      };
    case "rose":
      return {
        border: "border-rose-200",
        badge: "bg-rose-100 text-rose-800",
        label: "text-rose-700",
        check: "text-rose-500",
        footer: "border-rose-100/60",
      };
    case "slate":
      return {
        border: "border-slate-200",
        badge: "bg-slate-100 text-slate-700",
        label: "text-slate-600",
        check: "text-slate-500",
        footer: "border-slate-100/60",
      };
    case "forest":
      return {
        border: "border-forest-900/40",
        badge: "bg-forest-900 text-lime-300",
        label: "text-forest-900",
        check: "text-forest-900",
        footer: "border-forest-900/15",
      };
    case "lime":
    default:
      return {
        border: "border-lime-200",
        badge: "bg-lime-300 text-forest-900",
        label: "text-lime-700",
        check: "text-lime-600",
        footer: "border-lime-100/60",
      };
  }
}
