import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./types";

/**
 * Edge-middleware helper — refreshes the Supabase session cookie.
 *
 * MUST be called from `middleware.ts` BEFORE any auth check that reads
 * the Supabase user, otherwise expired tokens are never renewed and the
 * user appears signed out after their JWT lifetime.
 *
 * Behaviour when env is missing:
 *   - Returns the original `NextResponse.next({ request })` untouched
 *   - Logs nothing (this is the default state until the user pastes
 *     real Supabase credentials)
 *
 * Behaviour when env is configured:
 *   - Constructs a request-scoped Supabase client
 *   - Calls `getUser()` which transparently refreshes the JWT if needed
 *   - Writes any new cookies back onto the response
 */
export async function updateSupabaseSession(
  request: NextRequest,
): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No-op path — env not provisioned. Pass through so the rest of the
  // middleware chain (Auth.js) runs normally.
  if (!url || !anon) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // Triggers the cookie refresh side-effect via `setAll` if the JWT is
  // close to expiring. The return value is intentionally discarded —
  // route protection lives in Auth.js's `authorized()` callback today.
  await supabase.auth.getUser();

  return response;
}
