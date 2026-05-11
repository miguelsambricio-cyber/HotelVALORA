import "server-only";
import { NextResponse } from "next/server";

/**
 * Cron route auth. Vercel Cron fires with an `Authorization: Bearer
 * <CRON_SECRET>` header when the env var is set. Manual curl from a
 * trusted operator can use the same header to re-trigger a run.
 *
 * Returns null when the request is authorised; otherwise returns a
 * 401 NextResponse the handler should return directly.
 *
 * Behaviour when CRON_SECRET is unset (preview / local):
 *   - production deployments without the secret → DENY (defence-in-
 *     depth; if you wanted to disable cron, set the schedule to never
 *     instead of leaving the secret empty)
 *   - non-production environments → ALLOW, but log a warning so the
 *     gap is visible
 */
export function assertCron(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("authorization");
  if (!secret) {
    if (process.env.VERCEL_ENV === "production") {
      return NextResponse.json(
        { ok: false, error: "CRON_SECRET unset on a production deployment" },
        { status: 401 },
      );
    }
    console.warn("[cron] CRON_SECRET unset — allowing in non-production");
    return null;
  }
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json(
      { ok: false, error: "unauthorised" },
      { status: 401 },
    );
  }
  return null;
}
