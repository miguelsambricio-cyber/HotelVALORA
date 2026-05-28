// Fetch-only enrichment for the 2 manual_curated hotels.
// Mirrors the daily cron `enrichHotel()` parsing exactly. Writes a JSON
// payload per hotel to disk · DB writes are applied separately via MCP
// execute_sql (same pattern as audit.mjs / resolve.mjs).

import { readFileSync, writeFileSync } from "node:fs";
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
if (!KEY) throw new Error("RAPIDAPI key missing in .env.local");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RATE_LIMIT_MS = 250;
const MAX_GALLERY_PHOTOS = 60;

function bookingDates() {
  const ms = Date.now() + 90 * 86_400_000;
  return { arrival_date: new Date(ms).toISOString().slice(0,10), departure_date: new Date(ms + 86_400_000).toISOString().slice(0,10) };
}
async function rapid(path, params) {
  const u = new URL(`https://${HOST}${path}`);
  for (const [k,v] of Object.entries(params)) u.searchParams.set(k, String(v));
  const r = await fetch(u, { headers: { "x-rapidapi-key": KEY, "x-rapidapi-host": HOST } });
  const j = await r.json();
  return { ok: r.ok, status: r.status, data: j?.data ?? j };
}
function collectFacilityTitles(payload) {
  const data = payload?.data ?? payload ?? {};
  const groupTitleById = new Map();
  if (Array.isArray(data.facilityGroups)) for (const g of data.facilityGroups) if (typeof g?.id === "number") groupTitleById.set(g.id, g.title || "");
  const highlights = [];
  if (Array.isArray(data.accommodationHighlights)) for (const h of data.accommodationHighlights) if (h?.title) highlights.push(h.title);
  const groupedFacilities = [];
  if (Array.isArray(data.facilities)) for (const f of data.facilities) { const groupTitle = groupTitleById.get(f.groupId) ?? ""; if (Array.isArray(f.instances)) for (const inst of f.instances) if (inst?.title) groupedFacilities.push({ group: groupTitle, title: inst.title }); }
  return { highlights, groupedFacilities };
}
const L1 = ["thalasso","thalassotherapy","massage","treatment room","treatment","thermal circuit","thermal","hammam","beauty treatment","beauty","facial","body treatment","wellness center","spa center"];
function classifySpaTitle(title) {
  const t = (title || "").toLowerCase().trim();
  if (!t) return null;
  for (const kw of L1) if (t.includes(kw)) return 1;
  if (/\bspa\b/.test(t)) return 1;
  return 3;
}
function detectSpa(payload) {
  const { highlights, groupedFacilities } = collectFacilityTitles(payload);
  if (!highlights.length && !groupedFacilities.length) return null;
  for (const t of highlights) if (classifySpaTitle(t) === 1) return true;
  for (const gf of groupedFacilities) if (classifySpaTitle(gf.title) === 1) return true;
  return false;
}
function detectFacility(payload, pattern) {
  const { highlights, groupedFacilities } = collectFacilityTitles(payload);
  if (!highlights.length && !groupedFacilities.length) return null;
  for (const t of highlights) if (pattern.test(t)) return true;
  for (const gf of groupedFacilities) if (pattern.test(gf.group) || pattern.test(gf.title)) return true;
  return false;
}
function extractRestaurantsCount(payload) {
  const { groupedFacilities } = collectFacilityTitles(payload);
  let count = 0;
  for (const gf of groupedFacilities) if (gf.group && /food.*drink|food\s*&\s*drink/i.test(gf.group) && /\brestaurant\b/i.test(gf.title)) count++;
  return count > 0 ? count : null;
}
function extractMeetingRoomsCount(payload) {
  const { groupedFacilities } = collectFacilityTitles(payload);
  let count = 0;
  for (const gf of groupedFacilities) if (/meeting|conferenc|banquet|ball ?room/i.test(gf.title)) count++;
  return count > 0 ? count : null;
}
function extractPhotos(payload) {
  const data = payload?.data ?? payload;
  const urls = [];
  function push(u) { if (typeof u === "string" && u.startsWith("http")) urls.push(u); }
  if (Array.isArray(data)) for (const e of data) push(e?.url_max1280 ?? e?.url_640 ?? e?.url ?? e?.photo_url);
  else if (data && typeof data === "object") for (const k of Object.keys(data)) { const arr = data[k]; if (Array.isArray(arr)) for (const e of arr) push(e?.url_max1280 ?? e?.url_640 ?? e?.url ?? e?.photo_url); }
  return [...new Set(urls)].slice(0, MAX_GALLERY_PHOTOS);
}

const TARGETS = [
  { id: "709f2211-42bc-48ec-b173-97c9b912fbd9", bid: "8176578", name: "The Madrid EDITION", force_spa: true,  reason: "operator-verified real spa" },
  { id: "00cb78a8-2139-4497-91f8-0bfde3053a61", bid: "4204507", name: "Riu Plaza España",   force_spa: false, reason: "operator-verified no spa" },
];

const report = { run_at: new Date().toISOString(), targets: [] };

for (const t of TARGETS) {
  console.log(`\n── ${t.name} · booking_hotel_id=${t.bid} ──`);
  const dates = bookingDates();
  const det = await rapid("/api/v1/hotels/getHotelDetails", { hotel_id: t.bid, ...dates, adults:2, children_age:"", room_qty:1, units:"metric", temperature_unit:"c", languagecode:"en-us", currency_code:"EUR" });
  await sleep(RATE_LIMIT_MS);
  const fac = await rapid("/api/v1/hotels/getHotelFacilities", { hotel_id: t.bid, ...dates, adults:2, children_age:"", room_qty:1, units:"metric", temperature_unit:"c", languagecode:"en-us", currency_code:"EUR" });
  await sleep(RATE_LIMIT_MS);
  const ph = await rapid("/api/v1/hotels/getHotelPhotos", { hotel_id: t.bid, languagecode:"en-us" });
  await sleep(RATE_LIMIT_MS);

  const d = det.data || {};
  const reviewScore = typeof d.review_score === "number" ? d.review_score : null;
  const reviewCnt = typeof d.review_nr === "number" ? d.review_nr : (typeof d.review_count === "number" ? d.review_count : null);
  const restaurantsCount = fac.ok ? extractRestaurantsCount(fac.data) : null;
  const meetingRoomsCount = fac.ok ? extractMeetingRoomsCount(fac.data) : null;
  const detectedAmenities = fac.ok ? {
    meet: detectFacility(fac.data, /meeting|conferenc|business cent|banquet|ball ?room/i),
    spa: detectSpa(fac.data),
    gym: detectFacility(fac.data, /gym|fitness/i),
    pool: detectFacility(fac.data, /pool|swimming/i),
    parking: detectFacility(fac.data, /parking/i),
    bar: detectFacility(fac.data, /bar\b/i),
    rooftop: detectFacility(fac.data, /rooftop|terrace/i),
  } : {};
  const photos = ph.ok ? extractPhotos(ph.data) : [];

  const tr = {
    canonical_id: t.id,
    name: t.name,
    booking_hotel_id: t.bid,
    api_response_status: { details: det.status, facilities: fac.status, photos: ph.status },
    detail: {
      hotel_name: d.hotel_name ?? d.name ?? null,
      address: d.address ?? null, zip: d.zip ?? null, city: d.city ?? null,
      lat: typeof d.latitude === "number" ? Number(d.latitude.toFixed(6)) : null,
      lng: typeof d.longitude === "number" ? Number(d.longitude.toFixed(6)) : null,
      url: d.url ?? null,
      review_score: reviewScore,
      review_count: reviewCnt,
    },
    facilities_parsed: {
      restaurants_count: restaurantsCount,
      meeting_rooms_count: meetingRoomsCount,
      detected_amenities: detectedAmenities,
      raw_spa_parser_result: detectedAmenities.spa,
    },
    photos: { count: photos.length, urls: photos },
    operator_override: {
      force_spa: t.force_spa,
      reason: t.reason,
    },
  };
  console.log(`  detail: ${tr.detail.hotel_name} · ${tr.detail.address}, ${tr.detail.zip} · lat=${tr.detail.lat} lng=${tr.detail.lng}`);
  console.log(`  review: score=${tr.detail.review_score} count=${tr.detail.review_count}`);
  console.log(`  parsed: restaurants=${restaurantsCount} meetings=${meetingRoomsCount}`);
  console.log(`  amenities: spa(raw)=${detectedAmenities.spa} → forced=${t.force_spa}`);
  console.log(`  amenities full:`, JSON.stringify(detectedAmenities));
  console.log(`  photos: ${photos.length} URLs (first: ${photos[0]?.slice(0,80) ?? "none"}...)`);
  report.targets.push(tr);
}

writeFileSync(resolve(__dirname, "enrich-payload.json"), JSON.stringify(report, null, 2), "utf8");
console.log(`\n→ payload written to enrich-payload.json (${JSON.stringify(report).length} bytes)`);
