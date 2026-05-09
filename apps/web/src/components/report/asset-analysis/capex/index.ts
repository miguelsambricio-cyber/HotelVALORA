// Canonical components for the CAPEX & Renders sub-section under Asset
// Analysis. All consumable through one barrel:
//
//   import {
//     CapexTable, CapexCategory, CapexTotalRow, CostInputRow,
//     CapexTimeline, ToggleSelector,
//     PropertyGallerySidebar,
//     RenderConfigurator, RenderTagGroup, RenderPreviewCard,
//   } from "@/components/report/asset-analysis/capex";

export { ToggleSelector } from "./toggle-selector";
export type { ToggleSelectorProps, ToggleSelectorOption } from "./toggle-selector";

export { CostInputRow } from "./cost-input-row";
export type { CostInputRowProps } from "./cost-input-row";

export { CapexCategory } from "./capex-category";
export type { CapexCategoryProps } from "./capex-category";

export { CapexTotalRow } from "./capex-total-row";
export type { CapexTotalRowProps } from "./capex-total-row";

export { CapexTable } from "./capex-table";
export type { CapexTableProps } from "./capex-table";

export { CapexTimeline } from "./capex-timeline";
export type { CapexTimelineProps } from "./capex-timeline";

export { CapexDurationBadge } from "./capex-duration-badge";
export type { CapexDurationBadgeProps } from "./capex-duration-badge";

export { CapexScheduleRow } from "./capex-schedule-row";
export type { CapexScheduleRowProps } from "./capex-schedule-row";

export { CapexScheduleCard } from "./capex-schedule-card";
export type { CapexScheduleCardProps } from "./capex-schedule-card";

export { RangeTrack } from "./range-track";
export type { RangeTrackProps } from "./range-track";

export { PropertyGallerySidebar } from "./property-gallery-sidebar";
export type { PropertyGallerySidebarProps } from "./property-gallery-sidebar";

export { RenderPreviewCard } from "./render-preview-card";
export type { RenderPreviewCardProps } from "./render-preview-card";

export { RenderTagGroup } from "./render-tag-group";
export type { RenderTagGroupProps } from "./render-tag-group";

export { RenderConfigurator } from "./render-configurator";
export type { RenderConfiguratorProps } from "./render-configurator";
