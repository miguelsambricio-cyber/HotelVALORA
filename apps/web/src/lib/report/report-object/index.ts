/**
 * Unified Report Object · public API barrel.
 *
 *  Usage from a server component:
 *
 *    import { buildReportObject } from "@/lib/report/report-object";
 *    const report = await buildReportObject(canonical_id, { tier: "premium" });
 *    if (!report) return notFound();
 *    // pass report.financials.assumptions → PLContent
 *    // pass report.underwriting.inputs   → UnderwritingShell
 *    // pass report.capex                 → CapexBoard
 */
export { buildReportObject } from "./build";
export { tierMatrixFor } from "./types";
export type {
  ReportObject,
  ReportTier,
  TierMatrix,
  SectionAccess,
  SectionVisibility,
  SectionProvenance,
  GeoScope,
  FinancialsSlice,
  UnderwritingSlice,
  CapexSlice,
  CapexLineSnapshot,
  MarketListSlice,
  BuildReportOptions,
} from "./types";
export { buildFinancialsSlice } from "./sections/financials";
export { buildUnderwritingSlice } from "./sections/underwriting";
export { buildCapexSlice, resolveCapexCoords } from "./sections/capex";
