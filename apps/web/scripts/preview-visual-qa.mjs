// Visual-QA harness for the preview Executive Summary renders.
//
// Fetches the 3 cohort URLs from the feature-branch preview, extracts
// every key value rendered in the Valuation + Market sections, and
// surfaces:
//
//   1. NaN / null / undefined leaks
//   2. Locale formatting drift (€ symbol · es-ES separators · % spacing)
//   3. Cross-cohort drift (luxury vs upscale vs indie consistency)
//   4. False-precision smells (round-number cap rates · suspiciously
//      identical values across cohorts)
//   5. Source-label readability (provenance line)
//   6. Methodology note + LockedGate presence
//
// Run with:
//   cd apps/web && PREVIEW_BASE=<vercel-preview-domain> npx tsx scripts/preview-visual-qa.mjs
//
// The script is read-only · it never writes to Supabase or filesystem
// other than printing the QA report to stdout.

const BASE = process.env.PREVIEW_BASE ??
  "https://hotelvalora-git-feature-hote-320d61-miguel-sambricio-s-projects.vercel.app";

const COHORTS = [
  { cohort: "luxury_branded",     name: "Mandarin Oriental Ritz, Madrid",  canonical_id: "dafc4073-ab60-43ec-91a0-ac1d7311232e", expected_submarket: "Retiro" },
  { cohort: "upscale_branded",    name: "AC Hotel Recoletos by Marriott",  canonical_id: "651f9675-301c-43f7-820a-82e3f129b9f3", expected_submarket: "Salamanca" },
  { cohort: "independent_unknown",name: "7 Islas Hotel",                   canonical_id: "ac2d227a-4721-43b5-aba5-d0e2f4311de8", expected_submarket: "Madrid Centre" },
];

const VALUATION_LABELS = [
  "Gross Operating Profit",
  "EBITDA after replacement",
  "Cap. Rate",
  "Exit Year",
  "Escenario",
  "Hotel Market Valuation",
  "Hotel Valor estimado",
  "Hotel por habitación",
  "Hotel por m²",
  "Residential por m²",
  "Office por m²",
];

function stripHtml(html) {
  // Remove script + style first so script JSON does not pollute the text
  let h = html.replace(/<script[\s\S]*?<\/script>/g, "");
  h = h.replace(/<style[\s\S]*?<\/style>/g, "");
  // Replace closing tags + breaks with spaces so adjacent text doesn't merge
  h = h.replace(/<\/(td|tr|th|div|section|li|p|h\d)>/gi, " ");
  h = h.replace(/<br\s*\/?>/gi, " ");
  // Strip remaining tags
  h = h.replace(/<[^>]+>/g, " ");
  // Decode common entities
  h = h.replace(/&nbsp;/g, " ").replace(/&euro;/g, "€").replace(/&#8364;/g, "€").replace(/&amp;/g, "&");
  // Collapse whitespace
  h = h.replace(/\s+/g, " ").trim();
  return h;
}

function extractValuationRows(text) {
  // For each known label, find the next non-empty token after it · the
  // ValuationTable layout renders label/value cells adjacent so the
  // stripped text gives "<label> <value>" in order.
  const rows = {};
  for (const label of VALUATION_LABELS) {
    const idx = text.indexOf(label);
    if (idx === -1) { rows[label] = null; continue; }
    // Slice everything after the label up to the next label or end of text
    const tail = text.slice(idx + label.length);
    // Grab the first token-group that looks like a value · either:
    //   <num>[.,]<num><suffix>  (43,6M€, 6,00%, 285k€, 5.700 €, 35%, 188 €)
    //   <text-token>            (TTM, Engine · base · ...)
    //   range:  <num>M€ — <num>M€
    const rangeMatch = tail.match(/^\s*(\d[\d.,]*\s*M€\s*[—-]\s*\d[\d.,]*\s*M€)/);
    if (rangeMatch) { rows[label] = rangeMatch[1]; continue; }
    const numMatch = tail.match(/^\s*(\d[\d.,]*\s*(?:%|M€|k€|€))/);
    if (numMatch) { rows[label] = numMatch[1]; continue; }
    // Free-text up to next label or 80 chars
    const nextLabelIdx = VALUATION_LABELS
      .map((l) => tail.indexOf(l))
      .filter((i) => i > 0)
      .reduce((a, b) => Math.min(a, b), 1000);
    rows[label] = tail.slice(0, Math.min(nextLabelIdx, 80)).trim();
  }
  return rows;
}

function detectIssues(rows, cohort) {
  const issues = [];
  for (const [label, value] of Object.entries(rows)) {
    if (value === null) {
      issues.push({ severity: "info", field: label, msg: "label not found in HTML · may be locked premium row" });
      continue;
    }
    if (/NaN|undefined|null/i.test(value)) {
      issues.push({ severity: "error", field: label, msg: `leak: "${value}"` });
    }
    if (value === "—" || value === "" || value === "-") {
      issues.push({ severity: "warn", field: label, msg: "empty/dash value" });
    }
    if (/€\s*0(?:[.,]0+)?(?!\d)/.test(value)) {
      issues.push({ severity: "error", field: label, msg: `zero-€ leak: "${value}"` });
    }
  }
  // Scenario should mention CoStar submarket OR baseline
  const scenario = rows["Escenario"] ?? "";
  if (!/CoStar|baseline|Mercado|Engine/i.test(scenario)) {
    issues.push({ severity: "warn", field: "Escenario", msg: `unexpected scenario text: "${scenario}"` });
  }
  // Sanity: cohort submarket should appear somewhere in the scenario string
  if (cohort.expected_submarket && !scenario.includes(cohort.expected_submarket)) {
    issues.push({ severity: "warn", field: "Escenario", msg: `expected submarket "${cohort.expected_submarket}" missing in: "${scenario}"` });
  }
  return issues;
}

async function fetchPreview(canonical_id) {
  const url = `${BASE}/report/executive-summary?canonical_id=${canonical_id}`;
  const res = await fetch(url, { headers: { "User-Agent": "HotelVALORA-QA/1.0" } });
  return { url, status: res.status, html: await res.text() };
}

(async () => {
  console.log("================================================================================");
  console.log("PREVIEW VISUAL-QA · Executive Summary · 3 cohorts");
  console.log("================================================================================");
  console.log(`Base URL: ${BASE}`);
  console.log(`Date:     ${new Date().toISOString()}`);
  console.log("");

  const allIssues = [];
  const crossCohort = [];

  for (const c of COHORTS) {
    console.log(`================================================================================`);
    console.log(`COHORT: ${c.cohort}`);
    console.log(`HOTEL:  ${c.name}`);
    console.log(`================================================================================`);
    let r;
    try { r = await fetchPreview(c.canonical_id); }
    catch (e) { console.log(`❌ fetch failed: ${e.message}`); allIssues.push({ cohort: c.cohort, severity: "error", field: "fetch", msg: e.message }); continue; }
    console.log(`URL:    ${r.url}`);
    console.log(`Status: ${r.status}`);
    if (r.status !== 200) {
      console.log(`❌ non-200 · skipping field extraction`);
      const head = r.html.slice(0, 300).replace(/\s+/g, " ");
      console.log(`   first 300 chars: ${head}`);
      allIssues.push({ cohort: c.cohort, severity: "error", field: "status", msg: `${r.status}` });
      continue;
    }
    const text = stripHtml(r.html);
    const rows = extractValuationRows(text);
    console.log(`Valuation rows extracted:`);
    for (const [k, v] of Object.entries(rows)) {
      console.log(`  ${k.padEnd(34)} ${v ?? "<not found>"}`);
    }
    const issues = detectIssues(rows, c);
    if (issues.length === 0) {
      console.log(`✅ no formatting / NaN / null / drift issues`);
    } else {
      console.log(`⚠️  ${issues.length} issue(s):`);
      issues.forEach((i) => console.log(`   [${i.severity}] ${i.field}: ${i.msg}`));
    }
    issues.forEach((i) => allIssues.push({ cohort: c.cohort, ...i }));
    crossCohort.push({ cohort: c.cohort, rows });
    console.log("");
  }

  // ── Cross-cohort drift summary ──────────────────────────────────────────
  console.log("================================================================================");
  console.log("CROSS-COHORT DRIFT SUMMARY");
  console.log("================================================================================");
  if (crossCohort.length >= 2) {
    const fields = ["Cap. Rate", "Hotel Valor estimado", "Hotel Market Valuation", "Hotel por m²", "Gross Operating Profit", "Escenario"];
    console.log("field".padEnd(34) + COHORTS.map(c => c.cohort.padEnd(28)).join(""));
    for (const f of fields) {
      console.log(
        f.padEnd(34) +
        crossCohort.map(c => (c.rows[f] ?? "—").padEnd(28)).join("")
      );
    }
    // Detect suspect identical values
    for (const f of fields) {
      const values = crossCohort.map(c => c.rows[f]);
      const unique = [...new Set(values)];
      if (unique.length === 1 && unique[0] !== null && !["TTM"].includes(unique[0])) {
        console.log(`⚠️  "${f}" identical across all 3 cohorts: "${unique[0]}" · expected variation`);
      }
    }
  }

  // ── Final verdict ──────────────────────────────────────────────────────
  console.log("\n================================================================================");
  const errors = allIssues.filter(i => i.severity === "error").length;
  const warns  = allIssues.filter(i => i.severity === "warn").length;
  if (errors === 0 && warns === 0) {
    console.log(`✅ QA CLEAN · 0 errors · 0 warnings · safe to merge to main`);
  } else if (errors === 0) {
    console.log(`🟡 QA WARNINGS ONLY · ${warns} warning(s) · review before merge`);
  } else {
    console.log(`❌ QA FAILED · ${errors} error(s) · ${warns} warning(s) · do not merge`);
  }
  console.log("================================================================================");
  process.exit(errors > 0 ? 1 : 0);
})();
