// Wikidata SPARQL backfill · total_rooms + year_opened
//
// Re-sweeps Wikidata against the 67 Madrid canonical hotels that already
// have a `wikidata_qid` populated. Queries P1106 (max capacity / rooms),
// P571 (inception), P1619 (date of official opening).
//
// Emits UPDATE statements + provenance INSERTs as a single SQL transcript
// that can be applied via the Supabase MCP `execute_sql` or
// `apply_migration` tool.
//
// Honors Wikidata's 1 req/s polite rate · single batched VALUES query so
// effectively 1 request total · institutional user agent.
//
// Run with:
//   cd apps/web && node scripts/wikidata-sparql-backfill.mjs

const QIDS = [
  { id: 'fa20d9a6-94fa-4227-95f8-74f528e955e3', qid: 'Q111516030', name: 'Four Seasons Hotel Madrid' },
  { id: '89640384-6f55-4e72-84fe-3e6f06ad3973', qid: 'Q26702361',  name: 'Hotel Fénix · Gran Meliá' },
  { id: '778a45ea-89f4-4201-a6da-1770a10ba6f8', qid: 'Q111516036', name: 'Palacio de los Duques · Gran Meliá' },
  { id: '820c73b0-362e-49b3-be85-6c6cdcadcd82', qid: 'Q111389156', name: 'Rosewood Villa Magna' },
  { id: '225eabb9-4695-466d-b382-f1ffd841bb2d', qid: 'Q112011737', name: 'Atocha Hotel Madrid · Tapestry by Hilton' },
  { id: '0304bd68-d59c-4410-8417-8860763b4a94', qid: 'Q111388638', name: 'Axel Hotel Madrid' },
  { id: '2adc938d-afcb-4463-83d7-4693bb9c35f7', qid: 'Q112011952', name: 'Canopy by Hilton Madrid Castellana' },
  { id: 'db052e04-ba29-41c4-a00f-96a93a740a1c', qid: 'Q111871838', name: 'Círculo Gran Vía · Autograph' },
  { id: '370c1972-aa94-4841-b90b-10b773b0df18', qid: 'Q111389327', name: 'Hilton Madrid Airport' },
  { id: 'f95cfc46-fec5-4279-901c-7cd076d38ecc', qid: 'Q111388877', name: 'Hyatt Centric Gran Via' },
  { id: '05ceb6e8-d76e-49e2-ae5b-f566179f8eda', qid: 'Q136468059', name: 'Hyatt Regency Madrid Residences' },
  { id: 'eafb935d-a6eb-44d3-b2b8-11feff59a23e', qid: 'Q111389510', name: 'Madrid Marriott Auditorium' },
  { id: 'ec71ab4c-cba0-4e13-941d-e77f9d8d0fe0', qid: 'Q111389311', name: 'NH Collection Madrid Abascal' },
  { id: '7e5d4cb7-9d21-4a9b-89b4-bdb7e045b32c', qid: 'Q111389328', name: 'NH Collection Madrid Eurobuilding' },
  { id: '23605208-bdeb-4a6f-b92c-a3c7b1ab94a3', qid: 'Q111662127', name: 'NH Collection Madrid Gran Vía' },
  { id: 'fb8b5471-338f-4165-8cf8-2766b30369e1', qid: 'Q16615310',  name: 'NH Collection Madrid Palacio de Tepa' },
  { id: 'bbcd84a5-63c1-4cf2-9192-38cc223a0494', qid: 'Q111388750', name: 'NH Collection Madrid Suecia' },
  { id: 'ea134703-37ff-41dd-b80f-f0ede7aff7fc', qid: 'Q111389016', name: 'Only YOU Boutique Madrid' },
  { id: '0cf74e8d-56ee-4969-b45c-d02f5ad8f8e8', qid: 'Q111388628', name: 'Only YOU Hotel Atocha' },
  { id: 'c7f47b1a-01b6-41dd-83d0-70b719817e02', qid: 'Q111871840', name: 'Smartrental Gran Vía Centric' },
  { id: 'a879af8f-ad84-4446-b56e-173d0b7b15c0', qid: 'Q111389030', name: 'URSO Hotel & Spa' },
  { id: '33479e22-fe1e-4fd6-84e4-779a2e7f2c12', qid: 'Q111409036', name: 'AC Hotel Aitana' },
  { id: '7f8a67b1-adfc-42b4-a7e3-26177b1d3e3e', qid: 'Q111388623', name: 'AC Hotel Atocha' },
  { id: '3c21e3e2-d894-41ca-aa41-4d38890f6cb3', qid: 'Q111409050', name: 'AC Hotel Madrid Feria' },
  { id: '651f9675-301c-43f7-820a-82e3f129b9f3', qid: 'Q111388878', name: 'AC Hotel Recoletos' },
  { id: 'fa0b5629-4fb3-4945-94c7-d0adf075ef84', qid: 'Q111389175', name: 'Barceló Emperatriz' },
  { id: '461632b0-180e-4e5e-94ac-5f3455f5b372', qid: 'Q111389518', name: 'Barceló Imagine' },
  { id: '291e4210-d4b8-4427-b0c5-8aecc2a4cbfa', qid: 'Q111389027', name: 'Barceló Torre de Madrid' },
  { id: 'd2af52ca-523b-4892-b5aa-2a97b0152067', qid: 'Q111388635', name: 'Catalonia Atocha' },
  { id: 'c285b171-6cd9-4686-847f-ea0219c93314', qid: 'Q111389022', name: 'Catalonia Goya' },
  { id: 'b6f3621a-579a-415a-a1fc-7d6a846cf8ac', qid: 'Q111388645', name: 'Catalonia Las Cortes' },
  { id: '23d20597-0a88-46c3-928c-480de2d74ea1', qid: 'Q111388636', name: 'Catalonia Plaza Mayor' },
  { id: 'd9b782dc-e7e2-430b-afb4-aec308495da6', qid: 'Q111388642', name: 'Catalonia Puerta del Sol' },
  { id: '550c9ba0-48de-471f-975a-b3b030ffa4e2', qid: 'Q72172868',  name: 'DoubleTree Hilton Madrid-Prado' },
  { id: '2888ba78-1e18-4d1c-89bb-fc8da6817e43', qid: 'Q111662118', name: 'Eurostars Casa de la Lírica' },
  { id: 'f95382b8-0729-46a9-9e8c-b15093542909', qid: 'Q111389034', name: 'Eurostars Central' },
  { id: '525d3e1d-d6c8-4d64-9279-9d92d6985fff', qid: 'Q111871932', name: 'Eurostars Madrid Gran Vía' },
  { id: '8f2edc75-4e8a-4056-a823-06c013c0e5f7', qid: 'Q111389522', name: 'Eurostars Madrid Tower' },
  { id: 'f8e537e1-999e-42f3-aa38-cac6748edfa0', qid: 'Q111872205', name: 'Eurostars Monte Real' },
  { id: '79257f39-d5e0-4ab1-b6ad-331744e54639', qid: 'Q111388639', name: 'Eurostars Plaza Mayor' },
  { id: '20dafe47-678b-4720-8f17-0cd3386eca35', qid: 'Q111389525', name: 'Eurostars Suites Mirasierra' },
  { id: 'd3868189-c30d-4515-a51f-7e7a881b17e5', qid: 'Q111389314', name: 'Hyatt Regency Hesperia' },
  { id: 'c43c95c0-c2a2-419d-848a-e38fd9fda05c', qid: 'Q111389318', name: 'Ilunion Atrium' },
  { id: '6a8cb14d-43b0-42f0-b183-b0e4399d3052', qid: 'Q111389511', name: 'Meliá Castilla' },
  { id: '9dbba777-d08f-4c63-99b6-c95156107e93', qid: 'Q111872034', name: 'Meliá Madrid Serrano' },
  { id: 'c8cf9188-ad2b-40c5-a1ae-50727b748f3c', qid: 'Q111388637', name: 'Mercure Madrid Centro' },
  { id: '73617f4f-3a93-47d4-bcf4-560db5ab7fd8', qid: 'Q111389029', name: 'NH Madrid Lagasca' },
  { id: '5424a3d2-89e6-40c3-8a19-5aa4938138c0', qid: 'Q111388630', name: 'NH Madrid Nacional' },
  { id: 'a3c92494-43b8-4a88-bb0a-94a461e24617', qid: 'Q111388632', name: 'NH Madrid Ribera del Manzanares' },
  { id: 'c74d49ee-a057-41e6-b9bf-462622cff76f', qid: 'Q111388867', name: 'Novotel Madrid Center' },
  { id: '69922adc-e801-4bca-8c22-a74307fa92cf', qid: 'Q111872122', name: 'Novotel Madrid City Las Ventas' },
  { id: '982e3779-885c-4fcc-911a-d9630b0ffad5', qid: 'Q111872125', name: 'NYX Hotel Madrid' },
  { id: '9e91c056-ecda-4833-a355-c1a2f746f8b1', qid: 'Q111388751', name: 'Petit Palace Alcalá' },
  { id: '3bf09791-e62e-4aea-8b7a-3302cefa8895', qid: 'Q111388743', name: 'Petit Palace Lealtad Plaza' },
  { id: '2ed5d47f-5f3e-43bf-ba62-0d1dd4f3dcaf', qid: 'Q111388871', name: 'Petit Palace Plaza del Carmen' },
  { id: '50cf961b-734a-42ab-9801-af52f701e076', qid: 'Q111388749', name: 'Petit Palace Plaza Mayor' },
  { id: '92ed7d97-bfbc-4f2a-beb0-6669bcdbbdf5', qid: 'Q111388746', name: 'Petit Palace Posada del Peine' },
  { id: 'b1c36ef4-c983-4caf-98a3-0ecf17cec30f', qid: 'Q111389153', name: 'Petit Palace President Castellana' },
  { id: '52da201e-c1b0-4344-958b-b35f4c6b9497', qid: 'Q111389028', name: 'Petit Palace Santa Bárbara' },
  { id: '474e43b1-63af-479c-8a48-60da5c770b52', qid: 'Q111388744', name: 'Petit Palace Savoy Alfonso XII' },
  { id: '8e8ddb13-d788-48e1-adfe-a563f8458a8b', qid: 'Q111388622', name: 'Rafaelhoteles Atocha' },
  { id: 'a9a68cc9-406c-4893-8103-18c893bfeb97', qid: 'Q111388883', name: 'Vincci Capitol' },
  { id: '4099bcef-b2df-4935-a0a7-1356daa4ea02', qid: 'Q111516031', name: 'Vincci Centrum' },
  { id: '4c3bda58-594d-4083-a52c-5a0fab482ea9', qid: 'Q111389168', name: 'Sercotel Gran Hotel Conde Duque' },
  { id: 'c7581282-2e7a-4243-a9c3-89e21ee1689a', qid: 'Q111872204', name: 'Sercotel Madrid Aeropuerto' },
  { id: '2ea36513-b4b8-4f9b-92f6-0635594e7461', qid: 'Q112011950', name: 'Ibis Styles Madrid City Las Ventas' },
];

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'HotelVALORA/1.0 (+https://hotelvalora.com; contact=miguel.sambricio@metcub.com)';

const valuesClause = QIDS.map(({ qid }) => `wd:${qid}`).join(' ');
const query = `
SELECT ?qid ?capacity ?inception ?openingDate ?englishLabel WHERE {
  VALUES ?qid { ${valuesClause} }
  OPTIONAL { ?qid wdt:P1106 ?capacity. }
  OPTIONAL { ?qid wdt:P571 ?inception. }
  OPTIONAL { ?qid wdt:P1619 ?openingDate. }
  OPTIONAL {
    ?qid rdfs:label ?englishLabel.
    FILTER(LANG(?englishLabel) = "en")
  }
}
`;

console.log(`Querying Wikidata SPARQL · ${QIDS.length} QIDs · single batched VALUES query...`);
console.log(`UA: ${USER_AGENT}`);

const response = await fetch(SPARQL_ENDPOINT, {
  method: 'POST',
  headers: {
    'User-Agent': USER_AGENT,
    'Accept': 'application/sparql-results+json',
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: 'query=' + encodeURIComponent(query),
});

if (!response.ok) {
  console.error(`SPARQL request failed: ${response.status} ${response.statusText}`);
  const text = await response.text();
  console.error(text.slice(0, 500));
  process.exit(1);
}

const data = await response.json();
const bindings = data.results.bindings ?? [];
console.log(`SPARQL returned ${bindings.length} bindings`);

// Group by QID · a single hotel may appear multiple times if multiple values exist
const byQid = new Map();
for (const b of bindings) {
  const qid = b.qid.value.split('/').pop();
  if (!byQid.has(qid)) byQid.set(qid, { capacities: [], inceptions: [], openings: [], label: null });
  const slot = byQid.get(qid);
  if (b.capacity?.value) slot.capacities.push(Number(b.capacity.value));
  if (b.inception?.value) slot.inceptions.push(b.inception.value);
  if (b.openingDate?.value) slot.openings.push(b.openingDate.value);
  if (b.englishLabel?.value && !slot.label) slot.label = b.englishLabel.value;
}

// Build SQL transcript
const sqlLines = [];
sqlLines.push('-- Wikidata SPARQL backfill · ' + new Date().toISOString());
sqlLines.push('-- Source: query.wikidata.org · properties P1106 (capacity) + P571 (inception) + P1619 (opening)');
sqlLines.push('');

let stats = { rooms_found: 0, year_found: 0, both_found: 0, nothing: 0 };
const recapTable = [['QID', 'Hotel', 'Rooms', 'Year']];

for (const row of QIDS) {
  const result = byQid.get(row.qid) ?? { capacities: [], inceptions: [], openings: [], label: null };
  // Pick max capacity (some hotels have multiple values · max is the operational count)
  const rooms = result.capacities.length > 0 ? Math.max(...result.capacities) : null;
  // Pick earliest inception/opening · prefer inception (P571) over opening (P1619)
  const yearStr = result.inceptions[0] ?? result.openings[0] ?? null;
  const year = yearStr ? parseInt(yearStr.slice(0, 4), 10) : null;
  const yearValid = year !== null && !Number.isNaN(year) && year > 1800 && year < 2030;

  if (rooms !== null && yearValid) stats.both_found++;
  else if (rooms !== null) stats.rooms_found++;
  else if (yearValid) stats.year_found++;
  else stats.nothing++;

  recapTable.push([row.qid, row.name, rooms?.toString() ?? '-', yearValid ? year.toString() : '-']);

  const sets = [];
  if (rooms !== null) sets.push(`total_rooms = ${rooms}, total_keys = ${rooms}`);
  if (yearValid) sets.push(`year_opened = ${year}`);
  if (sets.length === 0) continue;

  sqlLines.push(`UPDATE public.hotel_canonical SET ${sets.join(', ')} WHERE id = '${row.id}';`);
  if (rooms !== null) {
    sqlLines.push(`INSERT INTO public.hotel_field_provenance (hotel_canonical_id, field_name, source_kind, source_path, confidence, observed_at) VALUES ('${row.id}', 'total_rooms', 'wikidata', 'https://www.wikidata.org/wiki/${row.qid}#P1106', 0.85, NOW()) ON CONFLICT DO NOTHING;`);
  }
  if (yearValid) {
    sqlLines.push(`INSERT INTO public.hotel_field_provenance (hotel_canonical_id, field_name, source_kind, source_path, confidence, observed_at) VALUES ('${row.id}', 'year_opened', 'wikidata', 'https://www.wikidata.org/wiki/${row.qid}#P571', 0.90, NOW()) ON CONFLICT DO NOTHING;`);
  }
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(`Hotels with BOTH rooms + year: ${stats.both_found}`);
console.log(`Hotels with rooms only:        ${stats.rooms_found}`);
console.log(`Hotels with year only:         ${stats.year_found}`);
console.log(`Hotels with nothing:           ${stats.nothing}`);
console.log('═══════════════════════════════════════════════════════════════════');
console.log('');

// Pretty-print recap
const w = recapTable[0].map((_, i) => Math.max(...recapTable.map((r) => (r[i] ?? '').length)));
for (const r of recapTable) {
  console.log(r.map((c, i) => (c ?? '').padEnd(w[i] + 2)).join(''));
}

console.log('');
console.log('═══════════════════════════════════════════════════════════════════');
console.log('SQL transcript:');
console.log('═══════════════════════════════════════════════════════════════════');
console.log(sqlLines.join('\n'));

// Write SQL to file for manual review
const fs = await import('node:fs/promises');
const sqlPath = './scripts/wikidata-sparql-backfill-output.sql';
await fs.writeFile(sqlPath, sqlLines.join('\n'));
console.log(`\nSQL written to ${sqlPath}`);
