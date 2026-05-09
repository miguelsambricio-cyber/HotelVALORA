"use client";

import type {
  Currency,
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
  /** Total number of table columns — 7 in v1 (label + assump + 5 years) */
  colSpan: number;
  /** First section in the table — uses compact header padding */
  isFirst?: boolean;
  /** Resolves the assumption value bound to a line-item id (null for derived rows) */
  resolveAssumption: (id: PLLineItemId) => number | null;
  /** Updates the assumption store when an editable assumption is changed */
  onAssumptionChange: (id: PLLineItemId, next: number) => void;
}

/**
 * One USALI section — header + N rows + optional emphasized result.
 *
 * Renders as a single `<tbody>` so `print:break-inside-avoid` keeps the
 * section together on one A4 page (Chrome/Firefox honour `break-inside`
 * on `<tbody>` reliably). When a section can't fit, the engine breaks
 * BEFORE the section, never inside it.
 */
export function PLSection({
  section,
  computed,
  assumptions,
  editable,
  colSpan,
  isFirst = false,
  resolveAssumption,
  onAssumptionChange,
}: PLSectionProps) {
  return (
    <tbody className="print:break-inside-avoid">
      <FinancialSectionHeader
        label={section.label}
        colSpan={colSpan}
        compact={isFirst}
      />

      {section.lineItems.map((line) => (
        <PLRow
          key={line.id}
          config={line}
          assumption={resolveAssumption(line.id)}
          yearValues={computed.lineItems[line.id]}
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
        />
      )}
    </tbody>
  );
}
