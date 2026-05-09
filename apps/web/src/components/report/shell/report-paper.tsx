import type { ReactNode } from "react";
import {
  ReportHeader,
  type ReportHeaderLayout,
} from "@/components/report/primitives/report-header";
import { cn } from "@/lib/utils";

export interface ReportPaperProps {
  sectionLabel: string;
  title: string;
  titleSize?: "2xl" | "4xl";
  /**
   * @deprecated Use `actions` for header-side controls. Kept for backward
   * compatibility with existing pages.
   */
  headerRight?: ReactNode;
  actions?: ReactNode;
  /** Header layout variant — see `ReportHeader.layout` */
  headerLayout?: ReportHeaderLayout;
  /**
   * When true the paper is fully bordered and rounded (border-b, rounded-xl).
   * Default `false` — paper has rounded-t-xl + open bottom edge so an attached
   * action bar visually flows from it (Executive Summary / Competitive Set).
   */
  closed?: boolean;
  /** Hide the PDF export button in the header */
  hideExportButton?: boolean;
  children: ReactNode;
}

/**
 * Paper card wrapper. Composes the canonical `ReportHeader` primitive with
 * the white card surface that carries the graph-paper texture. New pages can
 * also use `ReportSection` (which adds section-metadata-driven page breaks).
 */
export function ReportPaper({
  sectionLabel,
  title,
  titleSize,
  headerRight,
  actions,
  headerLayout,
  closed = false,
  hideExportButton,
  children,
}: ReportPaperProps) {
  return (
    <div
      className={cn(
        "bg-white shadow-2xl border-x border-t border-blue-100 overflow-hidden graph-paper",
        "print:shadow-none print:rounded-none print:border-none print:overflow-visible",
        closed
          ? "border-b rounded-xl"
          : "rounded-t-xl",
      )}
    >
      <ReportHeader
        sectionLabel={sectionLabel}
        title={title}
        titleSize={titleSize}
        actions={actions ?? headerRight}
        layout={headerLayout}
        hideExportButton={hideExportButton}
      />
      <div className="bg-white/95 print:bg-white">{children}</div>
    </div>
  );
}
