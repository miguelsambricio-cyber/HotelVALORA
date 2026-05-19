/**
 * Runnable dry-run for the Booking RapidAPI provider.
 *
 * Invocation (once tsx is available — Phase 2 dev-dep addition):
 *
 *   pnpm add -D tsx
 *   pnpm tsx apps/web/scripts/enrichment-booking-dry-run.ts
 *
 * Until then, the deterministic outputs of this script are
 * hand-computed and saved as
 *   apps/web/src/lib/enrichment/providers/booking-rapidapi/fixtures/
 *     sample-output-<label>.json
 *
 * No HTTP calls. No DB writes. Reads fixture JSON files only.
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { runDryRun, type DryRunFixture } from "../src/lib/enrichment/providers/booking-rapidapi/dry-run";
import type { RapidApiHotelData } from "../src/lib/enrichment/providers/booking-rapidapi/types";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = resolve(__dirname, "../src/lib/enrichment/providers/booking-rapidapi/fixtures");

const FIXTURE_FILES: Array<{ label: string; file: string }> = [
  { label: "ritz-by-belmond-madrid",        file: "madrid-ritz-by-belmond.json" },
  { label: "nh-collection-eurobuilding",    file: "madrid-nh-collection-eurobuilding.json" },
  { label: "ibis-centro-las-ventas",        file: "madrid-ibis-centro-las-ventas.json" },
];

async function loadFixture(file: string): Promise<RapidApiHotelData> {
  const raw = await readFile(resolve(FIXTURES_DIR, file), "utf-8");
  return JSON.parse(raw) as RapidApiHotelData;
}

async function main(): Promise<void> {
  const fixtures: DryRunFixture[] = [];
  for (const { label, file } of FIXTURE_FILES) {
    const e2 = await loadFixture(file);
    fixtures.push({ label, e2 });
  }

  const output = runDryRun({ fixtures });

  // Pretty-print to stdout for human inspection
  process.stdout.write(JSON.stringify(output, null, 2));
  process.stdout.write("\n");

  // Also persist each individual report to a sample-output file
  await mkdir(FIXTURES_DIR, { recursive: true });
  for (const report of output.reports) {
    const path = resolve(FIXTURES_DIR, `sample-output-${report.label}.json`);
    await writeFile(path, JSON.stringify(report, null, 2), "utf-8");
  }
  // Aggregate
  await writeFile(
    resolve(FIXTURES_DIR, "sample-output-aggregate.json"),
    JSON.stringify(output.aggregate, null, 2),
    "utf-8",
  );

  process.stderr.write(
    `[booking-rapidapi:dry-run] wrote ${output.reports.length} per-fixture sample outputs + aggregate to ${FIXTURES_DIR}\n`,
  );
}

main().catch((err) => {
  process.stderr.write(`[booking-rapidapi:dry-run] FAILED: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
