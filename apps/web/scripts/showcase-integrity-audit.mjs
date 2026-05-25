// Showcase 8×8 integrity audit harness · read-only.
//
// For each of 8 Madrid showcases verify integrity across 8 surfaces:
//   1. Executive Summary          (canonical-backed)
//   2. Asset Analysis             (canonical-backed)
//   3. Competitive Set            (canonical-backed)
//   4. Market Overview            (canonical-backed)
//   5. Financials (P&L)           (NOT canonical-coupled · gap)
//   6. Underwriting               (NOT canonical-coupled · gap)
//   7. Export PDF (print CSS)     (uses print:* classes on existing pages)
//   8. Library entry              (DB row from Supabase MCP context)
//
// Per cell verdict:
//   PASS    — section opens · shows correct hotel · matches canonical
//   WARNING — section opens but hotel context is ambiguous / decoupled
//   FAIL    — broken render · 404/500 · cross-section mismatch
//
// Uses `vercel curl` to bypass BotID. Run with:
//   cd apps/web && node scripts/showcase-integrity-audit.mjs

import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';

const SHOWCASES = [
  { id: '8f2edc75-4e8a-4056-a823-06c013c0e5f7', name: 'Eurostars Madrid Tower',          submarket: 'Madrid Surrounding',          chain: 'upscale',  tier: 'premium' },
  { id: 'dafc4073-ab60-43ec-91a0-ac1d7311232e', name: 'Mandarin Oriental Ritz, Madrid',  submarket: 'Retiro',                      chain: 'luxury',   tier: 'premium' },
  { id: 'fa20d9a6-94fa-4227-95f8-74f528e955e3', name: 'Four Seasons Hotel Madrid',       submarket: 'Madrid Centre',               chain: 'luxury',   tier: 'premium' },
  { id: 'af8e6ebf-2b47-4b7d-8c9d-b438e7acb676', name: 'Hotel Indigo Madrid - Gran Vía',  submarket: 'Madrid Centre',               chain: 'upper_upscale', tier: 'pro' },
  { id: '709f2211-42bc-48ec-b173-97c9b912fbd9', name: 'The Madrid EDITION',              submarket: 'Madrid Centre',               chain: 'luxury',   tier: 'premium' },
  { id: '50cf961b-734a-42ab-9801-af52f701e076', name: 'Petit Palace Plaza Mayor',        submarket: 'Madrid Centre',               chain: 'upscale',  tier: 'pro' },
  { id: '730f91ca-e1a7-4c77-8c4d-f62a2e4a0785', name: 'VP Plaza España Design',          submarket: 'Madrid Centre',               chain: 'upscale',  tier: 'free' },
  { id: 'bd9fd2f0-2b0e-4711-aa0f-6b8028c72b65', name: 'Meliá Madrid Barajas',            submarket: 'Barajas/Hortaleza/San Blas',  chain: 'upscale',  tier: 'free' },
];

const SECTIONS = [
  { key: 'exec',         label: 'Executive Summary', path: '/report/executive-summary',     canonicalParam: true  },
  { key: 'asset',        label: 'Asset Analysis',    path: '/report/asset-analysis',        canonicalParam: true  },
  { key: 'compset',      label: 'Competitive Set',   path: '/report/competitive-set',       canonicalParam: true  },
  { key: 'market',       label: 'Market Overview',   path: '/report/market-overview',       canonicalParam: true  },
  { key: 'financials',   label: 'Financials (P&L)',  path: '/report/financials/pl',         canonicalParam: false },
  { key: 'underwriting', label: 'Underwriting',      path: '/report/financials/underwriting', canonicalParam: false },
];

const DEPLOY = 'https://www.hotelvalora.com';

function stripHtml(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/g, ' ');
  h = h.replace(/<style[\s\S]*?<\/style>/g, ' ');
  h = h.replace(/<\/(td|tr|th|div|section|li|p|h\d)>/gi, ' ');
  h = h.replace(/<[^>]+>/g, ' ');
  h = h.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
  return h.replace(/\s+/g, ' ').trim();
}

function fetchPage(path, canonicalId, useCanonical) {
  // BotID requires `vercel curl` which uses the team session.
  // dash-only path bug · always append benign query.
  const url = useCanonical
    ? `${path}?canonical_id=${canonicalId}&_qa=1`
    : `${path}?_qa=1`;
  try {
    const out = execSync(`vercel curl "${url}" --deployment "${DEPLOY}"`, { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 20 * 1024 * 1024 });
    return out;
  } catch (e) {
    return '';
  }
}

function inspectExec(html, hotel) {
  const text = stripHtml(html);
  const nameMatch = text.includes(hotel.name) || text.includes(hotel.name.split(',')[0]);
  const submarketMatch = text.includes(hotel.submarket);
  const scenarioMatch = text.match(/Escenario\s+([^a-z]\S[^|]+?)(?:Hotel|$)/i);
  const scenario = scenarioMatch ? scenarioMatch[1].trim().slice(0, 80) : '?';
  const hasPrint = html.includes('print:') || html.includes('@media print');
  return { nameMatch, submarketMatch, scenario, hasPrint, size: html.length };
}

function inspectAsset(html, hotel) {
  const text = stripHtml(html);
  const nameMatch = text.includes(hotel.name) || text.includes(hotel.name.split(',')[0]);
  return { nameMatch, size: html.length };
}

function inspectCompset(html, hotel) {
  const text = stripHtml(html);
  const subjectMatch = text.includes(hotel.name) || text.includes(hotel.name.split(',')[0]);
  // Find the 4 peer names in HTML · they appear as h3/h4 tags or data-* attrs
  // We can't reliably extract peers from raw HTML · use size + subject presence
  return { subjectMatch, size: html.length };
}

function inspectMarket(html, hotel) {
  const text = stripHtml(html);
  const nameMatch = text.includes(hotel.name) || text.includes(hotel.name.split(',')[0]);
  const submarketMatch = text.includes(hotel.submarket);
  // Market Overview should mention "Madrid" and the submarket name
  const marketMatch = text.includes('Madrid');
  return { nameMatch, submarketMatch, marketMatch, size: html.length };
}

function inspectFinancials(html, hotel) {
  const text = stripHtml(html);
  // Financials page does NOT accept canonical_id · so it CANNOT show the
  // showcase hotel name. We verify it renders cleanly (no 404/500).
  const renders = html.includes('5-Year P&L Forecast') || html.includes('Underwriting');
  // Critical · does the page show ANY hotel name? Should be hard-coded
  // mock or empty.
  const showsCorrectHotel = text.includes(hotel.name) || text.includes(hotel.name.split(',')[0]);
  return { renders, showsCorrectHotel, size: html.length };
}

function verdict(checks) {
  // Aggregate · all required checks must be true for PASS
  if (Object.values(checks).every((v) => v === true || typeof v === 'string' || typeof v === 'number')) {
    // string/number = neutral metadata · only boolean=false counts as miss
    if (Object.entries(checks).filter(([, v]) => typeof v === 'boolean' && v === false).length === 0) return 'PASS';
  }
  return 'WARNING';
}

async function auditHotel(hotel, libraryRow) {
  console.error(`\n▶ ${hotel.name} · ${hotel.id}`);
  const results = {};
  for (const sec of SECTIONS) {
    const html = fetchPage(sec.path, hotel.id, sec.canonicalParam);
    if (html.length < 5000) {
      results[sec.key] = { verdict: 'FAIL', detail: `tiny response · ${html.length}b`, size: html.length };
      console.error(`  ${sec.label.padEnd(22)} FAIL · response ${html.length}b`);
      continue;
    }
    if (html.includes('could not be found') && !html.includes('Executive Summary')) {
      results[sec.key] = { verdict: 'FAIL', detail: '404 page', size: html.length };
      console.error(`  ${sec.label.padEnd(22)} FAIL · 404`);
      continue;
    }

    let detail;
    if (sec.key === 'exec') {
      const r = inspectExec(html, hotel);
      const issues = [];
      if (!r.nameMatch) issues.push('hotel name missing');
      if (!r.submarketMatch) issues.push(`submarket "${hotel.submarket}" missing`);
      detail = { ...r, issues };
      results[sec.key] = { verdict: issues.length === 0 ? 'PASS' : 'WARNING', detail, size: html.length };
    } else if (sec.key === 'asset') {
      const r = inspectAsset(html, hotel);
      const issues = [];
      if (!r.nameMatch) issues.push('hotel name missing');
      results[sec.key] = { verdict: issues.length === 0 ? 'PASS' : 'WARNING', detail: { ...r, issues }, size: html.length };
    } else if (sec.key === 'compset') {
      const r = inspectCompset(html, hotel);
      const issues = [];
      if (!r.subjectMatch) issues.push('subject hotel missing from compset');
      results[sec.key] = { verdict: issues.length === 0 ? 'PASS' : 'WARNING', detail: { ...r, issues }, size: html.length };
    } else if (sec.key === 'market') {
      const r = inspectMarket(html, hotel);
      const issues = [];
      if (!r.nameMatch) issues.push('subject hotel name missing');
      if (!r.submarketMatch) issues.push(`submarket "${hotel.submarket}" missing`);
      if (!r.marketMatch) issues.push('Madrid market not referenced');
      results[sec.key] = { verdict: issues.length === 0 ? 'PASS' : 'WARNING', detail: { ...r, issues }, size: html.length };
    } else if (sec.key === 'financials' || sec.key === 'underwriting') {
      const r = inspectFinancials(html, hotel);
      // Critical · these pages are NOT canonical-coupled. We report:
      //   - FAIL if the page does not render
      //   - WARNING if the page renders but shows a hotel name that
      //     contradicts the showcase (e.g. shows "Mandarin Ritz" while
      //     we asked for Four Seasons)
      //   - WARNING (architectural gap) if the page renders without any
      //     hotel context at all (current expected state)
      const issues = [];
      if (!r.renders) issues.push('page did not render the expected canvas');
      if (r.showsCorrectHotel) {
        // Unexpected · the page accepts canonical_id we did not realise
      } else {
        issues.push(`ARCHITECTURAL GAP · page does not propagate canonical_id (showcase hotel not referenced)`);
      }
      results[sec.key] = { verdict: r.renders ? 'WARNING' : 'FAIL', detail: { ...r, issues }, size: html.length };
    }
    console.error(`  ${sec.label.padEnd(22)} ${results[sec.key].verdict} · ${html.length}b`);
  }

  // Surface 7 · Export PDF · derived from existing pages' print CSS
  const printOK = (results.exec?.detail?.hasPrint ?? false);
  results.pdf = {
    verdict: printOK ? 'PASS' : 'WARNING',
    detail: { printCss: printOK, note: 'print canvas via print:* tailwind classes · no dedicated /pdf route' },
  };
  console.error(`  Export PDF             ${results.pdf.verdict} · print CSS ${printOK ? 'present' : 'absent'}`);

  // Surface 8 · Library entry · DB row
  const libIssues = [];
  if (!libraryRow) libIssues.push('missing library row');
  else {
    if (libraryRow.canonical_id !== hotel.id) libIssues.push(`canonical_id mismatch · row=${libraryRow.canonical_id}`);
    if (libraryRow.report_origin !== 'showcase') libIssues.push(`report_origin=${libraryRow.report_origin}, expected showcase`);
    if (libraryRow.tier_badge !== hotel.tier) libIssues.push(`tier_badge=${libraryRow.tier_badge}, expected ${hotel.tier}`);
    if (!libraryRow.report_url || !libraryRow.report_url.includes(hotel.id)) libIssues.push(`report_url not pointing to canonical: ${libraryRow.report_url}`);
  }
  results.library = { verdict: libIssues.length === 0 ? 'PASS' : 'FAIL', detail: { issues: libIssues, row: libraryRow ? { tier: libraryRow.tier_badge, promote: libraryRow.is_top_promote, priority: libraryRow.showcase_priority } : null } };
  console.error(`  Library entry          ${results.library.verdict}`);

  return results;
}

// === Main ===
const libraryRows = JSON.parse(await fs.readFile('/tmp/library-rows.json', 'utf-8'));
const libraryByCanonical = Object.fromEntries(libraryRows.map((r) => [r.canonical_id, r]));

const all = [];
for (const h of SHOWCASES) {
  const r = await auditHotel(h, libraryByCanonical[h.id]);
  all.push({ hotel: h.name, id: h.id, results: r });
}

// Print matrix
const SECTION_LABELS = [
  ['exec',        'Executive Summary'],
  ['asset',       'Asset Analysis'],
  ['compset',     'Competitive Set'],
  ['market',      'Market Overview'],
  ['financials',  'Financials (P&L)'],
  ['underwriting','Underwriting'],
  ['pdf',         'Export PDF'],
  ['library',     'Library entry'],
];

console.log('\n=============================================================================');
console.log('MATRIX · 8 showcases × 8 surfaces · PASS / WARNING / FAIL');
console.log('=============================================================================');
const HEADER = 'Hotel'.padEnd(40) + SECTION_LABELS.map(([_, l]) => l.slice(0, 11).padStart(12)).join('');
console.log(HEADER);
console.log('-'.repeat(HEADER.length));
for (const row of all) {
  const cells = SECTION_LABELS.map(([k]) => {
    const v = row.results[k]?.verdict ?? '?';
    const icon = v === 'PASS' ? '✅ PASS' : v === 'WARNING' ? '🟡 WARN' : v === 'FAIL' ? '❌ FAIL' : '? ----';
    return icon.padStart(12);
  });
  console.log(row.hotel.slice(0, 38).padEnd(40) + cells.join(''));
}

// Per-surface aggregate
console.log('\n--- Per-surface roll-up ---');
for (const [k, l] of SECTION_LABELS) {
  const counts = { PASS: 0, WARNING: 0, FAIL: 0 };
  for (const row of all) counts[row.results[k]?.verdict ?? 'FAIL']++;
  console.log(`${l.padEnd(22)} PASS:${counts.PASS}  WARN:${counts.WARNING}  FAIL:${counts.FAIL}`);
}

// Issues detail
console.log('\n--- Issues by hotel ---');
for (const row of all) {
  const issues = [];
  for (const [k, l] of SECTION_LABELS) {
    const r = row.results[k];
    if (!r) continue;
    const d = r.detail || {};
    if (d.issues && d.issues.length > 0) {
      for (const i of d.issues) issues.push(`${l}: ${i}`);
    }
  }
  if (issues.length > 0) {
    console.log(`\n${row.hotel}:`);
    for (const i of issues) console.log(`  · ${i}`);
  }
}

await fs.writeFile('/tmp/showcase-audit-results.json', JSON.stringify(all, null, 2));
console.log('\nFull JSON written to /tmp/showcase-audit-results.json');
