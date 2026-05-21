// Bulk-seed `hotel_report_library` by rendering /report/executive-summary
// for every canonical Madrid hotel. Each render fires the persistence
// upsert · this script just drives the URLs · the report page does the
// work.
//
// Concurrency 3 · respects Vercel function limits.

const BASE = process.env.BASE_URL ?? 'https://www.hotelvalora.com';

async function fetchAllCanonicalIds() {
  // Hardcoded canonical_ids of Madrid 224 corpus is impractical · instead
  // we read from Supabase via the public read RLS on hotel_canonical.
  // Use anon key from env or rely on production-only.
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supaKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !supaKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env');
    process.exit(1);
  }
  const res = await fetch(`${supaUrl}/rest/v1/hotel_canonical?select=id,canonical_name,chain_scale,total_rooms,year_opened&city_normalized=eq.Madrid&deleted_at=is.null&order=canonical_name.asc`, {
    headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` },
  });
  if (!res.ok) {
    console.error('supabase fetch failed', res.status);
    process.exit(1);
  }
  return res.json();
}

async function pingReport(canonicalId) {
  const url = `${BASE}/report/executive-summary?canonical_id=${canonicalId}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'HotelVALORA-LibrarySeed/1.0' } });
    return { id: canonicalId, status: res.status };
  } catch (e) {
    return { id: canonicalId, error: e.message };
  }
}

async function runWithConcurrency(items, limit, fn) {
  const results = [];
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      const r = await fn(items[idx]);
      results.push(r);
      process.stdout.write(`[${results.length}/${items.length}] ${r.status ?? r.error}\n`);
    }
  }
  const workers = Array.from({ length: limit }, () => worker());
  await Promise.all(workers);
  return results;
}

console.log(`Library seed · base ${BASE}`);
const hotels = await fetchAllCanonicalIds();
console.log(`Loaded ${hotels.length} Madrid canonical hotels.`);

// Only ping hotels that already have rooms + year (engine will produce a
// valuation). Hotels without rooms render but library entry is "partial".
// We can still seed them · let library reflect the corpus state.

const start = Date.now();
const results = await runWithConcurrency(hotels.map((h) => h.id), 3, pingReport);
const ms = Date.now() - start;
console.log(`\n${results.length} reports rendered in ${(ms / 1000).toFixed(1)}s`);
const ok = results.filter((r) => r.status === 200).length;
const bad = results.length - ok;
console.log(`HTTP 200: ${ok} · non-200/errors: ${bad}`);
