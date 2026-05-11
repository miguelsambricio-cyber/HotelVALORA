"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Browser-side Supabase client.
 *
 * Use in client components / hooks where the auth context (cookie-based
 * JWT) must stay in sync with the user's session. Reads the same
 * cookies that the server client writes, so RSC + client stay coherent.
 *
 * Env requirements:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Both are public — the anon key is safe in the browser when Row Level
 * Security policies are in place (see `docs/database/schema.sql`).
 *
 * Calling `createBrowserSupabaseClient()` before the env is provisioned
 * throws at call-time so callers can render a graceful fallback.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env missing — set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local and via " +
        "`vercel env add` for production.",
    );
  }
  return createBrowserClient<Database>(url, anon);
}
