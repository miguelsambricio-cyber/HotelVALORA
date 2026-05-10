/**
 * App Router OAuth callback handler — Auth.js v5.
 *
 * Auth.js mounts ALL of its endpoints under this single dynamic route:
 *   GET  /api/auth/providers       — provider discovery
 *   GET  /api/auth/csrf            — CSRF token
 *   GET  /api/auth/session         — current session
 *   POST /api/auth/signin/:id      — initiate OAuth flow
 *   GET  /api/auth/callback/:id    — OAuth callback redirect target
 *   POST /api/auth/signout         — sign out
 *
 * `handlers` is the `{ GET, POST }` object minted by NextAuth(authConfig)
 * in `src/auth.ts`. Destructure here for the App Router's route-handler
 * surface.
 */
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
