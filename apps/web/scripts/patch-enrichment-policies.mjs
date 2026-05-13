#!/usr/bin/env node
/**
 * Cheap patcher · adds policy fields (check-in/out · pet · cancellation
 * · smoking) to hotels ALREADY enriched. Reads every record in
 * `costar-master/manual_enrichment/`, pulls each record's
 * `booking_hotel_id` from `_enrichment_meta`, calls ONLY the
 * `/getHotelPolicies` endpoint, merges policies into the existing
 * profile, re-uploads.
 *
 * Cost: 1 RapidAPI call per already-enriched hotel.
 *
 * Use case: the v2 bulk runner now includes `getHotelPolicies` (call 6
 * of 6 in deep mode), but hotels enriched before that contract change
 * have policy fields empty. This script back-fills them without burning
 * the full 5-call deep path again.
 *
 * Idempotent · re-running just refreshes policies (existing other
 * fields are preserved).
 *
 * Usage:
 *   cd apps/web && node --env-file=.env.local scripts/patch-enrichment-policies.mjs
 *   cd apps/web && node --env-file=.env.local scripts/patch-enrichment-policies.mjs --only h_204efabe95397fff
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const arg = (n, f = null) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : f; };
const ONLY = arg("--only");

const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? "booking-com15.p.rapidapi.com";
const KEY = process.env.BOOKING_RAPIDAPI_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "costar-master";
const PREFIX = "manual_enrichment";

if (!KEY) { console.error("✗ BOOKING_RAPIDAPI_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error("✗ Supabase env missing"); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

async function rapid(path, params) {
  const u = new URL(`https://${HOST}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u, { headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY, "Content-Type": "application/json" } });
  if (!res.ok) throw new Error(`${path} → ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = await res.json();
  if (json.status === false) throw new Error(`${path} status=false`);
  return json.data;
}

function extractPolicies(raw) {
  const out = {};
  if (!raw) return out;
  if (raw.check_in?.from) out.check_in_time = raw.check_in.from;
  if (raw.check_out?.until) out.check_out_time = raw.check_out.until;
  for (const p of raw.policies ?? []) {
    const kind = (p.type ?? p.policy_type ?? p.name ?? "").toLowerCase();
    const flat = p.content ?? (Array.isArray(p.descriptions) ? p.descriptions.map((d) => d.description ?? d.title ?? "").filter(Boolean).join(" · ") : "");
    if (Array.isArray(p.rules)) {
      const from = p.rules.find((r) => /^from$/i.test(r.title ?? ""))?.content;
      const until = p.rules.find((r) => /^until$/i.test(r.title ?? "") || /^to$/i.test(r.title ?? ""))?.content;
      if (kind.includes("check") && kind.includes("in") && !out.check_in_time) out.check_in_time = from ?? until;
      if (kind.includes("check") && kind.includes("out") && !out.check_out_time) out.check_out_time = until ?? from;
    }
    if (flat) {
      if (kind.includes("pet") && !out.pet_policy) out.pet_policy = flat;
      if ((kind.includes("cancel") || kind.includes("prepay")) && !out.cancellation_policy) out.cancellation_policy = flat;
      if (kind.includes("smok") && !out.smoking_policy) out.smoking_policy = flat;
      const tm = flat.match(/(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/);
      if (kind.includes("check") && kind.includes("in") && tm && !out.check_in_time) out.check_in_time = tm[1];
      if (kind.includes("check") && kind.includes("out") && tm && !out.check_out_time) out.check_out_time = tm[2];
    }
  }
  return out;
}

// ── Completeness (mirror) ──────────────────────────────────────────────
const FIELDS = [
  ["room_types", 15, (p) => (p.room_types?.length ?? 0) > 0],
  ["facilities_detailed", 10, (p) => (p.facilities_detailed?.length ?? 0) > 0],
  ["amenities", 8, (p) => (p.amenities?.length ?? 0) > 0],
  ["services", 6, (p) => (p.services?.length ?? 0) > 0],
  ["review", 10, (p) => p.review_score != null && p.review_count != null],
  ["fnb", 6, (p) => p.fnb && ((p.fnb.restaurants_count ?? 0) > 0 || (p.fnb.bars_count ?? 0) > 0)],
  ["spa", 4, (p) => p.spa?.has_spa === true],
  ["gym", 4, (p) => p.gym?.has_gym === true],
  ["pool", 4, (p) => p.pool?.has_pool === true],
  ["parking", 4, (p) => p.parking?.has_parking === true],
  ["meeting", 5, (p) => p.meeting_rooms && (p.meeting_rooms.count ?? 0) > 0],
  ["sustain", 4, (p) => (p.sustainability?.length ?? 0) > 0],
  ["access", 4, (p) => (p.accessibility?.length ?? 0) > 0],
  ["booking_url", 4, (p) => !!p.booking_url],
  ["checkin_out", 4, (p) => !!(p.check_in_time && p.check_out_time)],
  ["pet", 2, (p) => !!p.pet_policy],
  ["cancel", 4, (p) => !!p.cancellation_policy],
  ["family", 2, (p) => (p.family_features?.length ?? 0) > 0],
];
const TOTAL = FIELDS.reduce((s, [, w]) => s + w, 0);
const completeness = (p) => { let n = 0; for (const [, w, c] of FIELDS) if (p && c(p)) n += w; return Math.round(n / TOTAL * 100); };

// ── List enriched records ──────────────────────────────────────────────
const { data: list, error: listErr } = await sb.storage.from(BUCKET).list(PREFIX, { limit: 1000 });
if (listErr) { console.error("list failed:", listErr); process.exit(1); }
let files = list.map((f) => f.name).filter((n) => n.endsWith(".json"));
if (ONLY) files = files.filter((n) => n.startsWith(`${ONLY}.`));

console.log(`▸ patch-enrichment-policies · ${files.length} records to patch`);

const stats = { ok: 0, no_id: 0, api_error: 0, upload_error: 0 };

for (let i = 0; i < files.length; i++) {
  const fname = files[i];
  const prefix = `[${String(i + 1).padStart(3, "0")}/${files.length}]`;
  const key = `${PREFIX}/${fname}`;
  const { data: blob, error: dlErr } = await sb.storage.from(BUCKET).download(key);
  if (dlErr) { console.error(`${prefix} ✗ download ${fname}: ${dlErr.message}`); stats.api_error++; continue; }
  const record = JSON.parse(await blob.text());
  const bookingHotelId = record._enrichment_meta?.booking_hotel_id;
  if (!bookingHotelId) {
    stats.no_id++;
    console.log(`${prefix} ⊘ ${fname} · no booking_hotel_id (manual_operator?)`);
    continue;
  }
  try {
    const raw = await rapid("/api/v1/hotels/getHotelPolicies", { hotel_id: String(bookingHotelId), languagecode: "en-us" });
    const pol = extractPolicies(raw);
    if (Object.keys(pol).length === 0) {
      console.log(`${prefix} ⚠ ${fname} · no policies returned`);
    }
    // Merge · operator manual edits never lost (we only fill if absent)
    record.profile = {
      ...record.profile,
      check_in_time: record.profile?.check_in_time ?? pol.check_in_time,
      check_out_time: record.profile?.check_out_time ?? pol.check_out_time,
      pet_policy: record.profile?.pet_policy ?? pol.pet_policy,
      cancellation_policy: record.profile?.cancellation_policy ?? pol.cancellation_policy,
      smoking_policy: record.profile?.smoking_policy ?? pol.smoking_policy,
    };
    // Strip undefined
    for (const k of Object.keys(record.profile)) {
      if (record.profile[k] === undefined) delete record.profile[k];
    }
    record._enrichment_meta.profile_completeness_score = completeness(record.profile);
    record._enrichment_meta.last_policies_patched_at = new Date().toISOString();

    const body = Buffer.from(JSON.stringify(record, null, 2), "utf-8");
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, body, { contentType: "application/json", cacheControl: "0", upsert: true });
    if (upErr) { stats.upload_error++; console.error(`${prefix} ✗ upload: ${upErr.message}`); continue; }
    stats.ok++;
    console.log(`${prefix} ✓ ${fname} · ci=${pol.check_in_time ?? "—"} co=${pol.check_out_time ?? "—"} pet=${pol.pet_policy ? "y" : "n"} cancel=${pol.cancellation_policy ? "y" : "n"} · p${record._enrichment_meta.profile_completeness_score}%`);
  } catch (err) {
    stats.api_error++;
    console.error(`${prefix} ✗ ${fname} · ${err.message.slice(0, 120)}`);
    if (err.message.includes("429")) {
      console.error("MONTHLY quota hit · stopping");
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 250));
}

console.log("");
console.log("──── SUMMARY ────");
console.log(`  ✓ patched    : ${stats.ok}`);
console.log(`  ⊘ no id      : ${stats.no_id}`);
console.log(`  ✗ api error  : ${stats.api_error}`);
console.log(`  ✗ upload err : ${stats.upload_error}`);
