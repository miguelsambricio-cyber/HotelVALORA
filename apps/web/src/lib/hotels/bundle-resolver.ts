/**
 * Hotel bundle resolver · per-hotel UnderwritingBundle assembly.
 *
 * Bridges the hotel registry (selection identity + per-hotel deltas)
 * with the canonical underwriting engine. Given a HotelId, returns a
 * fresh UnderwritingBundle equivalent to SCENARIO_BASE but with the
 * hotel's identity + financial deltas applied.
 *
 * Freeze-safe by design:
 *   · Never mutates SCENARIO_BASE.
 *   · Never imports anything from `apps/web/src/components/underwriting/*`
 *     so the renderer side stays untouched.
 *   · Re-runs runEngine on the cloned + overlaid inputs · respects
 *     ENGINE_VERSION / SCHEMA_VERSION discipline (no math change).
 *
 * Assumptions (documented · 2026-05-19):
 *   · The clone uses JSON · the same primitive the existing
 *     `applyOverrides` uses (try/catch-wrapped in defaults.ts H-1).
 *     UnderwritingInputs is plain JSON · no Date / Map / Set today.
 *   · `scale_gop_factor` applies to gop.* and costs.* PeriodSeries
 *     across all periods · Y0 is 0 in the base, stays 0 after scale.
 *   · Unknown hotelId → null (caller falls back to SCENARIO_BASE).
 */

import { runEngine } from "../underwriting/engine";
import { currentVersionTag } from "../underwriting/versioning";
import type { UnderwritingBundle, UnderwritingInputs, ScenarioMeta } from "../underwriting/types";
import { SCENARIO_BASE } from "../underwriting/defaults";
import {
  getHotelRegistryEntry,
  type HotelId,
  type HotelInputDelta,
  type HotelRegistryEntry,
} from "./madrid-centro-registry";

/**
 * Returns a fresh UnderwritingBundle for the given hotel id.
 * Returns null if the hotel is not in the registry · caller can fall
 * back to SCENARIO_BASE.
 */
export function getHotelBundle(hotelId: HotelId): UnderwritingBundle | null {
  const entry = getHotelRegistryEntry(hotelId);
  if (!entry) return null;
  return buildBundleFromEntry(entry);
}

/**
 * Build the bundle from a registry entry · clones SCENARIO_BASE inputs ·
 * overlays the entry's delta · re-runs the engine · returns the bundle.
 */
function buildBundleFromEntry(entry: HotelRegistryEntry): UnderwritingBundle {
  const inputs = cloneInputs(SCENARIO_BASE.inputs);
  applyHotelDelta(inputs, entry.delta);

  const meta: ScenarioMeta = {
    id: `hotel:${entry.profile.id}`,
    label: entry.profile.display_name,
    description: entry.profile.positioning,
  };

  return {
    ...currentVersionTag(),
    meta,
    inputs,
    computed: runEngine(inputs),
  };
}

function cloneInputs(base: UnderwritingInputs): UnderwritingInputs {
  // Same primitive the engine clone uses · already guarded inside
  // applyOverrides via the H-1 try/catch · we wrap here too so the
  // route-level error boundary catches a clone failure cleanly.
  try {
    return JSON.parse(JSON.stringify(base));
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[hotels/bundle-resolver] Failed to clone SCENARIO_BASE inputs:", err);
    throw new Error("Hotel bundle clone failed — please reload.");
  }
}

function applyHotelDelta(inputs: UnderwritingInputs, delta: HotelInputDelta): void {
  // ── Asset identity overlay ──────────────────────────────────────
  inputs.asset.hotel_name = delta.asset.hotel_name;
  inputs.asset.rooms = delta.asset.rooms;
  inputs.asset.total_sqm = delta.asset.total_sqm;
  inputs.asset.intervention_sqm = delta.asset.intervention_sqm;
  inputs.asset.market = delta.asset.market;
  inputs.asset.submarket = delta.asset.submarket;
  inputs.asset.category = delta.asset.category;
  inputs.asset.state = delta.asset.state;

  // ── Acquisition overlay ─────────────────────────────────────────
  if (delta.acquisition?.asking_price !== undefined) {
    inputs.acquisition.asking_price = delta.acquisition.asking_price;
  }
  if (delta.acquisition?.hotel_value !== undefined) {
    inputs.acquisition.hotel_value = delta.acquisition.hotel_value;
  }

  // ── GOP / costs scale overlay ───────────────────────────────────
  if (delta.scale_gop_factor !== undefined && delta.scale_gop_factor > 0) {
    const f = delta.scale_gop_factor;
    const drivers = inputs.pl_drivers;
    drivers.gop.hotel = drivers.gop.hotel.map((v) => Math.round(v * f));
    drivers.gop.fb = drivers.gop.fb.map((v) => Math.round(v * f));
    drivers.gop.other = drivers.gop.other.map((v) => Math.round(v * f));
    drivers.costs.mgmt_fee = drivers.costs.mgmt_fee.map((v) => Math.round(v * f));
    drivers.costs.property_tax = drivers.costs.property_tax.map((v) => Math.round(v * f));
    drivers.costs.property_insurance = drivers.costs.property_insurance.map((v) =>
      Math.round(v * f),
    );
    drivers.costs.ffe_reserve = drivers.costs.ffe_reserve.map((v) => Math.round(v * f));
  }
}

export type { HotelId } from "./madrid-centro-registry";
