// Canonical report primitives — single import surface for section pages.
//
//   import {
//     ReportSection, ReportHeader, MetricRow, MetricTable,
//     StatCard, StatGrid, UpgradeGate, UpgradeCard,
//     ImageGallery, ImageGalleryCard, ReportMap,
//     PrintPage, PdfExportButton,
//   } from "@/components/report/primitives";

export { MetricRow } from "./metric-row";
export type { MetricRowProps } from "./metric-row";

export { MetricTable } from "./metric-table";
export type { MetricTableProps } from "./metric-table";

export { ReportSection } from "./report-section";
export type { ReportSectionProps } from "./report-section";

export { ReportHeader } from "./report-header";
export type { ReportHeaderProps } from "./report-header";

export { StatCard, StatGrid } from "./stat-card";
export type { StatValue } from "./stat-card";

export { UpgradeGate, UpgradeCard } from "./upgrade-gate";

export { ImageGallery, ImageGalleryCard } from "./image-gallery";

export { ReportMap } from "./report-map";

export { PrintPage } from "./print-page";
export type { PrintPageProps } from "./print-page";

export { PdfExportButton } from "./pdf-export-button";
export type { PdfExportButtonProps } from "./pdf-export-button";
