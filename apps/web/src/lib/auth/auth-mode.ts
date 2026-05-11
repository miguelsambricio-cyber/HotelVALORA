// Auth-mode switch — single source of truth for "is real auth on".
//
// Set BOTH env vars together (Vercel preview/production):
//   AUTH_ENABLED=true                   ← read on server / edge (middleware)
//   NEXT_PUBLIC_AUTH_ENABLED=true       ← read in client components
//
// Both must be present for the production path (Supabase Auth) to take
// over. When either is missing/false the existing Zustand mock at
// `lib/auth/store.ts` continues to drive the surface so the app keeps
// working through every migration step.

/** Server / edge — middleware route protection reads this. */
export function isAuthEnabledServer(): boolean {
  return process.env.AUTH_ENABLED === "true";
}

/** Client / browser — `useAuth()` picks its source from this. */
export function isAuthEnabledClient(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED === "true";
}

/** True iff a real OAuth callback URL should be wired through Supabase. */
export function isSupabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
