// Phase D-8 · LIMITED rollout · 2 hotels only (Hilton + Marriott AC Recoletos).
//
// Operator-authorised smoke test. Validate extraction reliability,
// field accuracy, runtime, false-positive rate, provenance trail.
//
// Hard rules (per phase-d8-hotel-website-design-v1):
//   - robots.txt CHECK FIRST · honour Disallow + Crawl-delay
//   - User-Agent identifies HotelVALORA + contact
//   - HEAD probe before GET
//   - 4-8s randomised delay per domain
//   - HEAD-only for discovery · GET ONLY for the institutional landing
//   - Targets: total_rooms · year_opened
//   - NO destructive operations · NO storage of HTML bodies · only
//     extracted field values + URL + extraction method confidence
//
// Output:
//   fixtures/phase-d8/limited-results.json
//   fixtures/phase-d8/limited-update.sql

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures/phase-d8");
fs.mkdirSync(FIXTURES_DIR, { recursive: true });

const USER_AGENT =
  "HotelVALORA/1.0 (+https://hotelvalora.com; bot=HotelVALORA-Bot; contact=miguel.sambricio@metcub.com)";

const HOTELS = [
  {
    canonical_id: "370c1972-aa94-4841-b90b-10b773b0df18",
    name: "Hilton Madrid Airport",
    domain: "www.hilton.com",
    url: "https://www.hilton.com/en/hotels/madaphi-hilton-madrid-airport/",
  },
  {
    canonical_id: "eafb935d-a6eb-44d3-b2b8-11feff59a23e",
    name: "Madrid Marriott Auditorium Hotel & Conference Center",
    domain: "www.marriott.com",
    url: "https://www.marriott.com/en-us/hotels/madad-madrid-marriott-auditorium-hotel-and-conference-center/overview/",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jitterDelay = () => 4000 + Math.floor(Math.random() * 4000);

async function fetchRobots(domain) {
  const url = `https://${domain}/robots.txt`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/plain" },
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return { ok: false, status: res.status, allowed: true };
    const body = await res.text();
    // Very simple: parse the User-agent: * block · check Disallow lines
    const blocks = body.split(/\r?\n\r?\n/);
    let starBlock = blocks.find((b) => /^User-agent:\s*\*/im.test(b)) ?? "";
    const disallows = Array.from(starBlock.matchAll(/Disallow:\s*([^\s#]*)/gi)).map((m) => m[1]);
    const crawlDelayMatch = starBlock.match(/Crawl-delay:\s*(\d+)/i);
    const crawlDelay = crawlDelayMatch ? parseInt(crawlDelayMatch[1], 10) : 0;
    return { ok: true, disallows, crawlDelay };
  } catch (e) {
    return { ok: false, error: e.message, allowed: true };
  }
}

function isAllowed(robots, urlPath) {
  if (!robots.ok || !robots.disallows) return true;
  for (const d of robots.disallows) {
    if (!d) continue;
    if (urlPath.startsWith(d)) return false;
  }
  return true;
}

async function headProbe(url) {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15_000),
      redirect: "follow",
    });
    return { ok: res.ok, status: res.status, finalUrl: res.url, contentType: res.headers.get("content-type") };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function getPage(url) {
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,es;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Cache-Control": "no-cache",
      },
      signal: AbortSignal.timeout(60_000),
      redirect: "follow",
    });
    if (!res.ok) return { ok: false, status: res.status };
    const body = await res.text();
    return { ok: true, status: res.status, html: body, finalUrl: res.url };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

function extractJsonLd(html) {
  // Match all <script type="application/ld+json"> blocks
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1].trim());
      if (Array.isArray(parsed)) out.push(...parsed);
      else if (parsed["@graph"]) out.push(...(parsed["@graph"] || []));
      else out.push(parsed);
    } catch (_e) {
      // skip malformed blocks
    }
  }
  return out;
}

function extractFromJsonLd(blocks) {
  const out = { total_rooms: null, year_opened: null, extraction_method: null };
  for (const b of blocks) {
    if (!b || typeof b !== "object") continue;
    const type = b["@type"];
    const types = Array.isArray(type) ? type : [type];
    if (!types.some((t) => /hotel|lodgingbusiness/i.test(t || ""))) continue;
    // numberOfRooms (singular OR object with value)
    const nor = b.numberOfRooms ?? b.numberOfBeds;
    if (nor && out.total_rooms === null) {
      if (typeof nor === "number") out.total_rooms = nor;
      else if (typeof nor === "string" && /^\d+$/.test(nor)) out.total_rooms = parseInt(nor, 10);
      else if (typeof nor === "object" && nor.value) out.total_rooms = Number(nor.value);
      if (out.total_rooms) out.extraction_method = "json_ld";
    }
    // dateCreated / foundingDate as approximations for year_opened
    const dc = b.dateCreated ?? b.foundingDate;
    if (dc && out.year_opened === null) {
      const ym = String(dc).match(/(\d{4})/);
      if (ym) {
        out.year_opened = parseInt(ym[1], 10);
        out.extraction_method = out.extraction_method ?? "json_ld";
      }
    }
  }
  return out;
}

function extractFromRegex(html) {
  const out = { total_rooms: null, year_opened: null, extraction_method: null };
  // Common patterns for room count
  const roomPatterns = [
    /\b(\d{2,4})\s+(?:guest\s+rooms|guestrooms|rooms\s+and\s+suites|rooms)\b/i,
    /\b(\d{2,4})\s+habitaciones\b/i,
    /"numberOfRooms"\s*:\s*(\d+)/i,
    /"totalRooms"\s*:\s*(\d+)/i,
  ];
  for (const re of roomPatterns) {
    const m = html.match(re);
    if (m) {
      const n = parseInt(m[1], 10);
      if (n >= 10 && n <= 5000) {
        out.total_rooms = n;
        out.extraction_method = "regex_html";
        break;
      }
    }
  }
  // Year opened / built / renovated
  const yearPatterns = [
    /\b(?:opened|inaugurat[a-z]+|completed|built|established|fundad[a-z]+|inauguración(?:\s+(?:en|del?))?)\s+(?:in\s+)?(\d{4})\b/i,
    /\b(?:año|year)\s+(?:de\s+)?(?:apertura|opening|inauguraci[oó]n)\s*:?\s*(\d{4})\b/i,
  ];
  for (const re of yearPatterns) {
    const m = html.match(re);
    if (m) {
      const y = parseInt(m[1], 10);
      if (y >= 1700 && y <= new Date().getFullYear()) {
        out.year_opened = y;
        out.extraction_method = out.extraction_method ?? "regex_html";
        break;
      }
    }
  }
  return out;
}

async function processHotel(hotel) {
  const result = {
    canonical_id: hotel.canonical_id,
    name: hotel.name,
    domain: hotel.domain,
    url: hotel.url,
    started_at: new Date().toISOString(),
    robots: null,
    head: null,
    extraction: null,
    error: null,
    elapsed_ms: null,
  };
  const t0 = Date.now();
  try {
    // 1. robots.txt
    result.robots = await fetchRobots(hotel.domain);
    const urlPath = new URL(hotel.url).pathname;
    if (!isAllowed(result.robots, urlPath)) {
      result.error = `robots.txt disallows path ${urlPath}`;
      return result;
    }
    // 2. random delay above crawl-delay
    await sleep(Math.max((result.robots.crawlDelay || 0) * 1000, jitterDelay()));
    // 3. HEAD probe
    result.head = await headProbe(hotel.url);
    if (!result.head.ok) {
      result.error = `HEAD failed: ${result.head.status ?? result.head.error}`;
      return result;
    }
    // 4. Content-type guard
    if (!/text\/html/i.test(result.head.contentType ?? "")) {
      result.error = `non-html content-type: ${result.head.contentType}`;
      return result;
    }
    // 5. GET (single page, no crawling)
    const page = await getPage(result.head.finalUrl ?? hotel.url);
    if (!page.ok) {
      result.error = `GET failed: ${page.status ?? page.error}`;
      return result;
    }
    // 6. Extract
    const ldBlocks = extractJsonLd(page.html);
    const fromLd = extractFromJsonLd(ldBlocks);
    const fromRegex = extractFromRegex(page.html);
    result.extraction = {
      ld_blocks: ldBlocks.length,
      total_rooms: fromLd.total_rooms ?? fromRegex.total_rooms,
      year_opened: fromLd.year_opened ?? fromRegex.year_opened,
      method_rooms: fromLd.total_rooms ? "json_ld" : fromRegex.total_rooms ? "regex_html" : null,
      method_year: fromLd.year_opened ? "json_ld" : fromRegex.year_opened ? "regex_html" : null,
      html_bytes: page.html.length,
    };
  } catch (e) {
    result.error = e.message;
  } finally {
    result.elapsed_ms = Date.now() - t0;
  }
  return result;
}

async function main() {
  console.log(`[D-8 limited] ${HOTELS.length} hotels · user-agent ${USER_AGENT}`);
  const results = [];
  for (const h of HOTELS) {
    console.log(`\n[D-8] -> ${h.name} (${h.domain})`);
    const r = await processHotel(h);
    console.log(
      `  robots_ok=${r.robots?.ok} ` +
      `head_status=${r.head?.status ?? "n/a"} ` +
      `ld=${r.extraction?.ld_blocks ?? "n/a"} ` +
      `rooms=${r.extraction?.total_rooms ?? "n/a"} (${r.extraction?.method_rooms ?? "-"}) ` +
      `year=${r.extraction?.year_opened ?? "n/a"} (${r.extraction?.method_year ?? "-"}) ` +
      `t=${r.elapsed_ms}ms ` +
      `err=${r.error ?? "-"}`,
    );
    results.push(r);
    // Pause between hotels to avoid hammering any single host
    if (HOTELS.indexOf(h) < HOTELS.length - 1) await sleep(jitterDelay());
  }

  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const resultsPath = path.join(FIXTURES_DIR, `limited-results-${ts}.json`);
  fs.writeFileSync(resultsPath, JSON.stringify(results, null, 2));
  console.log(`\n[D-8] results -> ${resultsPath}`);

  // SQL update for canonical
  const updates = results
    .filter((r) => r.extraction && (r.extraction.total_rooms != null || r.extraction.year_opened != null))
    .map((r) => {
      const rooms = r.extraction.total_rooms ?? null;
      const year = r.extraction.year_opened ?? null;
      const sourceUrl = r.head?.finalUrl ?? r.url;
      const conf =
        (r.extraction.method_rooms === "json_ld" ? 0.90 : 0.75);
      return `-- ${r.name}
update public.hotel_canonical
set
  total_rooms = coalesce(total_rooms, ${rooms ?? "null"}),
  year_opened = coalesce(year_opened, ${year ?? "null"}),
  source_confidence = source_confidence || jsonb_strip_nulls(jsonb_build_object(
    'total_rooms_d8', ${rooms != null ? conf.toFixed(2) : "null"},
    'year_opened_d8', ${year != null ? (conf - 0.05).toFixed(2) : "null"},
    'd8_source_url', ${JSON.stringify(sourceUrl)},
    'd8_method_rooms', ${JSON.stringify(r.extraction.method_rooms)},
    'd8_method_year', ${JSON.stringify(r.extraction.method_year)},
    'd8_scraped_at', ${JSON.stringify(r.started_at)}
  )),
  updated_at = now()
where id = '${r.canonical_id}';`;
    })
    .join("\n\n");
  if (updates) {
    const sqlPath = path.join(FIXTURES_DIR, `limited-update-${ts}.sql`);
    fs.writeFileSync(sqlPath, updates);
    console.log(`[D-8] sql -> ${sqlPath}`);
  } else {
    console.log("[D-8] no extractions persisted (every result null)");
  }
}

main().catch((e) => {
  console.error("[D-8] fatal:", e);
  process.exit(1);
});
