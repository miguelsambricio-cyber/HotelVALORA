import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Service-role Supabase client — bypasses Row Level Security.
 *
 * Use ONLY from:
 *   - Server Actions where the action's authorization has been verified
 *   - Route Handlers protected by Auth.js or Supabase auth
 *   - Cron / background jobs
 *
 * NEVER:
 *   - Import from client components (the `import "server-only"` directive
 *     enforces this at build time)
 *   - Use to render data that wouldn't pass the RLS policy for the
 *     calling user — that's a privilege escalation
 *   - Expose the service-role key in any public env var (no `NEXT_PUBLIC_`)
 *
 * Singleton — service-role calls are stateless (no session) so a single
 * client is safe across requests.
 */
let cached: SupabaseClient<Database> | null = null;

export function getSupabaseAdmin(): SupabaseClient<Database> {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin env missing — set NEXT_PUBLIC_SUPABASE_URL and " +
        "SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local (dev) and via " +
        "`vercel env add SUPABASE_SERVICE_ROLE_KEY production`.",
    );
  }
  cached = createClient<Database>(url, serviceKey, {
    auth: {
      // Service-role tokens don't represent a user — disable persistence
      // and auto-refresh entirely.
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      // Next.js wraps the global fetch with a Data Cache layer. For
      // admin / operator queries we always want the freshest row —
      // invitation status, subscription state, audit counts all flip
      // out-of-band. Force every PostgREST roundtrip through this
      // surface to bypass the Data Cache.
      fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }),
    },
  });
  return cached;
}
