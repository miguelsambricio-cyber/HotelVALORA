// Read-only resolver · find booking_hotel_id for 2 manual-curated hotels.
// Uses booking-com15 (same endpoint family as the pipeline) so the resolved
// dest_id is the same identifier the rest of the corpus uses for booking_hotel_id.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(__dirname, "..", "..");

function loadEnv() {
  const raw = readFileSync(resolve(REPO, "apps", "web", ".env.local"), "utf8");
  const env = {};
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.startsWith("#") || !line.includes("=")) continue;
    const [k, ...rest] = line.split("=");
    let v = rest.join("=").trim();
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
    env[k.trim()] = v;
  }
  return env;
}
const env = loadEnv();
const KEY = env.RAPIDAPI_BOOKING_KEY || env.BOOKING_RAPIDAPI_KEY;
const HOST = env.RAPIDAPI_BOOKING_HOST || env.BOOKING_RAPIDAPI_HOST || "booking-com15.p.rapidapi.com";
if (!KEY) throw new Error("BOOKING/RAPIDAPI key missing in .env.local");

async function searchDestination(query) {
  const u = new URL(`https://${HOST}/api/v1/hotels/searchDestination`);
  u.searchParams.set("query", query);
  const r = await fetch(u, { headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST } });
  const j = await r.json();
  return { ok: r.ok, status: r.status, data: j?.data ?? j };
}

async function getHotelDetails(hotelId) {
  const arrivalDate = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
  const departureDate = new Date(Date.now() + 91 * 86_400_000).toISOString().slice(0, 10);
  const u = new URL(`https://${HOST}/api/v1/hotels/getHotelDetails`);
  const params = {
    hotel_id: hotelId, arrival_date: arrivalDate, departure_date: departureDate,
    adults: 2, children_age: "", room_qty: 1, units: "metric", temperature_unit: "c",
    languagecode: "en-us", currency_code: "EUR",
  };
  for (const [k, v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const r = await fetch(u, { headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST } });
  const j = await r.json();
  return { ok: r.ok, status: r.status, data: j?.data ?? j };
}

const TARGETS = [
  { canonical: "The Madrid EDITION", q: "The Madrid EDITION", expectedAddr: "Plaza de Celenque 2", expectedZip: "28013" },
  { canonical: "Riu Plaza España",   q: "Riu Plaza Espana Madrid",  expectedAddr: "Gran Vía 84",      expectedZip: "28013" },
];

for (const t of TARGETS) {
  console.log("\n────────────────────────────────────────────────────────");
  console.log(`TARGET · ${t.canonical}`);
  console.log(`  expected: ${t.expectedAddr}, ${t.expectedZip} Madrid`);
  const dest = await searchDestination(t.q);
  if (!dest.ok) { console.log(`  searchDestination HTTP ${dest.status}`); continue; }
  const hits = Array.isArray(dest.data) ? dest.data : [];
  const hotels = hits.filter((h) => (h.dest_type || h.search_type) === "hotel");
  console.log(`  searchDestination · ${hits.length} hits · ${hotels.length} of type 'hotel'`);
  for (const h of hotels.slice(0, 5)) {
    console.log(`    candidate · dest_id=${h.dest_id} · name="${h.name}" · label="${h.label || ""}" · city=${h.city_name || h.country || ""}`);
  }
  // Pick first hotel-type hit → resolve full details
  const best = hotels[0];
  if (!best) { console.log("  ⚠ no hotel-type hit"); continue; }
  const det = await getHotelDetails(best.dest_id);
  if (!det.ok) { console.log(`  getHotelDetails HTTP ${det.status}`); continue; }
  const d = det.data || {};
  console.log(`  → details · hotel_id=${d.hotel_id} · name="${d.hotel_name || d.name}"`);
  console.log(`             address="${d.address || ""}" · zip=${d.zip || ""} · city=${d.city || d.city_trans || ""}`);
  console.log(`             lat=${d.latitude} · lng=${d.longitude} · class=${d.accuratePropertyClass || d.propertyClass || d.class}`);
  console.log(`             url=${d.url || ""}`);
  const addrMatch = (d.address || "").toLowerCase().includes(t.expectedAddr.toLowerCase().replace(/í/g, "i"));
  const zipMatch  = (d.zip || "").trim() === t.expectedZip;
  console.log(`             ADDRESS_MATCH=${addrMatch} · ZIP_MATCH=${zipMatch}`);
  await new Promise((r) => setTimeout(r, 200));
}
