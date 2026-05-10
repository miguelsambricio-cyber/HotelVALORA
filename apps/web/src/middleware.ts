import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Edge middleware — protects `/settings`, `/library`, `/report`,
 * `/dashboard` once `AUTH_ENABLED=true` is set in the environment.
 *
 * Today (no OAuth credentials configured), the `authorized()` callback
 * in `auth.config.ts` returns `true` unconditionally, so this middleware
 * is a no-op. The shape is in place: flip the env var the moment a real
 * provider is wired and route protection activates with zero code change.
 *
 * The auth-config import path stays edge-safe — see comment in
 * `auth.config.ts` for what NEVER to import there.
 */
export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  // Run on everything EXCEPT static assets, Next internals and the auth
  // API routes themselves (those need to be reachable unauthenticated).
  matcher: [
    "/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)",
  ],
};
