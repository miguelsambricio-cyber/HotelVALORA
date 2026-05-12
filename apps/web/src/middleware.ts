import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge middleware.
 *
 * Two responsibilities:
 *
 *   1. Supabase session refresh — reads / rotates the HttpOnly auth
 *      cookies on every request. Safe no-op when Supabase env is
 *      absent. Runs unconditionally so that, when a user DOES sign
 *      in via Google (or password), their session sticks around.
 *
 *   2. Route protection — gated on `AUTH_ENABLED=true` AND the matched
 *      pathname appearing in `PROTECTED_PREFIXES`. Visiting a protected
 *      path without a session redirects to `/login?next=<original-path>`.
 *
 * Activation contract
 *   The Administrator section requires `AUTH_ENABLED=true` to take
 *   effect — without it, the middleware refreshes sessions but never
 *   redirects. The list below is the source of truth for what is
 *   institutional-private. Public surfaces (landing · library
 *   showcase · public reports) are intentionally excluded so the
 *   institutional showcase still works anonymously.
 *
 *   See docs/auth.md for the full activation runbook.
 */

const PROTECTED_PREFIXES: readonly string[] = [
  // Operator console — credentials provisioning, agent ops, integrations.
  // This is the load-bearing entry; everything else is forward-looking.
  "/user/admin",
  // User-owned preferences + investment criteria. Anonymous browsing
  // would expose org-level configuration once it lands.
  "/settings",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  // Start from a pass-through response — cookies set during the
  // session refresh below will be folded back in.
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // No Supabase env → no auth context at all. Skip enforcement.
  if (!url || !anon) return response;

  // Build a request-scoped Supabase client that round-trips cookies
  // through the Next response object. `@supabase/ssr` will refresh the
  // session token automatically when it's close to expiring.
  const supabase = createServerClient(url, anon, {
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

  // Touch `getUser()` to force the refresh + cookie write.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Route protection — only enforce when explicitly enabled.
  if (process.env.AUTH_ENABLED === "true" && isProtected(request.nextUrl.pathname)) {
    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  // Run on everything EXCEPT static assets, Next internals, and the
  // OAuth callback endpoints themselves (those must stay reachable
  // even when no session exists).
  matcher: [
    "/((?!api/auth|auth/callback|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
