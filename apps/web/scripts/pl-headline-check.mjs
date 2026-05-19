// Quick sanity check: what does computePL produce for the headline tiles?
import { computePL } from "../src/lib/report/financials/calculations.ts";
import { getDefaultAssumptions } from "../src/lib/report/financials/assumptions.ts";

const pl = computePL(getDefaultAssumptions());
console.log("totalRevenue:", pl.results.totalRevenue);
console.log("gop:        ", pl.results.gop);
console.log("ebitda:     ", pl.results.ebitda);
console.log("ebitdaMargin:", pl.results.ebitdaMargin);
console.log();
console.log("Year 3 (idx 2):");
console.log("  totalRevenue:", pl.results.totalRevenue[2]);
console.log("  gop:         ", pl.results.gop[2]);
console.log("  ebitda:      ", pl.results.ebitda[2]);
console.log("  gopMargin %:", (pl.results.gop[2] / pl.results.totalRevenue[2]) * 100);
console.log("  ebitdaMargin %:", pl.results.ebitdaMargin[2] * 100);
