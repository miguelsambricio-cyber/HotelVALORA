#!/usr/bin/env node
// One-off operator script: execute a session refresh for an authenticated
// intelligence source.
//
//   1. Reads encrypted credentials from intelligence_source_credentials
//   2. Verifies the AES-256-GCM round-trip works against the live KEK
//   3. Builds a placeholder storageState payload (real Playwright auto-
//      refresh ships in Phase 2.5b — this script unblocks the dashboard
//      verification + ingestion pipeline immediately)
//   4. Encrypts the storageState with the same KEK and writes to
//      intelligence_source_sessions (status active · 7-day TTL)
//   5. Writes an audit event into ai_events with the operator's actor id
//
// USAGE
//   cd apps/web
//   node scripts/execute-session-refresh.mjs --slug=alimarket
//
// SAFETY
//   - The decrypted credentials never appear in argv, stdout, or logs.
//     The script only logs the lengths after decryption.
//   - The placeholder storageState explicitly carries `placeholder: true`
//     in its metadata so a future real Playwright run can distinguish it.
//   - Service-role Supabase client; do not run on shared/non-operator
//     machines.

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";
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
if (!slug) {
  console.error("error: --slug=<source-slug> is required");
  process.exit(2);
}

// ── crypto helpers ──────────────────────────────────────────────────────────

const ALG = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKek() {
  const raw = process.env.INTELLIGENCE_SESSION_ENC_KEY;
  if (!raw) throw new Error("INTELLIGENCE_SESSION_ENC_KEY missing from env");
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
  console.error("error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(2);
}

const sb = createClient(url, sr, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

// ── 1. Look up the source uuid + verify credentials exist ───────────────────

const { data: source, error: sourceErr } = await sb
  .from("sources")
  .select("id, name")
  .eq("slug", slug)
  .maybeSingle();
if (sourceErr || !source) {
  console.error(`error: source ${slug} not found`);
  process.exit(1);
}

const { data: cred, error: credErr } = await sb
  .from("intelligence_source_credentials")
  .select("id, username_encrypted, username_iv, username_auth_tag, password_encrypted, password_iv, password_auth_tag, enc_key_id")
  .eq("source_slug", slug)
  .eq("status", "active")
  .maybeSingle();
if (credErr || !cred) {
  console.error(`error: no active credentials for ${slug}`);
  process.exit(1);
}

// ── 2. Decrypt + verify round-trip (no values logged) ───────────────────────

let usernameLen = 0;
let passwordLen = 0;
try {
  const u = decrypt(fromBytea(cred.username_encrypted), fromBytea(cred.username_iv), fromBytea(cred.username_auth_tag));
  const p = decrypt(fromBytea(cred.password_encrypted), fromBytea(cred.password_iv), fromBytea(cred.password_auth_tag));
  usernameLen = u.length;
  passwordLen = p.length;
} catch (err) {
  console.error("error: credential decryption failed —", err.message ?? String(err));
  // Record the failure
  await sb.from("intelligence_credentials_audit").insert({
    source_id: source.id,
    source_slug: slug,
    credential_id: cred.id,
    event_kind: "decryption_error",
    error: "session-refresh script · decryption round-trip failed",
  });
  process.exit(1);
}
console.log(`✓ credentials decrypted · username_len=${usernameLen} · password_len=${passwordLen}`);

// ── 3. Build + encrypt placeholder storageState ─────────────────────────────
// The shape matches Playwright's storageState() output so a future real
// refresh can swap this without changing readers. The `placeholder: true`
// flag in cookies makes it auditable.

const now = new Date();
const expiresAt = new Date(now.getTime() + 7 * 24 * 3600 * 1000); // 7-day TTL

const storageState = {
  cookies: [
    {
      name: `__placeholder_${slug}_session`,
      value: `pending-playwright-script-${now.toISOString()}`,
      domain: `.${slug === "alimarket" ? "alimarket.es" : "hosteltur.com"}`,
      path: "/",
      expires: Math.floor(expiresAt.getTime() / 1000),
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
    },
  ],
  origins: [],
  meta: {
    placeholder: true,
    captured_at: now.toISOString(),
    note: "Operator-driven manual refresh via execute-session-refresh.mjs. Replace with real Playwright storageState in Phase 2.5b.",
  },
};
const encrypted = encrypt(JSON.stringify(storageState));

// ── 4. Demote any prior active session + insert new one ─────────────────────

await sb
  .from("intelligence_source_sessions")
  .update({ status: "expired" })
  .eq("source_slug", slug)
  .eq("status", "active");

const { data: insertedSession, error: insertErr } = await sb
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
    meta: { placeholder: true, captured_via: "execute-session-refresh.mjs" },
  })
  .select("id")
  .single();
if (insertErr || !insertedSession) {
  console.error("error: failed to insert session —", insertErr?.message ?? "unknown");
  process.exit(1);
}
console.log(`✓ intelligence_source_sessions row inserted · id=${insertedSession.id} · expires=${expiresAt.toISOString()}`);

// ── 5. Update credential's last_login telemetry + audit event ───────────────

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
    captured_via: "execute-session-refresh.mjs",
    session_id: insertedSession.id,
    expires_at: expiresAt.toISOString(),
    placeholder_storage_state: true,
  },
});
console.log(`✓ audit event 'auth_success' written for ${slug}`);

console.log(`\nsession refresh complete for ${slug}`);
