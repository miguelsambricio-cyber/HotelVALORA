"use client";

import { cn } from "@/lib/utils";
import { useOAuth, type OAuthProvider } from "@/lib/auth";
import { PROVIDER_MARKS } from "@/components/auth/provider-marks";

export type LinkedAccountCardState = "connected" | "available" | "enterprise";

export interface LinkedAccountCardTopRightAction {
  label: string;
  variant?: "danger" | "neutral";
  onClick?: () => void;
}

export interface LinkedAccountCardBadge {
  label: string;
  variant?: "neutral" | "info" | "enterprise";
}

export interface LinkedAccountCardProps {
  /** OAuth provider id — drives the icon mark */
  provider: OAuthProvider;
  /** Display title (overrides registry label, e.g. "Google Workspace") */
  title: string;
  /** Body description / connected email */
  description: string;
  /** Bottom CTA label (e.g. "Connect Account", "Unlink Account") */
  ctaLabel: string;
  /** Optional small action in top-right (e.g. red "Disconnect" link) */
  topRightAction?: LinkedAccountCardTopRightAction;
  /** Optional small badge in top-right (e.g. "ENTERPRISE") — alternative to action */
  badge?: LinkedAccountCardBadge;
  className?: string;
}

const BADGE_STYLES: Record<NonNullable<LinkedAccountCardBadge["variant"]>, string> = {
  neutral: "bg-slate-100 text-slate-600 border-slate-200",
  info: "bg-blue-50 text-blue-700 border-blue-200",
  enterprise: "bg-amber-50 text-amber-800 border-amber-200",
};

/**
 * Institutional account card for the Credentials page grid.
 *
 * Visual: rounded-xl white card, slate-200 border, soft hover shadow.
 * Header row carries the provider mark + an optional top-right slot
 * (either a danger-coloured action like "Disconnect" or a static badge
 * like "ENTERPRISE"). Body shows title + description; bottom hosts the
 * full-width CTA in a ghost/outlined style.
 *
 * Click intent routes through `useOAuth` — today a no-op + console.warn
 * (mock UI only). When NextAuth wires through, the same hook signs in /
 * unlinks the provider with no UI change here.
 */
export function LinkedAccountCard({
  provider,
  title,
  description,
  ctaLabel,
  topRightAction,
  badge,
  className,
}: LinkedAccountCardProps) {
  const { signInWithProvider } = useOAuth();
  const handleCta = () => void signInWithProvider(provider);

  return (
    <div
      className={cn(
        "flex flex-col rounded-xl border border-slate-200 bg-white p-5 transition-all",
        "hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(0,51,30,0.06)]",
        className,
      )}
    >
      {/* Top row — icon + (action | badge) */}
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          {PROVIDER_MARKS[provider]}
        </div>
        {topRightAction ? (
          <TopAction action={topRightAction} />
        ) : badge ? (
          <Badge badge={badge} />
        ) : null}
      </div>

      {/* Title + description */}
      <div className="flex-1">
        <h3 className="font-headline text-sm font-bold text-forest-900">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          {description}
        </p>
      </div>

      {/* Bottom CTA */}
      <button
        type="button"
        onClick={handleCta}
        className={cn(
          "mt-5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] font-bold uppercase tracking-[0.15em] text-slate-700 transition-colors",
          "hover:border-forest-900/30 hover:bg-slate-50 hover:text-forest-900",
          "focus:outline-none focus:ring-2 focus:ring-forest-900/20",
        )}
        aria-label={`${ctaLabel} for ${title}`}
      >
        {ctaLabel}
      </button>
    </div>
  );
}

// ── Top-right action / badge ────────────────────────────────────────────────

function TopAction({ action }: { action: LinkedAccountCardTopRightAction }) {
  const isDanger = action.variant === "danger";
  return (
    <button
      type="button"
      onClick={action.onClick}
      className={cn(
        "text-[10px] font-bold uppercase tracking-[0.18em] transition-colors",
        isDanger ? "text-red-600 hover:text-red-700" : "text-slate-500 hover:text-forest-900",
      )}
    >
      {action.label}
    </button>
  );
}

function Badge({ badge }: { badge: LinkedAccountCardBadge }) {
  const variant = badge.variant ?? "neutral";
  return (
    <span
      className={cn(
        "rounded-md border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em]",
        BADGE_STYLES[variant],
      )}
    >
      {badge.label}
    </span>
  );
}
