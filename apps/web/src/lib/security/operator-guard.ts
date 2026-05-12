import "server-only";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Single source of truth for "is the caller an authorised HotelVALORA
 * operator?" — used by every `/user/admin/*` surface (layout RSC guard,
 * server actions, route handlers).
 *
 * Tri-state by design:
 *
 *   1. AUTH_ENABLED !== "true"  — local dev / public showcase mode.
 *      Authentication is not engaged platform-wide. The guard is
 *      *permissive*: returns `{ mode: "dev_permissive" }` so an
 *      operator can iterate locally without sign-in. The middleware
 *      gate is also dormant in this mode, so this preserves the
 *      established dev DX.
 *
 *   2. AUTH_ENABLED === "true"  — production / staging.
 *      The guard is *strict and fail-closed*:
 *        - no Supabase session            → DENIED (no email known)
 *        - email not on the allow-list    → DENIED
 *        - allow-list is empty            → DENIED (fail-closed — the
 *          fail-open behaviour of the prior `assertAdminContext` was
 *          the security gap this module exists to close)
 *
 * Allow-list resolution order:
 *   ADMIN_OPERATOR_EMAILS  (primary · comma-separated · case-insensitive)
 *   INTERNAL_ALERT_RECIPIENTS (fallback · same shape)
 *
 * Either env can stand alone; if BOTH are empty in production, no
 * caller is admitted — by design.
 */

export interface OperatorContext {
  /**
   * `operator`         — strict mode, real signed-in operator
   * `dev_permissive`   — AUTH_ENABLED is off, no enforcement
   */
  mode: "operator" | "dev_permissive";
  /**
   * Caller email in lowercase. `null` only in dev_permissive mode when
   * no Supabase session exists.
   */
  email: string | null;
  /**
   * Supabase user UUID — `null` in dev_permissive mode when anonymous.
   */
  userId: string | null;
}

export class OperatorDenied extends Error {
  constructor(public reason: "no_session" | "not_in_allowlist" | "empty_allowlist") {
    super(
      reason === "no_session"
        ? "Sign in required."
        : reason === "not_in_allowlist"
          ? "Your account is not authorised for the Operator Console."
          : "Operator allow-list is empty — production cannot proceed without ADMIN_OPERATOR_EMAILS.",
    );
    this.name = "OperatorDenied";
  }
}

function resolveAllowlist(): string[] {
  const primary = (process.env.ADMIN_OPERATOR_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (primary.length > 0) return primary;
  return (process.env.INTERNAL_ALERT_RECIPIENTS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * The canonical guard. Throws `OperatorDenied` on rejection so callers
 * can map to the right UX (404 from a layout, error toast from an
 * action, 403 from a route handler).
 */
export async function requireOperator(): Promise<OperatorContext> {
  const authEnabled = process.env.AUTH_ENABLED === "true";

  if (!authEnabled) {
    // Dev / showcase. Try to surface the email anyway so RSCs can show
    // "you are X" affordances when a Supabase session happens to exist.
    try {
      const sb = createServerSupabaseClient();
      const { data } = await sb.auth.getUser();
      return {
        mode: "dev_permissive",
        email: data.user?.email?.toLowerCase() ?? null,
        userId: data.user?.id ?? null,
      };
    } catch {
      return { mode: "dev_permissive", email: null, userId: null };
    }
  }

  // Strict mode.
  const sb = createServerSupabaseClient();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    throw new OperatorDenied("no_session");
  }
  const email = data.user.email?.toLowerCase() ?? null;
  if (!email) {
    // Email-less Supabase user can't be matched against the allow-list.
    throw new OperatorDenied("not_in_allowlist");
  }

  const allowed = resolveAllowlist();
  if (allowed.length === 0) {
    // Fail-closed. Empty list means no one is authorised.
    throw new OperatorDenied("empty_allowlist");
  }
  if (!allowed.includes(email)) {
    throw new OperatorDenied("not_in_allowlist");
  }

  return { mode: "operator", email, userId: data.user.id };
}

/**
 * Boolean variant for surfaces that need to branch without throwing
 * (e.g., conditionally rendering admin chrome). Never throws.
 */
export async function isOperator(): Promise<boolean> {
  try {
    const ctx = await requireOperator();
    return ctx.mode === "operator" || ctx.mode === "dev_permissive";
  } catch {
    return false;
  }
}
