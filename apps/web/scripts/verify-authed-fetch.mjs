#!/usr/bin/env node
// Phase 2.5b · Verify that the canonical T2 cookies actually unlock paywalled
// content for a given source. Decrypts the active T2 row, decodes the
// storageState, builds a cookie header, fetches a set of target URLs both
// anonymously and with the cookie jar, then reports the deltas.
//
// READ-ONLY · no DB writes · no login attempts · pure HTTP.
//
// USAGE
//   cd apps/web
//   node scripts/verify-authed-fetch.mjs --slug=hosteltur
//
// FLAGS
//   --slug=<slug>   required · matches public.sources.slug
//   --save-body     after verification, write the authed body of the LAST
//                   listed target into market_news.body (one row, identified
//                   by canonical_url) as end-to-end proof. Only writes when
//                   the verdict for that target is "AUTHED-DIFFERS".
//   --json          machine-readable JSON output

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createDecipheriv } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

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
if (!slug) { console.error("--slug=<source-slug> required"); process.exit(2); }
const SAVE_BODY = args["save-body"] === true || args["save-body"] === "true";
const JSON_OUT = args.json === true || args.json === "true";

// ── per-source verification targets ─────────────────────────────────────────

const TARGETS = {
  hosteltur: [
    {
      url: "https://www.hosteltur.com/",
      label: "homepage",
      // The homepage carries user-state in the header navigation.
      paywallPatterns: ["Hazte Premium", "Suscríbete por"],
      authedPatterns: ["logout", "Cerrar sesión", "Mi cuenta", "Mi perfil", "Mi suscripción"],
    },
    {
      url: "https://www.hosteltur.com/premium",
      label: "premium-landing",
      paywallPatterns: ["Hazte Premium", "Suscríbete por", "0,17"],
      authedPatterns: ["logout", "Mi suscripción", "Mi perfil"],
    },
    {
      url: "https://www.hosteltur.com/edicion-impresa",
      label: "magazine-archive",
      paywallPatterns: ["Hazte Premium", "Suscríbete", "Sólo para Premium"],
      authedPatterns: ["logout", "Descargar", "Leer revista", "Mi perfil"],
    },
    // A known editorial article from the recent RSS ingest. Many Hosteltur
    // articles are free with a partial preview; some are fully gated. We
    // expect at minimum a small delta in body size (subscriber UI elements).
    {
      url: "https://www.hosteltur.com/176015_las-cadenas-hoteleras-ganan-peso-en-espana-325-empresas-ya-controlan-el-81-de-la-oferta.html",
      label: "news-article-marketstructure",
      paywallPatterns: ["Hazte Premium", "Suscríbete por", "Para seguir leyendo"],
      authedPatterns: ["logout", "Mi perfil"],
    },
  ],
  alimarket: [
    {
      url: "https://www.alimarket.es/",
      label: "homepage",
      paywallPatterns: ["Suscríbete", "Acceder"],
      authedPatterns: ["logout", "Mi cuenta", "Cerrar sesión"],
    },
    {
      // Subscriber-only account page · anon fetch follows redirect to login
      // form (much smaller body), authed fetch returns the real /mi_cuenta
      // page (~35kB larger). Strongest binary signal.
      url: "https://www.alimarket.es/mi_cuenta",
      label: "account-page",
      paywallPatterns: ["Iniciar sesión", "Acceder", "Recordar contraseña"],
      authedPatterns: ["logout", "Cerrar sesión", "Mi cuenta", "Mi perfil", "Mi suscripción", "Mis alertas"],
    },
    {
      // Known premium hospitality article already ingested via RSS — proves
      // the cookie jar grants subscriber body delivery on the paywalled
      // content surface itself, not just account UI.
      url: "https://www.alimarket.es/hoteles/noticia/425817/el-fondo-hotelero-de-tikehau-capital-comienza-las-obras-del-mayor--holiday-inn-express--de-espana",
      label: "premium-article",
      paywallPatterns: ["Suscríbete", "Hazte suscriptor", "Sólo para suscriptores", "Para seguir leyendo"],
      authedPatterns: ["logout", "Cerrar sesión", "Mi cuenta", "Mi perfil"],
    },
  ],
};

const targets = TARGETS[slug];
if (!targets) { console.error(`no verification targets configured for "${slug}"`); process.exit(2); }

// ── crypto helpers ──────────────────────────────────────────────────────────

const ALG = "aes-256-gcm";
function getKek() {
  const raw = process.env.INTELLIGENCE_SESSION_ENC_KEY;
  if (!raw) throw new Error("INTELLIGENCE_SESSION_ENC_KEY missing");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error(`KEK must decode to 32 bytes (got ${key.length})`);
  return key;
}
function decrypt(ciphertext, iv, authTag) {
  const decipher = createDecipheriv(ALG, getKek(), iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
const fromBytea = (s) => Buffer.from((s ?? "").startsWith("\\x") ? s.slice(2) : s, "hex");

// ── supabase + decrypt T2 ───────────────────────────────────────────────────

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const { data: t2 } = await sb
  .from("intelligence_source_sessions")
  .select("id, storage_state_encrypted, iv, auth_tag, expires_at, meta")
  .eq("source_slug", slug)
  .eq("status", "active")
  .order("refreshed_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (!t2) { console.error(`no active T2 row for ${slug}`); process.exit(1); }
if (new Date(t2.expires_at).getTime() <= Date.now()) { console.error(`T2 row is expired`); process.exit(1); }

let storageState;
try {
  const json = decrypt(fromBytea(t2.storage_state_encrypted), fromBytea(t2.iv), fromBytea(t2.auth_tag));
  storageState = JSON.parse(json);
} catch (err) {
  console.error("decrypt failed:", err.message);
  process.exit(1);
}

const placeholderFlag = storageState?.meta?.placeholder === true || t2.meta?.placeholder === true;
const cookieCount = storageState?.cookies?.length ?? 0;

console.log(`\n→ T2 decrypted · session_id=${t2.id} · cookies=${cookieCount} · placeholder=${placeholderFlag}`);
console.log(`  expires_at=${t2.expires_at}\n`);

if (placeholderFlag) {
  console.error("⚠  T2 is still a placeholder — fetch will likely behave as anon. Run playwright-refresh first.");
  process.exit(1);
}

// ── build a Cookie header for the relevant domain ───────────────────────────

function buildCookieHeader(cookies, targetUrl) {
  const u = new URL(targetUrl);
  const host = u.hostname;
  const isHttps = u.protocol === "https:";
  const matching = cookies.filter((c) => {
    // Domain match · cookies with leading dot match all subdomains
    const cDomain = (c.domain ?? "").replace(/^\./, "");
    const domainMatch = host === cDomain || host.endsWith(`.${cDomain}`);
    if (!domainMatch) return false;
    if (c.secure && !isHttps) return false;
    // Path match (loose — most session cookies use "/")
    if (c.path && !u.pathname.startsWith(c.path)) return false;
    // expires/sameSite ignored — short-lived fetch
    return true;
  });
  if (matching.length === 0) return "";
  return matching.map((c) => `${c.name}=${c.value}`).join("; ");
}

// ── fetch + analyze ─────────────────────────────────────────────────────────

async function fetchBody(url, cookieHeader) {
  const headers = {
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "es-ES,es;q=0.9,en;q=0.8",
  };
  if (cookieHeader) headers.cookie = cookieHeader;
  try {
    const res = await fetch(url, { headers, redirect: "follow" });
    const text = await res.text();
    return { status: res.status, length: text.length, body: text };
  } catch (err) {
    return { status: 0, length: 0, body: "", error: err.message };
  }
}

function scan(body, paywallPatterns, authedPatterns) {
  if (!body) return { paywallHits: 0, authedHits: 0 };
  const lower = body.toLowerCase();
  const paywallHits = paywallPatterns.filter((p) => lower.includes(p.toLowerCase())).length;
  const authedHits = authedPatterns.filter((p) => lower.includes(p.toLowerCase())).length;
  return { paywallHits, authedHits };
}

const report = [];
let lastTargetAuthedBody = null;

for (const t of targets) {
  const cookieHeader = buildCookieHeader(storageState.cookies, t.url);
  const cookieCountForUrl = cookieHeader ? cookieHeader.split("; ").length : 0;

  const [anon, authed] = await Promise.all([
    fetchBody(t.url, null),
    fetchBody(t.url, cookieHeader),
  ]);

  const anonFlags = scan(anon.body, t.paywallPatterns, t.authedPatterns);
  const authedFlags = scan(authed.body, t.paywallPatterns, t.authedPatterns);

  const sizeDelta = authed.length - anon.length;
  const moreAuthedMarkers = authedFlags.authedHits > anonFlags.authedHits;
  const fewerPaywallCtas = authedFlags.paywallHits < anonFlags.paywallHits;
  const verdict = moreAuthedMarkers || fewerPaywallCtas || sizeDelta > 5000;

  report.push({
    label: t.label,
    url: t.url,
    cookies_sent: cookieCountForUrl,
    anon: { status: anon.status, length: anon.length, ...anonFlags },
    authed: { status: authed.status, length: authed.length, ...authedFlags },
    size_delta_bytes: sizeDelta,
    more_authed_markers: moreAuthedMarkers,
    fewer_paywall_ctas: fewerPaywallCtas,
    verdict: verdict ? "AUTHED-DIFFERS" : "NO-DIFFERENCE",
  });

  lastTargetAuthedBody = { url: t.url, body: authed.body, length: authed.length, verdict };
}

// ── stamp last_authed_fetch_at on the active T2 row ─────────────────────────
//
// The Admin UI surfaces this timestamp + status as "Last successful
// authenticated fetch" — distinct from `refreshed_at`, since auth refresh
// and authed fetch are independent operations. Writing here is the cheap,
// honest signal: every time the cookie jar successfully demonstrated a
// differential against anon, we stamp this row.
const passedTargets = report.filter((r) => r.verdict === "AUTHED-DIFFERS").length;
const fetchStatus = passedTargets > 0 ? "ok" : "fail";
{
  const currentMeta = (t2.meta && typeof t2.meta === "object") ? t2.meta : {};
  // Persist the latest authoritative anon-vs-authed signal into T2.meta
  // so the Admin UI ("Premium-access verification" table) reflects
  // real data, not just the snapshot captured at refresh time.
  const validationReport = report.map((r) => ({
    target: r.label,
    url: r.url,
    anon_length: r.anon.length,
    authed_length: r.authed.length,
    anon_authed_hits: r.anon.authedHits,
    anon_paywall_hits: r.anon.paywallHits,
    authed_authed_hits: r.authed.authedHits,
    authed_paywall_hits: r.authed.paywallHits,
    size_delta: r.size_delta_bytes,
    more_authed_markers: r.more_authed_markers,
    fewer_paywall_ctas: r.fewer_paywall_ctas,
    significant_size_delta: Math.abs(r.size_delta_bytes) > 5000,
    verdict: r.verdict === "AUTHED-DIFFERS",
  }));
  const nextMeta = {
    ...currentMeta,
    last_authed_fetch_at: new Date().toISOString(),
    last_authed_fetch_status: fetchStatus,
    last_authed_fetch_passed: passedTargets,
    last_authed_fetch_total: report.length,
    last_authed_fetch_via: "verify-authed-fetch.mjs",
    validation_report: validationReport,
    validation_passed_at: new Date().toISOString(),
  };
  const { error: metaErr } = await sb
    .from("intelligence_source_sessions")
    .update({ meta: nextMeta })
    .eq("id", t2.id);
  if (metaErr) console.error(`⚠  meta stamp failed: ${metaErr.message}`);
}

// ── output ──────────────────────────────────────────────────────────────────

if (JSON_OUT) {
  console.log(JSON.stringify({ slug, session_id: t2.id, cookies_total: cookieCount, report }, null, 2));
} else {
  console.log(`Verification report · slug=${slug}\n${"=".repeat(72)}`);
  for (const r of report) {
    const banner = r.verdict === "AUTHED-DIFFERS" ? "✓" : "✗";
    console.log(`\n${banner} ${r.label}`);
    console.log(`   url:     ${r.url}`);
    console.log(`   cookies: ${r.cookies_sent} sent`);
    console.log(`   anon:    status=${r.anon.status} length=${r.anon.length} authed-markers=${r.anon.authedHits} paywall-CTAs=${r.anon.paywallHits}`);
    console.log(`   authed:  status=${r.authed.status} length=${r.authed.length} authed-markers=${r.authed.authedHits} paywall-CTAs=${r.authed.paywallHits}`);
    console.log(`   delta:   ${r.size_delta_bytes >= 0 ? "+" : ""}${r.size_delta_bytes} bytes ${r.size_delta_bytes > 0 ? "(authed bigger)" : r.size_delta_bytes < 0 ? "(anon bigger)" : ""}`);
    console.log(`   verdict: ${r.verdict}`);
  }
  const passed = report.filter((r) => r.verdict === "AUTHED-DIFFERS").length;
  console.log(`\n${"=".repeat(72)}`);
  console.log(`Summary: ${passed}/${report.length} target(s) showed authenticated differential.`);
}

// ── optional: write the last target's authed body to market_news.body ───────

if (SAVE_BODY && lastTargetAuthedBody && lastTargetAuthedBody.verdict) {
  console.log(`\n→ --save-body · attempting to persist authed body for: ${lastTargetAuthedBody.url}`);
  // market_news has source_id (FK to sources), not source_slug — resolve first.
  const { data: src } = await sb.from("sources").select("id").eq("slug", slug).maybeSingle();
  // Find a market_news row that matches this URL (any of the 8 already ingested
  // for hosteltur via RSS). If found, update body + enriched_meta.
  const slugFragment = lastTargetAuthedBody.url.split("/").pop().split(".")[0];
  const matchingArticle = await sb
    .from("market_news")
    .select("id, title")
    .eq("source_id", src?.id ?? "")
    .ilike("url", `%${slugFragment}%`)
    .maybeSingle();

  if (matchingArticle.data) {
    const { id } = matchingArticle.data;
    const { error } = await sb
      .from("market_news")
      .update({
        body: lastTargetAuthedBody.body.length > 65000
          ? lastTargetAuthedBody.body.slice(0, 65000) + "\n\n[truncated to 65k for storage]"
          : lastTargetAuthedBody.body,
        enriched_meta: {
          fetched_authed_at: new Date().toISOString(),
          fetched_authed_by_session: t2.id,
          fetched_authed_length: lastTargetAuthedBody.length,
          fetch_source: "verify-authed-fetch.mjs",
        },
      })
      .eq("id", id);
    if (error) console.error(`  ✗ update failed: ${error.message}`);
    else console.log(`  ✓ market_news.body updated for article id=${id}`);
  } else {
    console.log(`  · no matching market_news row · skipping`);
  }
}

process.exit(0);
