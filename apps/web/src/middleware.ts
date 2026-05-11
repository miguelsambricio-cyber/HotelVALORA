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
 *   2. Route protection — gated on `AUTH_ENABLED=true` AND a non-empty
 *      `PROTECTED_PREFIXES` list. Today the list is intentionally
 *      empty: HotelVALORA is in "Public Beta / Institutional Showcase
 *      Mode" — every surface is anonymous-readable while the financial
 *      engine, underwriting, report rendering and Library are being
 *      validated by partners and prospects. Auth still exists for
 *      session testing + future-ready account architecture, but it
 *      MUST NOT block access anywhere yet.
 *
 *      When private surfaces land (saved reports, CRM, collaboration,
 *      payments, admin), add their prefixes to PROTECTED_PREFIXES.
 *      Likely future entries:
 *
 *        "/settings",  // user-owned preferences
 *        "/dashboard", // institutional portfolio view
 *        "/admin",     // operator surface
 *        "/billing",   // Stripe-connected billing surface
 *
 *      The route-protection path is fully wired — the only thing
 *      stopping it firing today is this empty list.
 */

const PROTECTED_PREFIXES: readonly string[] = [];

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
