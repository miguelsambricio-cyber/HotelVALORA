#!/usr/bin/env node
/**
 * Phase C — Madrid 50-hotel smoke pilot (live).
 *
 * Calls booking-com15 live (E1 + 50 E2) and writes canonical rows
 * to disk as both JSON intermediates AND a batched SQL script ready
 * for Supabase MCP execute_sql.
 *
 * Pipeline:
 *   1. E1 sweep Madrid (popularity sort, page_number=1)
 *   2. Filter to accommodation_type_name === "Hotels" (NOT Hostels/Apartments)
 *   3. For each: E2 detail fetch
 *   4. Parse dual-source → canonical row
 *   5. Resolve brand / amenities / municipio / type via inlined registries
 *   6. Compute block_key + data_quality_tier
 *   7. Emit:
 *       fixtures/phase-c-canonical-rows.json
 *       fixtures/phase-c-source-records.json
 *       fixtures/phase-c-provenance-rows.json
 *       fixtures/phase-c-execution-log.json
 *       fixtures/phase-c-batch-insert.sql
 *
 * Operator then runs the SQL via Supabase MCP `execute_sql`.
 *
 * Budget: ~51 calls (1 E1 + 50 E2) ≈ 0.2% of Pro 25k.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { randomUUID, createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures");
const OUT_DIR = resolve(FIXTURES_DIR, "phase-c");

const KEY = process.env.BOOKING_RAPIDAPI_KEY ?? "";
const HOST = process.env.BOOKING_RAPIDAPI_HOST ?? "booking-com15.p.rapidapi.com";
const BASE_URL = `https://${HOST}`;
const HEADERS = { "X-RapidAPI-Key": KEY, "X-RapidAPI-Host": HOST, Accept: "application/json" };
if (!KEY) { console.error("✖ BOOKING_RAPIDAPI_KEY missing"); process.exit(2); }

const MADRID_DEST_ID = "-390625"; // resolved earlier from E0 smoke
const TARGET_HOTELS = 50;
const ENRICHMENT_RUN_ID = randomUUID();
const NOW_ISO = new Date().toISOString();
const ARRIVAL = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
const DEPARTURE = new Date(Date.now() + 8 * 86400000).toISOString().slice(0, 10);

// ════════════════════════════════════════════════════════════════════════════
// REGISTRIES (inlined subset — focused on Madrid-relevant chains)
// ════════════════════════════════════════════════════════════════════════════

// Brand → { brand_family, chain_scale, hq_country }
// Aligned with apps/web/src/lib/enrichment/registries/brands.ts (subset).
const BRANDS = [
  // Spanish chains
  { aliases: ["nh collection"], family: "NH Hotel Group", scale: "upper_upscale", hq: "ES" },
  { aliases: ["nhow"], family: "NH Hotel Group", scale: "upper_upscale", hq: "ES" },
  { aliases: ["nh hotel", "nh hotels", "nh hoteles", "nh "], family: "NH Hotel Group", scale: "upscale", hq: "ES" },
  { aliases: ["hesperia"], family: "NH Hotel Group", scale: "upscale", hq: "ES" },
  { aliases: ["gran melia", "gran meliá"], family: "Meliá Hotels International", scale: "luxury", hq: "ES" },
  { aliases: ["me by melia", "me by meliá", "me melia"], family: "Meliá Hotels International", scale: "upper_upscale", hq: "ES" },
  { aliases: ["paradisus"], family: "Meliá Hotels International", scale: "upper_upscale", hq: "ES" },
  { aliases: ["innside"], family: "Meliá Hotels International", scale: "upscale", hq: "ES" },
  { aliases: ["sol by melia", "sol by meliá", "sol melia"], family: "Meliá Hotels International", scale: "upper_midscale", hq: "ES" },
  { aliases: ["melia ", "meliá ", "melia hotel", "meliá hotel"], family: "Meliá Hotels International", scale: "upscale", hq: "ES" },
  { aliases: ["royal hideaway"], family: "Barceló Hotel Group", scale: "luxury", hq: "ES" },
  { aliases: ["barcelo", "barceló"], family: "Barceló Hotel Group", scale: "upscale", hq: "ES" },
  { aliases: ["occidental"], family: "Barceló Hotel Group", scale: "upscale", hq: "ES" },
  { aliases: ["iberostar"], family: "Iberostar Group", scale: "upscale", hq: "ES" },
  { aliases: ["riu hotels", "riu hotel"], family: "Riu Hotels & Resorts", scale: "upper_midscale", hq: "ES" },
  { aliases: ["eurostars"], family: "Hotusa Hotels", scale: "upscale", hq: "ES" },
  { aliases: ["petit palace"], family: "Hotusa Hotels", scale: "upscale", hq: "ES" },
  { aliases: ["vincci"], family: "Vincci Hotels", scale: "upscale", hq: "ES" },
  { aliases: ["catalonia"], family: "Catalonia Hotels & Resorts", scale: "upscale", hq: "ES" },
  { aliases: ["room mate", "room-mate"], family: "Room Mate Hotels", scale: "upper_midscale", hq: "ES" },
  { aliases: ["sercotel"], family: "Sercotel Hotels", scale: "upper_midscale", hq: "ES" },
  { aliases: ["only you"], family: "Palladium Hotel Group", scale: "upper_upscale", hq: "ES" },
  { aliases: ["hard rock"], family: "Palladium Hotel Group", scale: "upper_upscale", hq: "ES" },
  { aliases: ["h10"], family: "H10 Hotels", scale: "upscale", hq: "ES" },
  // Luxury international
  { aliases: ["four seasons"], family: "Four Seasons Hotels and Resorts", scale: "luxury", hq: "CA" },
  { aliases: ["mandarin oriental"], family: "Mandarin Oriental Hotel Group", scale: "luxury", hq: "HK" },
  { aliases: ["rosewood"], family: "Rosewood Hotels & Resorts", scale: "luxury", hq: "HK" },
  { aliases: ["bvlgari", "bulgari"], family: "Bvlgari Hotels & Resorts", scale: "luxury", hq: "IT" },
  { aliases: ["belmond"], family: "Belmond (LVMH)", scale: "luxury", hq: "GB" },
  // Marriott family
  { aliases: ["ritz-carlton", "ritz carlton"], family: "Marriott International", scale: "luxury", hq: "US" },
  { aliases: ["st regis", "st. regis"], family: "Marriott International", scale: "luxury", hq: "US" },
  { aliases: ["edition"], family: "Marriott International", scale: "luxury", hq: "US" },
  { aliases: ["w madrid", "w hotel", "w hotels"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  { aliases: ["westin"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  { aliases: ["sheraton"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  { aliases: ["le meridien", "le méridien", "meridien"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  { aliases: ["autograph collection", "autograph"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  { aliases: ["ac hotel", "ac by marriott", "ac hoteles"], family: "Marriott International", scale: "upscale", hq: "US" },
  { aliases: ["courtyard"], family: "Marriott International", scale: "upscale", hq: "US" },
  { aliases: ["moxy"], family: "Marriott International", scale: "upper_midscale", hq: "US" },
  { aliases: ["aloft"], family: "Marriott International", scale: "upscale", hq: "US" },
  { aliases: ["marriott"], family: "Marriott International", scale: "upper_upscale", hq: "US" },
  // Hilton family
  { aliases: ["waldorf astoria"], family: "Hilton", scale: "luxury", hq: "US" },
  { aliases: ["conrad"], family: "Hilton", scale: "luxury", hq: "US" },
  { aliases: ["curio"], family: "Hilton", scale: "upper_upscale", hq: "US" },
  { aliases: ["canopy"], family: "Hilton", scale: "upper_upscale", hq: "US" },
  { aliases: ["doubletree"], family: "Hilton", scale: "upscale", hq: "US" },
  { aliases: ["hampton"], family: "Hilton", scale: "upper_midscale", hq: "US" },
  { aliases: ["hilton garden inn", "garden inn"], family: "Hilton", scale: "upscale", hq: "US" },
  { aliases: ["hilton"], family: "Hilton", scale: "upper_upscale", hq: "US" },
  // Hyatt family
  { aliases: ["park hyatt"], family: "Hyatt", scale: "luxury", hq: "US" },
  { aliases: ["grand hyatt"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["hyatt regency"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["hyatt centric", "centric"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["andaz"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["thompson"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["hyatt"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  // IHG family
  { aliases: ["intercontinental", "inter continental"], family: "InterContinental Hotels Group", scale: "luxury", hq: "GB" },
  { aliases: ["kimpton"], family: "InterContinental Hotels Group", scale: "upper_upscale", hq: "GB" },
  { aliases: ["hotel indigo", "indigo"], family: "InterContinental Hotels Group", scale: "upper_upscale", hq: "GB" },
  { aliases: ["voco"], family: "InterContinental Hotels Group", scale: "upscale", hq: "GB" },
  { aliases: ["crowne plaza"], family: "InterContinental Hotels Group", scale: "upper_upscale", hq: "GB" },
  { aliases: ["holiday inn express"], family: "InterContinental Hotels Group", scale: "upper_midscale", hq: "GB" },
  { aliases: ["holiday inn"], family: "InterContinental Hotels Group", scale: "upper_midscale", hq: "GB" },
  // Accor family
  { aliases: ["sofitel"], family: "Accor", scale: "luxury", hq: "FR" },
  { aliases: ["pullman"], family: "Accor", scale: "upper_upscale", hq: "FR" },
  { aliases: ["mgallery", "m gallery"], family: "Accor", scale: "upper_upscale", hq: "FR" },
  { aliases: ["novotel"], family: "Accor", scale: "upscale", hq: "FR" },
  { aliases: ["mercure"], family: "Accor", scale: "upscale", hq: "FR" },
  { aliases: ["ibis styles", "ibis style"], family: "Accor", scale: "midscale", hq: "FR" },
  { aliases: ["ibis "], family: "Accor", scale: "midscale", hq: "FR" },
  { aliases: ["25hours", "25 hours"], family: "Accor", scale: "upper_upscale", hq: "FR" },
  // Radisson
  { aliases: ["radisson collection"], family: "Radisson Hotel Group", scale: "upper_upscale", hq: "BE" },
  { aliases: ["radisson blu"], family: "Radisson Hotel Group", scale: "upper_upscale", hq: "BE" },
  { aliases: ["radisson"], family: "Radisson Hotel Group", scale: "upscale", hq: "BE" },
  { aliases: ["park plaza"], family: "Radisson Hotel Group", scale: "upscale", hq: "BE" },
  // Other
  { aliases: ["tryp by wyndham", "tryp"], family: "Wyndham Hotels & Resorts", scale: "midscale", hq: "US" },
  { aliases: ["wyndham"], family: "Wyndham Hotels & Resorts", scale: "upper_midscale", hq: "US" },
  { aliases: ["best western"], family: "Best Western Hotels & Resorts", scale: "midscale", hq: "US" },
  { aliases: ["leonardo"], family: "Leonardo Hotels", scale: "upscale", hq: "DE" },
  { aliases: ["pestana"], family: "Pestana Hotel Group", scale: "upscale", hq: "PT" },
  // Observed in Phase C run 1 — added to v1.1
  { aliases: ["rafaelhoteles", "rafael hoteles"], family: "Rafaelhoteles", scale: "upscale", hq: "ES" },
  { aliases: ["ilunion"], family: "ILUNION Hotels", scale: "upscale", hq: "ES" },
  { aliases: ["episode"], family: "Episode Hotels (Ennismore)", scale: "upper_upscale", hq: "GB" },
  // Other Spanish chains common in Madrid
  { aliases: ["axel hotels", "axel hotel"], family: "Axel Hotels", scale: "upper_upscale", hq: "ES" },
  { aliases: ["catalonia hotels", "catalonia hotel"], family: "Catalonia Hotels & Resorts", scale: "upscale", hq: "ES" },
  { aliases: ["b&b hotels", "b and b hotels"], family: "B&B Hotels", scale: "midscale", hq: "FR" },
  { aliases: ["motel one"], family: "Motel One", scale: "midscale", hq: "DE" },
  { aliases: ["princesa plaza"], family: "Princesa Plaza", scale: "upscale", hq: "ES" },
  { aliases: ["hotel preciados"], family: "Preciados Hotels", scale: "upscale", hq: "ES" },
  { aliases: ["totem"], family: "Totem Hotels", scale: "upper_upscale", hq: "ES" },
  { aliases: ["villamagna"], family: "Rosewood Hotels & Resorts", scale: "luxury", hq: "HK" },
  { aliases: ["urso"], family: "Urso Hotel & Spa", scale: "upper_upscale", hq: "ES" },
  { aliases: ["thompson madrid"], family: "Hyatt", scale: "upper_upscale", hq: "US" },
  { aliases: ["the principal"], family: "The Principal Madrid", scale: "upper_upscale", hq: "ES" },
];

function normalize(s) {
  return (s ?? "").toString().toLowerCase().normalize("NFKD").replace(/\p{Diacritic}/gu, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function lookupBrand(name) {
  if (!name) return null;
  const n = " " + normalize(name) + " ";
  for (const b of BRANDS) {
    for (const a of b.aliases) {
      if (n.includes(" " + a + " ") || n.includes(a + " ") || n.includes(" " + a)) {
        return b;
      }
    }
  }
  return null;
}

// Amenity normalization (canonical 14-key bitmap)
const AMENITY_KEYS = ["bar","restaurant","rooftop","spa","gym","pool","parking","meet","business_center","kids_club","beach_access","golf","casino","marina"];
const AMENITY_ALIASES = {
  bar: ["bar","lobby bar","cocktail bar","wine bar","snack bar","bar de copas","bar de hotel","bar lounge","lounge bar"],
  restaurant: ["restaurant","restaurante","comedor","fine dining","all day dining","buffet restaurant","restaurante propio"],
  rooftop: ["rooftop","rooftop bar","rooftop terrace","rooftop pool","sky bar","skybar","azotea","terraza panoramica","roof top"],
  spa: ["spa","spa and wellness center","wellness center","wellness centre","centro de bienestar","centro spa","spa and wellness"],
  gym: ["gym","fitness centre","fitness center","fitness facilities","fitness room","gimnasio","sala de fitness","sala fitness"],
  pool: ["pool","swimming pool","indoor pool","outdoor pool","heated pool","infinity pool","rooftop pool","piscina","piscina cubierta","piscina exterior","piscina climatizada"],
  parking: ["parking","private parking","free parking","paid parking","valet parking","garage","underground parking","aparcamiento","parking privado","parking gratis","garaje"],
  meet: ["meeting room","meeting rooms","meeting facilities","meeting and banquet facilities","meeting banquet facilities","banquet facilities","conference room","conference rooms","conference facilities","salas de reuniones","sala de reuniones","salones","salones de banquetes"],
  business_center: ["business centre","business center","centro de negocios","executive lounge","executive floor"],
  kids_club: ["kids club","kids' club","miniclub","mini club","childrens playground","club infantil","actividades para ninos"],
  beach_access: ["beachfront","private beach","private beach area","beach access","playa privada","acceso a la playa"],
  golf: ["golf course","golf course on site","golf","campo de golf","putting green"],
  casino: ["casino","gaming"],
  marina: ["marina","puerto deportivo","yacht berth"],
};
function resolveAmenities(rawList) {
  const bitmap = Object.fromEntries(AMENITY_KEYS.map(k => [k, null]));
  const unmapped = [];
  for (const raw of rawList || []) {
    if (!raw) continue;
    const n = normalize(raw);
    let hit = false;
    for (const key of AMENITY_KEYS) {
      for (const alias of AMENITY_ALIASES[key]) {
        if (n.includes(alias)) { bitmap[key] = true; hit = true; break; }
      }
      if (hit) break;
    }
    if (!hit) unmapped.push(raw);
  }
  return { bitmap, unmapped };
}

// Madrid municipios postal-prefix map
const POSTAL_TO_NORMALIZED = {};
for (let n = 1; n <= 55; n++) {
  const code = "280" + String(n).padStart(2, "0");
  POSTAL_TO_NORMALIZED[code] = "Madrid";
}
// Metro municipios
[
  ["28100", "Alcobendas"], ["28108", "Alcobendas"],
  ["28700", "San Sebastián de los Reyes"], ["28701", "San Sebastián de los Reyes"], ["28702", "San Sebastián de los Reyes"], ["28703", "San Sebastián de los Reyes"],
  ["28760", "Tres Cantos"],
  ["28850", "Torrejón de Ardoz"],
  ["28830", "San Fernando de Henares"],
  ["28820", "Coslada"], ["28823", "Coslada"],
  ["28223", "Pozuelo de Alarcón"], ["28224", "Pozuelo de Alarcón"],
  ["28220", "Majadahonda"], ["28221", "Majadahonda"], ["28222", "Majadahonda"],
  ["28230", "Las Rozas"], ["28231", "Las Rozas"], ["28232", "Las Rozas"],
  ["28660", "Boadilla del Monte"],
  ["28901", "Getafe"], ["28902", "Getafe"], ["28903", "Getafe"], ["28904", "Getafe"], ["28905", "Getafe"], ["28906", "Getafe"], ["28907", "Getafe"], ["28909", "Getafe"],
  ["28911", "Leganés"], ["28912", "Leganés"], ["28913", "Leganés"], ["28914", "Leganés"], ["28915", "Leganés"], ["28916", "Leganés"], ["28917", "Leganés"], ["28918", "Leganés"],
  ["28921", "Alcorcón"], ["28922", "Alcorcón"], ["28923", "Alcorcón"], ["28924", "Alcorcón"], ["28925", "Alcorcón"],
  ["28931", "Móstoles"], ["28932", "Móstoles"], ["28933", "Móstoles"], ["28934", "Móstoles"], ["28935", "Móstoles"], ["28936", "Móstoles"], ["28937", "Móstoles"], ["28938", "Móstoles"],
  ["28941", "Fuenlabrada"], ["28942", "Fuenlabrada"], ["28943", "Fuenlabrada"], ["28944", "Fuenlabrada"], ["28945", "Fuenlabrada"], ["28946", "Fuenlabrada"],
  ["28320", "Pinto"],
  ["28521", "Rivas-Vaciamadrid"], ["28522", "Rivas-Vaciamadrid"], ["28523", "Rivas-Vaciamadrid"],
].forEach(([code]) => { POSTAL_TO_NORMALIZED[code] = "Madrid"; });

// Separate-market municipios
[
  ["28800", "Alcalá de Henares"], ["28801", "Alcalá de Henares"], ["28802", "Alcalá de Henares"], ["28803", "Alcalá de Henares"], ["28804", "Alcalá de Henares"], ["28805", "Alcalá de Henares"], ["28806", "Alcalá de Henares"], ["28807", "Alcalá de Henares"],
  ["28300", "Aranjuez"],
  ["28200", "Sierra Norte de Madrid"],
  ["28370", "Chinchón"],
].forEach(([code, name]) => { POSTAL_TO_NORMALIZED[code] = name; });

function resolveMunicipio(rawCity, postalCode) {
  if (postalCode) {
    const cleaned = String(postalCode).trim().slice(0, 5);
    if (/^\d{5}$/.test(cleaned) && POSTAL_TO_NORMALIZED[cleaned]) {
      return { cityNormalized: POSTAL_TO_NORMALIZED[cleaned], conf: 0.95, source: "postal" };
    }
  }
  if (rawCity) return { cityNormalized: rawCity, conf: 0.5, source: "verbatim" };
  return { cityNormalized: "Madrid", conf: 0.5, source: "default" };
}

// Hotel type map
const TYPE_MAP = {
  "hotel": { type: "urban", conf: 0.7, exclude: false },
  "hotels": { type: "urban", conf: 0.7, exclude: false },
  "resort": { type: "resort", conf: 0.9, exclude: false },
  "boutique hotel": { type: "boutique", conf: 0.9, exclude: false },
  "design hotel": { type: "boutique", conf: 0.85, exclude: false },
  "aparthotel": { type: "aparthotel", conf: 0.95, exclude: false },
  "apartment hotel": { type: "aparthotel", conf: 0.9, exclude: false },
  "extended stay hotel": { type: "extended_stay", conf: 0.95, exclude: false },
  "serviced apartment": { type: "flex_living", conf: 0.9, exclude: false },
  "airport hotel": { type: "airport", conf: 0.95, exclude: false },
  // Excluded
  "apartment": { type: "flex_living", conf: 0.4, exclude: true },
  "apartments": { type: "flex_living", conf: 0.4, exclude: true },
  "hostel": { type: "urban", conf: 0.4, exclude: true },
  "hostels": { type: "urban", conf: 0.4, exclude: true },
  "bed and breakfast": { type: "urban", conf: 0.4, exclude: true },
  "guest house": { type: "urban", conf: 0.4, exclude: true },
  "guesthouse": { type: "urban", conf: 0.4, exclude: true },
  "villa": { type: "flex_living", conf: 0.4, exclude: true },
  "holiday park": { type: "resort", conf: 0.4, exclude: true },
  "campground": { type: "resort", conf: 0.4, exclude: true },
  "vacation rental": { type: "flex_living", conf: 0.4, exclude: true },
  "homestay": { type: "flex_living", conf: 0.4, exclude: true },
};
function resolveHotelType(rawName) {
  if (!rawName) return null;
  const n = normalize(rawName);
  if (TYPE_MAP[n]) return TYPE_MAP[n];
  for (const [k, v] of Object.entries(TYPE_MAP)) {
    if (n.includes(k)) return { ...v, conf: v.conf * 0.9 };
  }
  return null;
}

function deriveSegment({ chainScale, hotelType, starRating }) {
  if (chainScale && chainScale !== "unknown") return { segment: chainScale, conf: 0.85 };
  if (hotelType === "resort") return { segment: "resort", conf: 0.8 };
  if (hotelType === "boutique") return { segment: "boutique", conf: 0.8 };
  if (hotelType === "aparthotel" || hotelType === "flex_living") return { segment: "serviced_apartments", conf: 0.8 };
  if (typeof starRating === "number") {
    if (starRating >= 5) return { segment: "upper_upscale", conf: 0.7 };
    if (starRating >= 4) return { segment: "upscale", conf: 0.7 };
    if (starRating >= 3) return { segment: "upper_midscale", conf: 0.7 };
    if (starRating >= 2) return { segment: "midscale", conf: 0.7 };
    if (starRating >= 1) return { segment: "economy", conf: 0.7 };
  }
  return { segment: "unknown", conf: 0.5 };
}

// ════════════════════════════════════════════════════════════════════════════
// String similarity / soundex / blockKey
// ════════════════════════════════════════════════════════════════════════════

const SOUNDEX_MAP = { b:"1", f:"1", p:"1", v:"1", c:"2", g:"2", j:"2", k:"2", q:"2", s:"2", x:"2", z:"2", d:"3", t:"3", l:"4", m:"5", n:"5", r:"6" };
function soundex(input) {
  const cleaned = normalize(input).replace(/\s+/g, "");
  if (!cleaned) return "Z000";
  let result = cleaned[0].toUpperCase();
  let prev = SOUNDEX_MAP[cleaned[0]] ?? "";
  for (let i = 1; i < cleaned.length && result.length < 4; i++) {
    const code = SOUNDEX_MAP[cleaned[i]];
    if (!code) continue;
    if (code !== prev) result += code;
    prev = code;
  }
  return (result + "000").slice(0, 4);
}

const STOPWORDS = new Set(["hotel","hotels","hoteles","the","el","la","los","las","de","del","by","and","y","spa","resort","apartments","aparthotel","boutique","luxury","collection"]);
function normalizeForBlocking(s) {
  return normalize(s).split(" ").filter(t => t && !STOPWORDS.has(t)).join(" ");
}
function blockKey({ name, cityNormalized, countryCode }) {
  return `${soundex(normalizeForBlocking(name) || name || "")}::${normalize(cityNormalized || "")}::${(countryCode || "").toUpperCase()}`;
}

// ════════════════════════════════════════════════════════════════════════════
// HTTP helpers
// ════════════════════════════════════════════════════════════════════════════

function buildUrl(path, params) {
  const url = new URL(path, BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v == null) continue;
    url.searchParams.set(k, String(v));
  }
  return url.toString();
}

async function callApi(label, path, params) {
  const url = buildUrl(path, params);
  const t = Date.now();
  let res;
  try { res = await fetch(url, { headers: HEADERS }); }
  catch (e) { return { ok: false, error: { class: "NETWORK", message: e?.message } }; }
  const ms = Date.now() - t;
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, status: res.status, ms, error: { class: res.status === 429 ? "RATE_LIMIT" : `HTTP_${res.status}`, message: text.slice(0, 200) } };
  }
  const body = await res.json();
  return { ok: true, status: res.status, ms, data: body };
}

// ════════════════════════════════════════════════════════════════════════════
// Parsers (inline subset matching the v2 TS parser semantics)
// ════════════════════════════════════════════════════════════════════════════

function validateLat(v) { if (v == null) return null; if (v < -90 || v > 90) return null; return Math.round(v * 1_000_000) / 1_000_000; }
function validateLng(v) { if (v == null) return null; if (v < -180 || v > 180) return null; return Math.round(v * 1_000_000) / 1_000_000; }
function validateCC(v) { if (!v) return null; const cc = String(v).trim().toUpperCase(); return /^[A-Z]{2}$/.test(cc) ? cc : null; }
function validateStar(v) { if (v == null || v === 0) return null; const n = Math.round(Number(v)); return n >= 1 && n <= 5 ? n : null; }
function validateReview(v) { if (v == null) return null; const n = Number(v); return n >= 0 && n <= 10 ? Math.round(n * 100) / 100 : null; }

function pickStarRating(prop) {
  return validateStar(prop?.accuratePropertyClass) ?? validateStar(prop?.propertyClass) ?? validateStar(prop?.qualityClass);
}

function parseE1AndE2(hit, detail) {
  const p = hit?.property || {};
  const d = detail || {};
  const facilities = Array.isArray(d.facilities_block?.facilities)
    ? d.facilities_block.facilities.map(f => f?.name).filter(Boolean)
    : [];
  if (Array.isArray(d.family_facilities)) facilities.push(...d.family_facilities);
  return {
    bookingHotelId: String(p.id ?? d.hotel_id ?? hit?.hotel_id ?? ""),
    name: (d.hotel_name || p.name || "").trim() || null,
    addressLine1: (d.address || "").trim() || null,
    city: (d.city_trans || d.city_name_en || d.city || "").trim() || null,
    district: (d.district || "").trim() || null,
    postalCode: (d.zip || "").trim() || null,
    countryCode: validateCC(d.cc1 || d.countrycode || p.countryCode),
    region: (d.region || "").trim() || null,
    lat: validateLat(d.latitude ?? p.latitude),
    lng: validateLng(d.longitude ?? p.longitude),
    starRating: pickStarRating(p),
    reviewScore: validateReview(p.reviewScore),
    reviewCount: typeof p.reviewCount === "number" ? p.reviewCount : (d.review_nr ?? null),
    bookingUrl: (d.url || "").trim() || null,
    mainPhotoUrl: Array.isArray(p.photoUrls) && p.photoUrls.length > 0 ? (p.photoUrls[1] || p.photoUrls[0]) : null,
    galleryUrls: Array.isArray(p.photoUrls) ? p.photoUrls.slice(0, 3) : [],
    accommodationTypeName: (d.accommodation_type_name || "").trim() || null,
    isClosed: d.is_closed === 1 || d.is_closed === true,
    isFamilyFriendly: d.is_family_friendly === 1 || d.is_family_friendly === true,
    wifiReviewScore: d.wifi_review_score?.rating ?? null,
    breakfastReviewScore: d.breakfast_review_score?.rating ?? d.breakfast_review_score?.review_score ?? null,
    rawFacilities: facilities,
  };
}

function buildCanonical(parsed) {
  const hotelTypeResolution = resolveHotelType(parsed.accommodationTypeName);
  const brand = lookupBrand(parsed.name);
  const municipio = resolveMunicipio(parsed.city, parsed.postalCode);
  const amenityResult = resolveAmenities(parsed.rawFacilities);
  const segment = deriveSegment({
    chainScale: brand?.scale,
    hotelType: hotelTypeResolution?.type,
    starRating: parsed.starRating,
  });
  const bk = blockKey({
    name: parsed.name,
    cityNormalized: municipio.cityNormalized,
    countryCode: parsed.countryCode || "ES",
  });
  return {
    booking_hotel_id: parsed.bookingHotelId,
    canonical_name: parsed.name,
    brand: brand ? parsed.name?.match(new RegExp(brand.aliases[0], "i"))?.[0] ?? brand.family : null,
    brand_family: brand?.family ?? null,
    chain_scale: brand?.scale ?? "unknown",
    operator_type: "unknown",
    star_rating: parsed.starRating,
    hotel_type: hotelTypeResolution?.type ?? null,
    segment: segment.segment,
    address_line1: parsed.addressLine1,
    city: parsed.city || municipio.cityNormalized,
    city_normalized: municipio.cityNormalized,
    postal_code: parsed.postalCode,
    country_code: parsed.countryCode || "ES",
    region: parsed.region,
    neighborhood: parsed.district,
    lat: parsed.lat,
    lng: parsed.lng,
    amenities: amenityResult.bitmap,
    review_score: parsed.reviewScore,
    review_count: parsed.reviewCount,
    primary_review_source: parsed.reviewScore != null ? "booking_rapidapi" : null,
    booking_url: parsed.bookingUrl,
    hero_image_path: parsed.mainPhotoUrl,
    gallery_paths: parsed.galleryUrls,
    primary_source: "booking_rapidapi",
    data_quality_tier: "bronze",
    block_key: bk,
    status: parsed.isClosed ? "closed" : "active",
    enrichment_version: 1,
    last_enriched_at: NOW_ISO,
    source_confidence: {},
    field_provenance_summary: {},
    // Bonus fields not in canonical schema but useful for audit
    _bonus: {
      hotel_type_excluded: hotelTypeResolution?.exclude === true,
      brand_resolution: brand,
      amenity_unmapped_count: amenityResult.unmapped.length,
      amenity_keys_determined: Object.values(amenityResult.bitmap).filter(v => v !== null).length,
      wifi_review_score: parsed.wifiReviewScore,
      breakfast_review_score: parsed.breakfastReviewScore,
      is_family_friendly: parsed.isFamilyFriendly,
      municipio_source: municipio.source,
      municipio_confidence: municipio.conf,
      segment_confidence: segment.conf,
    },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// SQL builder
// ════════════════════════════════════════════════════════════════════════════

function sqlString(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : "null";
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    return "array[" + v.map(s => sqlString(s)).join(",") + "]";
  }
  if (typeof v === "object") return "'" + JSON.stringify(v).replace(/'/g, "''") + "'::jsonb";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function buildCanonicalInsertSql(rows, runId) {
  const cols = [
    "booking_hotel_id","canonical_name","brand","brand_family","chain_scale","operator_type",
    "star_rating","hotel_type","segment",
    "address_line1","city","city_normalized","postal_code","country_code","region","neighborhood",
    "lat","lng","geom",
    "amenities","review_score","review_count","primary_review_source",
    "booking_url","hero_image_path","gallery_paths",
    "primary_source","data_quality_tier","block_key","status","enrichment_version","last_enriched_at",
    "source_confidence","field_provenance_summary"
  ];
  const valueRows = rows.map(r => {
    const geom = (r.lat != null && r.lng != null)
      ? `st_setsrid(st_makepoint(${r.lng},${r.lat}),4326)::geography`
      : "null";
    return "(" + [
      sqlString(r.booking_hotel_id),
      sqlString(r.canonical_name),
      sqlString(r.brand),
      sqlString(r.brand_family),
      sqlString(r.chain_scale),
      sqlString(r.operator_type),
      sqlString(r.star_rating),
      sqlString(r.hotel_type),
      sqlString(r.segment),
      sqlString(r.address_line1),
      sqlString(r.city),
      sqlString(r.city_normalized),
      sqlString(r.postal_code),
      sqlString(r.country_code),
      sqlString(r.region),
      sqlString(r.neighborhood),
      sqlString(r.lat),
      sqlString(r.lng),
      geom,
      sqlString(r.amenities),
      sqlString(r.review_score),
      sqlString(r.review_count),
      sqlString(r.primary_review_source),
      sqlString(r.booking_url),
      sqlString(r.hero_image_path),
      sqlString(r.gallery_paths),
      sqlString(r.primary_source),
      sqlString(r.data_quality_tier),
      sqlString(r.block_key),
      sqlString(r.status),
      sqlString(r.enrichment_version),
      sqlString(r.last_enriched_at),
      sqlString(r.source_confidence),
      sqlString(r.field_provenance_summary),
    ].join(",") + ")";
  });
  return `insert into public.hotel_canonical (${cols.join(",")}) values\n${valueRows.join(",\n")}\non conflict (booking_hotel_id) where booking_hotel_id is not null do nothing;`;
}

function buildSourceRecordsInsertSql(records, runId) {
  const cols = ["source","source_id","payload","payload_hash","fetched_at","fetch_status","ttl_expires_at","enrichment_run_id"];
  const ttl = new Date(Date.now() + 7 * 86400000).toISOString();
  const valueRows = records.map(rec => "(" + [
    sqlString("booking_rapidapi"),
    sqlString(rec.source_id),
    sqlString(rec.payload),
    sqlString(rec.payload_hash),
    sqlString(NOW_ISO),
    sqlString(rec.fetch_status),
    sqlString(ttl),
    sqlString(runId),
  ].join(",") + ")");
  return `insert into public.hotel_source_record (${cols.join(",")}) values\n${valueRows.join(",\n")};`;
}

function buildEnrichmentRunInsertSql(runId, counters) {
  return `insert into public.hotel_enrichment_run (id, source, triggered_by, scope, started_at, completed_at, hotels_seen, hotels_inserted, hotels_updated, fields_updated, errors_count, status, budget_max_requests, budget_used, notes)
values (
  ${sqlString(runId)},
  ${sqlString("booking_rapidapi")},
  ${sqlString("phase_c_smoke_pilot")},
  ${sqlString({ city: "Madrid", limit: TARGET_HOTELS, sort: "popularity" })},
  ${sqlString(NOW_ISO)},
  ${sqlString(new Date().toISOString())},
  ${counters.hotels_seen},
  ${counters.hotels_inserted},
  ${counters.hotels_updated},
  ${counters.fields_updated},
  ${counters.errors_count},
  ${sqlString("completed")},
  25000,
  ${counters.budget_used},
  ${sqlString("Phase C 50-hotel smoke pilot · Madrid · booking-com15")}
);`;
}

// ════════════════════════════════════════════════════════════════════════════
// Main
// ════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Phase C · Madrid 50-hotel smoke pilot");
  console.log(`  ${NOW_ISO} · run_id=${ENRICHMENT_RUN_ID}`);
  console.log("══════════════════════════════════════════════════════════════");
  await mkdir(OUT_DIR, { recursive: true });

  const log = [];
  const callMs = [];
  let totalCalls = 0;

  // ── E1 sweep — paginate class_descending until TARGET_HOTELS reached or 6 pages ──
  // class_descending surfaces 5★ → 4★ → 3★ branded hotels first; popularity
  // bias toward budget tier (verified in Phase C run 1: 65% quarantine rate).
  const allHits = [];
  const MAX_PAGES = 6;
  for (let page = 1; page <= MAX_PAGES; page++) {
    console.log(`\n→ E1 searchHotels Madrid (page ${page}, class_descending)`);
    const e1 = await callApi("E1", "/api/v1/hotels/searchHotels", {
      dest_id: MADRID_DEST_ID, search_type: "CITY", arrival_date: ARRIVAL, departure_date: DEPARTURE,
      adults: 2, children_age: "", room_qty: 1, page_number: page,
      sort_by: "class_descending",
      units: "metric", temperature_unit: "c", languagecode: "en-us", currency_code: "EUR",
    });
    totalCalls++;
    callMs.push(e1.ms);
    log.push({ step: `E1 page ${page}`, ok: e1.ok, ms: e1.ms, status: e1.status });
    if (!e1.ok) { console.error("E1 failed:", e1.error); break; }
    const pageHits = e1.data?.data?.hotels ?? [];
    console.log(`  ✓ ${pageHits.length} hits on page ${page}`);
    if (pageHits.length === 0) break;
    allHits.push(...pageHits);
    if (allHits.length >= TARGET_HOTELS * 2) break;  // Get enough headroom for E2 filtering
  }

  // Dedup by hotel_id (in case pagination overlaps)
  const seenIds = new Set();
  const uniqueHits = [];
  for (const h of allHits) {
    const id = h?.property?.id ?? h?.hotel_id;
    if (id && !seenIds.has(id)) { seenIds.add(id); uniqueHits.push(h); }
  }
  console.log(`\n  total unique E1 candidates: ${uniqueHits.length}`);

  // Take up to TARGET_HOTELS * 2 for E2 filtering headroom
  const candidates = uniqueHits.slice(0, Math.min(uniqueHits.length, TARGET_HOTELS * 2));
  console.log(`  → fetching E2 detail for ${candidates.length} candidates`);

  const canonicalRows = [];
  const sourceRecords = [];
  const quarantineLog = [];
  const errorLog = [];
  const counters = { hotels_seen: 0, hotels_inserted: 0, hotels_updated: 0, fields_updated: 0, errors_count: 0 };

  for (let i = 0; i < candidates.length; i++) {
    if (counters.hotels_inserted >= TARGET_HOTELS) break;
    const hit = candidates[i];
    const hotelId = hit?.property?.id ?? hit?.hotel_id;
    if (!hotelId) continue;
    counters.hotels_seen++;

    process.stdout.write(`  [${i + 1}/${candidates.length}] hotel_id=${hotelId} ... `);
    const e2 = await callApi(`E2[${i}]`, "/api/v1/hotels/getHotelDetails", {
      hotel_id: hotelId, arrival_date: ARRIVAL, departure_date: DEPARTURE,
      adults: 2, children_age: "", room_qty: 1,
      units: "metric", temperature_unit: "c", languagecode: "en-us", currency_code: "EUR",
    });
    totalCalls++;
    callMs.push(e2.ms);

    if (!e2.ok) {
      console.log(`✖ E2 failed (${e2.error?.class})`);
      errorLog.push({ hotel_id: hotelId, error: e2.error });
      counters.errors_count++;
      continue;
    }

    const detail = e2.data?.data;
    const parsed = parseE1AndE2(hit, detail);
    const canonical = buildCanonical(parsed);

    // Pre-enrich filter: skip Hostels / Apartments / excluded types
    if (canonical._bonus.hotel_type_excluded) {
      console.log(`⊘ excluded type: ${parsed.accommodationTypeName}`);
      quarantineLog.push({
        hotel_id: hotelId,
        name: parsed.name,
        reason: "excluded_accommodation_type",
        accommodation_type: parsed.accommodationTypeName,
      });
      continue;
    }

    // Critical-field validation (TIER-0)
    if (!parsed.bookingHotelId || !parsed.name || !parsed.countryCode || parsed.lat == null || parsed.lng == null) {
      console.log(`⊘ TIER-0 fail`);
      quarantineLog.push({
        hotel_id: hotelId,
        name: parsed.name,
        reason: "tier_0_incomplete",
        missing: Object.entries({
          bookingHotelId: parsed.bookingHotelId,
          name: parsed.name,
          countryCode: parsed.countryCode,
          lat: parsed.lat,
          lng: parsed.lng,
        }).filter(([_k, v]) => !v).map(([k]) => k),
      });
      continue;
    }

    // Compute quality_tier (basic — pure Booking, no fallback yet)
    const t0Filled = 8; // all critical present (we checked above)
    const t1Fields = [
      canonical.star_rating != null,
      canonical.review_score != null,
      canonical.review_count != null,
      canonical.booking_url != null,
      canonical._bonus.amenity_keys_determined >= 5,
      canonical.hotel_type != null,
      canonical.segment !== "unknown",
    ];
    const t1Pct = t1Fields.filter(Boolean).length / t1Fields.length;
    if (t1Pct >= 0.9) canonical.data_quality_tier = "bronze";
    if (t1Pct >= 0.7 && canonical.brand_family) canonical.data_quality_tier = "silver";

    // Compose source_confidence + field_provenance_summary inline
    canonical.source_confidence = {
      canonical_name: 0.85, address_line1: 0.85, city: 0.85, city_normalized: canonical._bonus.municipio_confidence,
      postal_code: 0.85, country_code: 0.95, neighborhood: 0.70,
      lat: 0.85, lng: 0.85,
      star_rating: canonical.star_rating != null ? 0.85 : 0,
      review_score: canonical.review_score != null ? 0.85 : 0,
      review_count: canonical.review_count != null ? 0.90 : 0,
      brand: canonical.brand != null ? 0.85 : 0,
      brand_family: canonical.brand_family != null ? 0.85 : 0,
      chain_scale: canonical.chain_scale !== "unknown" ? 0.85 : 0,
      hotel_type: canonical.hotel_type != null ? 0.70 : 0,
      segment: canonical._bonus.segment_confidence,
      booking_url: 1.00,
      hero_image_path: canonical.hero_image_path != null ? 0.85 : 0,
      booking_hotel_id: 1.00,
    };
    canonical.field_provenance_summary = {};
    for (const [field, conf] of Object.entries(canonical.source_confidence)) {
      if (conf > 0) canonical.field_provenance_summary[field] = { source: "booking_rapidapi", fetched_at: NOW_ISO, confidence: conf };
    }

    // Source record: hash of (E1 hit + E2 detail) for audit
    const payloadCombined = { e1Hit: hit, e2Detail: detail };
    const payloadHash = createHash("sha256").update(JSON.stringify(payloadCombined)).digest("hex");
    sourceRecords.push({
      source_id: String(hotelId),
      payload: payloadCombined,
      payload_hash: payloadHash,
      fetch_status: "ok",
    });

    canonicalRows.push(canonical);
    counters.hotels_inserted++;
    counters.fields_updated += Object.values(canonical.source_confidence).filter(c => c > 0).length;
    console.log(`✓ ${canonical.brand_family ? "[" + canonical.brand_family + "] " : ""}${canonical.canonical_name} (${canonical.data_quality_tier}, T1=${(t1Pct*100).toFixed(0)}%, amenities=${canonical._bonus.amenity_keys_determined}/14)`);
  }

  counters.budget_used = totalCalls;
  const avgMs = callMs.length ? (callMs.reduce((a, b) => a + b, 0) / callMs.length).toFixed(0) : 0;

  // ── Emit SQL ────────────────────────────────────────────────────────────
  const canonicalSql = buildCanonicalInsertSql(canonicalRows, ENRICHMENT_RUN_ID);
  const sourceSql = buildSourceRecordsInsertSql(sourceRecords, ENRICHMENT_RUN_ID);
  const runSql = buildEnrichmentRunInsertSql(ENRICHMENT_RUN_ID, counters);

  await writeFile(resolve(OUT_DIR, "canonical-inserts.sql"), canonicalSql + "\n", "utf-8");
  await writeFile(resolve(OUT_DIR, "source-records-inserts.sql"), sourceSql + "\n", "utf-8");
  await writeFile(resolve(OUT_DIR, "enrichment-run-insert.sql"), runSql + "\n", "utf-8");

  await writeFile(resolve(OUT_DIR, "canonical-rows.json"), JSON.stringify(canonicalRows, null, 2), "utf-8");
  await writeFile(resolve(OUT_DIR, "quarantine-log.json"), JSON.stringify(quarantineLog, null, 2), "utf-8");
  await writeFile(resolve(OUT_DIR, "error-log.json"), JSON.stringify(errorLog, null, 2), "utf-8");

  const summary = {
    run_id: ENRICHMENT_RUN_ID,
    started_at: NOW_ISO,
    completed_at: new Date().toISOString(),
    total_calls: totalCalls,
    avg_call_ms: Number(avgMs),
    candidates_fetched: candidates.length,
    hotels_inserted: counters.hotels_inserted,
    hotels_quarantined: quarantineLog.length,
    errors: errorLog.length,
    quality_tier_breakdown: canonicalRows.reduce((acc, r) => { acc[r.data_quality_tier] = (acc[r.data_quality_tier] || 0) + 1; return acc; }, {}),
    branded_count: canonicalRows.filter(r => r.brand_family).length,
    avg_amenity_keys_determined: canonicalRows.length
      ? (canonicalRows.reduce((s, r) => s + r._bonus.amenity_keys_determined, 0) / canonicalRows.length).toFixed(1)
      : 0,
    quarantine_reasons: quarantineLog.reduce((acc, q) => { acc[q.reason] = (acc[q.reason] || 0) + 1; return acc; }, {}),
  };
  await writeFile(resolve(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2), "utf-8");

  console.log("\n══════════════════════════════════════════════════════════════");
  console.log("  Phase C pilot · summary");
  console.log("══════════════════════════════════════════════════════════════");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\n  SQL ready in: ${OUT_DIR}`);
  console.log(`  Apply via Supabase MCP execute_sql.`);
}

main().catch(e => { console.error("✖", e); process.exit(1); });
