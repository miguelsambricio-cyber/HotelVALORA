import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Cookie-less anonymous Supabase client for server-side reads of
 * publicly-accessible tables (RLS public-read policy applies).
 *
 * Use cases
 *   - Build-time SSG fetches (no request context, no cookies)
 *   - Server Component reads that don't need the visitor's session
 *
 * Differs from `createServerSupabaseClient()` which uses cookies +
 * `@supabase/ssr` to surface the authenticated user's session. Here we
 * deliberately do NOT touch cookies, so RLS evaluates against the
 * anonymous role and the response matches what an anonymous visitor
 * would see.
 *
 * NEVER use this for queries that depend on `auth.uid()` — they will
 * always return empty rows.
 */

let cached: ReturnType<typeof createClient<Database>> | null = null;

export function createAnonServerSupabaseClient() {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "createAnonServerSupabaseClient: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY required",
    );
  }
  cached = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return cached;
}
