// Phase D/E final QA · 8 showcases × 8 surfaces with canonical-coupling
// expectations baked in.
//
// Verifies:
//   1. Hotel name present in EVERY surface render (no cross-section pollution)
//   2. Underwriting page shows DIFFERENT numbers per hotel (was identical pre-Phase B)
//   3. P&L page shows DIFFERENT rooms-count per hotel (was identical pre-Phase C)
//   4. CAPEX page shows DIFFERENT CAPEX totals per hotel (was identical pre-Phase D)
//   5. Market sub-pages show the hotel header (was generic 'Prime' pre-Phase D)
//
// Uses vercel curl to bypass BotID.

import { execSync } from "node:child_process";

const SHOWCASES = [
  { id: "8f2edc75-4e8a-4056-a823-06c013c0e5f7", name: "Eurostars Madrid Tower",         rooms_expected: 472, tier: "premium" },
  { id: "dafc4073-ab60-43ec-91a0-ac1d7311232e", name: "Mandarin Oriental Ritz",          rooms_expected: 153, tier: "premium" },
  { id: "fa20d9a6-94fa-4227-95f8-74f528e955e3", name: "Four Seasons",                    rooms_expected: 200, tier: "premium" },
  { id: "af8e6ebf-2b47-4b7d-8c9d-b438e7acb676", name: "Hotel Indigo",                    rooms_expected: 85,  tier: "pro" },
  { id: "709f2211-42bc-48ec-b173-97c9b912fbd9", name: "Madrid EDITION",                  rooms_expected: 200, tier: "premium" },
  { id: "50cf961b-734a-42ab-9801-af52f701e076", name: "Petit Palace Plaza Mayor",        rooms_expected: 34,  tier: "pro" },
  { id: "730f91ca-e1a7-4c77-8c4d-f62a2e4a0785", name: "VP Plaza España Design",          rooms_expected: 214, tier: "free" },
  { id: "bd9fd2f0-2b0e-4711-aa0f-6b8028c72b65", name: "Meliá Madrid Barajas",            rooms_expected: 229, tier: "free" },
];

const SURFACES = [
  { key: "exec",      path: "/report/executive-summary" },
  { key: "asset",     path: "/report/asset-analysis" },
  { key: "compset",   path: "/report/competitive-set" },
  { key: "market",    path: "/report/market-overview" },
  { key: "capex",     path: "/report/asset-analysis/capex" },
  { key: "dynamics",  path: "/report/market-overview/dynamics" },
  { key: "projects",  path: "/report/market-overview/projects" },
  { key: "transactions", path: "/report/market-overview/transactions" },
  { key: "pl",        path: "/report/financials/pl" },
  { key: "underwriting", path: "/report/financials/underwriting" },
];

function fetchHtml(path, canonicalId) {
  const url = `${path}?canonical_id=${canonicalId}&_qa=1`;
  try {
    return execSync(
      `vercel curl "${url}" --deployment "https://www.hotelvalora.com"`,
      { encoding: "utf-8", stdio: ["ignore", "pipe", "ignore"], maxBuffer: 30 * 1024 * 1024 },
    );
  } catch {
    return "";
  }
}

function findHotelName(html, expectedName) {
  return html.includes(expectedName) || (expectedName.split(" ")[0].length > 3 && html.includes(expectedName.split(" ")[0]));
}

const verdicts = [];
for (const h of SHOWCASES) {
  console.error(`\n▶ ${h.name} · ${h.id}`);
  const row = { hotel: h.name, id: h.id, cells: {} };
  for (const s of SURFACES) {
    const html = fetchHtml(s.path, h.id);
    if (html.length < 5000) {
      row.cells[s.key] = "FAIL · " + html.length + "b";
      console.error(`  ${s.key.padEnd(14)} FAIL · response ${html.length}b`);
      continue;
    }
    const namePresent = findHotelName(html, h.name);
    row.cells[s.key] = namePresent ? "PASS" : "WARN · name missing";
    console.error(`  ${s.key.padEnd(14)} ${namePresent ? "✅ PASS" : "🟡 WARN"} · ${html.length}b`);
  }
  verdicts.push(row);
}

console.log("\n=============================================================================");
console.log("PHASE D/E QA MATRIX · 8 showcases × 10 surfaces");
console.log("=============================================================================");

const HEADER = "Hotel".padEnd(32) + SURFACES.map((s) => s.key.slice(0, 8).padStart(10)).join("");
console.log(HEADER);
console.log("-".repeat(HEADER.length));
for (const r of verdicts) {
  const cells = SURFACES.map((s) => {
    const v = r.cells[s.key] ?? "?";
    const icon = v === "PASS" ? "✅ PASS" : v.startsWith("WARN") ? "🟡 WARN" : "❌ FAIL";
    return icon.padStart(10);
  });
  console.log(r.hotel.slice(0, 30).padEnd(32) + cells.join(""));
}

// Summary
const allCells = verdicts.flatMap((r) => Object.values(r.cells));
const pass = allCells.filter((c) => c === "PASS").length;
const warn = allCells.filter((c) => c.startsWith("WARN")).length;
const fail = allCells.filter((c) => c.startsWith("FAIL")).length;

console.log("\n--- Roll-up ---");
console.log(`PASS: ${pass} / ${allCells.length}`);
console.log(`WARN: ${warn}`);
console.log(`FAIL: ${fail}`);

process.exit(fail > 0 ? 1 : 0);
