"use client";

// Auth state — mock implementation for v1.
//
// Architecture
// ────────────
// Zustand store with `signIn` / `signOut` actions. The store is in-memory
// only (reload = signed out) — by design, since real session persistence
// will come from the auth provider's cookie/JWT when we wire Supabase or
// Clerk. The hook surface (`useAuthStore`, `useAuth`) stays identical
// across that swap.
//
// Mock auth rules (v1)
// ────────────────────
// Any non-empty email + password authenticates. The user's tier is
// inferred from the email — useful for demo'ing each tier without needing
// real accounts:
//
//   institutional@…  → institutional   (also `@institutional.test`)
//   premium@…        → premium         (default for plain emails)
//   pro@…            → pro
//   free@…           → free
//
// Future
// ──────
// Replace `signIn` with `supabase.auth.signInWithPassword(...)` (or
// Clerk equivalent) and populate `user.tier` from the row in the `users`
// table. Add `signInWithProvider` for SSO (LinkedIn / Google / Microsoft
// / Apple — mockup-style social access surface).

import { create } from "zustand";
import type { SignInResult, User, UserTier } from "./types";

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  isAuthenticated: false,

  signIn: async (email, password) => {
    if (!email.trim() || !password.trim()) {
      return { ok: false, error: "Email and password required." };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { ok: false, error: "Enter a valid email address." };
    }
    if (password.length < 4) {
      return { ok: false, error: "Password must be at least 4 characters." };
    }
    // Simulate a brief network round-trip for realism
    await new Promise((r) => setTimeout(r, 350));

    const tier = inferTierFromEmail(email);
    const user: User = {
      id: `demo-${email.toLowerCase()}`,
      email,
      name: email.split("@")[0],
      tier,
      ...(tier === "institutional" ? { organization: "HotelVALORA Demo Institutional" } : {}),
    };
    set({ user, isAuthenticated: true });
    return { ok: true };
  },

  signOut: () => set({ user: null, isAuthenticated: false }),
}));

/** Convenience hook — `[user, signIn, signOut]` tuple. */
export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const signIn = useAuthStore((s) => s.signIn);
  const signOut = useAuthStore((s) => s.signOut);
  return { user, signIn, signOut, isAuthenticated: user !== null };
}

// ── Tier inference (mock helper) ────────────────────────────────────────────

function inferTierFromEmail(email: string): UserTier {
  const local = email.toLowerCase().split("@")[0];
  const domain = email.toLowerCase().split("@")[1] ?? "";
  if (local.includes("institutional") || domain.includes("institutional")) {
    return "institutional";
  }
  if (local.includes("free") || domain.includes("free")) return "free";
  if (local.includes("pro") || domain.includes("pro")) return "pro";
  // Default for any plain demo email — keeps the editable underwriting
  // experience visible without the user needing to type a tier hint
  return "premium";
}
