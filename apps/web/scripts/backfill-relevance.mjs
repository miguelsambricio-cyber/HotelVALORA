#!/usr/bin/env node
// Phase 2.8 · one-shot backfill of `enriched_meta.relevance_tier` for every
// existing market_news row. Uses the same regex ruleset that lives in
// lib/intelligence/relevance.ts · inlined here because Node ESM scripts
// can't import server-only TS modules.
//
// USAGE
//   cd apps/web
//   node scripts/backfill-relevance.mjs           # commits the update
//   node scripts/backfill-relevance.mjs --dry-run # prints distribution, writes nothing

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// ── env loader ──────────────────────────────────────────────────────────────

function loadDotenv(path) {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}
loadDotenv(resolve(import.meta.dirname, "..", ".env.local"));

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, ...r] = a.replace(/^--/, "").split("=");
    return [k, r.join("=") || true];
  }),
);
const DRY_RUN = args["dry-run"] === true || args["dry-run"] === "true";

// ── PRIORITY rules (mirror of lib/intelligence/relevance.ts) ────────────────

const PRIORITY_RULES = [
  { signal: "socimi_reit", patterns: [/\b(socimi|reit|listed property|inmobiliaria cotizada)\b/i] },
  {
    signal: "refinancing_debt",
    patterns: [
      /\b(refinanc(?:e|ing|ed)|recapitali[sz]ation|loan extension|mezzanine|cmbs|senior loan|debt restructure|bond issu(?:e|ance)|credit facility|secured? loan)\b/i,
      /\b(refinanciaci[óo]n|crédito sindicado|deuda|bono emisi[óo]n|hipoteca|línea de crédito|préstamo)\b/i,
    ],
  },
  {
    signal: "investment_fund",
    patterns: [
      /\b(private equity|asset manager|fund(?:s|raise|raising)?|sovereign wealth|family office|institutional investor|capital commitment|raises? (?:€|\$|£|eur)?\s*\d+)\b/i,
      /\b(fondo de inversi[óo]n|gestora|fondo soberano|family office|inversor institucional|levanta capital|capta fondos)\b/i,
      /\b(blackstone|brookfield|kkr|cerberus|starwood capital|apollo|carlyle|gic|kohlberg|tristan capital|hines|invesco|pgim|aermont|orion capital|stoneweg|atom hoteles|hispania|millenium|azora|edyn|hipotels|barceló|n[\s-]?capital|stoneweg)\b/i,
    ],
  },
  {
    signal: "acquisition_sale",
    patterns: [
      /\b(acquir(?:e|es|ed|ing|ition)|take[\s-]?over|buy(?:s|out|er|ers)|purchas(?:e|es|ed)|sale|sold|sells|divest|disposal|exits?)\b.{0,80}\b(hotel|property|portfolio|asset|building|complex|resort)/i,
      /\b(compra|adquisici[óo]n|adquiere|adquirido|adquiriendo|vende|venta|venden|desinversi[óo]n|enajenaci[óo]n|cede|cedió|ceder)\b/i,
      /\b€\s*\d+\s*(M|m|millones|million|bn|billion)\b/,
      /\b(deal|operation|transaction)\b.{0,30}\b(?:€|EUR|US\$|\$|£)\s*\d/i,
      /\b(operaci[óo]n|transacci[óo]n)\b.{0,40}\b(?:€|EUR|millones|millón)/i,
    ],
  },
  {
    signal: "joint_venture_partnership",
    patterns: [
      /\b(joint venture|jv|equity partnership|co-invest(?:ment|or)|strategic partnership|memorandum of understanding|mou)\b/i,
      /\b(empresa conjunta|alianza estrat[ée]gica|coinversi[óo]n|acuerdo estrat[ée]gico|sociedad conjunta)\b/i,
    ],
  },
  {
    signal: "operator_agreement",
    patterns: [
      /\b(management agreement|operator agreement|franchise agreement|hma|hotel management|takes over operations?|new operator|operator change|brand affiliation)\b/i,
      /\b(contrato de gesti[óo]n|nuevo operador|cambio de operador|gestor[áa] el hotel|asume la gesti[óo]n)\b/i,
    ],
  },
  {
    signal: "lease_agreement",
    patterns: [
      /\b(lease|leasing|leases|leased|sale[\s-]?and[\s-]?leaseback|long[\s-]?term lease|ground lease)\b/i,
      /\b(arrendamiento|contrato de alquiler|alquiler de hotel|cesi[óo]n de uso|sale[\s-]?and[\s-]?leaseback)\b/i,
    ],
  },
  {
    signal: "development",
    patterns: [
      /\b(new (?:hotel|build|development|property)|breaking ground|construction begins|under construction|new[\s-]?build|groundbreaking|develops? .{0,30}\b(?:hotel|resort)|construction of)\b/i,
      /\b(nueva apertura|construcci[óo]n|nuevo hotel|desarrollo hotelero|levantar[áa] un hotel|inicio de obras)\b/i,
    ],
  },
  {
    signal: "pipeline_expansion",
    patterns: [
      /\b(pipeline|to open|will open|plans to open|signs deal|signs management agreement|expansion plan|expanding to|set to open|opens .{0,15}\b(?:201|202)\d|debuts? in .{0,30}\b201|coming (?:in|to))\b/i,
      /\b(abrir[áa]|inaugurar[áa]|próxima apertura|firma acuerdo|firma contrato|plan de expansi[óo]n|expandir[áa]|nueva incorporaci[óo]n)\b/i,
    ],
  },
  {
    signal: "conversion_repositioning",
    patterns: [
      /\b(conversion|convert .{0,20}\b(?:hotel|property)|reposition|repositioning|rebrand(?:ed|ing|s)?|re[\s-]?flag(?:ged|ging)?|refurbish(?:ed|ment|ing)?|renovation|capex|joins .{0,20}\b(?:brand|portfolio|chain))\b/i,
      /\b(reposicionamiento|rebranding|cambio de marca|nueva marca|reconvertir|reforma|reformar|renovaci[óo]n|inversi[óo]n en .{0,20}\b(?:reforma|capex))\b/i,
    ],
  },
  { signal: "branded_residences", patterns: [/\bbranded residences?\b/i, /\b(residencias de marca)\b/i] },
  {
    signal: "flex_living",
    patterns: [
      /\b(flex[\s-]?living|serviced apartments|co[\s-]?living|long[\s-]?stay|extended[\s-]?stay)\b/i,
      /\b(vivienda flexible|coliving|apartamentos con servicios)\b/i,
    ],
  },
  {
    signal: "distress",
    patterns: [
      /\b(default|distress(?:ed)?|foreclos(?:e|ure)|receivership|administration|bankrupt(?:cy)?|chapter 11|insolven(?:t|cy))\b/i,
      /\b(concurso de acreedores|preconcurso|moros[oa]|impago|quiebra|insolvencia)\b/i,
    ],
  },
];

const OPERATIONAL_RULES = [
  {
    signal: "performance_metric",
    patterns: [
      /\b(adr|revpar|trevpar|goppar|gop[\s/]?par|occupancy|occ\.?|average daily rate|booking pace|demand index|str global|hotstats)\b/i,
      /\b(ocupaci[óo]n|tarifa media|ingresos por habitaci[óo]n|RevPAR|ADR|GOPPAR|índice de demanda)\b/i,
    ],
  },
  {
    signal: "tourism_demand",
    patterns: [
      /\b(tourist arrivals|tourism demand|international arrivals|inbound tourism|forward bookings|booking window|stay length|seasonality)\b/i,
      /\b(llegadas tur[íi]sticas|turismo nacional|turismo internacional|reservas anticipadas|ventana de reserva|demanda tur[íi]stica|estancia media)\b/i,
    ],
  },
];

const NOISE_RULES = [
  {
    signal: "event_conference",
    patterns: [
      /\b(conference|congress|summit|trade fair|exhibition|symposium|fitur|ihif|wtm|itb)\b/i,
      /\b(congreso|simposio|encuentro|feria|sal[óo]n|exposici[óo]n|jornada)\b/i,
    ],
  },
  {
    signal: "awards",
    patterns: [
      /\b(award(?:s|ed|ing)?|prize|winners?|recogniz(?:es?|ed|ing)?|finalist|nominated|shortlist|gala|distinction)\b/i,
      /\b(premio|premios|galardonad[oa]s?|reconocimiento|finalista|distinguid[oa]|distinci[óo]n)\b/i,
    ],
  },
  {
    signal: "opinion_editorial",
    patterns: [
      /\b(opinion|editorial|column(?:ist|na)?|commentary|point of view|op[\s-]?ed)\b/i,
      /\b(opini[óo]n|punto de vista|comentario|tribuna|columna)\b/i,
    ],
  },
  {
    signal: "lifestyle_travel",
    patterns: [
      /\b(top \d+ best|best of (?:the )?(?:year|season|month)|escapada|getaway|wanderlust|travel inspiration|hidden gem|bucket list|relaxing|wellness retreat|spa weekend|romantic getaway)\b/i,
      /\b(escapadas|inspiraci[óo]n para viajar|destinos rom[áa]nticos|fin de semana de spa|joya escondida)\b/i,
    ],
  },
  {
    signal: "marketing_pr",
    patterns: [
      /\b(launches? .{0,30}\b(?:campaign|loyalty|programme|program)|unveils? new (?:campaign|loyalty)|debuts? (?:new )?campaign|introduces? loyalty)\b/i,
      /\b(lanza .{0,30}\b(?:campaña|programa de fidelizaci[óo]n)|nueva campaña|programa de fidelizaci[óo]n)\b/i,
    ],
  },
  {
    signal: "generic_ai",
    patterns: [
      /\b(artificial intelligence|chatgpt|generative ai|llm|machine learning hype|ai revolution|ai transformation)\b/i,
      /\b(inteligencia artificial|chatgpt|IA generativa|revoluci[óo]n de la IA)\b/i,
    ],
  },
];

function classify(title, body, summary) {
  const corpus = `${title ?? ""} ${summary ?? ""} ${body ?? ""}`.trim();
  if (!corpus) return { tier: "operational", signal: null };
  for (const r of PRIORITY_RULES) if (r.patterns.some((p) => p.test(corpus))) return { tier: "priority", signal: r.signal };
  for (const r of OPERATIONAL_RULES) if (r.patterns.some((p) => p.test(corpus))) return { tier: "operational", signal: r.signal };
  for (const r of NOISE_RULES) if (r.patterns.some((p) => p.test(corpus))) return { tier: "noise", signal: r.signal };
  return { tier: "operational", signal: null };
}

// ── main ────────────────────────────────────────────────────────────────────

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

console.log(`→ Phase 2.8 · relevance backfill · dry_run=${DRY_RUN}\n`);

const { data: rows, error } = await sb
  .from("market_news")
  .select("id, title, summary, body, enriched_meta")
  .order("first_seen_at", { ascending: false });

if (error) {
  console.error("fetch error:", error.message);
  process.exit(1);
}

const totals = { priority: 0, operational: 0, noise: 0 };
const signals = {};
const updates = [];

for (const row of rows ?? []) {
  const { tier, signal } = classify(row.title, row.body, row.summary);
  totals[tier] += 1;
  const k = `${tier}:${signal ?? "default"}`;
  signals[k] = (signals[k] ?? 0) + 1;
  const currentMeta = (row.enriched_meta && typeof row.enriched_meta === "object") ? row.enriched_meta : {};
  const nextMeta = {
    ...currentMeta,
    relevance_tier: tier,
    relevance_signal: signal,
    relevance_backfilled_at: new Date().toISOString(),
  };
  updates.push({ id: row.id, meta: nextMeta });
}

console.log(`Total rows: ${rows?.length ?? 0}`);
console.log(`Distribution:`);
console.log(`  priority    · ${totals.priority}`);
console.log(`  operational · ${totals.operational}`);
console.log(`  noise       · ${totals.noise}`);
console.log(`\nTop signals:`);
const sorted = Object.entries(signals).sort((a, b) => b[1] - a[1]).slice(0, 20);
for (const [k, n] of sorted) console.log(`  ${k.padEnd(40)} ${n}`);

if (DRY_RUN) {
  console.log(`\n[dry-run] no writes performed.`);
  process.exit(0);
}

console.log(`\n→ writing ${updates.length} rows...`);
let written = 0;
let failed = 0;
for (const u of updates) {
  const { error: updErr } = await sb
    .from("market_news")
    .update({ enriched_meta: u.meta })
    .eq("id", u.id);
  if (updErr) {
    failed += 1;
    console.error(`  ✗ ${u.id}: ${updErr.message}`);
  } else {
    written += 1;
  }
}
console.log(`\n✓ written: ${written} · ✗ failed: ${failed}`);
process.exit(failed === 0 ? 0 : 1);
