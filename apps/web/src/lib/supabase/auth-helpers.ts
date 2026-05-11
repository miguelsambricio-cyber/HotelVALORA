import "server-only";
import { createServerSupabaseClient } from "./server";

/**
 * Server-side auth helpers built on top of the Supabase server client.
 *
 * Today: convenience wrappers around `supabase.auth.{getUser,getSession}`.
 * When Supabase auth ships (Phase 3), these become the single read API
 * for protected pages — call from any Server Component, Server Action
 * or Route Handler.
 *
 * Until then, every helper returns `null` gracefully if Supabase env
 * isn't provisioned — letting protected pages fall back to Auth.js or
 * the mock auth store.
 */

export interface SupabaseUser {
  id: string;
  email: string | undefined;
  emailVerified: boolean;
}

/**
 * Returns the current Supabase user from the request cookies, or null
 * if no session / no env / token invalid. Never throws.
 */
export async function getSupabaseUser(): Promise<SupabaseUser | null> {
  if (!isSupabaseConfigured()) return null;
  try {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) return null;
    return {
      id: data.user.id,
      email: data.user.email ?? undefined,
      emailVerified: Boolean(data.user.email_confirmed_at),
    };
  } catch {
    return null;
  }
}

/**
 * Higher-level "require auth" gate for Server Components. Returns the
 * user when present; consumers use it to short-circuit a redirect:
 *
 *   const user = await requireSupabaseUser();
 *   if (!user) redirect("/login");
 *
 * Stays a non-throwing helper — the redirect decision belongs to the
 * caller so the surface stays composable with Auth.js gating.
 */
export async function requireSupabaseUser(): Promise<SupabaseUser | null> {
  return getSupabaseUser();
}

/**
 * True iff Supabase URL + anon key are present in the environment.
 * Useful for branches that should disable themselves entirely until the
 * project is provisioned.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/** True iff the service-role key is present (server-only). */
export function isSupabaseAdminConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
