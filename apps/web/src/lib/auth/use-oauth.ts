"use client";

// OAuth sign-in hook — shared between the login card and the linked-
// accounts panel.
//
// Two engines, picked at runtime by `isAuthEnabledClient()`:
//
//   • Supabase Auth (production)
//       `supabase.auth.signInWithOAuth({ provider, options: { redirectTo }})`
//       Supabase handles the OAuth dance with the provider (creds set
//       in the Supabase Dashboard, NOT in app env). On success Supabase
//       redirects back to `/auth/callback?code=...&next=<...>`, which
//       exchanges the code for an HttpOnly session cookie and forwards
//       to `next`.
//
//   • Auth.js v5 (legacy / parked)
//       Falls through to `next-auth/react`'s `signIn(providerId)` when
//       Supabase Auth is disabled. The Auth.js scaffold still ships in
//       the repo for future non-OAuth flows (magic links, credentials).
//
// Surface is unchanged: components keep calling
// `signInWithProvider("google")` exactly the same way.

import { signIn, signOut } from "next-auth/react";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isAuthEnabledClient } from "./auth-mode";
import { OAUTH_PROVIDERS } from "./providers";
import type { OAuthProvider } from "./types";

export interface OAuthSignInResult {
  ok: boolean;
  error?: string;
}

const SUPABASE_PROVIDER_MAP: Record<OAuthProvider, string> = {
  google: "google",
  linkedin: "linkedin_oidc",
  apple: "apple",
  microsoft: "azure",
};

/** Default landing target after sign-in. Single source so the callback
 *  handler and this hook stay in lockstep. */
const DEFAULT_CALLBACK_PATH = "/settings/profile";

export function useOAuth() {
  const signInWithProvider = async (
    id: OAuthProvider,
  ): Promise<OAuthSignInResult> => {
    const provider = OAUTH_PROVIDERS[id];
    if (!provider.enabled) {
      console.warn(
        `[auth] OAuth provider "${id}" is disabled in the registry.`,
      );
      return { ok: false, error: "Provider not enabled" };
    }

    // Production path — Supabase Auth.
    if (isAuthEnabledClient()) {
      try {
        const supabase = createBrowserSupabaseClient();
        const origin =
          typeof window !== "undefined"
            ? window.location.origin
            : "https://www.hotelvalora.com";
        const next = encodeURIComponent(DEFAULT_CALLBACK_PATH);
        const { error } = await supabase.auth.signInWithOAuth({
          provider: SUPABASE_PROVIDER_MAP[id] as "google" | "linkedin_oidc" | "apple" | "azure",
          options: {
            redirectTo: `${origin}/auth/callback?next=${next}`,
            queryParams:
              id === "google"
                ? { access_type: "offline", prompt: "consent" }
                : undefined,
          },
        });
        if (error) {
          console.error(`[auth] Supabase signInWithOAuth(${id}) failed`, error);
          return { ok: false, error: error.message };
        }
        return { ok: true };
      } catch (err) {
        console.error(`[auth] Supabase signInWithOAuth(${id}) threw`, err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Sign-in failed",
        };
      }
    }

    // Legacy path — Auth.js v5 scaffold (no real backend until
    // GOOGLE_CLIENT_ID etc. are populated and AUTH_ENABLED flips).
    try {
      await signIn(provider.nextAuthId, {
        callbackUrl: DEFAULT_CALLBACK_PATH,
        redirect: true,
      });
      return { ok: true };
    } catch (err) {
      console.error(`[auth] next-auth signIn(${id}) failed`, err);
      return {
        ok: false,
        error: err instanceof Error ? err.message : "Sign-in failed",
      };
    }
  };

  const unlinkProvider = async (
    id: OAuthProvider,
  ): Promise<OAuthSignInResult> => {
    // Unlinking is a per-engine concern. Today's surface is a soft
    // sign-out: drops the current session so the user re-links on the
    // next OAuth tap. Full unlink (deleting the `oauth_accounts` row +
    // revoking the provider token) ships with the account settings PR.
    if (isAuthEnabledClient()) {
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signOut();
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    }
    console.warn(`[auth] Unlink for "${id}" — Auth.js scaffold inert.`);
    await signOut({ redirect: false });
    return { ok: true };
  };

  const isProviderEnabled = (id: OAuthProvider): boolean =>
    OAUTH_PROVIDERS[id].enabled;

  return { signInWithProvider, unlinkProvider, isProviderEnabled };
}
