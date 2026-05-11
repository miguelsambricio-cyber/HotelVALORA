"use client";

// `useAuth()` — single hook every consumer in the app imports.
//
// One unified surface: `{ user, signIn, signOut, isAuthenticated }`.
// Two underlying engines:
//
//   • Supabase Auth — when NEXT_PUBLIC_AUTH_ENABLED === "true". OAuth +
//     password sign-in flow through `lib/auth/use-supabase-auth.ts`.
//   • Zustand mock  — every other case. Same demo behaviour the app has
//     been shipping (any email + 4+ char password, tier inferred from
//     local-part).
//
// The picker reads a build-time env flag, so swapping engines is a
// single Vercel toggle + redeploy. No consumer ever changes.

import { useMemo } from "react";
import type { SignInResult, User } from "./types";
import { isAuthEnabledClient } from "./auth-mode";
import { useMockAuth } from "./store";
import { useSupabaseAuth } from "./use-supabase-auth";

export interface UseAuthResult {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => Promise<void> | void;
}

export function useAuth(): UseAuthResult {
  // Both hooks ALWAYS run (rules of hooks). The picker just decides which
  // result to surface. The inactive branch is cheap — the mock store is a
  // Zustand selector; the Supabase branch is an effect-driven subscription
  // that resolves to `user: null` quickly when no session exists.
  const supabase = useSupabaseAuth();
  const mock = useMockAuth();

  return useMemo<UseAuthResult>(() => {
    if (isAuthEnabledClient()) {
      return {
        user: supabase.user,
        isAuthenticated: supabase.isAuthenticated,
        signIn: supabase.signIn,
        signOut: supabase.signOut,
      };
    }
    return {
      user: mock.user,
      isAuthenticated: mock.isAuthenticated,
      signIn: mock.signIn,
      signOut: mock.signOut,
    };
  }, [
    supabase.user,
    supabase.isAuthenticated,
    supabase.signIn,
    supabase.signOut,
    mock.user,
    mock.isAuthenticated,
    mock.signIn,
    mock.signOut,
  ]);
}
