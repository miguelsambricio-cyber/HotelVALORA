import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

/**
 * Edge middleware.
 *
 * Three responsibilities:
 *
 *   1. Underwriting preview gate — env-gated invite-only access for the
 *      institutional underwriting flagship at /report/financials/underwriting.
 *      Lightweight token + cookie pattern · does NOT depend on the
 *      Supabase auth stack so the temporary public deploy can be
 *      protected before institutional auth is fully wired in production.
 *
 *   2. Supabase session refresh — reads / rotates the HttpOnly auth
 *      cookies on every request. Safe no-op when Supabase env is
 *      absent. Runs unconditionally so that, when a user DOES sign
 *      in via Google (or password), their session sticks around.
 *
 *   3. Route protection — gated on `AUTH_ENABLED=true` AND the matched
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
 *   The underwriting preview gate is independently controlled by
 *   `UNDERWRITING_PREVIEW_TOKEN`. When unset, the page is open
 *   (preserves local dev DX). When set, only callers presenting a
 *   matching `?preview=<token>` query (which seeds an HttpOnly cookie)
 *   may access the route — anyone else is bounced to the landing page.
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

// ─── Underwriting preview gate ──────────────────────────────────────────
// Path covered by the gate. Single-page memo · no sub-routes today.
const UNDERWRITING_PREVIEW_PATH = "/report/financials/underwriting";
const UNDERWRITING_COOKIE = "uw-preview-ok";
const UNDERWRITING_COOKIE_MAX_AGE_S = 60 * 60 * 24 * 30; // 30 days

/**
 * Returns a NextResponse if the request should be diverted (token-unlock
 * redirect or bounce-to-landing). Returns `null` to mean "pass through".
 *
 * Three branches:
 *   · env unset                → null (open access · local dev / pre-prod)
 *   · cookie present + valid   → null (already-authorised reviewer)
 *   · query token matches      → redirect to clean URL with cookie set
 *   · otherwise                → redirect to landing (do NOT leak page)
 */
function gateUnderwritingPreview(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname;
  if (path !== UNDERWRITING_PREVIEW_PATH && !path.startsWith(`${UNDERWRITING_PREVIEW_PATH}/`)) {
    return null;
  }

  const expected = process.env.UNDERWRITING_PREVIEW_TOKEN;
  if (!expected) {
    // No env configured → gate is dormant. Preserves local dev DX and
    // lets pre-production environments stay open. Production deploy
    // sets this env to a long random secret.
    return null;
  }

  // Already-authorised cookie?
  if (request.cookies.get(UNDERWRITING_COOKIE)?.value === "1") {
    return null;
  }

  // Token-unlock query param? (one-time link · seeds cookie · redirects
  // to clean URL so the token never appears in the address bar after
  // first visit.)
  const queryToken = request.nextUrl.searchParams.get("preview");
  if (queryToken && queryToken === expected) {
    const cleanUrl = new URL(request.nextUrl);
    cleanUrl.searchParams.delete("preview");
    const res = NextResponse.redirect(cleanUrl);
    res.cookies.set(UNDERWRITING_COOKIE, "1", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      maxAge: UNDERWRITING_COOKIE_MAX_AGE_S,
      path: "/",
    });
    return res;
  }

  // Neither cookie nor valid token → bounce to landing. We deliberately
  // do NOT 404 so anonymous traffic does not learn the route exists.
  return NextResponse.redirect(new URL("/", request.url));
}

export async function middleware(request: NextRequest) {
  // ── Underwriting preview gate · runs before Supabase context so it
  //    does not depend on the auth stack being wired in production.
  const previewDecision = gateUnderwritingPreview(request);
  if (previewDecision) return previewDecision;

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
