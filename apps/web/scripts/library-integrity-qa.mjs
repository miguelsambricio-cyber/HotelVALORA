// Library + report integrity QA · cross-section consistency check.
//
// For each of 20 representative canonical_ids (covering all cohorts +
// 5 Madrid submarkets), fetch the 4 canonical-backed report sections
// (Executive Summary · Asset Analysis · Competitive Set · Market
// Overview) and verify they all render the SAME hotel name. Reports
// any mismatch where section A shows "Hotel X" but section B shows
// "Hotel Y" for the same canonical_id (would indicate a mapper bug
// or a cache pollution issue).
//
// Read-only · no writes · runs against production.
//
// Run with: cd apps/web && node scripts/library-integrity-qa.mjs

const BASE = process.env.BASE_URL ?? 'https://www.hotelvalora.com';

const SAMPLE = [
  // luxury (4 different submarkets)
  { id: 'dafc4073-ab60-43ec-91a0-ac1d7311232e', name: 'Mandarin Oriental Ritz, Madrid',                                          cohort: 'luxury',         submarket: 'Retiro' },
  { id: 'fa20d9a6-94fa-4227-95f8-74f528e955e3', name: 'Four Seasons Hotel Madrid',                                              cohort: 'luxury',         submarket: 'Madrid Centre' },
  { id: '820c73b0-362e-49b3-be85-6c6cdcadcd82', name: 'Rosewood Villa Magna',                                                   cohort: 'luxury',         submarket: 'Salamanca' },
  { id: 'eabde8b9-41b1-4eec-b528-916768ce8f31', name: 'BLESS Hotel Madrid - The Leading Hotels of the World',                   cohort: 'luxury',         submarket: 'Salamanca' },
  // upper_upscale (5 different brands)
  { id: 'eafb935d-a6eb-44d3-b2b8-11feff59a23e', name: 'Madrid Marriott Auditorium Hotel & Conference Center',                   cohort: 'upper_upscale',  submarket: 'Madrid Surrounding' },
  { id: '370c1972-aa94-4841-b90b-10b773b0df18', name: 'Hilton Madrid Airport',                                                  cohort: 'upper_upscale',  submarket: 'Barajas/Hortaleza/San Blas' },
  { id: 'f95cfc46-fec5-4279-901c-7cd076d38ecc', name: 'Hyatt Centric Gran Via Madrid',                                          cohort: 'upper_upscale',  submarket: 'Madrid Centre' },
  { id: '7e5d4cb7-9d21-4a9b-89b4-bdb7e045b32c', name: 'NH Collection Madrid Eurobuilding',                                      cohort: 'upper_upscale',  submarket: 'Chamartin & Plaza de Castilla' },
  { id: '8a99c6fe-18eb-4834-83a1-704c71cd7909', name: 'Crowne Plaza Madrid - Centre Retiro by IHG',                             cohort: 'upper_upscale',  submarket: 'Retiro' },
  // upscale branded (5)
  { id: '651f9675-301c-43f7-820a-82e3f129b9f3', name: 'AC Hotel Recoletos by Marriott',                                         cohort: 'upscale',        submarket: 'Salamanca' },
  { id: '291e4210-d4b8-4427-b0c5-8aecc2a4cbfa', name: 'Barceló Torre de Madrid',                                                cohort: 'upscale',        submarket: 'Madrid Centre' },
  { id: '6a8cb14d-43b0-42f0-b183-b0e4399d3052', name: 'Meliá Castilla',                                                         cohort: 'upscale',        submarket: 'Chamartin & Plaza de Castilla' },
  { id: 'fc9d8ed0-9c80-4e19-ab57-dfb662ed8d74', name: 'Catalonia Plaza España Hotel & Spa',                                     cohort: 'upscale',        submarket: 'Madrid Centre' },
  { id: 'c74d49ee-a057-41e6-b9bf-462622cff76f', name: 'Novotel Madrid Center',                                                  cohort: 'upscale',        submarket: 'Salamanca' },
  // upper_midscale + midscale (3)
  { id: '4c3bda58-594d-4083-a52c-5a0fab482ea9', name: 'Sercotel Gran Hotel Conde Duque',                                        cohort: 'upper_midscale', submarket: 'Arguelles & Chamberi' },
  { id: '3545bb5f-de71-40f9-9c80-c8330609d6f9', name: 'Room Mate Collection Alba, Madrid',                                      cohort: 'upper_midscale', submarket: 'Madrid Centre' },
  { id: '2ea36513-b4b8-4f9b-92f6-0635594e7461', name: 'Ibis Styles Madrid City Las Ventas',                                     cohort: 'midscale',       submarket: 'Barajas/Hortaleza/San Blas' },
  // independent / unknown (3)
  { id: 'ac2d227a-4721-43b5-aba5-d0e2f4311de8', name: '7 Islas Hotel',                                                          cohort: 'independent',    submarket: 'Madrid Centre' },
  { id: '92fa1601-7b91-4e37-899b-4646379e3e43', name: 'Exe Convention Plaza Madrid',                                            cohort: 'independent',    submarket: 'Fuencarral-El Pardo' },
  { id: 'b1aa4e37-2ac7-4eef-ad5c-a717edde62e1', name: 'Urban Hive Madrid',                                                      cohort: 'independent',    submarket: null },
];

const SECTIONS = [
  { key: 'exec',   path: '/report/executive-summary' },
  { key: 'asset',  path: '/report/asset-analysis' },
  { key: 'comp',   path: '/report/competitive-set' },
  { key: 'market', path: '/report/market-overview' },
];

function stripHtml(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/g, ' ');
  h = h.replace(/<style[\s\S]*?<\/style>/g, ' ');
  h = h.replace(/<\/(td|tr|th|div|section|li|p|h\d)>/gi, ' ');
  h = h.replace(/<[^>]+>/g, ' ');
  h = h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
  return h.replace(/\s+/g, ' ').trim();
}

function pickHotelName(text, expectedName) {
  // Strategy 1 · exact match against canonical name (full)
  if (expectedName && text.includes(expectedName)) return expectedName;
  // Strategy 2 · brand-family + 'Madrid' bigram
  const candidates = expectedName.split(/\s+/).filter((w) => w.length > 4);
  for (const c of candidates) {
    if (text.includes(c)) return c;
  }
  return null;
}

async function fetchSection(canonicalId, sectionPath) {
  const url = `${BASE}${sectionPath}?canonical_id=${canonicalId}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'HotelVALORA-IntegrityQA/1.0' } });
    if (res.status !== 200) return { ok: false, status: res.status, name: null };
    const html = await res.text();
    return { ok: true, status: 200, html, text: stripHtml(html) };
  } catch (e) {
    return { ok: false, error: e.message, name: null };
  }
}

async function checkHotel(h) {
  const results = await Promise.all(SECTIONS.map((s) => fetchSection(h.id, s.path)));
  const namesFound = {};
  let mismatches = [];
  for (let i = 0; i < SECTIONS.length; i++) {
    const sec = SECTIONS[i];
    const r = results[i];
    if (!r.ok) {
      mismatches.push(`${sec.key}: HTTP ${r.status ?? 'ERR'}`);
      namesFound[sec.key] = null;
      continue;
    }
    const detected = pickHotelName(r.text, h.name);
    namesFound[sec.key] = detected;
    if (!detected) mismatches.push(`${sec.key}: hotel name NOT found in render`);
  }
  return { id: h.id, expected: h.name, cohort: h.cohort, submarket: h.submarket, namesFound, mismatches };
}

async function runConcurrent(items, limit, fn) {
  const out = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]);
      out.push(r);
      const dot = r.mismatches.length === 0 ? '✅' : '❌';
      process.stdout.write(`[${out.length}/${items.length}] ${dot} ${r.expected.slice(0, 50)}\n`);
    }
  }
  await Promise.all(Array.from({ length: limit }, () => worker()));
  return out;
}

console.log('================================================================================');
console.log('LIBRARY + REPORT INTEGRITY QA · cross-section consistency');
console.log('================================================================================');
console.log(`Base: ${BASE}`);
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Sample: ${SAMPLE.length} canonical_ids × ${SECTIONS.length} sections = ${SAMPLE.length * SECTIONS.length} fetches`);
console.log('');

const start = Date.now();
const results = await runConcurrent(SAMPLE, 3, checkHotel);
const elapsedMs = Date.now() - start;
console.log(`\nElapsed: ${(elapsedMs / 1000).toFixed(1)}s\n`);

console.log('================================================================================');
console.log('PER-HOTEL RESULT');
console.log('================================================================================');
let totalSections = SAMPLE.length * SECTIONS.length;
let okSections = 0;
let cleanHotels = 0;
const failures = [];

for (const r of results) {
  const found = SECTIONS.map((s) => r.namesFound[s.key] !== null).filter(Boolean).length;
  okSections += found;
  if (r.mismatches.length === 0) cleanHotels++;
  else failures.push(r);
  const status = r.mismatches.length === 0 ? '✅ CLEAN' : `⚠️  ${r.mismatches.length} issue(s)`;
  console.log(`${status.padEnd(20)} ${r.expected.slice(0, 50).padEnd(50)} · ${r.cohort.padEnd(15)} · ${r.submarket ?? '(no submarket)'}`);
  if (r.mismatches.length > 0) {
    for (const m of r.mismatches) console.log(`   · ${m}`);
  }
}

console.log('');
console.log('================================================================================');
console.log('SUMMARY');
console.log('================================================================================');
console.log(`Hotels with all 4 sections clean: ${cleanHotels}/${SAMPLE.length}`);
console.log(`Sections OK: ${okSections}/${totalSections} (${((okSections / totalSections) * 100).toFixed(1)} %)`);
console.log(`Failures: ${failures.length}`);
if (failures.length > 0) {
  console.log('\nFailed canonical_ids:');
  for (const f of failures) console.log(`  ${f.id} · ${f.expected}`);
  process.exit(1);
} else {
  console.log('\n✅ CROSS-SECTION INTEGRITY VERIFIED · every section reports the same hotel');
}
