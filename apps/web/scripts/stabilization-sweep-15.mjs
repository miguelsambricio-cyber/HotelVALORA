// Stabilization sweep · 15 hotels cross-segment · production live render
//
// Fetches Executive Summary from production for a diverse sample of 15
// canonical hotels covering luxury / upper_upscale / upscale-branded /
// upper_midscale / midscale / independent. Extracts valuation block
// values, detects outliers, and reports a punch list.

const HOTELS = [
  { id: 'eabde8b9-41b1-4eec-b528-916768ce8f31', name: 'BLESS Hotel Madrid',                 cohort: 'luxury',          submarket: 'Salamanca' },
  { id: 'fa20d9a6-94fa-4227-95f8-74f528e955e3', name: 'Four Seasons Hotel Madrid',          cohort: 'luxury',          submarket: 'Centro' },
  { id: '89640384-6f55-4e72-84fe-3e6f06ad3973', name: 'Hotel Fénix · Gran Meliá',           cohort: 'luxury',          submarket: 'Salamanca' },
  { id: '8a99c6fe-18eb-4834-83a1-704c71cd7909', name: 'Crowne Plaza Madrid Centre Retiro',  cohort: 'upper_upscale',   submarket: 'Retiro' },
  { id: '737f2c2f-0ac1-4e71-9761-a45ce20b7d74', name: 'Madrid Marriott Princesa Plaza',     cohort: 'upper_upscale',   submarket: 'Centro' },
  { id: 'fe0dba16-de54-4313-83ef-3422298c8bf4', name: 'NH Collection Paseo del Prado',      cohort: 'upper_upscale',   submarket: 'Centro' },
  { id: 'fc9d8ed0-9c80-4e19-ab57-dfb662ed8d74', name: 'Catalonia Plaza España',             cohort: 'upscale_branded', submarket: 'Centro' },
  { id: '550c9ba0-48de-471f-975a-b3b030ffa4e2', name: 'DoubleTree Hilton Madrid-Prado',     cohort: 'upscale_branded', submarket: 'Centro' },
  { id: 'c74d49ee-a057-41e6-b9bf-462622cff76f', name: 'Novotel Madrid Center',              cohort: 'upscale_branded', submarket: 'Salamanca-MISMATCH' },
  { id: '3545bb5f-de71-40f9-9c80-c8330609d6f9', name: 'Room Mate Alba',                     cohort: 'upper_midscale',  submarket: 'Centro' },
  { id: '4c3bda58-594d-4083-a52c-5a0fab482ea9', name: 'Sercotel Gran Hotel Conde Duque',    cohort: 'upper_midscale',  submarket: 'Chamberi' },
  { id: '2ea36513-b4b8-4f9b-92f6-0635594e7461', name: 'Ibis Styles Las Ventas',             cohort: 'midscale',        submarket: 'Ciudad Lineal' },
  { id: '4a2eb71e-f2b2-4d90-9ceb-10f5281d0717', name: 'Aspasios Atocha Apartments',         cohort: 'independent',     submarket: 'Centro' },
  { id: '92fa1601-7b91-4e37-899b-4646379e3e43', name: 'Exe Convention Plaza',               cohort: 'independent',     submarket: 'Fuencarral' },
  { id: 'b1aa4e37-2ac7-4eef-ad5c-a717edde62e1', name: 'Urban Hive Madrid',                  cohort: 'independent',     submarket: 'NULL-MISSING' },
];

const BASE = 'https://www.hotelvalora.com';

const LABELS = ['Gross Operating Profit', 'EBITDA after replacement', 'Cap. Rate', 'Exit Year', 'Escenario', 'Hotel Market Valuation', 'Hotel Valor estimado', 'Hotel por habitación', 'Hotel por m²'];

function stripHtml(html) {
  let h = html.replace(/<script[\s\S]*?<\/script>/g, '');
  h = h.replace(/<style[\s\S]*?<\/style>/g, '');
  h = h.replace(/<\/(td|tr|th|div|section|li|p|h\d)>/gi, ' ');
  h = h.replace(/<br\s*\/?>/gi, ' ');
  h = h.replace(/<[^>]+>/g, ' ');
  h = h.replace(/&nbsp;/g, ' ').replace(/&euro;/g, '€').replace(/&#8364;/g, '€').replace(/&amp;/g, '&').replace(/&#x27;/g, "'");
  return h.replace(/\s+/g, ' ').trim();
}

function extract(text) {
  const rows = {};
  for (const label of LABELS) {
    const idx = text.indexOf(label);
    if (idx === -1) { rows[label] = null; continue; }
    const tail = text.slice(idx + label.length);
    const rangeMatch = tail.match(/^\s*(\d[\d.,]*\s*M€\s*[—-]\s*\d[\d.,]*\s*M€)/);
    if (rangeMatch) { rows[label] = rangeMatch[1]; continue; }
    const numMatch = tail.match(/^\s*(\d[\d.,]*\s*(?:%|M€|k€|€))/);
    if (numMatch) { rows[label] = numMatch[1]; continue; }
    const nextLabelIdx = LABELS.map((l) => tail.indexOf(l)).filter((i) => i > 0).reduce((a, b) => Math.min(a, b), 1000);
    rows[label] = tail.slice(0, Math.min(nextLabelIdx, 120)).trim();
  }
  return rows;
}

function fmtParseM(s) {
  if (!s) return NaN;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*M€/);
  if (!m) return NaN;
  return parseFloat(m[1].replace(',', '.'));
}
function fmtParsePct(s) {
  if (!s) return NaN;
  const m = s.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!m) return NaN;
  return parseFloat(m[1].replace(',', '.'));
}

console.log('===========================================================================');
console.log('STABILIZATION SWEEP · 15 hotels · cross-segment · production live');
console.log('===========================================================================');
console.log(`Date: ${new Date().toISOString()}`);
console.log(`Base: ${BASE}`);
console.log('');

const summary = [];
const issues = [];

for (const h of HOTELS) {
  const url = `${BASE}/report/executive-summary?canonical_id=${h.id}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'HotelVALORA-QA/1.0' } });
    if (res.status !== 200) {
      issues.push({ hotel: h.name, severity: 'error', msg: `HTTP ${res.status}` });
      summary.push({ ...h, status: res.status, cap: NaN, val: NaN, scenario: '?', heuristic: false });
      continue;
    }
    const html = await res.text();
    const rows = extract(stripHtml(html));
    const cap = fmtParsePct(rows['Cap. Rate']);
    const val = fmtParseM(rows['Hotel Valor estimado']);
    const sqm = rows['Hotel por m²'] ?? '?';
    const scenario = rows['Escenario'] ?? '?';
    const heuristic = scenario.includes('heurístico');
    // Sanity checks
    if (Number.isNaN(cap) || cap < 4 || cap > 9) issues.push({ hotel: h.name, severity: 'warn', msg: `cap-rate out of band: ${rows['Cap. Rate']}` });
    if (Number.isNaN(val) || val < 5 || val > 200) issues.push({ hotel: h.name, severity: 'warn', msg: `valuation absurd: ${rows['Hotel Valor estimado']}` });
    if (!scenario.includes('CoStar submarket') && !scenario.includes('baseline')) issues.push({ hotel: h.name, severity: 'info', msg: `scenario unexpected: "${scenario.slice(0, 80)}"` });
    if (rows['Hotel por m²']?.startsWith('0 €')) issues.push({ hotel: h.name, severity: 'error', msg: `0 €/m²` });

    summary.push({ ...h, status: 200, cap, val, scenario: scenario.replace('Engine · base · ', ''), heuristic, sqm: rows['Hotel por m²'] ?? '?', gop: rows['Gross Operating Profit'] ?? '?' });
  } catch (e) {
    issues.push({ hotel: h.name, severity: 'error', msg: `fetch failed: ${e.message}` });
  }
}

// Print summary table
console.log('cohort           hotel                                cap%   val(M€)  €/sqm     scenario');
console.log('---------------- ------------------------------------ ------ -------- --------- -----------------------------------');
for (const s of summary) {
  const cohort = (s.cohort ?? '?').padEnd(16);
  const name = (s.name ?? '?').slice(0, 36).padEnd(36);
  const cap = (Number.isNaN(s.cap) ? '?' : s.cap.toFixed(2)).padStart(6);
  const val = (Number.isNaN(s.val) ? '?' : s.val.toFixed(1)).padStart(8);
  const sqm = (s.sqm ?? '?').padStart(9);
  const sc = (s.scenario ?? '?').slice(0, 60);
  console.log(`${cohort} ${name} ${cap} ${val} ${sqm} ${sc}`);
}

// Print issues
console.log('');
console.log('===========================================================================');
console.log(`ISSUES · ${issues.length}`);
console.log('===========================================================================');
for (const i of issues) {
  console.log(`[${i.severity}] ${i.hotel}: ${i.msg}`);
}

// Cohort coherence check
console.log('');
console.log('===========================================================================');
console.log('COHORT COHERENCE');
console.log('===========================================================================');
const grouped = {};
for (const s of summary) {
  if (!grouped[s.cohort]) grouped[s.cohort] = [];
  grouped[s.cohort].push(s);
}
for (const [cohort, items] of Object.entries(grouped)) {
  const caps = items.map(i => i.cap).filter(c => !Number.isNaN(c));
  const vals = items.map(i => i.val).filter(v => !Number.isNaN(v));
  if (caps.length === 0) { console.log(`${cohort}: no data`); continue; }
  const capMin = Math.min(...caps), capMax = Math.max(...caps);
  const valMin = Math.min(...vals), valMax = Math.max(...vals);
  const heuristicCount = items.filter(i => i.heuristic).length;
  console.log(`${cohort.padEnd(18)} n=${items.length}  cap=[${capMin.toFixed(2)}–${capMax.toFixed(2)}]  val=[${valMin.toFixed(1)}–${valMax.toFixed(1)}M€]  heurístico: ${heuristicCount}/${items.length}`);
}
