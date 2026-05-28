"use client";

import type {
  MonthlyYear1Breakdown,
  PLAssumptions,
  PLComputed,
  PLLineItemId,
  PLSectionConfig,
} from "@/lib/report/financials";
import { FinancialSectionHeader } from "./financial-section-header";
import { FinancialResultRow } from "./financial-result-row";
import { PLRow } from "./pl-row";

export interface PLSectionProps {
  section: PLSectionConfig;
  computed: PLComputed;
  assumptions: PLAssumptions;
  editable: boolean;
  /** Total number of table columns (7 collapsed, 18 expanded) */
  colSpan: number;
  /** First section in the table — uses compact header padding */
  isFirst?: boolean;
  /**
   * Optional Year-1 monthly breakdown. When provided, every row in this
   * section renders 12 month cells in place of the single Year-1 cell.
   */
  year1Monthly?: MonthlyYear1Breakdown;
  /** Resolves the assumption value bound to a line-item id (null for derived rows) */
  resolveAssumption: (id: PLLineItemId) => number | null;
  /** Updates the assumption store when an editable assumption is changed */
  onAssumptionChange: (id: PLLineItemId, next: number) => void;
}

/**
 * Facility-aware row hiding · suppresses any line whose 5-year values are
 * all zero (within a small float tolerance to absorb computePL rounding).
 *
 * Behaviour kicks in when `applyFacilityAwareRule` zeroes a revenue ratio
 * because the underlying facility is absent (e.g. One Shot Fortuny has no
 * meeting space — `rev-meeting` becomes [0,0,0,0,0] and disappears, taking
 * the linked `exp-other-dept` line with it when no other ancillary remains).
 * Derived rows like `rev-rooms` (residual) are never zero so they always
 * render.
 */
function rowHasSignal(values: readonly number[]): boolean {
  for (const v of values) {
    if (Math.abs(v) > 0.5) return true;
  }
  return false;
}

export function PLSection({
  section,
  computed,
  assumptions,
  editable,
  colSpan,
  isFirst = false,
  year1Monthly,
  resolveAssumption,
  onAssumptionChange,
}: PLSectionProps) {
  const visibleLines = section.lineItems.filter((line) =>
    rowHasSignal(computed.lineItems[line.id] ?? [0, 0, 0, 0, 0]),
  );

  return (
    <tbody className="print:break-inside-avoid">
      <FinancialSectionHeader
        label={section.label}
        colSpan={colSpan}
        compact={isFirst}
      />

      {visibleLines.map((line) => (
        <PLRow
          key={line.id}
          config={line}
          assumption={resolveAssumption(line.id)}
          yearValues={computed.lineItems[line.id]}
          year1Monthly={year1Monthly?.lineItems[line.id]}
          editable={editable}
          currency={assumptions.currency}
          onAssumptionChange={(next) => onAssumptionChange(line.id, next)}
        />
      ))}

      {section.result && (
        <FinancialResultRow
          label={section.result.label}
          variant={section.result.variant}
          values={
            section.result.id === "total-revenue"
              ? computed.results.totalRevenue
              : section.result.id === "gop"
                ? computed.results.gop
                : computed.results.ebitda
          }
          currency={assumptions.currency}
          marginValues={
            section.result.showMargin ? computed.results.ebitdaMargin : undefined
          }
          year1Monthly={
            year1Monthly
              ? section.result.id === "total-revenue"
                ? year1Monthly.results.totalRevenue
                : section.result.id === "gop"
                  ? year1Monthly.results.gop
                  : year1Monthly.results.ebitda
              : undefined
          }
          year1MonthlyMargin={
            year1Monthly && section.result.showMargin
              ? year1Monthly.results.ebitdaMargin
              : undefined
          }
        />
      )}
    </tbody>
  );
}
