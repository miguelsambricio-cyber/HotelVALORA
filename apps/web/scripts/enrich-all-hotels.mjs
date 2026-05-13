#!/usr/bin/env node
/**
 * Bulk Booking enrichment runner · operator-side CLI.
 *
 * Strategy (v2 · 2026-05-14): match every canonical hotel to a Booking
 * property by calling `searchDestination(hotel_name)` and looking for
 * a `dest_type === "hotel"` hit · the dest_id IS the hotel_id for the
 * detail endpoints. Filter by country to avoid same-name collisions
 * across markets.
 *
 * Per hotel · up to 5 RapidAPI calls:
 *   1. searchDestination(name)         → resolve booking hotel_id
 *   2. getHotelDetails(hotel_id)       → core profile fields
 *   3. getHotelFacilities(hotel_id)    → categorized facility list
 *   4. getHotelRooms(hotel_id)         → room mix
 *   5. getHotelReviewScores(hotel_id)  → review score + distribution
 *
 * Total for 364 hotels · ~1820 calls. Operator can pass `--basic` to
 * cut to 2 calls (skip facilities/rooms/reviews) when quota is tight.
 *
 * Uploads payload to:
 *   costar-master/manual_enrichment/<hotel_id>.json
 *
 * Idempotent · re-running upserts the same key.
 *
 * Usage:
 *   cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs
 *   cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs --limit 5
 *   cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs --only h_204efabe95397fff
 *   cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs --skip-enriched
 *   cd apps/web && node --env-file=.env.local scripts/enrich-all-hotels.mjs --basic
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve as pathResolve } from "node:path";

// ── CLI args ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const arg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && i + 1 < args.length ? args[i + 1] : fallback;
};
const flag = (name) => args.includes(name);
const LIMIT = arg("--limit") ? parseInt(arg("--limit"), 10) : Infinity;
const ONLY = arg("--only");
const SKIP_ENRICHED = flag("--skip-enriched");
const BASIC = flag("--basic");
const THROTTLE_MS = parseInt(arg("--throttle", "250"), 10);
const MIN_MATCH = parseFloat(arg("--min-match", "0.7"));

// ── Config ──────────────────────────────────────────────────────────────
const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? "booking-com15.p.rapidapi.com";
const KEY = process.env.BOOKING_RAPIDAPI_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = "costar-master";
const ENRICHMENT_PREFIX = "manual_enrichment";

if (!KEY) { console.error("✗ BOOKING_RAPIDAPI_KEY not set"); process.exit(1); }
if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) { console.error("✗ Supabase env missing"); process.exit(1); }

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const snapshotPath = pathResolve(process.cwd(), "..", "..", "services", "costar", "MASTER", "snapshot.json");
const snapshot = JSON.parse(readFileSync(snapshotPath, "utf-8"));
let hotels = snapshot.hotels ?? [];
if (ONLY) hotels = hotels.filter((h) => h.hotel_id === ONLY);
hotels = hotels.slice(0, LIMIT);

const COUNTRY_NAME_TO_ISO = {
  spain: "ES", españa: "ES", francia: "FR", france: "FR", portugal: "PT",
  italy: "IT", italia: "IT", germany: "DE", alemania: "DE", "united kingdom": "GB", uk: "GB",
  "reino unido": "GB", "united states": "US", usa: "US", "estados unidos": "US",
};
function normCountry(c) {
  if (!c) return null;
  const lc = c.toLowerCase().trim();
  return COUNTRY_NAME_TO_ISO[lc] ?? c.toUpperCase().slice(0, 2);
}

console.log(`▸ enrich-all-hotels v2 · ${hotels.length} hotels in scope · throttle ${THROTTLE_MS}ms · ${BASIC ? "BASIC mode (2 calls/hotel)" : "DEEP mode (up to 5 calls/hotel)"}`);
console.log(`  min-match: ${MIN_MATCH} · skip-enriched: ${SKIP_ENRICHED}`);

// ── RapidAPI helper ────────────────────────────────────────────────────
async function rapid(path, params) {
  const u = new URL(`https://${HOST}${path}`);
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
  const res = await fetch(u.toString(), {
    headers: { "x-rapidapi-host": HOST, "x-rapidapi-key": KEY, "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${path} → ${res.status} ${res.statusText} · ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  if (json.status === false) throw new Error(`${path} status=false · ${json.message ?? "unknown"}`);
  return json.data;
}

const TODAY = new Date();
const ARRIVAL = new Date(TODAY.getTime() + 30 * 86400_000).toISOString().slice(0, 10);
const DEPARTURE = new Date(TODAY.getTime() + 31 * 86400_000).toISOString().slice(0, 10);

const DETAIL_PARAMS = (hotel_id) => ({
  hotel_id: String(hotel_id), arrival_date: ARRIVAL, departure_date: DEPARTURE,
  adults: "1", children_age: "", room_qty: "1", units: "metric", temperature_unit: "c",
  languagecode: "en-us", currency_code: "EUR",
});

// ── Match heuristic · loose token-overlap with name-cleaning ───────────
function normName(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\b(hotel|hotels|resort|resorts|by|the|de|del|la|el|los|las)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
function matchConfidence(candidateName, targetName) {
  const c = normName(candidateName);
  const t = normName(targetName);
  if (!c || !t) return 0;
  if (c === t) return 1;
  // Contiguous substring · ordered · DISCRIMINATES "AC Hotel Avenida America
  // by Marriott" (target is ordered substring · score 0.95) from
  // "Avenida America Cama King AC junto" (same tokens · different order · 0.40)
  if (c.includes(t)) return 0.95;
  if (t.includes(c)) return 0.9;
  // Disordered token overlap · use Jaccard so noisy candidates score low
  const ct = new Set(c.split(/\s+/).filter(Boolean));
  const tt = new Set(t.split(/\s+/).filter(Boolean));
  if (tt.size === 0) return 0;
  const inter = [...tt].filter((x) => ct.has(x)).length;
  const union = new Set([...ct, ...tt]).size;
  return Math.max(0, Math.min(0.85, (inter / union) * 0.9));
}

// ── Mapper · Booking raw → HotelProfile ────────────────────────────────
const FACILITY_TO_TOGGLE = {
  "swimming pool": "has_pool", pool: "has_pool",
  fitness: "has_gym", gym: "has_gym",
  spa: "has_spa", wellness: "has_spa",
  parking: "has_parking",
  restaurant: "has_restaurant", bar: "has_bar",
  meeting: "has_meeting", conference: "has_meeting", "business cent": "has_meeting",
  rooftop: "has_rooftop", terrace: "has_rooftop",
  "non-smoking": "non_smoking_rooms",
  "airport shuttle": "has_shuttle", shuttle: "has_shuttle",
  "room service": "has_room_service",
  laundry: "has_laundry",
  concierge: "has_concierge",
  "disabled": "accessibility_hint", wheelchair: "accessibility_hint",
};

function probeFacilities(names) {
  const out = {};
  for (const n of names) {
    const ln = n.toLowerCase();
    for (const [needle, key] of Object.entries(FACILITY_TO_TOGGLE)) {
      if (ln.includes(needle)) out[key] = true;
    }
  }
  return out;
}

function reviewScoreFromDistribution(distribution) {
  if (!Array.isArray(distribution)) return null;
  let totalCount = 0;
  let totalWeighted = 0;
  for (const d of distribution) {
    const score = typeof d.score === "number" ? d.score : parseFloat(d.score);
    const count = typeof d.count === "number" ? d.count : parseInt(d.count, 10);
    if (Number.isFinite(score) && Number.isFinite(count)) {
      totalCount += count;
      totalWeighted += score * count;
    }
  }
  if (totalCount === 0) return null;
  return totalWeighted / totalCount;
}

function extractPolicies(raw) {
  const out = {};
  if (!raw) return out;
  if (raw.check_in?.from) out.check_in_time = raw.check_in.from;
  if (raw.check_out?.until) out.check_out_time = raw.check_out.until;
  const policies = Array.isArray(raw.policies) ? raw.policies : [];
  for (const p of policies) {
    const kind = (p.type ?? p.policy_type ?? p.name ?? "").toLowerCase();
    const flatContent = p.content ?? (Array.isArray(p.descriptions) ? p.descriptions.map((d) => d.description ?? d.title ?? "").filter(Boolean).join(" · ") : "");
    if (Array.isArray(p.rules)) {
      const ruleFrom = p.rules.find((r) => /^from$/i.test(r.title ?? ""))?.content;
      const ruleUntil = p.rules.find((r) => /^until$/i.test(r.title ?? "") || /^to$/i.test(r.title ?? ""))?.content;
      if (kind.includes("check") && kind.includes("in") && !out.check_in_time) out.check_in_time = ruleFrom ?? ruleUntil;
      if (kind.includes("check") && kind.includes("out") && !out.check_out_time) out.check_out_time = ruleUntil ?? ruleFrom;
    }
    if (flatContent) {
      if (kind.includes("pet") && !out.pet_policy) out.pet_policy = flatContent;
      if ((kind.includes("cancel") || kind.includes("prepay")) && !out.cancellation_policy) out.cancellation_policy = flatContent;
      if (kind.includes("smok") && !out.smoking_policy) out.smoking_policy = flatContent;
      const tm = flatContent.match(/(\d{1,2}:\d{2})\s*[-–to]+\s*(\d{1,2}:\d{2})/);
      if (kind.includes("check") && kind.includes("in") && tm && !out.check_in_time) out.check_in_time = tm[1];
      if (kind.includes("check") && kind.includes("out") && tm && !out.check_out_time) out.check_out_time = tm[2];
    }
  }
  return out;
}

function mapToProfile({ details: d = {}, facilities: f = {}, rooms: r = {}, reviews: rv = null, policies: pol = null }) {
  // Collect facility names from every shape Booking returns
  const facilityNames = [];
  const collectBlock = (block) => {
    for (const item of block?.facilities ?? []) if (item?.name) facilityNames.push(item.name);
  };
  collectBlock(d.facilities_block);
  // getHotelFacilities returns either an array of categories OR a top-level facilities[] · probe both
  if (Array.isArray(f)) {
    for (const cat of f) collectBlock({ facilities: cat.facilities });
  } else {
    for (const cat of f?.facilities_block?.facilities ?? []) collectBlock({ facilities: cat.facilities });
    for (const cat of f?.hotel_facilities_filtered ?? []) collectBlock({ facilities: cat.facilities });
    for (const cat of f?.facilities ?? []) collectBlock({ facilities: cat.facilities });
  }
  for (const hl of d.property_highlight_strip ?? []) {
    if (hl?.name) facilityNames.push(hl.name);
  }

  const facilities_detailed = Array.from(new Set(facilityNames.filter(Boolean)));
  const probe = probeFacilities(facilities_detailed);

  // Explicit toggles from getHotelDetails
  if (d.has_swimming_pool === 1) probe.has_pool = true;
  if (d.has_fitness_center === 1) probe.has_gym = true;
  if (d.has_spa === 1) probe.has_spa = true;
  if (d.has_parking === 1 || d.has_free_parking === 1) probe.has_parking = true;
  if (d.has_restaurant === 1) probe.has_restaurant = true;

  // Room types
  const room_types = [];
  const roomsArr = Array.isArray(r) ? r : null;
  if (Array.isArray(r?.block)) {
    for (const b of r.block) {
      if (!b?.name) continue;
      room_types.push({
        name: b.name,
        sqm: typeof b.room_surface_in_m2 === "number" ? b.room_surface_in_m2 : undefined,
        max_occupancy:
          typeof b.max_occupancy === "number" ? b.max_occupancy :
          typeof b.max_occupancy === "string" ? parseInt(b.max_occupancy, 10) || undefined :
          b.nr_adults,
      });
    }
  } else if (roomsArr) {
    for (const room of roomsArr) {
      if (!room?.name) continue;
      room_types.push({
        name: room.name,
        max_occupancy: typeof room.max_occupancy === "number" ? room.max_occupancy : undefined,
      });
    }
  } else if (r?.rooms) {
    for (const [, room] of Object.entries(r.rooms)) {
      if (!room?.name) continue;
      room_types.push({
        name: room.name,
        max_occupancy:
          typeof room.max_occupancy === "number" ? room.max_occupancy :
          typeof room.max_occupancy === "string" ? parseInt(room.max_occupancy, 10) || undefined :
          undefined,
      });
    }
  }

  // Reviews
  let review_score, review_count;
  if (Array.isArray(rv) && rv.length > 0) {
    const r0 = rv[0];
    if (typeof r0.review_score === "number") review_score = r0.review_score;
    else {
      const computed = reviewScoreFromDistribution(r0.score_distribution);
      if (computed != null) review_score = Math.round(computed * 100) / 100;
    }
    if (Array.isArray(r0.score_distribution)) {
      review_count = r0.score_distribution.reduce((s, x) => s + (Number(x.count) || 0), 0);
    }
  }
  // Fall back to details fields if reviews call wasn't made
  if (review_score == null && typeof d.review_score === "number") review_score = d.review_score;
  if (review_count == null && typeof d.review_nr === "number") review_count = d.review_nr;

  const polx = extractPolicies(pol);
  const check_in_time = polx.check_in_time ?? d.checkin?.from ?? d.checkin_from ?? (typeof d.arrival_time === "string" && d.arrival_time.trim()) ?? undefined;
  const check_out_time = polx.check_out_time ?? d.checkout?.until ?? d.checkout_from ?? undefined;

  const profile = {
    facilities_detailed,
    amenities: facilities_detailed.length > 0 ? facilities_detailed.slice(0, 50) : undefined,
    room_types: room_types.length > 0 ? room_types : undefined,
    fnb: probe.has_restaurant || probe.has_bar
      ? {
          restaurants_count: probe.has_restaurant ? 1 : 0,
          bars_count: probe.has_bar ? 1 : 0,
          breakfast_included: d.has_breakfast === 1 || undefined,
        }
      : undefined,
    spa: probe.has_spa ? { has_spa: true } : undefined,
    gym: probe.has_gym ? { has_gym: true } : undefined,
    pool: probe.has_pool ? { has_pool: true } : undefined,
    parking: probe.has_parking ? { has_parking: true } : undefined,
    meeting_rooms: probe.has_meeting ? { count: 1 } : undefined,
    rooftop: probe.has_rooftop ? { has_rooftop: true } : undefined,
    accessibility: probe.accessibility_hint ? ["wheelchair_accessible"] : undefined,
    review_score,
    review_count,
    review_source: (review_score != null) ? "booking" : undefined,
    booking_url: d.url ?? undefined,
    check_in_time,
    check_out_time,
    pet_policy: polx.pet_policy ?? d.pets ?? undefined,
    cancellation_policy: polx.cancellation_policy ?? undefined,
    smoking_policy: polx.smoking_policy ?? (d.is_smoking_allowed === 0 ? "No smoking allowed" : d.is_smoking_policy ?? undefined),
  };

  // Strip empty
  const strip = (v) => {
    if (v === null || v === undefined) return undefined;
    if (typeof v === "string") return v.trim() === "" ? undefined : v;
    if (Array.isArray(v)) {
      const out = v.map(strip).filter((x) => x !== undefined && x !== null);
      return out.length === 0 ? undefined : out;
    }
    if (typeof v === "object") {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        const cleaned = strip(val);
        if (cleaned !== undefined && cleaned !== null && cleaned !== "") out[k] = cleaned;
      }
      return Object.keys(out).length === 0 ? undefined : out;
    }
    return v;
  };
  return strip(profile) ?? {};
}

// ── Skip-list ──────────────────────────────────────────────────────────
let skipSet = new Set();
if (SKIP_ENRICHED) {
  const { data: list, error } = await supabase.storage
    .from(STORAGE_BUCKET).list(ENRICHMENT_PREFIX, { limit: 1000 });
  if (!error) {
    skipSet = new Set(list.map((f) => f.name.replace(/\.json$/, "")));
    console.log(`  skip-list · ${skipSet.size} hotels already enriched`);
  }
}

// ── Completeness ───────────────────────────────────────────────────────
const FIELD_DEFS = [
  { key: "room_types", weight: 15, check: (p) => (p.room_types?.length ?? 0) > 0 },
  { key: "facilities", weight: 10, check: (p) => (p.facilities_detailed?.length ?? 0) > 0 },
  { key: "amenities", weight: 8, check: (p) => (p.amenities?.length ?? 0) > 0 },
  { key: "services", weight: 6, check: (p) => (p.services?.length ?? 0) > 0 },
  { key: "review", weight: 10, check: (p) => p.review_score != null && p.review_count != null },
  { key: "fnb", weight: 6, check: (p) => p.fnb && ((p.fnb.restaurants_count ?? 0) > 0 || (p.fnb.bars_count ?? 0) > 0) },
  { key: "spa", weight: 4, check: (p) => p.spa?.has_spa === true },
  { key: "gym", weight: 4, check: (p) => p.gym?.has_gym === true },
  { key: "pool", weight: 4, check: (p) => p.pool?.has_pool === true },
  { key: "parking", weight: 4, check: (p) => p.parking?.has_parking === true },
  { key: "meeting", weight: 5, check: (p) => p.meeting_rooms && (p.meeting_rooms.count ?? 0) > 0 },
  { key: "sustain", weight: 4, check: (p) => (p.sustainability?.length ?? 0) > 0 },
  { key: "access", weight: 4, check: (p) => (p.accessibility?.length ?? 0) > 0 },
  { key: "booking_url", weight: 4, check: (p) => !!p.booking_url },
  { key: "checkin_out", weight: 4, check: (p) => !!(p.check_in_time && p.check_out_time) },
  { key: "pet", weight: 2, check: (p) => !!p.pet_policy },
  { key: "cancel", weight: 4, check: (p) => !!p.cancellation_policy },
  { key: "family", weight: 2, check: (p) => (p.family_features?.length ?? 0) > 0 },
];
const TOTAL = FIELD_DEFS.reduce((s, f) => s + f.weight, 0);
function completeness(p) { let pop = 0; if (!p) return 0; for (const f of FIELD_DEFS) if (f.check(p)) pop += f.weight; return Math.round(pop / TOTAL * 100); }

// ── Main loop ──────────────────────────────────────────────────────────
const stats = { total: hotels.length, ok: 0, ambig: 0, skipped: 0, no_match: 0, api_error: 0, upload_error: 0, consecutive_rl: 0, start_ms: Date.now() };
const log = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (let i = 0; i < hotels.length; i++) {
  const hotel = hotels[i];
  const prefix = `[${String(i + 1).padStart(3, "0")}/${hotels.length}]`;
  const idShort = hotel.hotel_id.slice(0, 18);
  const nameShort = (hotel.name || "").slice(0, 30);

  if (stats.consecutive_rl >= 5) { console.error(`${prefix} ✗ ABORT · 5 consecutive rate-limits`); break; }
  if (SKIP_ENRICHED && skipSet.has(hotel.hotel_id)) {
    stats.skipped += 1;
    if (i < 3 || i % 50 === 0) console.log(`${prefix} ⊘ ${idShort} · ${nameShort} · already enriched`);
    continue;
  }
  if (!hotel.name?.trim()) { stats.no_match += 1; continue; }

  try {
    // 1. searchDestination(hotel_name) — look for hotel-type hit
    const destHits = await rapid("/api/v1/hotels/searchDestination", { query: hotel.name });
    await sleep(THROTTLE_MS);
    const hotelHits = (destHits || []).filter((d) => d.dest_type === "hotel");
    const wantedCountryISO = normCountry(hotel.country);

    // Score every hotel hit · prefer same-country matches
    const scored = hotelHits.map((h) => {
      const candCountryNorm = (h.country || "").toLowerCase();
      const candCountryISO = COUNTRY_NAME_TO_ISO[candCountryNorm] ?? (h.country || "").toUpperCase().slice(0, 2);
      const countryMatch = wantedCountryISO ? candCountryISO === wantedCountryISO : true;
      return { hit: h, score: matchConfidence(h.name, hotel.name), countryMatch };
    }).sort((a, b) => {
      // country match preferred · then by score
      if (a.countryMatch !== b.countryMatch) return a.countryMatch ? -1 : 1;
      return b.score - a.score;
    });

    const top = scored[0];
    if (!top || !top.countryMatch || top.score < MIN_MATCH) {
      stats.ambig += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "ambig", name: hotel.name, top_name: top?.hit?.name, top_score: top?.score, country_match: top?.countryMatch });
      console.log(`${prefix} ? ${idShort} · ${nameShort} → ${top?.hit?.name?.slice(0, 30) ?? "—"} (${((top?.score ?? 0) * 100).toFixed(0)}% ${top?.countryMatch ? "" : "wrong-country"})`);
      continue;
    }

    const bookingHotelId = top.hit.dest_id;

    // 2. getHotelDetails
    const details = await rapid("/api/v1/hotels/getHotelDetails", DETAIL_PARAMS(bookingHotelId));
    await sleep(THROTTLE_MS);

    let facilities, rooms, reviews, policies;
    if (!BASIC) {
      // 3. getHotelFacilities
      try { facilities = await rapid("/api/v1/hotels/getHotelFacilities", { hotel_id: String(bookingHotelId), languagecode: "en-us" }); } catch {}
      await sleep(THROTTLE_MS);
      // 4. getHotelRooms
      try { rooms = await rapid("/api/v1/hotels/getRoomList", DETAIL_PARAMS(bookingHotelId)); } catch {}
      await sleep(THROTTLE_MS);
      // 5. getHotelReviewScores
      try { reviews = await rapid("/api/v1/hotels/getHotelReviewScores", { hotel_id: String(bookingHotelId), languagecode: "en-us" }); } catch {}
      await sleep(THROTTLE_MS);
      // 6. getHotelPolicies — check-in/out + pet + cancellation + smoking
      try { policies = await rapid("/api/v1/hotels/getHotelPolicies", { hotel_id: String(bookingHotelId), languagecode: "en-us" }); } catch {}
      await sleep(THROTTLE_MS);
    }

    const profile = mapToProfile({ details, facilities, rooms, reviews, policies });
    const score = completeness(profile);

    const payload = {
      hotel_id: hotel.hotel_id,
      profile,
      _enrichment_meta: {
        enrichment_sources: ["rapidapi_booking"],
        source_priority: { rapidapi_booking: 80 },
        enrichment_confidence: top.score,
        booking_hotel_id: bookingHotelId,
        last_scraped_at: new Date().toISOString(),
        profile_completeness_score: score,
        submitted_by: "cli:enrich-all-hotels",
        submitted_at: new Date().toISOString(),
      },
    };

    const storage_key = `${ENRICHMENT_PREFIX}/${hotel.hotel_id}.json`;
    const body = Buffer.from(JSON.stringify(payload, null, 2), "utf-8");
    const { error: uploadErr } = await supabase.storage
      .from(STORAGE_BUCKET).upload(storage_key, body, { contentType: "application/json", cacheControl: "0", upsert: true });
    if (uploadErr) {
      stats.upload_error += 1;
      log.push({ hotel_id: hotel.hotel_id, status: "upload_error", error: uploadErr.message });
      console.error(`${prefix} ✗ ${idShort} · upload: ${uploadErr.message}`);
      continue;
    }

    stats.ok += 1;
    stats.consecutive_rl = 0;
    log.push({ hotel_id: hotel.hotel_id, status: "ok", booking_name: top.hit.name, match: top.score, completeness: score, facility_count: profile.facilities_detailed?.length ?? 0, room_count: profile.room_types?.length ?? 0 });
    console.log(`${prefix} ✓ ${idShort} · ${nameShort} → ${top.hit.name?.slice(0, 28)} · m${(top.score * 100).toFixed(0)}% p${score}% f${profile.facilities_detailed?.length ?? 0} r${profile.room_types?.length ?? 0}${profile.review_score ? ` ★${profile.review_score.toFixed(1)}` : ""}`);
  } catch (err) {
    stats.api_error += 1;
    const msg = err.message ?? String(err);
    log.push({ hotel_id: hotel.hotel_id, status: "api_error", error: msg });
    console.error(`${prefix} ✗ ${idShort} · ${msg.slice(0, 120)}`);
    if (msg.includes("429") || /rate|quota|too many/i.test(msg)) {
      stats.consecutive_rl += 1;
      await sleep(THROTTLE_MS * 8);
    } else stats.consecutive_rl = 0;
  }
  await sleep(THROTTLE_MS);
}

const elapsed = ((Date.now() - stats.start_ms) / 1000).toFixed(1);
console.log("");
console.log("──── SUMMARY ────");
console.log(`  ✓ enriched           : ${stats.ok}`);
console.log(`  ? needs disambig     : ${stats.ambig}`);
console.log(`  ⊘ skipped (existing) : ${stats.skipped}`);
console.log(`  ⚠ no match           : ${stats.no_match}`);
console.log(`  ✗ api error          : ${stats.api_error}`);
console.log(`  ✗ upload error       : ${stats.upload_error}`);
console.log(`  ──────────────────`);
console.log(`  total                : ${stats.total}`);
console.log(`  elapsed              : ${elapsed}s`);
console.log("");

const logPath = pathResolve(process.cwd(), "..", "..", "services", "costar", "logs", `enrich-all-${new Date().toISOString().slice(0, 10)}-${Date.now()}.jsonl`);
mkdirSync(pathResolve(logPath, ".."), { recursive: true });
writeFileSync(logPath, log.map((l) => JSON.stringify(l)).join("\n") + "\n");
console.log(`  log → ${logPath}`);
