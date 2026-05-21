"use client";

// Supabase-backed `useAuth()` adapter.
//
// Subscribes to `supabase.auth.onAuthStateChange()` so the surface
// reacts to sign-in / sign-out events anywhere in the app (other tabs
// included). On every session change we read `public.users` +
// `public.profiles` to materialise the canonical `User` shape — same
// fields the legacy Zustand mock exposes.
//
// This module is consumed only when `NEXT_PUBLIC_AUTH_ENABLED === "true"`.
// The Zustand mock at `./store` still drives every other case, so the
// migration is opt-in per environment.

import { useCallback, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";
import { isSupabaseAuthConfigured } from "./auth-mode";
import type { Database } from "@/lib/supabase/types";
import type { SignInResult, User, UserRole, UserTier } from "./types";

interface SupabaseAuthState {
  user: User | null;
  isAuthenticated: boolean;
  isHydrated: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void>;
}

type UsersRow = Database["public"]["Tables"]["users"]["Row"];
type ProfilesRow = Database["public"]["Tables"]["profiles"]["Row"];

function deriveDisplayName(
  profile: Pick<ProfilesRow, "full_name"> | null,
  email: string,
): string {
  return profile?.full_name ?? email.split("@")[0] ?? email;
}

async function hydrateUser(session: Session | null): Promise<User | null> {
  if (!session?.user) return null;
  const supabase = createBrowserSupabaseClient();

  // Pull the canonical app-level row + profile in one round-trip.
  const [{ data: appUser }, { data: profile }] = await Promise.all([
    supabase
      .from("users")
      .select("id, email, tier, role, current_organization_id")
      .eq("id", session.user.id)
      .maybeSingle<Pick<UsersRow, "id" | "email" | "tier" | "role" | "current_organization_id">>(),
    supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", session.user.id)
      .maybeSingle<Pick<ProfilesRow, "full_name">>(),
  ]);

  // First-sign-in race: the `handle_new_user` trigger runs in the same
  // transaction as the auth.users insert, so the row should always be
  // there by the time we read. Fall back to a free-tier shell when the
  // probe somehow misses — the next refetch will pick the row up.
  const baseEmail = session.user.email ?? appUser?.email ?? "user@hotelvalora.com";
  return {
    id: session.user.id,
    email: baseEmail,
    name: deriveDisplayName(profile, baseEmail),
    tier: (appUser?.tier ?? "free") as UserTier,
    role: (appUser?.role ?? "user") as UserRole,
    ...(appUser?.current_organization_id
      ? { organization: appUser.current_organization_id }
      : {}),
  };
}

export function useSupabaseAuth(): SupabaseAuthState {
  // Preview deploys (and any environment missing the Supabase NEXT_PUBLIC_*
  // vars) must NOT crash when this hook is mounted by AppHeader on every
  // surface. Detecting the env at hook entry lets us short-circuit the
  // session-refresh effect + every callback so the page renders normally
  // in a "signed-out / hydrated" state — same behavior as if no user
  // had ever signed in.
  const envOk = isSupabaseAuthConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [isHydrated, setIsHydrated] = useState(!envOk);

  useEffect(() => {
    if (!envOk) return;

    let cancelled = false;
    const supabase = createBrowserSupabaseClient();

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      const hydrated = await hydrateUser(data.session);
      if (cancelled) return;
      setUser(hydrated);
      setIsHydrated(true);
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const hydrated = await hydrateUser(session);
        if (cancelled) return;
        setUser(hydrated);
        setIsHydrated(true);
      },
    );

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [envOk]);

  const signIn = useCallback(
    async (email: string, password: string): Promise<SignInResult> => {
      if (!envOk) {
        return {
          ok: false,
          error: "Authentication not configured for this environment.",
        };
      }
      if (!email.trim() || !password.trim()) {
        return { ok: false, error: "Email and password required." };
      }
      const supabase = createBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        // Most common case: the user has only ever signed in with Google,
        // so there's no password on file. Steer them to the OAuth button.
        return {
          ok: false,
          error:
            error.message === "Invalid login credentials"
              ? "Use the Google button below — this account doesn't have a password yet."
              : error.message,
        };
      }
      return { ok: true };
    },
    [envOk],
  );

  const signOut = useCallback(async () => {
    if (!envOk) return;
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
  }, [envOk]);

  return {
    user,
    isAuthenticated: user !== null,
    isHydrated,
    signIn,
    signOut,
  };
}
