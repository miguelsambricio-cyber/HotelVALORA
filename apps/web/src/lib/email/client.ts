import "server-only";
import { Resend } from "resend";

/**
 * Resend client — single instance shared across server actions and
 * route handlers. Imported only from server contexts (the
 * `import "server-only"` directive throws at build time if a client
 * component ever imports this file).
 *
 * Configuration:
 *   RESEND_API_KEY      — required. From https://resend.com/api-keys.
 *   RESEND_FROM_EMAIL   — required. Default sender. Must be either:
 *                         • a verified domain address (production), or
 *                         • "onboarding@resend.dev" (sandbox — only
 *                           delivers to the account owner's email).
 *
 * Missing API key → `getResend()` throws at call-time (not at import-
 * time) so the rest of the app can build + boot without it. Callers
 * MUST handle the throw — server actions surface it as a typed error.
 */

let cached: Resend | null = null;

export function getResend(): Resend {
  if (cached) return cached;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "RESEND_API_KEY is not set. Add it to apps/web/.env.local (dev) " +
        "or to the Vercel project env (prod). Get a key at https://resend.com/api-keys.",
    );
  }
  cached = new Resend(key);
  return cached;
}

/** Default sender — falls back to Resend's sandbox if unset. */
export function getDefaultFromAddress(): string {
  return process.env.RESEND_FROM_EMAIL || "HotelVALORA <onboarding@resend.dev>";
}
