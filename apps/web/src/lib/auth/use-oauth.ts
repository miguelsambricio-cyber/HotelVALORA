"use client";

// OAuth interaction hook — decoupled from any backend so the UI surface
// stays stable across the v1 mock → v2 NextAuth migration.
//
// v1 (today)
// ──────────
// Bodies are no-ops. Calls return `{ ok: false, error: "OAuth not yet
// enabled" }` and emit a `console.warn` so any accidental wiring during
// dev shows up in the console without breaking the page. UI components
// still call the hook so the integration point is real and tested.
//
// v2 (NextAuth wire-up — see providers.ts comment for the full migration
// recipe)
// ──────────
// Replace the bodies with:
//
//   import { signIn, signOut as naSignOut } from "next-auth/react";
//
//   signInWithProvider: async (id) => {
//     if (!OAUTH_PROVIDERS[id].enabled) return { ok: false, ... };
//     const res = await signIn(OAUTH_PROVIDERS[id].nextAuthId, { redirect: true });
//     return { ok: res?.ok ?? false, error: res?.error };
//   }
//
//   unlinkProvider: async (id) => {
//     // Call your API: DELETE /api/account/linked/:id
//     ...
//   }
//
// No UI change required — `LinkedInstitutionalAccounts` already calls
// these handlers via the `onLink` / `onUnlink` props.

import { OAUTH_PROVIDERS } from "./providers";
import type { OAuthProvider } from "./types";

export interface OAuthSignInResult {
  ok: boolean;
  error?: string;
}

export function useOAuth() {
  const signInWithProvider = async (
    id: OAuthProvider,
  ): Promise<OAuthSignInResult> => {
    const provider = OAUTH_PROVIDERS[id];
    if (!provider.enabled) {
      console.warn(
        `[auth] OAuth provider "${id}" is not yet wired to a backend ` +
          `(v1 = mock UI). Set OAUTH_PROVIDERS["${id}"].enabled = true and ` +
          `replace useOAuth body with NextAuth's signIn() to activate.`,
      );
      return { ok: false, error: "Provider not yet enabled" };
    }
    // Future (when enabled = true and NextAuth installed):
    //   import { signIn } from "next-auth/react";
    //   const res = await signIn(provider.nextAuthId);
    //   return { ok: res?.ok ?? false, error: res?.error };
    return { ok: false, error: "OAuth runtime not yet installed" };
  };

  const unlinkProvider = async (
    id: OAuthProvider,
  ): Promise<OAuthSignInResult> => {
    console.warn(
      `[auth] OAuth unlink for "${id}" is not yet wired (v1 = mock UI).`,
    );
    return { ok: false, error: "Unlink not yet wired" };
  };

  const isProviderEnabled = (id: OAuthProvider): boolean =>
    OAUTH_PROVIDERS[id].enabled;

  return { signInWithProvider, unlinkProvider, isProviderEnabled };
}
