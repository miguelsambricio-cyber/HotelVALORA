import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import LinkedIn from "next-auth/providers/linkedin";
import Apple from "next-auth/providers/apple";
import type { UserTier } from "@/lib/auth/types";

/**
 * Edge-safe Auth.js v5 config.
 *
 * Split into its own module so the middleware can import it without
 * pulling Node-only adapters (Supabase/Postgres adapter goes in
 * `./auth.ts`, never here). This file MUST stay free of:
 *   - DB clients
 *   - any `import "server-only"` modules
 *   - `bcrypt`, `crypto.createPrivateKey`, etc.
 *
 * Credentials are placeholders today (no OAuth apps created yet); the
 * providers list still loads so the surface compiles. The middleware's
 * route enforcement is gated by `AUTH_ENABLED=true` — see middleware.ts.
 */

/** Routes that require an authenticated session when AUTH_ENABLED=true. */
export const PROTECTED_PREFIXES = [
  "/settings",
  "/library",
  "/report",
  "/dashboard",
] as const;

export const authConfig = {
  pages: {
    signIn: "/login",
    signOut: "/login",
    error: "/login",
  },

  session: {
    strategy: "jwt",
    // 30 days — institutional sessions are long-lived; tighten per the
    // tier system when Phase 5 enforces stricter org policies.
    maxAge: 30 * 24 * 60 * 60,
  },

  // Tighter cookie defaults for production deploys (Vercel auto-detects).
  // Auth.js v5 already applies `secure` + `httpOnly` + `sameSite: lax` in
  // production by default; we override the name prefix so collisions
  // with other Vercel projects on the same root domain are impossible.
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-hotelvalora.session-token"
          : "hotelvalora.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    LinkedIn({
      clientId: process.env.LINKEDIN_CLIENT_ID,
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    Apple({
      clientId: process.env.APPLE_CLIENT_ID,
      // Apple's client secret is a short-lived JWT signed with the
      // developer's .p8 private key. Until the Apple Developer setup is
      // done we accept the raw env value as a placeholder; the helper
      // that mints the JWT lands when Apple ships.
      clientSecret: process.env.APPLE_CLIENT_SECRET,
    }),
  ],

  callbacks: {
    /**
     * Route-level authorization. Middleware uses this — return `true` to
     * allow the request through, `false` to redirect to `pages.signIn`.
     *
     * `AUTH_ENABLED` gates enforcement: while no real OAuth apps exist
     * (placeholder env), the middleware passes everything through to
     * avoid bricking the product. Flip the env var to `true` once
     * credentials are configured.
     */
    authorized({ auth, request: { nextUrl } }) {
      if (process.env.AUTH_ENABLED !== "true") return true;

      const isProtected = PROTECTED_PREFIXES.some((p) =>
        nextUrl.pathname.startsWith(p),
      );
      if (!isProtected) return true;
      return !!auth?.user;
    },

    /**
     * JWT callback runs every time a token is created OR refreshed.
     * We persist `tier` + `role` on the token so the session callback
     * can mirror them onto `session.user` without a DB round-trip.
     */
    async jwt({ token, user, account, profile }) {
      // First sign-in — `user` is populated. Tier inference is intentionally
      // stubbed (always "free") because Supabase / DB adapter is Phase 3.
      if (user) {
        token.tier = (user as { tier?: UserTier }).tier ?? "free";
        token.role = (user as { role?: "user" | "admin" | "owner" }).role ?? "user";
      }
      // `account` + `profile` are available on first sign-in only — useful
      // for the future "link providers" surface (see provider registry).
      if (account) {
        token.provider = account.provider;
      }
      return token;
    },

    /**
     * Session callback — runs on every `auth()` / `useSession()` read.
     * Mirror the JWT extension onto `session.user` so consumers can read
     * `session.user.tier` directly.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.tier = (token.tier as UserTier) ?? "free";
        session.user.role =
          (token.role as "user" | "admin" | "owner") ?? "user";
      }
      return session;
    },
  },

  // Trust the proxy-set host header in production (Vercel + custom
  // domains). Without this, callback URLs can resolve to the
  // *.vercel.app preview domain instead of hotelvalora.com.
  trustHost: true,
} satisfies NextAuthConfig;
