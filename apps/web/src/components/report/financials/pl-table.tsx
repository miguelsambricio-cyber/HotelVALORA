"use client";

import { useMemo, useState } from "react";
import {
  PL_STRUCTURE,
  expandYear1ToMonthly,
  getSeasonalityProfile,
  type PLAssumptions,
  type PLComputed,
  type PLLineItemId,
} from "@/lib/report/financials";
import { FinancialTable, getTableColCount } from "./financial-table";
import { PLSection } from "./pl-section";

export interface PLTableProps {
  /** When false, all assumption + year-1 cells render readonly */
  editable: boolean;
  /** Controlled assumption state — typically owned by the page */
  assumptions: PLAssumptions;
  /** Pre-computed view from `computePL(assumptions)` */
  computed: PLComputed;
  /** Fires when an editable assumption changes (parsed numeric value) */
  onAssumptionChange: (id: PLLineItemId, next: number) => void;
}

/**
 * USALI table composer — stitches the 5 sections together and owns the
 * Year-1 monthly expansion state.
 *
 * Why state lives here, not on the page: the toggle is intrinsic to the
 * table's presentation, not to the assumption model. Page-level state
 * (assumptions) flows down; expansion is a UI concern that doesn't escape.
 *
 * The monthly breakdown is computed on demand (only when expanded) and
 * memoised against `assumptions` + `computed` so toggling the chevron is
 * cheap on subsequent opens.
 */
export function PLTable({
  editable,
  assumptions,
  computed,
  onAssumptionChange,
}: PLTableProps) {
  const [year1Expanded, setYear1Expanded] = useState(false);

  // Seasonality profile lookup — future: keyed by hotel market + class
  const seasonalityProfile = useMemo(
    () => getSeasonalityProfile(),
    [],
  );

  // Monthly breakdown — only computed when expanded (cheap re-toggle)
  const year1Monthly = useMemo(
    () =>
      year1Expanded
        ? expandYear1ToMonthly(assumptions, computed, seasonalityProfile)
        : undefined,
    [year1Expanded, assumptions, computed, seasonalityProfile],
  );

  const resolveAssumption = (id: PLLineItemId): number | null =>
    resolveAssumptionValue(id, assumptions);

  const colSpan = getTableColCount(year1Expanded);

  return (
    <FinancialTable
      year1Expanded={year1Expanded}
      onToggleYear1={() => setYear1Expanded((v) => !v)}
    >
      {PL_STRUCTURE.map((section, idx) => (
        <PLSection
          key={section.id}
          section={section}
          computed={computed}
          assumptions={assumptions}
          editable={editable}
          colSpan={colSpan}
          isFirst={idx === 0}
          year1Monthly={year1Monthly}
          resolveAssumption={resolveAssumption}
          onAssumptionChange={onAssumptionChange}
        />
      ))}
    </FinancialTable>
  );
}

// ── Helpers (exported for use by the page when wiring updates) ──────────────

export function resolveAssumptionValue(
  id: PLLineItemId,
  a: PLAssumptions,
): number | null {
  switch (id) {
    case "rooms-count":
      return a.rooms;
    case "occupancy":
      return a.occupancyYear1;
    case "adr":
      return a.adrYear1;
    case "rev-fb":
      return a.ratios.revFB;
    case "rev-meeting":
      return a.ratios.revMeeting;
    case "rev-spa":
      return a.ratios.revSpa;
    case "rev-parking-other":
      return a.ratios.revParkingOther;
    case "exp-rooms":
      return a.ratios.expRooms;
    case "exp-fb":
      return a.ratios.expFB;
    case "exp-other-dept":
      return a.ratios.expOtherDept;
    case "exp-admin":
      return a.ratios.expAdmin;
    case "exp-sales-marketing":
      return a.ratios.expSalesMarketing;
    case "exp-property-maint":
      return a.ratios.expPropertyMaint;
    case "exp-utilities":
      return a.ratios.expUtilities;
    case "exp-mgmt-fee":
      return a.ratios.expMgmtFee;
    case "exp-property-tax":
      return a.ratios.expPropertyTax;
    case "exp-insurance":
      return a.ratios.expInsurance;
    case "exp-ffe-reserve":
      return a.ratios.expFfeReserve;
    case "rev-rooms":
      // Residual: 1 − sum of ancillary revenue ratios
      return (
        1 -
        a.ratios.revFB -
        a.ratios.revMeeting -
        a.ratios.revSpa -
        a.ratios.revParkingOther
      );
    case "revpar":
      return null; // derived
  }
}

/** Pure update — returns the next assumption struct for a single field change. */
export function applyAssumptionChange(
  a: PLAssumptions,
  id: PLLineItemId,
  next: number,
): PLAssumptions {
  const clamp = (n: number, min: number, max: number) =>
    Math.max(min, Math.min(max, n));
  switch (id) {
    case "rooms-count":
      return { ...a, rooms: Math.max(0, Math.round(next)) };
    case "occupancy":
      return { ...a, occupancyYear1: clamp(next, 0, 1) };
    case "adr":
      return { ...a, adrYear1: Math.max(0, next) };
    case "rev-fb":
      return { ...a, ratios: { ...a.ratios, revFB: clamp(next, 0, 0.95) } };
    case "rev-meeting":
      return { ...a, ratios: { ...a.ratios, revMeeting: clamp(next, 0, 0.95) } };
    case "rev-spa":
      return { ...a, ratios: { ...a.ratios, revSpa: clamp(next, 0, 0.95) } };
    case "rev-parking-other":
      return {
        ...a,
        ratios: { ...a.ratios, revParkingOther: clamp(next, 0, 0.95) },
      };
    case "exp-rooms":
      return { ...a, ratios: { ...a.ratios, expRooms: clamp(next, 0, 1) } };
    case "exp-fb":
      return { ...a, ratios: { ...a.ratios, expFB: clamp(next, 0, 1) } };
    case "exp-other-dept":
      return {
        ...a,
        ratios: { ...a.ratios, expOtherDept: clamp(next, 0, 1) },
      };
    case "exp-admin":
      return { ...a, ratios: { ...a.ratios, expAdmin: clamp(next, 0, 1) } };
    case "exp-sales-marketing":
      return {
        ...a,
        ratios: { ...a.ratios, expSalesMarketing: clamp(next, 0, 1) },
      };
    case "exp-property-maint":
      return {
        ...a,
        ratios: { ...a.ratios, expPropertyMaint: clamp(next, 0, 1) },
      };
    case "exp-utilities":
      return {
        ...a,
        ratios: { ...a.ratios, expUtilities: clamp(next, 0, 1) },
      };
    case "exp-mgmt-fee":
      return { ...a, ratios: { ...a.ratios, expMgmtFee: clamp(next, 0, 1) } };
    case "exp-property-tax":
      return {
        ...a,
        ratios: { ...a.ratios, expPropertyTax: clamp(next, 0, 1) },
      };
    case "exp-insurance":
      return {
        ...a,
        ratios: { ...a.ratios, expInsurance: clamp(next, 0, 1) },
      };
    case "exp-ffe-reserve":
      return {
        ...a,
        ratios: { ...a.ratios, expFfeReserve: clamp(next, 0, 1) },
      };
    case "rev-rooms":
    case "revpar":
      return a; // derived — no-op
  }
}
