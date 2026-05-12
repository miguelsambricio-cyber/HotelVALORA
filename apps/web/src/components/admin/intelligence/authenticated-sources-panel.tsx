import Link from "next/link";
import { KeyRound, ShieldCheck, ShieldAlert, ShieldX } from "lucide-react";
import { cn } from "@/lib/utils";
import { SIGNAL_VISUAL } from "@/components/admin/dashboard/signal-tints";
import type { CredentialsStatusView } from "@/lib/intelligence/credentials-store";
import type { IntegrationDescriptor } from "@/lib/admin/integrations";

export interface AuthenticatedSourceCard {
  integration: IntegrationDescriptor;
  credentialsStatus: CredentialsStatusView;
}

/**
 * Authenticated Sources panel for the Intelligence Terminal. Surfaces
 * the paid-tier sources (Hosteltur + Alimarket) with credentials health,
 * session validity, and last successful login — the operator-facing
 * "what's the state of our institutional access" panel.
 */
export function AuthenticatedSourcesPanel({
  cards,
}: {
  cards: AuthenticatedSourceCard[];
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-800/60 bg-gradient-to-b from-forest-900 to-slate-950 shadow-sm">
      <header className="flex items-center justify-between border-b border-slate-800/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <KeyRound size={14} className="text-slate-400" aria-hidden />
          <h3 className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-400">
            Authenticated Sources
          </h3>
        </div>
        <span className="font-mono text-[10.5px] text-slate-500">
          {cards.length} paid-tier
        </span>
      </header>
      <div className="grid gap-3 p-5 md:grid-cols-2">
        {cards.map(({ integration, credentialsStatus }) => (
          <Card
            key={integration.id}
            integration={integration}
            credentialsStatus={credentialsStatus}
          />
        ))}
      </div>
    </section>
  );
}

function Card({
  integration,
  credentialsStatus,
}: AuthenticatedSourceCard) {
  const credBadge = credentialsBadge(credentialsStatus);
  const sessionBadge = sessionBadgeFor(integration);
  return (
    <Link
      href={`/user/admin/integrations/${integration.id}`}
      className="group flex flex-col gap-3 rounded-xl border border-slate-800/60 bg-slate-900/40 p-4 transition-colors hover:border-lime-300/40"
    >
      <header className="flex items-center justify-between gap-2">
        <p className="font-headline text-base font-extrabold tracking-tight text-white">
          {integration.name}
        </p>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">
          {integration.region} · {integration.language.toUpperCase()}
        </span>
      </header>

      <div className="flex flex-wrap gap-1.5">
        <Badge {...credBadge} icon={credBadge.icon} />
        <Badge {...sessionBadge} icon={sessionBadge.icon} />
      </div>

      <dl className="grid grid-cols-3 gap-2 border-t border-slate-800/60 pt-3 text-[11px]">
        <Cell label="Last Login" value={formatRelativeUtc(credentialsStatus.lastLoginAt)} />
        <Cell label="Rotations" value={String(credentialsStatus.rotationCount)} mono />
        <Cell label="Articles · 7d" value={String(integration.health.articles7d)} mono />
      </dl>
    </Link>
  );
}

interface BadgeProps {
  label: string;
  signal: "ok" | "warn" | "error" | "neutral";
  icon: React.ReactNode;
}

function Badge({ label, signal, icon }: BadgeProps) {
  const sig = SIGNAL_VISUAL[signal];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-headline text-[10px] font-bold uppercase tracking-[0.18em] ring-1",
        sig.bg,
        sig.ring,
        sig.text,
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="font-headline text-[9px] font-bold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </dt>
      <dd className={mono ? "mt-0.5 font-mono text-[11.5px] text-lime-300" : "mt-0.5 text-[11.5px] text-slate-300"}>
        {value || "—"}
      </dd>
    </div>
  );
}

function credentialsBadge(status: CredentialsStatusView): BadgeProps {
  if (!status.configured) {
    return {
      label: "Not Provisioned",
      signal: "warn",
      icon: <ShieldX size={11} aria-hidden />,
    };
  }
  if (status.status === "invalidated") {
    return {
      label: "Invalidated",
      signal: "error",
      icon: <ShieldX size={11} aria-hidden />,
    };
  }
  if (status.lastLoginStatus === "failure") {
    return {
      label: "Auth Failing",
      signal: "error",
      icon: <ShieldAlert size={11} aria-hidden />,
    };
  }
  return {
    label: "Encrypted · Active",
    signal: "ok",
    icon: <ShieldCheck size={11} aria-hidden />,
  };
}

function sessionBadgeFor(integration: IntegrationDescriptor): BadgeProps {
  const s = integration.session;
  if (!s || !integration.requiresAuth) {
    return {
      label: "No Auth",
      signal: "neutral",
      icon: <ShieldCheck size={11} aria-hidden />,
    };
  }
  switch (s.status) {
    case "active_session":
      return { label: "Session Active", signal: "ok", icon: <ShieldCheck size={11} aria-hidden /> };
    case "session_expiring":
      return { label: "Expiring Soon", signal: "warn", icon: <ShieldAlert size={11} aria-hidden /> };
    case "session_expired":
      return { label: "Session Expired", signal: "warn", icon: <ShieldAlert size={11} aria-hidden /> };
    case "refresh_failed":
      return { label: "Refresh Failed", signal: "error", icon: <ShieldX size={11} aria-hidden /> };
    case "not_provisioned":
      return { label: "Session Pending", signal: "neutral", icon: <ShieldX size={11} aria-hidden /> };
    case "no_auth_required":
      return { label: "No Auth", signal: "neutral", icon: <ShieldCheck size={11} aria-hidden /> };
  }
}

function formatRelativeUtc(iso: string | null): string {
  if (!iso) return "Never";
  const ts = new Date(iso).getTime();
  if (!Number.isFinite(ts)) return "Never";
  const diffMs = Date.now() - ts;
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}
