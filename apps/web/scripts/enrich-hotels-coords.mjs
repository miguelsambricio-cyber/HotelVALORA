#!/usr/bin/env node
/**
 * Coordinate-enrichment runner · Google Places API v1.
 *
 * Iterates every hotel in the snapshot, resolves a place via
 * `places:searchText`, and writes lat/lng + addressComponents into
 * `costar-master/manual_enrichment/<hotel_id>.json` under
 * `profile.latitude / .longitude / .geo_context.google_place_id`.
 *
 * MERGE-aware: if a record already exists at that key with a
 * `manual_operator` or `rapidapi_booking` source, lat/lng land WITHOUT
 * overwriting other fields. Source priority is enforced at the
 * snapshot-reader merge layer · Google Places (priority 70) never
 * clobbers manual (100) or booking (80) signals.
 *
 * Idempotent · `--skip-coord-resolved` flag skips hotels that already
 * have lat/lng in either the canonical record or the existing profile.
 *
 * Cost: ~1 SearchText call per hotel · ~$32/1000 Atmosphere tier · 364
 * hotels ≈ $12 total.
 *
 * Usage:
 *   cd apps/web && node --env-file=.env.local scripts/enrich-hotels-coords.mjs
 *   cd apps/web && node --env-file=.env.local scripts/enrich-hotels-coords.mjs --limit 5
 *   cd apps/web && node --env-file=.env.local scripts/enrich-hotels-coords.mjs --only h_204efabe95397fff
 *   cd apps/web && node --env-file=.env.local scripts/enrich-hotels-coords.mjs --skip-coord-resolved
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

const args = process.argv.slice(2);
const arg = (n, f = null) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : f; };
const flag = (n) => args.includes(n);
const LIMIT = arg("--limit") ? parseInt(arg("--limit"), 10) : Infinity;
const ONLY = arg("--only");
const SKIP_RESOLVED = flag("--skip-coord-resolved");
const THROTTLE_MS = parseInt(arg("--throttle", "200"), 10);
const MIN_MATCH = parseFloat(arg("--min-match", "0.7"));

const KEY = process.env.GOOGLE_PLACES_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "costar-master";
const PREFIX = "manual_enrichment";

if (!KEY) { console.error("✗ GOOGLE_PLACES_API_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error("✗ Supabase env missing"); process.exit(1); }

const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

const snapshotPath = pathResolve(process.cwd(), "..", "..", "services", "costar", "MASTER", "snapshot.json");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
let hotels = snapshot.hotels ?? [];
if (ONLY) hotels = hotels.filter((h) => h.hotel_id === ONLY);
hotels = hotels.slice(0, LIMIT);

console.log(`▸ enrich-hotels-coords · ${hotels.length} hotels in scope · throttle ${THROTTLE_MS}ms · min-match ${MIN_MATCH}`);

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.addressComponents",
  "places.types",
  "places.businessStatus",
  "places.rating",
  "places.userRatingCount",
  "places.websiteUri",
].join(",");

async function searchText(query, regionCode) {
  const body = { textQuery: query, maxResultCount: 5 };
  if (regionCode) body.regionCode = regionCode;
  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": KEY,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`searchText ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return json.places ?? [];
}

function normName(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(hotel|hotels|by|the|de|del|la|el|los|las)\b/g, " ")
    .replace(/\s+/g, " ").trim();
}
function matchConf(placeName, targetName) {
  const c = normName(placeName);
  const t = normName(targetName);
  if (!c || !t) return 0;
  if (c === t) return 1;
  if (c.includes(t)) return 0.95;
  if (t.includes(c)) return 0.9;
  const ct = new Set(c.split(/\s+/).filter(Boolean));
  const tt = new Set(t.split(/\s+/).filter(Boolean));
  if (tt.size === 0) return 0;
  const inter = [...tt].filter((x) => ct.has(x)).length;
  const union = new Set([...ct, ...tt]).size;
  return Math.max(0, Math.min(0.85, (inter / union) * 0.9));
}

function extractAddress(place) {
  const out = {};
  for (const c of place.addressComponents ?? []) {
    const types = c.types ?? [];
    const v = c.shortText ?? c.longText;
    if (!v) continue;
    if (types.includes("street_number")) out.street_number = v;
    if (types.includes("route")) out.street = v;
    if (types.includes("postal_code")) out.postal_code = v;
    if (types.includes("locality") || types.includes("postal_town")) out.city = v;
    if (types.includes("administrative_area_level_2")) out.province = v;
    if (types.includes("country")) out.country_code = c.shortText ?? v;
    if (types.includes("neighborhood") || types.includes("sublocality")) out.neighborhood = c.longText ?? v;
  }
  return out;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stats = { total: hotels.length, ok: 0, skipped: 0, no_match: 0, api_error: 0, upload_error: 0, start: Date.now() };
const log = [];

for (let i = 0; i < hotels.length; i++) {
  const hotel = hotels[i];
  const prefix = `[${String(i + 1).padStart(3, "0")}/${hotels.length}]`;
  const idShort = hotel.hotel_id.slice(0, 18);
  const nameShort = (hotel.name || "").slice(0, 32);
  const key = `${PREFIX}/${hotel.hotel_id}.json`;

  // Skip path · check both CoStar record and existing profile
  let existingRecord = null;
  try {
    const { data: blob } = await sb.storage.from(BUCKET).download(key);
    if (blob) existingRecord = JSON.parse(await blob.text());
  } catch {}
  const profileLat = existingRecord?.profile?.latitude;
  const profileLng = existingRecord?.profile?.longitude;
  if (SKIP_RESOLVED && ((hotel.latitude != null && hotel.longitude != null) || (profileLat != null && profileLng != null))) {
    stats.skipped += 1;
    if (i < 3 || i % 50 === 0) console.log(`${prefix} ⊘ ${idShort} · ${nameShort} · already has coords`);
    continue;
  }

  // Build a strong query: name + address + market + country
  const queryParts = [hotel.name, hotel.address_line, hotel.market_name, hotel.country].filter(Boolean);
  const query = queryParts.join(", ");

  try {
    const places = await searchText(query, hotel.country);
    if (places.length === 0) {
      stats.no_match += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "no_match", query });
      console.log(`${prefix} ⚠ ${idShort} · ${nameShort} · no Places hits`);
      await sleep(THROTTLE_MS);
      continue;
    }

    const scored = places.map((p) => ({
      place: p,
      score: matchConf(p.displayName?.text, hotel.name),
    })).sort((a, b) => b.score - a.score);

    const top = scored[0];
    if (top.score < MIN_MATCH) {
      stats.no_match += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "ambig", query, top_name: top.place.displayName?.text, top_score: top.score });
      console.log(`${prefix} ? ${idShort} · ${nameShort} → ${(top.place.displayName?.text ?? "—").slice(0, 30)} (${(top.score * 100).toFixed(0)}%)`);
      await sleep(THROTTLE_MS);
      continue;
    }

    const loc = top.place.location;
    if (!loc || typeof loc.latitude !== "number") {
      stats.no_match += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "no_location", top_name: top.place.displayName?.text });
      await sleep(THROTTLE_MS);
      continue;
    }
    const addr = extractAddress(top.place);
    const placeId = (top.place.id ?? "").replace(/^places\//, "");

    // MERGE-aware upload · preserve other enrichment fields when present.
    // Source-priority guard: don't overwrite a manual_operator (100) record's
    // explicit lat/lng. Skip when profile lat/lng came from rapidapi_booking
    // (80) and is already populated · operator can manually delete and re-run.
    const existingSources = existingRecord?._enrichment_meta?.enrichment_sources ?? [];
    const isManualOperator = existingSources[0] === "manual_operator";
    if (isManualOperator && profileLat != null && profileLng != null) {
      stats.skipped += 1;
      console.log(`${prefix} ⊘ ${idShort} · manual_operator already set coords · skipped`);
      await sleep(THROTTLE_MS);
      continue;
    }

    const payload = {
      hotel_id: hotel.hotel_id,
      profile: {
        ...(existingRecord?.profile ?? {}),
        latitude: loc.latitude,
        longitude: loc.longitude,
        geo_context: {
          ...(existingRecord?.profile?.geo_context ?? {}),
          google_place_id: placeId,
          google_formatted_address: top.place.formattedAddress,
          google_address_components: addr,
        },
      },
      _enrichment_meta: {
        ...(existingRecord?._enrichment_meta ?? {}),
        enrichment_sources: Array.from(new Set([
          ...(existingRecord?._enrichment_meta?.enrichment_sources ?? []),
          "google_places",
        ])),
        source_priority: {
          ...(existingRecord?._enrichment_meta?.source_priority ?? {}),
          google_places: 70,
        },
        google_match_confidence: top.score,
        last_places_scraped_at: new Date().toISOString(),
        submitted_by: existingRecord?._enrichment_meta?.submitted_by ?? "cli:enrich-hotels-coords",
        submitted_at: existingRecord?._enrichment_meta?.submitted_at ?? new Date().toISOString(),
      },
    };

    const body = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
    const { error: upErr } = await sb.storage.from(BUCKET).upload(key, body, { contentType: "application/json", cacheControl: "0", upsert: true });
    if (upErr) {
      stats.upload_error += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "upload_error", error: upErr.message });
      console.error(`${prefix} ✗ ${idShort} · upload: ${upErr.message}`);
      await sleep(THROTTLE_MS);
      continue;
    }

    stats.ok += 1;
    log.push({ hotel_id: hotel.hotel_id, status: "ok", place_id: placeId, lat: loc.latitude, lng: loc.longitude, match: top.score, place_name: top.place.displayName?.text });
    console.log(`${prefix} ✓ ${idShort} · ${nameShort} → ${(top.place.displayName?.text ?? "—").slice(0, 26)} · m${(top.score * 100).toFixed(0)}% · ${loc.latitude.toFixed(4)},${loc.longitude.toFixed(4)}`);
  } catch (err) {
    stats.api_error += 1;
    const msg = err.message ?? String(err);
    log.push({ hotel_id: hotel.hotel_id, status: "api_error", error: msg });
    console.error(`${prefix} ✗ ${idShort} · ${msg.slice(0, 120)}`);
  }
  await sleep(THROTTLE_MS);
}

const elapsed = ((Date.now() - stats.start) / 1000).toFixed(1);
console.log("");
console.log("──── SUMMARY ────");
console.log(`  ✓ enriched (coords): ${stats.ok}`);
console.log(`  ⊘ skipped           : ${stats.skipped}`);
console.log(`  ⚠ no/poor match     : ${stats.no_match}`);
console.log(`  ✗ api error         : ${stats.api_error}`);
console.log(`  ✗ upload error      : ${stats.upload_error}`);
console.log(`  total               : ${stats.total}`);
console.log(`  elapsed             : ${elapsed}s`);

const logPath = pathResolve(process.cwd(), "..", "..", "services", "costar", "logs", `enrich-coords-${new Date().toISOString().slice(0, 10)}-${Date.now()}.jsonl`);
mkdirSync(pathResolve(logPath, ".."), { recursive: true });
writeFileSync(logPath, log.map((l) => JSON.stringify(l)).join("\n") + "\n");
console.log(`  log → ${logPath}`);
