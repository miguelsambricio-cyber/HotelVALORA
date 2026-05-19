#!/usr/bin/env node
/**
 * Booking RapidAPI live smoke test.
 *
 * Self-contained Node ESM script. Validates wire shape against the
 * subscribed publisher (default: booking-com15) by making 3 controlled
 * calls — E0 (destination lookup) + E1 (search hotels in Madrid) + E2
 * (detail for the first hit). Saves raw responses to fixtures dir.
 *
 * Usage:
 *   # Env vars in shell
 *   $env:RAPIDAPI_BOOKING_KEY="<key>"; $env:RAPIDAPI_BOOKING_HOST="booking-com15.p.rapidapi.com"
 *   node apps/web/scripts/smoke-test-booking-live.mjs
 *
 *   # Or via Node's built-in --env-file (Node 20.6+)
 *   node --env-file=.env.local apps/web/scripts/smoke-test-booking-live.mjs
 *
 * Output:
 *   - Pretty-printed call results to stdout.
 *   - Raw payloads saved to apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/live-*.json
 *
 * Budget impact: 3 calls total (≈ 0.0001% of Pro 25k monthly quota).
 */

import { writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(
  __dirname,
  "../src/lib/enrichment/providers/booking-rapidapi/fixtures",
);

// ───── Config ──────────────────────────────────────────────────────────────

// Accept both naming conventions: BOOKING_RAPIDAPI_* (operator's) or
// RAPIDAPI_BOOKING_* (this repo's TS config default). Whichever is set wins.
const KEY = process.env.BOOKING_RAPIDAPI_KEY ?? process.env.RAPIDAPI_BOOKING_KEY ?? "";
const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? process.env.RAPIDAPI_BOOKING_HOST ?? "booking-com15.p.rapidapi.com";
const BASE_URL = process.env.BOOKING_RAPIDAPI_BASE_URL ?? process.env.RAPIDAPI_BOOKING_BASE_URL ?? `https://${HOST}`;

if (!KEY) {
  console.error("✖ RAPIDAPI_BOOKING_KEY not set. Aborting before any HTTP call.");
  console.error("  Set it in your shell:");
  console.error("    $env:RAPIDAPI_BOOKING_KEY = \"<your-key>\"");
  console.error("  Or pass via --env-file=.env.local (Node 20.6+):");
  console.error("    node --env-file=.env.local apps/web/scripts/smoke-test-booking-live.mjs");
  process.exit(2);
}

const HEADERS = {
  "X-RapidAPI-Key": KEY,
  "X-RapidAPI-Host": HOST,
  Accept: "application/json",
};

// Default endpoint paths for the booking-com15 family. If your subscribed
// publisher uses different paths, override via env:
//   RAPIDAPI_E0_PATH, RAPIDAPI_E1_PATH, RAPIDAPI_E2_PATH
const PATH_E0 = process.env.RAPIDAPI_E0_PATH ?? "/api/v1/hotels/searchDestination";
const PATH_E1 = process.env.RAPIDAPI_E1_PATH ?? "/api/v1/hotels/searchHotels";
const PATH_E2 = process.env.RAPIDAPI_E2_PATH ?? "/api/v1/hotels/getHotelDetails";

// ───── Helpers ─────────────────────────────────────────────────────────────

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
  const startedAt = Date.now();
  console.log(`\n→ [${label}] GET ${url}`);
  let res;
  try {
    res = await fetch(url, { method: "GET", headers: HEADERS });
  } catch (err) {
    console.error(`  ✖ network error: ${err?.message ?? err}`);
    return { ok: false, error: { code: "NETWORK_ERROR", message: String(err?.message ?? err) } };
  }
  const ms = Date.now() - startedAt;
  console.log(`  HTTP ${res.status} (${ms} ms)`);

  if (!res.ok) {
    const text = await res.text();
    console.error(`  ✖ body: ${text.slice(0, 400)}`);
    return { ok: false, error: { code: `HTTP_${res.status}`, message: text } };
  }
  let body;
  try {
    body = await res.json();
  } catch (err) {
    console.error(`  ✖ JSON parse: ${err?.message ?? err}`);
    return { ok: false, error: { code: "PARSE", message: String(err?.message ?? err) } };
  }
  console.log(`  ✓ OK — top-level keys: ${Object.keys(body ?? {}).join(", ") || "(none)"}`);
  return { ok: true, data: body };
}

async function save(filename, payload) {
  await mkdir(FIXTURES_DIR, { recursive: true });
  const path = resolve(FIXTURES_DIR, filename);
  await writeFile(path, JSON.stringify(payload, null, 2), "utf-8");
  console.log(`  ↳ saved: ${path}`);
}

// ───── Heuristics: dig destination_id / hotel_id from arbitrary shapes ─────
// Booking publishers vary; this is best-effort.

function digFirst(value, candidateKeys) {
  if (value == null) return null;
  if (Array.isArray(value)) {
    for (const v of value) {
      const out = digFirst(v, candidateKeys);
      if (out !== null) return out;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const k of candidateKeys) {
      if (k in value && value[k] != null) return value[k];
    }
    for (const v of Object.values(value)) {
      const out = digFirst(v, candidateKeys);
      if (out !== null) return out;
    }
  }
  return null;
}

// ───── Main ─────────────────────────────────────────────────────────────────

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Booking RapidAPI · Live Smoke Test");
  console.log(`  Host: ${HOST}`);
  console.log(`  Time: ${new Date().toISOString()}`);
  console.log("══════════════════════════════════════════════════════════════");

  const summary = {
    host: HOST,
    started_at: new Date().toISOString(),
    calls: [],
  };

  // ── E0 — destination lookup ─────────────────────────────────────────────
  const e0 = await call("E0 searchDestination(Madrid)", PATH_E0, { query: "Madrid" });
  summary.calls.push({ label: "E0", path: PATH_E0, ok: e0.ok, error: e0.error });
  if (!e0.ok) {
    console.error("\n✖ E0 failed. Aborting subsequent calls.");
    await save("live-smoke-summary.json", summary);
    process.exit(1);
  }
  await save("live-e0-search-destination-madrid.json", e0.data);

  // Find Madrid destination_id — try common keys across publishers
  const destId = digFirst(e0.data, [
    "dest_id",
    "destinationId",
    "id",
  ]);
  if (destId == null) {
    console.error("\n✖ Could not extract destination_id from E0 response.");
    console.error("  Inspect live-e0-search-destination-madrid.json and update the dig keys.");
    summary.calls[0].diagnostic = "destination_id_not_found";
    await save("live-smoke-summary.json", summary);
    process.exit(1);
  }
  console.log(`  ↳ Madrid dest_id = ${destId}`);

  // ── E1 — search hotels ──────────────────────────────────────────────────
  // booking-com15 typically requires arrival/departure dates. Use next-week 1-night.
  const today = new Date();
  const arrival = new Date(today.getTime() + 7 * 86400000).toISOString().slice(0, 10);
  const departure = new Date(today.getTime() + 8 * 86400000).toISOString().slice(0, 10);

  const e1Params = {
    dest_id: destId,
    search_type: "CITY",
    arrival_date: arrival,
    departure_date: departure,
    adults: 2,
    children_age: "",
    room_qty: 1,
    page_number: 1,
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  };
  const e1 = await call("E1 searchHotels", PATH_E1, e1Params);
  summary.calls.push({ label: "E1", path: PATH_E1, params: e1Params, ok: e1.ok, error: e1.error });
  if (!e1.ok) {
    console.error("\n✖ E1 failed.");
    await save("live-smoke-summary.json", summary);
    process.exit(1);
  }
  await save("live-e1-search-hotels-madrid.json", e1.data);

  // Find first hotel_id
  const hotelId = digFirst(e1.data, ["hotel_id", "hotelId", "id"]);
  if (hotelId == null) {
    console.error("\n✖ Could not extract hotel_id from E1 response.");
    await save("live-smoke-summary.json", summary);
    process.exit(1);
  }
  console.log(`  ↳ first hotel_id = ${hotelId}`);

  // ── E2 — hotel detail ───────────────────────────────────────────────────
  const e2Params = {
    hotel_id: hotelId,
    arrival_date: arrival,
    departure_date: departure,
    adults: 2,
    children_age: "",
    room_qty: 1,
    units: "metric",
    temperature_unit: "c",
    languagecode: "en-us",
    currency_code: "EUR",
  };
  const e2 = await call("E2 getHotelDetails", PATH_E2, e2Params);
  summary.calls.push({ label: "E2", path: PATH_E2, params: e2Params, ok: e2.ok, error: e2.error });
  if (e2.ok) {
    await save("live-e2-hotel-details-madrid.json", e2.data);

    // Light validation against expected canonical fields
    const expected = ["hotel_id", "name", "address", "city", "latitude", "longitude", "class", "review_score"];
    const present = expected.filter((k) => digFirst(e2.data, [k]) != null);
    console.log(`  ↳ canonical-field presence: ${present.length}/${expected.length}`);
    console.log(`     hit: ${present.join(", ")}`);
    summary.canonical_field_hits = { expected, present };
  }

  summary.completed_at = new Date().toISOString();
  await save("live-smoke-summary.json", summary);
  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Smoke test complete.");
  console.log("  Inspect the live-*.json fixtures for actual wire shape.");
  console.log("══════════════════════════════════════════════════════════════");
}

main().catch((err) => {
  console.error("\n✖ unhandled error:", err);
  process.exit(1);
});
