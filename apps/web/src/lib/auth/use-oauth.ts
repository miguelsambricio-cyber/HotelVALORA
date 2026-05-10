"use client";

// OAuth interaction hook — Auth.js v5 wire-up.
//
// `signInWithProvider(id)` calls `signIn(providerId)` from
// `next-auth/react`. Auth.js itself handles the redirect to the
// provider's OAuth page and the callback round-trip via the route
// handler at `/api/auth/[...nextauth]`.
//
// Until OAuth credentials are populated in the environment
// (GOOGLE_CLIENT_ID, LINKEDIN_CLIENT_ID, APPLE_CLIENT_ID, …) the
// provider handshake will 500 at runtime — the UI surface still
// captures intent and routes correctly. The middleware route
// enforcement is opt-in via `AUTH_ENABLED=true`.

import { signIn, signOut } from "next-auth/react";
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
        `[auth] OAuth provider "${id}" is disabled in the registry. ` +
          `Flip OAUTH_PROVIDERS["${id}"].enabled = true to activate.`,
      );
      return { ok: false, error: "Provider not enabled" };
    }

    try {
      // `signIn` returns void when `redirect: true` (default) — Auth.js
      // performs a hard navigation to the provider's authorize URL and
      // never resolves the promise. We treat that as a success path.
      await signIn(provider.nextAuthId, {
        callbackUrl: "/settings/profile",
        redirect: true,
      });
      return { ok: true };
    } catch (err) {
      console.error(`[auth] signIn(${id}) failed`, err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Sign-in failed",
      };
    }
  };

  const unlinkProvider = async (
    id: OAuthProvider,
  ): Promise<OAuthSignInResult> => {
    // True account-unlinking needs a server endpoint (`DELETE
    // /api/account/linked/:id`) backed by a real DB adapter — wired in
    // Phase 3 with Supabase. For now `signOut` is the closest local
    // approximation: drops the current session, the user re-links on
    // the next sign-in.
    console.warn(
      `[auth] Unlink for "${id}" requires the Supabase adapter — Phase 3.`,
    );
    await signOut({ redirect: false });
    return { ok: true };
  };

  const isProviderEnabled = (id: OAuthProvider): boolean =>
    OAUTH_PROVIDERS[id].enabled;

  return { signInWithProvider, unlinkProvider, isProviderEnabled };
}
