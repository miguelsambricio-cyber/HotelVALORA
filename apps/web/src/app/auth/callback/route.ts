import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Supabase OAuth callback handler.
 *
 * Flow
 * ────
 *   1. Provider (Google) redirects to Supabase with `code`.
 *   2. Supabase exchanges it for a session and redirects HERE with
 *      `?code=<one-time>` + the `next` param we passed when starting
 *      the flow.
 *   3. We call `exchangeCodeForSession(code)` — that writes the
 *      HttpOnly session cookies via the server Supabase client.
 *   4. Final redirect to `next` (sanitised to same-origin paths only).
 *
 * `auth.users` row creation + the `handle_new_user` trigger that
 * populates `public.users` + `public.profiles` happen automatically
 * inside Supabase — no extra work here.
 */
const DEFAULT_NEXT = "/settings/profile";

function sanitiseNext(raw: string | null): string {
  // Only allow relative paths that start with "/" and don't try to
  // escape with `//` (protocol-relative URLs) or a backslash.
  if (!raw) return DEFAULT_NEXT;
  if (!raw.startsWith("/")) return DEFAULT_NEXT;
  if (raw.startsWith("//") || raw.startsWith("/\\")) return DEFAULT_NEXT;
  return raw;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = sanitiseNext(url.searchParams.get("next"));
  const errorDescription = url.searchParams.get("error_description");

  if (errorDescription) {
    const failure = new URL("/login", url.origin);
    failure.searchParams.set("error", errorDescription);
    return NextResponse.redirect(failure);
  }

  if (!code) {
    const failure = new URL("/login", url.origin);
    failure.searchParams.set("error", "Missing OAuth code in callback.");
    return NextResponse.redirect(failure);
  }

  const supabase = createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failure = new URL("/login", url.origin);
    failure.searchParams.set("error", error.message);
    return NextResponse.redirect(failure);
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
