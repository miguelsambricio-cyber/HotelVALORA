import "server-only";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { decryptSecret } from "./crypto";
import { getRecipe } from "./source-recipes";

/**
 * Server-side cookie-jar loader + session-health validator.
 *
 * Reads the active T2 row from `intelligence_source_sessions`, decrypts
 * the storageState envelope, builds a HTTP `Cookie` header per target
 * URL (domain + path + secure aware), and runs the anon-vs-authed
 * differential against the source's canonical health target.
 *
 * Mirrors the operator-side `verify-authed-fetch.mjs` script — the cron
 * uses this module instead so server context never shells out to Node.
 *
 * Boundaries
 *   - Plaintext storageState NEVER leaves this module · all callers
 *     receive an opaque jar handle that exposes `headerFor(url)` only.
 *   - Validation result is structured · contains target URL, byte counts,
 *     marker counts, verdict, but no body text · so cron audit rows
 *     remain compact.
 */

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";
const ACCEPT_LANG = "es-ES,es;q=0.9,en;q=0.8";
const FETCH_TIMEOUT_MS = 25_000;

export interface StorageCookie {
  name: string;
  value: string;
  domain: string;
  path: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None" | string;
}

export interface CookieJar {
  sessionId: string;
  cookiesCount: number;
  hoursToExpiry: number;
  expiresAt: string;
  /** Build a Cookie HTTP header value for an absolute target URL. */
  headerFor(absoluteUrl: string): string;
}

export interface SessionHealthReport {
  ok: boolean;
  target: string;
  anonLength: number;
  authedLength: number;
  sizeDelta: number;
  anonPaywallHits: number;
  authedPaywallHits: number;
  anonAuthedHits: number;
  authedAuthedHits: number;
  moreAuthedMarkers: boolean;
  fewerPaywallCtas: boolean;
  significantSizeDelta: boolean;
  failureReason: string | null;
}

const fromBytea = (s: unknown): Buffer => {
  if (typeof s !== "string") return Buffer.alloc(0);
  const hex = s.startsWith("\\x") ? s.slice(2) : s;
  return Buffer.from(hex, "hex");
};

/** Load the most recently refreshed active T2 row · null when none. */
export async function loadActiveCookieJar(slug: string): Promise<CookieJar | null> {
  const sb = getSupabaseAdmin();
  const sessRes = await sb
    .from("intelligence_source_sessions")
    .select("id, storage_state_encrypted, iv, auth_tag, enc_key_id, expires_at, status")
    .eq("source_slug", slug)
    .eq("status", "active")
    .order("refreshed_at", { ascending: false })
    .limit(1);
  const rows = (sessRes.data as Array<{
    id: string;
    storage_state_encrypted: string;
    iv: string;
    auth_tag: string;
    enc_key_id: string;
    expires_at: string;
    status: string;
  }> | null) ?? [];
  const row = rows[0];
  if (!row) return null;

  const expiresAtMs = new Date(row.expires_at).getTime();
  if (expiresAtMs <= Date.now()) return null;

  let storageState: { cookies?: StorageCookie[] };
  try {
    const json = decryptSecret({
      ciphertext: fromBytea(row.storage_state_encrypted),
      iv: fromBytea(row.iv),
      authTag: fromBytea(row.auth_tag),
      encKeyId: row.enc_key_id,
    });
    storageState = JSON.parse(json);
  } catch {
    return null;
  }
  const cookies = Array.isArray(storageState.cookies) ? storageState.cookies : [];
  const hoursToExpiry = Math.max(0, Math.round((expiresAtMs - Date.now()) / 3600_000));
  return {
    sessionId: row.id,
    cookiesCount: cookies.length,
    hoursToExpiry,
    expiresAt: row.expires_at,
    headerFor(absoluteUrl: string): string {
      try {
        const u = new URL(absoluteUrl);
        const host = u.hostname;
        const isHttps = u.protocol === "https:";
        const matches = cookies.filter((c) => {
          if (!c.name) return false;
          const cDomain = (c.domain ?? "").replace(/^\./, "");
          const domainMatch = host === cDomain || host.endsWith(`.${cDomain}`);
          if (!domainMatch) return false;
          if (c.secure && !isHttps) return false;
          if (c.path && c.path !== "/" && !u.pathname.startsWith(c.path)) return false;
          return true;
        });
        return matches.map((c) => `${c.name}=${c.value}`).join("; ");
      } catch {
        return "";
      }
    },
  };
}

async function fetchWithTimeout(url: string, headers: Record<string, string>): Promise<{ status: number; body: string }> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers,
      signal: ctl.signal,
      cache: "no-store",
      redirect: "follow",
    });
    const text = await res.text();
    return { status: res.status, body: text };
  } catch {
    return { status: 0, body: "" };
  } finally {
    clearTimeout(t);
  }
}

function countHits(body: string, patterns: string[]): number {
  if (!body) return 0;
  const lower = body.toLowerCase();
  return patterns.reduce(
    (acc, p) => acc + (lower.includes(p.toLowerCase()) ? 1 : 0),
    0,
  );
}

/**
 * Validate that the active T2 session still unlocks paywalled content.
 *
 * Strategy: fetch the canonical health target both anon and authed.
 * Any of three independent signals counts as a pass:
 *   1. more authed-only markers in authed body
 *   2. fewer paywall CTAs in authed body
 *   3. body size delta > recipe.minSizeDeltaBytes
 *
 * Returns ok=false + failureReason when no jar exists, recipe is missing,
 * fetches fail, or no positive signal triggers.
 */
export async function validateSessionHealth(
  slug: string,
  jar: CookieJar,
): Promise<SessionHealthReport> {
  const recipe = getRecipe(slug);
  if (!recipe || !recipe.canonicalHealthTarget) {
    return {
      ok: false,
      target: "(no recipe)",
      anonLength: 0,
      authedLength: 0,
      sizeDelta: 0,
      anonPaywallHits: 0,
      authedPaywallHits: 0,
      anonAuthedHits: 0,
      authedAuthedHits: 0,
      moreAuthedMarkers: false,
      fewerPaywallCtas: false,
      significantSizeDelta: false,
      failureReason: "no_canonical_health_target_for_source",
    };
  }
  const url = recipe.canonicalHealthTarget;
  const cookieHeader = jar.headerFor(url);
  const baseHeaders = {
    "user-agent": USER_AGENT,
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": ACCEPT_LANG,
  };

  const [anon, authed] = await Promise.all([
    fetchWithTimeout(url, baseHeaders),
    fetchWithTimeout(url, { ...baseHeaders, cookie: cookieHeader }),
  ]);

  if (anon.status === 0 || authed.status === 0) {
    return {
      ok: false,
      target: url,
      anonLength: 0,
      authedLength: 0,
      sizeDelta: 0,
      anonPaywallHits: 0,
      authedPaywallHits: 0,
      anonAuthedHits: 0,
      authedAuthedHits: 0,
      moreAuthedMarkers: false,
      fewerPaywallCtas: false,
      significantSizeDelta: false,
      failureReason: "fetch_failed_or_timed_out",
    };
  }

  const anonPaywallHits = countHits(anon.body, recipe.paywallCtaPatterns);
  const authedPaywallHits = countHits(authed.body, recipe.paywallCtaPatterns);
  const anonAuthedHits = countHits(anon.body, recipe.authedOnlyPatterns);
  const authedAuthedHits = countHits(authed.body, recipe.authedOnlyPatterns);
  const sizeDelta = authed.body.length - anon.body.length;

  const moreAuthedMarkers = authedAuthedHits > anonAuthedHits;
  const fewerPaywallCtas = authedPaywallHits < anonPaywallHits;
  const significantSizeDelta = Math.abs(sizeDelta) > recipe.minSizeDeltaBytes;
  const ok = moreAuthedMarkers || fewerPaywallCtas || significantSizeDelta;

  return {
    ok,
    target: url,
    anonLength: anon.body.length,
    authedLength: authed.body.length,
    sizeDelta,
    anonPaywallHits,
    authedPaywallHits,
    anonAuthedHits,
    authedAuthedHits,
    moreAuthedMarkers,
    fewerPaywallCtas,
    significantSizeDelta,
    failureReason: ok ? null : "no_authed_differential_detected",
  };
}

/**
 * Auto-degrade · mark T2 as refresh_failed and write audit event.
 * Called by the ingest pipeline when validateSessionHealth returns ok=false.
 * The Admin UI immediately surfaces the red banner because live.ts derives
 * connection status from session.status.
 */
export async function markSessionRefreshFailed(
  slug: string,
  jar: CookieJar,
  report: SessionHealthReport,
): Promise<void> {
  const sb = getSupabaseAdmin();

  await sb
    .from("intelligence_source_sessions")
    .update({
      status: "refresh_failed",
      last_refresh_error: `cron health-check failed · ${report.failureReason ?? "unknown"}`,
    })
    .eq("id", jar.sessionId);

  // Stamp meta so the admin UI's "Premium-access verification" table reflects
  // the failed run · helps the operator triage before running CLI refresh.
  const { data: sessRow } = await sb
    .from("intelligence_source_sessions")
    .select("meta")
    .eq("id", jar.sessionId)
    .maybeSingle();
  const currentMeta = (sessRow?.meta && typeof sessRow.meta === "object") ? sessRow.meta as Record<string, unknown> : {};
  await sb
    .from("intelligence_source_sessions")
    .update({
      meta: {
        ...currentMeta,
        last_authed_fetch_at: new Date().toISOString(),
        last_authed_fetch_status: "fail",
        last_authed_fetch_via: "cron",
        last_authed_fetch_passed: 0,
        last_authed_fetch_total: 1,
      },
    })
    .eq("id", jar.sessionId);

  // Resolve source_id + credential_id for the audit row.
  const { data: srcRow } = await sb
    .from("sources")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const { data: credRow } = await sb
    .from("intelligence_source_credentials")
    .select("id")
    .eq("source_slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (srcRow && credRow) {
    await sb.from("intelligence_credentials_audit").insert({
      source_id: srcRow.id,
      source_slug: slug,
      credential_id: credRow.id,
      event_kind: "auth_failure",
      error: "cron_session_health_failed",
      detail: {
        context: "cron_session_health",
        target: report.target,
        size_delta: report.sizeDelta,
        anon_length: report.anonLength,
        authed_length: report.authedLength,
        failure_reason: report.failureReason,
      },
    });
  }
}

/**
 * Stamp T2 meta after a successful cron health check. Mirrors what
 * verify-authed-fetch.mjs does so the Admin UI's "Last successful
 * authenticated fetch" line moves forward every cron night.
 */
export async function markSessionHealthOk(
  slug: string,
  jar: CookieJar,
  report: SessionHealthReport,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { data: sessRow } = await sb
    .from("intelligence_source_sessions")
    .select("meta")
    .eq("id", jar.sessionId)
    .maybeSingle();
  const currentMeta = (sessRow?.meta && typeof sessRow.meta === "object") ? sessRow.meta as Record<string, unknown> : {};
  await sb
    .from("intelligence_source_sessions")
    .update({
      meta: {
        ...currentMeta,
        last_authed_fetch_at: new Date().toISOString(),
        last_authed_fetch_status: "ok",
        last_authed_fetch_via: "cron",
        last_authed_fetch_passed: 1,
        last_authed_fetch_total: 1,
        cron_last_health: {
          target: report.target,
          size_delta: report.sizeDelta,
          anon_length: report.anonLength,
          authed_length: report.authedLength,
          checked_at: new Date().toISOString(),
        },
      },
    })
    .eq("id", jar.sessionId);

  const { data: srcRow } = await sb
    .from("sources")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  const { data: credRow } = await sb
    .from("intelligence_source_credentials")
    .select("id")
    .eq("source_slug", slug)
    .eq("status", "active")
    .maybeSingle();

  if (srcRow && credRow) {
    await sb.from("intelligence_credentials_audit").insert({
      source_id: srcRow.id,
      source_slug: slug,
      credential_id: credRow.id,
      event_kind: "auth_success",
      detail: {
        context: "cron_session_health",
        target: report.target,
        size_delta: report.sizeDelta,
        verdict_signals: {
          more_authed_markers: report.moreAuthedMarkers,
          fewer_paywall_ctas: report.fewerPaywallCtas,
          significant_size_delta: report.significantSizeDelta,
        },
      },
    });
  }
}
