import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

/**
 * Auth.js v5 — full instance.
 *
 * `auth()`   → server-side session reader (Server Components, Route
 *              Handlers, Server Actions). Returns the session or null.
 * `signIn()` → server-action / client-action helper. Use the
 *              `next-auth/react` re-export from client components.
 * `signOut()`→ same surface as `signIn`.
 * `handlers` → GET/POST exports consumed by the App Router route
 *              handler at `/api/auth/[...nextauth]`.
 *
 * The Node-only side of the stack (DB adapters, async bcrypt, etc.)
 * lives in THIS file — never in `auth.config.ts`, which the middleware
 * imports on the Edge runtime.
 *
 * Phase 3 swap: add the Supabase / Postgres adapter here:
 *
 *   import { SupabaseAdapter } from "@auth/supabase-adapter";
 *   export const { … } = NextAuth({
 *     ...authConfig,
 *     adapter: SupabaseAdapter({ url, secret }),
 *   });
 *
 * No other file needs to change when that swap happens.
 */
export const { handlers, signIn, signOut, auth } = NextAuth(authConfig);
