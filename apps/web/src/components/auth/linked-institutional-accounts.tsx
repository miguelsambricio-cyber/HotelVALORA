"use client";

import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useOAuth,
  type LinkedAccount,
  type OAuthProvider,
} from "@/lib/auth";
import { PROVIDER_MARKS } from "./provider-marks";

// Re-export the canonical types so existing consumers that imported them
// from this file keep resolving without changes.
export type {
  LinkedAccount,
  LinkedAccountState,
  OAuthProvider,
} from "@/lib/auth";

export interface LinkedInstitutionalAccountsProps {
  /** Override the default mocked set (LinkedIn connected, others available) */
  accounts?: LinkedAccount[];
  /**
   * Fires when the user clicks "Link Account" on an available provider.
   * If omitted, the component falls back to `useOAuth().signInWithProvider`
   * — which is a no-op + console.warn until NextAuth is wired (v1).
   */
  onLink?: (provider: OAuthProvider) => void;
  /** Fires when the user clicks "Disconnect" on a connected provider (future) */
  onUnlink?: (provider: OAuthProvider) => void;
  className?: string;
}

const DEFAULT_ACCOUNTS: LinkedAccount[] = [
  {
    provider: "linkedin",
    name: "LinkedIn",
    state: "connected",
    linkedEmail: "miguel@valora.com",
  },
  { provider: "google", name: "Google", state: "available" },
  { provider: "apple", name: "Apple", state: "available" },
];

/**
 * Institutional "Linked Accounts" section displayed beneath the auth card.
 *
 * UI is decoupled from auth runtime: the cards capture click intent and
 * route through `useOAuth().signInWithProvider` by default — which today
 * is a no-op + console.warn (v1 mock). When NextAuth wires through (v2),
 * the swap happens inside `useOAuth` and inside `OAUTH_PROVIDERS` (set
 * `enabled: true` per provider). No edit to this file is required.
 */
export function LinkedInstitutionalAccounts({
  accounts = DEFAULT_ACCOUNTS,
  onLink,
  onUnlink,
  className,
}: LinkedInstitutionalAccountsProps) {
  const { signInWithProvider, unlinkProvider } = useOAuth();
  const handleLink = onLink ?? ((p: OAuthProvider) => void signInWithProvider(p));
  const handleUnlink =
    onUnlink ?? ((p: OAuthProvider) => void unlinkProvider(p));

  return (
    <div className={cn("w-full", className)}>
      {/* Section divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Linked Institutional Accounts
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {accounts.map((acc) => (
          <ProviderRow
            key={acc.provider}
            account={acc}
            onLink={handleLink}
            onUnlink={handleUnlink}
          />
        ))}
      </div>
    </div>
  );
}

// ── Per-provider row ───────────────────────────────────────────────────────

interface ProviderRowProps {
  account: LinkedAccount;
  onLink: (p: OAuthProvider) => void;
  onUnlink: (p: OAuthProvider) => void;
}

function ProviderRow({ account, onLink }: ProviderRowProps) {
  const isConnected = account.state === "connected";
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 transition-colors",
        "hover:border-slate-300",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
          {PROVIDER_MARKS[account.provider]}
        </div>
        <div className="flex min-w-0 flex-col">
          <span className="text-sm font-bold leading-tight text-slate-800">
            {account.name}
          </span>
          {isConnected && account.linkedEmail && (
            <span className="mt-0.5 truncate text-[10px] uppercase leading-tight tracking-wider text-slate-400">
              {account.linkedEmail}
            </span>
          )}
        </div>
      </div>

      {isConnected ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Connected
        </span>
      ) : (
        <button
          type="button"
          onClick={() => onLink(account.provider)}
          className={cn(
            "inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-3 py-1.5",
            "text-[11px] font-bold uppercase tracking-wider text-slate-600 transition-colors",
            "hover:border-forest-900/30 hover:bg-slate-50 hover:text-forest-900",
            "focus:outline-none focus:ring-2 focus:ring-forest-900/20",
          )}
          aria-label={`Link ${account.name} account`}
        >
          Link Account
          <ChevronRight size={12} strokeWidth={2.5} />
        </button>
      )}
    </div>
  );
}

// Provider marks live in `./provider-marks` — shared with the credentials
// page's LinkedAccountCard grid.
