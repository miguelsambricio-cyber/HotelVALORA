import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { updateSupabaseSession } from "./lib/supabase/middleware";

/**
 * Edge middleware — composes two responsibilities:
 *
 * 1. Supabase session refresh
 *    `updateSupabaseSession()` reads the request cookies, refreshes the
 *    Supabase JWT if it's close to expiring, and writes any new cookies
 *    onto the response. No-op when NEXT_PUBLIC_SUPABASE_URL is unset.
 *
 * 2. Auth.js route protection
 *    NextAuth's `auth()` wrapper invokes the `authorized()` callback in
 *    `auth.config.ts` to decide whether to redirect unauthenticated
 *    users away from /settings, /library, /report, /dashboard. The
 *    callback returns `true` (allow) when `AUTH_ENABLED !== "true"`.
 *
 * Both halves are gated by their own env so this middleware is a pure
 * pass-through until credentials are provisioned — the product keeps
 * working through the entire scaffolding phase.
 */

const { auth } = NextAuth(authConfig);

export default auth(async (request) => {
  // 1. Refresh Supabase session — safe no-op when env is absent.
  await updateSupabaseSession(request);

  // 2. Falling through to undefined lets Auth.js's authorized() decision
  //    drive the response (redirect or allow). When Supabase ever needs
  //    to short-circuit the response (e.g., to write fresh cookies),
  //    return the response from updateSupabaseSession instead.
});

export const config = {
  // Run on everything EXCEPT static assets, Next internals, and the auth
  // API routes themselves (those need to stay reachable unauthenticated).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
