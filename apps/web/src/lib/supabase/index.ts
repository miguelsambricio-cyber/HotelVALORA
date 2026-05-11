// Supabase — barrel surface.
//
// Client exports are environment-specific:
//   - browser  → createBrowserSupabaseClient()    (use in client components)
//   - server   → createServerSupabaseClient()     (RSC / actions / route handlers)
//   - middleware → updateSupabaseSession()        (called from middleware.ts)
//   - admin    → getSupabaseAdmin()               (service-role, server-only)
//
// Auth helpers live in `auth-helpers.ts` — they read the server client.

export { createBrowserSupabaseClient } from "./client";
export { createServerSupabaseClient } from "./server";
export { updateSupabaseSession } from "./middleware";
export { getSupabaseAdmin } from "./admin";

export {
  getSupabaseUser,
  requireSupabaseUser,
  isSupabaseConfigured,
  isSupabaseAdminConfigured,
} from "./auth-helpers";
export type { SupabaseUser } from "./auth-helpers";

export type { Database } from "./types";
