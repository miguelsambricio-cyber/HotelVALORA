#!/usr/bin/env node
/**
 * Branded-hotel smoke test (booking-com15).
 *
 * Confirms behavior of `chain_name`, `chain_id`, star fields, and
 * branded metadata on a known chained Madrid property. Complements
 * the original smoke test which sampled an independent Hostel.
 *
 * Strategy:
 *   1. E0 search "NH Collection Madrid Eurobuilding" — if booking-com15
 *      returns a HOTEL-typed entry, use its hotel_id directly.
 *   2. If E0 doesn't surface a hotel, fall back to E1 with class_descending
 *      sort to find branded 5★ entries.
 *   3. E2 for the chosen hotel_id.
 *
 * Budget: 2-3 calls (within the 0.012% sweep already spent).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures");

const KEY = process.env.BOOKING_RAPIDAPI_KEY ?? process.env.RAPIDAPI_BOOKING_KEY ?? "";
const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? "booking-com15.p.rapidapi.com";
const BASE_URL = `https://${HOST}`;
const HEADERS = {
  "X-RapidAPI-Key": KEY,
  "X-RapidAPI-Host": HOST,
  Accept: "application/json",
};

if (!KEY) { console.error("✖ BOOKING_RAPIDAPI_KEY not set."); process.exit(2); }

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v == null) continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function call(label, path, params) {
  const url = buildUrl(path, params);
  console.log(`\n→ [${label}] GET ${url}`);
  const t = Date.now();
  let res;
  try { res = await fetch(url, { headers: HEADERS }); }
  catch (e) { console.error("  ✖ network:", e?.message); return { ok: false }; }
  console.log(`  HTTP ${res.status} (${Date.now() - t} ms)`);
  if (!res.ok) {
    const text = await res.text();
    console.error("  body:", text.slice(0, 300));
    return { ok: false };
  }
  const body = await res.json();
  console.log(`  ✓ keys: ${Object.keys(body).join(", ")}`);
  return { ok: true, data: body };
}

async function save(filename, payload) {
  await mkdir(FIXTURES_DIR, { recursive: true });
  await writeFile(resolve(FIXTURES_DIR, filename), JSON.stringify(payload, null, 2), "utf-8");
  console.log(`  ↳ saved: ${filename}`);
}

// ────────────────────────────────────────────────────────────────────────────
// Branded queries to try in order
// ────────────────────────────────────────────────────────────────────────────
const BRAND_QUERIES = [
  "NH Collection Madrid Eurobuilding",
  "Marriott Madrid",
  "Melia Madrid",
  "Hyatt Madrid",
];

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Booking RapidAPI · Branded Validation Smoke");
  console.log(`  ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════════════════");

  let chosen = null;     // { hotelId, brandedQuery, e0Entry }
  let totalCalls = 0;

  // ── Step 1: try E0 to surface a HOTEL-typed entry per branded query ────
  for (const q of BRAND_QUERIES) {
    const r = await call(`E0 query="${q}"`, "/api/v1/hotels/searchDestination", { query: q });
    totalCalls++;
    if (!r.ok) continue;
    const entries = r.data?.data ?? [];
    console.log(`  entry types: ${entries.map(e => e.dest_type).join(", ") || "(empty)"}`);
    const hotelEntry = entries.find(e => e.dest_type === "hotel" || e.dest_type === "HOTEL");
    if (hotelEntry) {
      console.log(`  ✓ hotel entry found: ${hotelEntry.name} (dest_id=${hotelEntry.dest_id})`);
      chosen = { hotelId: hotelEntry.dest_id, brandedQuery: q, e0Entry: hotelEntry, e0Response: r.data };
      break;
    }
    console.log("  (no hotel entry; trying next query)");
  }

  if (!chosen) {
    console.error("\n✖ No branded hotel surfaced via E0 across queries. Aborting.");
    await save("branded-e0-no-match-log.json", { tried: BRAND_QUERIES, calls: totalCalls });
    process.exit(1);
  }

  // ── Step 2: E2 for the branded hotel ─────────────────────────────────────
  const today = new Date();
  const arrival = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const departure = new Date(today.getTime() + 8 * 86400000).toISOString().slice(0, 10);

  const e2 = await call(`E2 hotel_id=${chosen.hotelId} (${chosen.brandedQuery})`, "/api/v1/hotels/getHotelDetails", {
    hotel_id: chosen.hotelId,
    arrival_date: arrival,
    departure_date: departure,
    adults: 2,
    children_age: "",
    room_qty: 1,
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  });
  totalCalls++;

  if (!e2.ok) {
    console.error("\n✖ E2 failed for branded hotel.");
    process.exit(1);
  }

  await save(`live-e0-search-${chosen.brandedQuery.toLowerCase().replace(/\s+/g, "-")}.json`, chosen.e0Response);
  await save(`live-e2-branded-${chosen.hotelId}.json`, e2.data);

  // ── Step 3: extract and report the branded fields ────────────────────────
  const d = e2.data?.data ?? {};

  const brandedFields = {
    hotel_id: d.hotel_id,
    hotel_name: d.hotel_name,
    address: d.address,
    city: d.city,
    district: d.district,
    cc1: d.cc1,
    countrycode: d.countrycode,
    accommodation_type_name: d.accommodation_type_name,
    accommodation_type_id: d.accommodation_type_id,
    is_closed: d.is_closed,

    // Branded specifics — the whole point of this validation
    chain_name: d.chain_name,
    chain_id: d.chain_id,
    brand: d.brand,
    chain_meta_present: !!(d.chain_name || d.chain_id || d.brand),

    // Star fields
    class: d.class,
    propertyClass: d.propertyClass,
    accurate_property_class: d.accurate_property_class,
    accuratePropertyClass: d.accuratePropertyClass,
    qualityClass: d.qualityClass,

    // Room count
    room_count: d.room_count,
    nr_rooms: d.nr_rooms,
    total_rooms: d.total_rooms,
    rooms_count_present_in_e2: !!(d.room_count || d.nr_rooms || d.total_rooms),

    // Contact
    phone: d.phone,
    email: d.email,
    website: d.website,
    contact_present: !!(d.phone || d.email || d.website),

    // Media
    main_photo_url: d.main_photo_url,
    hotel_photo: d.hotel_photo,
    photoUrls: Array.isArray(d.photoUrls) ? `[${d.photoUrls.length} urls]` : d.photoUrls,
    media_present: !!(d.main_photo_url || d.hotel_photo || (Array.isArray(d.photoUrls) && d.photoUrls.length > 0)),

    // Facilities (granular)
    facilities_block_count: Array.isArray(d.facilities_block?.facilities) ? d.facilities_block.facilities.length : null,

    // Bonus fields
    aggregated_data_keys: d.aggregated_data ? Object.keys(d.aggregated_data) : [],
    wifi_review_score: d.wifi_review_score,
    breakfast_review_score: d.breakfast_review_score,
    is_family_friendly: d.is_family_friendly,
    family_facilities_count: Array.isArray(d.family_facilities) ? d.family_facilities.length : null,
    languages_spoken_count: Array.isArray(d.languages_spoken) ? d.languages_spoken.length : null,
    review_nr: d.review_nr,
  };

  const summary = {
    tested_at: new Date().toISOString(),
    branded_query: chosen.brandedQuery,
    chosen_hotel: chosen.e0Entry?.name,
    chosen_hotel_id: chosen.hotelId,
    total_calls: totalCalls,
    e2_response_field_count: Object.keys(d).length,
    e2_top_level_keys: Object.keys(d).sort(),
    branded_fields: brandedFields,
    institutional_findings: {
      chain_in_e2: brandedFields.chain_meta_present
        ? "PRESENT — booking-com15 DOES return chain info in E2 for branded hotels."
        : "ABSENT — even for branded hotels, chain_name/chain_id are NOT in E2.",
      star_rating_in_e2: (d.class || d.accuratePropertyClass || d.accurate_property_class || d.propertyClass || d.qualityClass)
        ? "PRESENT (some star field)"
        : "ABSENT — star comes from E1 only.",
      rooms_in_e2: brandedFields.rooms_count_present_in_e2
        ? "PRESENT — total_rooms available."
        : "ABSENT — total_rooms requires fallback.",
      contact_in_e2: brandedFields.contact_present
        ? "PRESENT — phone/email/website available."
        : "ABSENT — contact requires fallback (Google Places / hotel-website).",
      media_in_e2: brandedFields.media_present
        ? "PRESENT in E2."
        : "ABSENT in E2 — photos only in E1 property.photoUrls[].",
    },
  };

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Branded fields summary:");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(JSON.stringify(summary.branded_fields, null, 2));
  console.log("\n  Institutional findings:");
  for (const [k, v] of Object.entries(summary.institutional_findings)) {
    console.log(`    ${k}: ${v}`);
  }

  await save("live-branded-validation-summary.json", summary);
}

main().catch(e => { console.error("✖", e); process.exit(1); });
