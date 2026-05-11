import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "./types";

/**
 * Server-side Supabase client.
 *
 * Use in:
 *   - Server Components — read auth + data on the server
 *   - Server Actions    — mutations with full RLS enforcement
 *   - Route Handlers    — API endpoints under /api/*
 *
 * Why a factory rather than a singleton: `cookies()` is request-scoped
 * in Next.js, so a single client would leak the wrong session across
 * concurrent requests. The factory captures the current request's
 * cookie store on construction.
 *
 * Cookie-set inside RSC throws (RSC is read-only). The catch is by
 * design: middleware writes the cookies, RSC just observes them.
 */
export function createServerSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Supabase env missing — set NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY in apps/web/.env.local and via " +
        "`vercel env add` for production.",
    );
  }
  const cookieStore = cookies();
  return createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component — Next.js disallows cookie
          // writes there. Middleware is responsible for refreshing the
          // session cookie; this `catch` is the documented Supabase
          // pattern.
        }
      },
    },
  });
}
