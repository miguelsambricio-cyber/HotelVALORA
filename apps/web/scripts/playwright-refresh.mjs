#!/usr/bin/env node
// Phase 2.5b · Real Playwright authentication for a paid intelligence source.
//
// This script REPLACES the placeholder session row created by
// execute-session-refresh.mjs with a REAL Playwright-captured storageState.
//
// SAFETY POSTURE
//   - Headless=false by default · the operator SEES the browser
//   - slowMo=300ms · human-paced interactions
//   - SINGLE attempt · no retry loop · no auto-retry on failure
//     (every login attempt counts toward potential account-lockout)
//   - On failure, the placeholder T2 row remains untouched
//   - Credentials never logged · only username length on success
//
// USAGE
//   cd apps/web
//   node scripts/playwright-refresh.mjs --slug=hosteltur [--headless] [--keep-open]
//
// FLAGS
//   --slug=<slug>      Required · matches public.sources.slug
//   --headless         Run headless (default: visible · headed for first runs)
//   --keep-open        After login, leave the browser open for 60s for inspection
//   --dry-run          Run login flow but DO NOT persist · diagnostic only
//
// ENV (loaded from apps/web/.env.local)
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//   INTELLIGENCE_SESSION_ENC_KEY (32-byte base64)
//   INTELLIGENCE_SESSION_ENC_KEY_ID (default v1)
//
// SOURCE-SPECIFIC CONFIG
//   The login flow is encoded per-slug below. Currently supports:
//     hosteltur · login form at /login · fields: login, password, _token (CSRF auto)
//   Add new sources by extending SOURCE_RECIPES.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// ── env loader ──────────────────────────────────────────────────────────────

function loadDotenv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadDotenv(resolve(import.meta.dirname, "..", ".env.local"));

// ── args ────────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...r] = a.replace(/^--/, "").split("=");
    return [k, r.join("=") || true];
  }),
);

const slug = (args.slug || "").toString().trim();
if (!slug) {
  console.error("error: --slug=<source-slug> required");
  process.exit(2);
}
const HEADLESS = args.headless === true || args.headless === "true";
const KEEP_OPEN = args["keep-open"] === true || args["keep-open"] === "true";
const DRY_RUN = args["dry-run"] === true || args["dry-run"] === "true";

// ── source recipes · per-slug login flow ────────────────────────────────────

const SOURCE_RECIPES = {
  hosteltur: {
    domain: "hosteltur.com",
    loginUrl: "https://www.hosteltur.com/login",
    selectors: {
      // Standard Laravel-style auth form · confirmed by recon 2026-05-12
      email: "#login",
      password: "input[name='password']",
      submit: "form.form-login button[type='submit'], form.form-login input[type='submit']",
    },
    // Success markers — any ONE indicates a logged-in state
    successSignals: {
      // URL leaves /login (Laravel typically redirects after successful auth)
      urlAwayFromLogin: true,
      // OR a logged-in element appears (logout link, user menu)
      anyLoggedInSelector: [
        "a[href*='/logout']",
        "a[href*='salir']",
        "a[href*='cerrar-sesion']",
        ".user-menu",
        "[class*='user-name']",
        "[class*='premium']",
      ],
      // OR a cookie with this prefix appears (Laravel session cookie)
      cookieNamePrefixes: ["hosteltur_session", "laravel_session", "XSRF-TOKEN"],
    },
    // Failure markers — script aborts WITHOUT persisting if any of these
    failureSignals: {
      anyErrorSelector: [
        ".alert-danger",
        ".form-error",
        "[role='alert']",
        ".invalid-feedback",
      ],
      // Specific error text fragments to look for
      errorTextFragments: [
        "credenciales no válidas",
        "datos incorrectos",
        "demasiados intentos",
        "captcha",
        "verifica",
      ],
    },
    // Validation targets · anon-vs-authed comparison after capture
    // Goal: prove the captured cookies actually grant subscriber-tier access
    // before we persist them as the canonical T2 session row.
    validationTargets: [
      { url: "https://www.hosteltur.com/", label: "homepage" },
      { url: "https://www.hosteltur.com/premium", label: "premium-landing" },
    ],
    // Substrings (case-insensitive) that appear in ANON page bodies but
    // should DISAPPEAR (or appear less prominently) when authed.
    paywallCtaPatterns: [
      "Hazte Premium",
      "Suscríbete por",
      "Hazte socio",
      "Únete a Hosteltur Premium",
    ],
    // Substrings that should APPEAR in AUTHED bodies (subscriber-only nav).
    authedOnlyPatterns: [
      "logout",
      "Cerrar sesión",
      "Mi cuenta",
      "Mi suscripción",
      "Mi perfil",
    ],
  },
  alimarket: {
    domain: "alimarket.es",
    loginUrl: "https://www.alimarket.es/acceso/login",
    selectors: {
      // Confirmed via recon 2026-05-12 · /login + /acceder both 301 to /acceso/login
      email: "#email-3",
      password: "#pass-3",
      submit: "#login_form button[type='submit'].btn-submit",
    },
    successSignals: {
      urlAwayFromLogin: true,
      anyLoggedInSelector: [
        "a[href*='/logout']",
        "a[href*='/acceso/logout']",
        "a[href*='cerrar-sesion']",
        ".user-menu",
        "[class*='user-name']",
        "[class*='premium']",
      ],
      cookieNamePrefixes: ["alimarket_session", "laravel_session", "XSRF-TOKEN"],
    },
    failureSignals: {
      anyErrorSelector: [
        ".btn-submit.btn-error",  // surfaces when login validator fails
        ".alert-danger",
        ".form-error",
        "[role='alert']",
        ".invalid-feedback",
      ],
      errorTextFragments: [
        "no es correcto",
        "no válido",
        "incorrectos",
        "demasiados intentos",
        "captcha",
        "verifica",
      ],
    },
    validationTargets: [
      { url: "https://www.alimarket.es/", label: "homepage" },
      // /mi_cuenta is the discriminative target · subscriber-only account
      // page. Anon visitors get redirected to /acceso/login (fetch follows
      // redirect · ends up at login form). Authed visitors get the real
      // account page. Massive body / content delta either way.
      { url: "https://www.alimarket.es/mi_cuenta", label: "account-page" },
    ],
    paywallCtaPatterns: [
      "Suscríbete",
      "Hazte suscriptor",
      "Sólo para suscriptores",
      "Solo para suscriptores",
      "Contenido premium",
      "Acceder",
    ],
    authedOnlyPatterns: [
      "logout",
      "Cerrar sesión",
      "Mi cuenta",
      "Mi perfil",
      "Mi suscripción",
    ],
  },
};

const recipe = SOURCE_RECIPES[slug];
if (!recipe) {
  console.error(`error: no Playwright recipe for slug "${slug}"`);
  console.error(`       supported: ${Object.keys(SOURCE_RECIPES).join(", ")}`);
  process.exit(2);
}

// ── crypto helpers ──────────────────────────────────────────────────────────

const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKek() {
  const raw = process.env.INTELLIGENCE_SESSION_ENC_KEY;
  if (!raw) throw new Error("INTELLIGENCE_SESSION_ENC_KEY missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`KEK must decode to 32 bytes (got ${key.length})`);
  return key;
}

function encrypt(plaintext) {
  const kek = getKek();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALG, kek, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return { ciphertext, iv, authTag: cipher.getAuthTag() };
}

function decrypt(ciphertext, iv, authTag) {
  const kek = getKek();
  const decipher = createDecipheriv(ALG, kek, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

// ── bytea wire format ───────────────────────────────────────────────────────

const toBytea = (buf) => `\\x${buf.toString("hex")}`;
const fromBytea = (s) => Buffer.from((s ?? "").startsWith("\\x") ? s.slice(2) : s, "hex");

// ── main ────────────────────────────────────────────────────────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const sr = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !sr) {
  console.error("error: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}

const sb = createClient(url, sr, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log(`\n→ Phase 2.5b · Playwright authentication for ${slug}`);
console.log(`   headless=${HEADLESS} · keep-open=${KEEP_OPEN} · dry-run=${DRY_RUN}\n`);

// 1. Look up source + verify creds
const { data: source } = await sb.from("sources").select("id, name").eq("slug", slug).maybeSingle();
if (!source) { console.error(`source ${slug} not found`); process.exit(1); }

const { data: cred } = await sb
  .from("intelligence_source_credentials")
  .select("id, username_encrypted, username_iv, username_auth_tag, password_encrypted, password_iv, password_auth_tag, enc_key_id")
  .eq("source_slug", slug)
  .eq("status", "active")
  .maybeSingle();
if (!cred) { console.error(`no active credentials for ${slug}`); process.exit(1); }

// 2. Decrypt (proves round-trip)
let username, password;
try {
  username = decrypt(fromBytea(cred.username_encrypted), fromBytea(cred.username_iv), fromBytea(cred.username_auth_tag));
  password = decrypt(fromBytea(cred.password_encrypted), fromBytea(cred.password_iv), fromBytea(cred.password_auth_tag));
} catch (err) {
  console.error("error: T1 decryption failed —", err.message);
  process.exit(1);
}
console.log(`✓ T1 decrypted · username_len=${username.length} · password_len=${password.length}\n`);

// 3. Launch Playwright
const browser = await chromium.launch({
  headless: HEADLESS,
  slowMo: HEADLESS ? 0 : 300,  // human pace when visible
});
const context = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  viewport: { width: 1366, height: 820 },
  locale: "es-ES",
  timezoneId: "Europe/Madrid",
});
const page = await context.newPage();

let loginOk = false;
let validationOk = false;
let failureReason = null;
let postLoginUrl = null;
let validationReport = [];

try {
  // 4. Navigate to login
  console.log(`→ GET ${recipe.loginUrl}`);
  await page.goto(recipe.loginUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });

  // 5. Verify form is present
  await page.waitForSelector(recipe.selectors.email, { timeout: 10_000 });
  console.log("✓ login form present");

  // 6. Fill creds
  await page.fill(recipe.selectors.email, username);
  await page.fill(recipe.selectors.password, password);
  console.log("✓ credentials filled");

  // 7. Submit (and wait for navigation)
  await Promise.all([
    page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => null),
    page.click(recipe.selectors.submit).catch(async () => {
      // Fallback if button selector misses — submit the form directly
      await page.evaluate(() => {
        const form = document.querySelector("form.form-login");
        if (form) form.submit();
      });
    }),
  ]);

  // 8. Give a beat for client-side state to settle
  await page.waitForTimeout(2000);

  postLoginUrl = page.url();
  console.log(`→ post-submit URL: ${postLoginUrl}`);

  // 9. Check failure signals FIRST (deterministic abort)
  // Use isVisible() not $() · client-side validators (e.g. Alimarket)
  // pre-render hidden error elements that match the selector but aren't
  // actually shown. We only count VISIBLE error markers as failures.
  for (const sel of recipe.failureSignals.anyErrorSelector) {
    let visible = false;
    try {
      visible = await page.isVisible(sel, { timeout: 500 });
    } catch {
      visible = false;
    }
    if (visible) {
      const el = await page.$(sel);
      const text = el ? ((await el.textContent())?.toLowerCase() ?? "") : "";
      failureReason = `visible error element matched: ${sel}${text ? ` · text="${text.slice(0, 120)}"` : ""}`;
      break;
    }
  }
  if (!failureReason) {
    const bodyText = (await page.textContent("body").catch(() => null))?.toLowerCase() ?? "";
    for (const frag of recipe.failureSignals.errorTextFragments) {
      if (bodyText.includes(frag)) {
        failureReason = `error fragment matched: "${frag}"`;
        break;
      }
    }
  }

  if (failureReason) {
    console.error(`✗ login appears to have failed: ${failureReason}`);
    loginOk = false;
  } else {
    // 10. Check success signals — at least one must match
    const stillOnLogin = postLoginUrl.includes("/login");
    let foundLoggedInSelector = false;
    for (const sel of recipe.successSignals.anyLoggedInSelector) {
      if (await page.$(sel)) {
        foundLoggedInSelector = true;
        console.log(`  · logged-in selector found: ${sel}`);
        break;
      }
    }
    const cookies = await context.cookies();
    const hasSessionCookie = cookies.some((c) =>
      recipe.successSignals.cookieNamePrefixes.some((p) => c.name.toLowerCase().includes(p.toLowerCase())),
    );

    if (!stillOnLogin) console.log(`  · URL left /login: ${postLoginUrl}`);
    if (hasSessionCookie) console.log(`  · session cookie present`);

    loginOk = (!stillOnLogin) || foundLoggedInSelector || hasSessionCookie;
    if (!loginOk) {
      failureReason = `no success signal · still_on_login=${stillOnLogin} · selector=${foundLoggedInSelector} · cookie=${hasSessionCookie}`;
      console.error(`✗ ${failureReason}`);
    } else {
      console.log("✓ login succeeded");
    }
  }

  // 11. Capture storageState (regardless · useful for diagnostics)
  const storageState = await context.storageState();
  console.log(`✓ storageState captured · ${storageState.cookies.length} cookies · ${storageState.origins.length} origins`);

  // 11b. VALIDATION · prove cookies grant subscriber-tier access
  // (Skipped when login already failed — no point validating bad cookies)
  if (loginOk) {
    console.log(`\n→ validation · anon vs. authed comparison`);
    // Fresh anonymous context for baseline (no login attempts consumed)
    const anonContext = await browser.newContext({
      userAgent: context._options?.userAgent ?? undefined,
      viewport: { width: 1366, height: 820 },
      locale: "es-ES",
      timezoneId: "Europe/Madrid",
    });
    const anonPage = await anonContext.newPage();

    for (const target of recipe.validationTargets) {
      const authedHtml = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 25_000 })
        .then(() => page.content())
        .catch((err) => { return `__FETCH_ERROR__${err.message}`; });
      const anonHtml = await anonPage.goto(target.url, { waitUntil: "domcontentloaded", timeout: 25_000 })
        .then(() => anonPage.content())
        .catch((err) => { return `__FETCH_ERROR__${err.message}`; });

      const authedFlags = scanHtml(authedHtml, recipe);
      const anonFlags = scanHtml(anonHtml, recipe);

      // Verdict per target: authed differs from anon in any meaningful way.
      // Three independent positive signals (any one triggers PASS):
      //   1. More authed-markers found in authed body
      //   2. Fewer paywall-CTAs in authed body
      //   3. Body size delta > 5000 bytes (subscriber-only HTML chunk
      //      is delivered in addition to the public shell)
      const moreAuthedMarkers = authedFlags.authedHits > anonFlags.authedHits;
      const fewerPaywallCtas = authedFlags.paywallHits < anonFlags.paywallHits;
      const sizeDelta = authedFlags.length - anonFlags.length;
      const significantSizeDelta = Math.abs(sizeDelta) > 5000;
      const verdict = moreAuthedMarkers || fewerPaywallCtas || significantSizeDelta;

      validationReport.push({
        target: target.label,
        url: target.url,
        anon: anonFlags,
        authed: authedFlags,
        sizeDelta,
        moreAuthedMarkers,
        fewerPaywallCtas,
        significantSizeDelta,
        verdict,
      });

      console.log(
        `  · ${target.label.padEnd(20)} ` +
        `anon(authed=${anonFlags.authedHits} paywall=${anonFlags.paywallHits} ${(anonFlags.length / 1024).toFixed(1)}kB) ` +
        `→ authed(authed=${authedFlags.authedHits} paywall=${authedFlags.paywallHits} ${(authedFlags.length / 1024).toFixed(1)}kB) ` +
        `Δ=${sizeDelta > 0 ? "+" : ""}${sizeDelta}B ` +
        `· ${verdict ? "✓" : "✗"}`,
      );
    }

    await anonContext.close();

    // Aggregate: at least one target must show a clear delta
    validationOk = validationReport.some((r) => r.verdict);
    console.log(`\n${validationOk ? "✓" : "✗"} validation ${validationOk ? "PASSED" : "FAILED"} · ${validationReport.filter((r) => r.verdict).length}/${validationReport.length} target(s) confirmed authed access`);
  }

  if (KEEP_OPEN && !HEADLESS) {
    console.log("→ keeping browser open for 60s for inspection (Ctrl+C to exit early)...");
    await page.waitForTimeout(60_000);
  }

  // 12. If login OK + validation OK + not dry-run · persist real T2 row
  if (loginOk && validationOk && !DRY_RUN) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
    const encrypted = encrypt(JSON.stringify(storageState));

    // Demote prior active sessions
    await sb
      .from("intelligence_source_sessions")
      .update({ status: "expired" })
      .eq("source_slug", slug)
      .eq("status", "active");

    const { data: inserted, error: insertErr } = await sb
      .from("intelligence_source_sessions")
      .insert({
        source_id: source.id,
        source_slug: slug,
        storage_state_encrypted: toBytea(encrypted.ciphertext),
        iv: toBytea(encrypted.iv),
        auth_tag: toBytea(encrypted.authTag),
        enc_key_id: process.env.INTELLIGENCE_SESSION_ENC_KEY_ID ?? "v1",
        status: "active",
        expires_at: expiresAt.toISOString(),
        refreshed_at: now.toISOString(),
        refresh_count: 1,
        meta: {
          placeholder: false,
          captured_via: "playwright-refresh.mjs",
          playwright_version: "1.60.x",
          user_agent: "chromium-headless-shell",
          cookies_count: storageState.cookies.length,
          origins_count: storageState.origins.length,
          post_login_url: postLoginUrl,
        },
      })
      .select("id")
      .single();
    if (insertErr) {
      console.error("error: T2 insert failed —", insertErr.message);
      process.exit(1);
    }

    await sb
      .from("intelligence_source_credentials")
      .update({
        last_login_at: now.toISOString(),
        last_login_status: "success",
        last_login_error: null,
      })
      .eq("id", cred.id);

    await sb.from("intelligence_credentials_audit").insert({
      source_id: source.id,
      source_slug: slug,
      credential_id: cred.id,
      event_kind: "auth_success",
      detail: {
        captured_via: "playwright-refresh.mjs",
        session_id: inserted.id,
        expires_at: expiresAt.toISOString(),
        placeholder_storage_state: false,
        cookies_count: storageState.cookies.length,
        validation_targets_passed: validationReport.filter((r) => r.verdict).length,
        validation_targets_total: validationReport.length,
      },
    });

    console.log(`\n✓ REAL T2 session row inserted · id=${inserted.id} · expires=${expiresAt.toISOString()}`);
    console.log(`✓ credentials.last_login_at updated · audit event auth_success written`);
    console.log(`\n  Placeholder row demoted to status='expired'.`);
  } else if (loginOk && validationOk && DRY_RUN) {
    console.log("\n[dry-run] login + validation succeeded · NOT persisting T2 (per --dry-run)");
  } else if (loginOk && !validationOk) {
    console.error(`\n✗ login succeeded but validation FAILED · NOT persisting T2`);
    console.error(`  placeholder row left intact · session may be valid but signal was inconclusive`);
    if (!DRY_RUN) {
      // Audit the validation-fail outcome separately so it shows up in
      // forensics without polluting the auth_success/failure semantics.
      await sb.from("intelligence_credentials_audit").insert({
        source_id: source.id,
        source_slug: slug,
        credential_id: cred.id,
        event_kind: "auth_failure",
        error: "login_ok but validation_failed",
        detail: {
          captured_via: "playwright-refresh.mjs",
          validation_report: validationReport.map((r) => ({
            target: r.target,
            verdict: r.verdict,
            anon: r.anon,
            authed: r.authed,
          })),
        },
      });
    }
  } else if (!loginOk) {
    // Record auth_failure audit event with sanitised reason
    if (!DRY_RUN) {
      await sb
        .from("intelligence_source_credentials")
        .update({
          last_login_at: new Date().toISOString(),
          last_login_status: "failure",
          last_login_error: failureReason?.slice(0, 480) ?? "unknown",
        })
        .eq("id", cred.id);
      await sb.from("intelligence_credentials_audit").insert({
        source_id: source.id,
        source_slug: slug,
        credential_id: cred.id,
        event_kind: "auth_failure",
        error: failureReason?.slice(0, 480) ?? "unknown",
        detail: { captured_via: "playwright-refresh.mjs", post_login_url: postLoginUrl },
      });
      console.log("\n  auth_failure audit event written. Placeholder T2 row left untouched.");
    }
  }
} catch (err) {
  console.error("\n✗ unexpected error:", err.message?.slice(0, 480) ?? String(err));
  loginOk = false;
} finally {
  if (!KEEP_OPEN) await browser.close();
}

console.log(`\n--- summary ---`);
console.log(`source:         ${slug}`);
console.log(`login_ok:       ${loginOk}`);
console.log(`validation_ok:  ${loginOk ? validationOk : "skipped (login failed)"}`);
console.log(`failure:        ${failureReason ?? "none"}`);
console.log(`persisted:      ${loginOk && validationOk && !DRY_RUN ? "yes (real T2)" : "no"}`);
console.log(`post_login_url: ${postLoginUrl ?? "n/a"}`);

process.exit(loginOk && (validationOk || DRY_RUN) ? 0 : 1);

// ── helpers ────────────────────────────────────────────────────────────────

function scanHtml(html, recipe) {
  if (!html || html.startsWith("__FETCH_ERROR__")) {
    return { error: html ? html.slice(14) : "no-body", paywallHits: 0, authedHits: 0, length: 0 };
  }
  const lower = html.toLowerCase();
  const paywallHits = recipe.paywallCtaPatterns.reduce(
    (acc, p) => acc + (lower.includes(p.toLowerCase()) ? 1 : 0),
    0,
  );
  const authedHits = recipe.authedOnlyPatterns.reduce(
    (acc, p) => acc + (lower.includes(p.toLowerCase()) ? 1 : 0),
    0,
  );
  return { paywallHits, authedHits, length: html.length };
}
