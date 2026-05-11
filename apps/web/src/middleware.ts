import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge middleware.
 *
 * Two responsibilities, both runtime-gated:
 *
 *   1. Supabase session refresh — reads / rotates the HttpOnly auth
 *      cookies on every request. Safe no-op when Supabase env is
 *      absent.
 *
 *   2. Route protection — when AUTH_ENABLED=true, redirect
 *      unauthenticated requests to /login?next=<original-path>.
 *      Protected prefixes are listed below; the public surface
 *      (/, /login, /landing, /dev/*, /auth/*) stays anonymous.
 *
 * When AUTH_ENABLED is unset or "false", route protection is OFF and
 * the existing mock auth (Zustand) continues to drive `useAuth()` —
 * the app keeps working through every migration step.
 */

const PROTECTED_PREFIXES = [
  "/settings",
  "/library",
  "/report",
  "/dashboard",
] as const;

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
