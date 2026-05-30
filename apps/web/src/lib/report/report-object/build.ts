import "server-only";
import {
  getCanonicalHotelById,
  resolveBestAvailableMarketKpis,
  resolveCanonicalIdFromSnapshotHotelId,
} from "@/lib/report/canonical-reader";
import { runForHotel } from "@/lib/report/underwriting-runner";
import { buildFinancialsSlice } from "./sections/financials";
import { buildUnderwritingSlice } from "./sections/underwriting";
import { buildCapexSlice } from "./sections/capex";
import { tierMatrixFor } from "./types";
import type { BuildReportOptions, ReportObject, ReportTier } from "./types";

/**
 * Build a `ReportObject` for a canonical hotel id.
 *
 *  Single entry point used by every `/report/*` server component.
 *
 *  Reads canonical hotel + market KPI + runs cap-rate engine · then
 *  derives the section slices for Financials · Underwriting · CAPEX
 *  consuming the admin financials defaults as master + canonical as
 *  auxiliary input (per operator directive 2026-05-25 rule 1).
 *
 *  Returns null when the canonical_id cannot be resolved (caller falls
 *  back to mock data).
 */
export async function buildReportObject(
  canonicalIdOrSnapshotId: string,
  options: BuildReportOptions = {},
): Promise<ReportObject | null> {
  // Multi-path resolver · accepts UUID or h_<hex> snapshot id
  let canonicalId: string | null = canonicalIdOrSnapshotId;
  if (canonicalIdOrSnapshotId.startsWith("h_")) {
    canonicalId = await resolveCanonicalIdFromSnapshotHotelId(canonicalIdOrSnapshotId);
  }
  if (!canonicalId) return null;

  const hotel = await getCanonicalHotelById(canonicalId);
  if (!hotel) return null;

  const marketKpi = await resolveBestAvailableMarketKpis(
    hotel.market_name,
    hotel.submarket_name,
    { country_code: hotel.country_code, chain_scale: hotel.chain_scale },
  );

  const engineRun = (() => {
    try {
      return runForHotel(hotel);
    } catch {
      return null;
    }
  })();

  const tier: ReportTier = options.tier ?? "premium";
  const access = tierMatrixFor(tier);

  const financials = await buildFinancialsSlice(hotel, marketKpi);
  const underwriting = await buildUnderwritingSlice(hotel, marketKpi, engineRun, { tier });
  const capex = buildCapexSlice(hotel);

  const now = new Date().toISOString();
  return {
    canonical_id: canonicalId,
    hotel,
    marketKpi,
    engineRun,
    financials,
    underwriting,
    capex,
    tier,
    access,
    meta: {
      schema_version: 1,
      generated_at: now,
      canonical_loaded_at: now,
      admin_defaults_version: "2026-05-25",
    },
  };
}
