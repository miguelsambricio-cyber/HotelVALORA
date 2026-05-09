"use client";

import type { ReactNode } from "react";
import { ChevronRight, Linkedin } from "lucide-react";
import { cn } from "@/lib/utils";

// ── OAuth contract ─────────────────────────────────────────────────────────
//
// `OAuthProvider` is the canonical id used across the app for
// social/identity providers. When real OAuth ships (NextAuth / Clerk /
// Auth.js), the hook surface stays identical:
//
//   <LinkedInstitutionalAccounts onLink={(p) => signIn(p)} />
//
// Today the cards render mock state and `onLink` is a no-op (the caller
// can pass a handler to fire toast / route, but it doesn't perform OAuth).

export type OAuthProvider = "linkedin" | "google" | "apple";
export type LinkedAccountState = "connected" | "available";

export interface LinkedAccount {
  provider: OAuthProvider;
  name: string;
  state: LinkedAccountState;
  /** Email shown when state is "connected" — small caption under the name */
  linkedEmail?: string;
}

export interface LinkedInstitutionalAccountsProps {
  /** Override the default mocked set (LinkedIn connected, others available) */
  accounts?: LinkedAccount[];
  /** Fires when the user clicks "Link Account" on an available provider */
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
 * Each row is a clean enterprise card: provider mark on the left, name +
 * (when connected) email beneath, state pill or "Link Account" CTA on the
 * right. Visual matches the rest of the auth experience — slate-200
 * borders, rounded-xl, no gradients.
 */
export function LinkedInstitutionalAccounts({
  accounts = DEFAULT_ACCOUNTS,
  onLink,
  onUnlink,
  className,
}: LinkedInstitutionalAccountsProps) {
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
            onLink={onLink}
            onUnlink={onUnlink}
          />
        ))}
      </div>
    </div>
  );
}

// ── Per-provider row ───────────────────────────────────────────────────────

interface ProviderRowProps {
  account: LinkedAccount;
  onLink?: (p: OAuthProvider) => void;
  onUnlink?: (p: OAuthProvider) => void;
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
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50",
          )}
        >
          {PROVIDER_MARKS[account.provider]}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-bold text-slate-800 leading-tight">
            {account.name}
          </span>
          {isConnected && account.linkedEmail && (
            <span className="text-[10px] uppercase tracking-wider text-slate-400 truncate leading-tight mt-0.5">
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
          onClick={() => onLink?.(account.provider)}
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

// ── Provider marks ─────────────────────────────────────────────────────────
//
// LinkedIn uses lucide's `Linkedin` (stroke icon — keeps weight consistent
// with the rest of the app). Google and Apple use minimal monochrome
// inline SVGs — sourced as the public-domain wordmark silhouettes,
// stripped of multi-colour decoration so they read as enterprise-neutral.

const PROVIDER_MARKS: Record<OAuthProvider, ReactNode> = {
  linkedin: <Linkedin size={18} className="text-[#0A66C2]" strokeWidth={2} />,
  google: <GoogleMark />,
  apple: <AppleMark />,
};

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-700"
      aria-hidden
    >
      <path d="M21.35 11.1H12v3.83h5.59c-.51 2.45-2.6 4.07-5.59 4.07-3.36 0-6.06-2.71-6.06-6.06s2.71-6.06 6.06-6.06c1.5 0 2.85.51 3.92 1.36l2.83-2.83C16.92 3.97 14.6 3 12 3 7.04 3 3 7.04 3 12s4.04 9 9 9c5.18 0 8.83-3.65 8.83-8.83 0-.59-.05-1.16-.15-1.71z" />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="text-slate-800"
      aria-hidden
    >
      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
    </svg>
  );
}
