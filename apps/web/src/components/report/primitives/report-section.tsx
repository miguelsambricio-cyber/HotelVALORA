import type { ReactNode } from "react";
import type { ReportSection as ReportSectionMeta } from "@/types/report";
import { ReportHeader, type ReportHeaderLayout } from "./report-header";
import { cn } from "@/lib/utils";

export interface ReportSectionProps {
  /** Section metadata from sections.ts — drives title, id anchor, and page-break */
  section: ReportSectionMeta;
  /** Override the small label above the title (defaults to "Hotel Valuation") */
  sectionLabel?: string;
  /** Override the page title (defaults to section.label) */
  title?: string;
  /** Title visual size — "4xl" for hero pages */
  titleSize?: "2xl" | "4xl";
  /** Right-aligned header actions (toggle, period selector, etc.) */
  actions?: ReactNode;
  /** Header layout — see `ReportHeader.layout` */
  headerLayout?: ReportHeaderLayout;
  /** Hide the built-in PDF export button in the header */
  hideExportButton?: boolean;
  /** Fully-rounded + bordered paper (vs. open bottom for attached action bars) */
  closed?: boolean;
  /** Body content of the section */
  children: ReactNode;
  className?: string;
}

/**
 * Canonical wrapper for a report section page. Renders the white paper card
 * with a header bar and a content area, and injects print-page-break behaviour
 * declared on the section metadata.
 */
export function ReportSection({
  section,
  sectionLabel = "Hotel Valuation",
  title,
  titleSize,
  actions,
  headerLayout,
  hideExportButton,
  closed = false,
  children,
  className,
}: ReportSectionProps) {
  return (
    <article
      id={`section-${section.id}`}
      className={cn(
        "bg-white shadow-2xl border-x border-t border-blue-100 overflow-hidden graph-paper",
        "print:shadow-none print:rounded-none print:border-none print:overflow-visible",
        closed ? "border-b rounded-xl" : "rounded-t-xl",
        section.printPageBreak && "print:break-before-page",
        className,
      )}
    >
      <ReportHeader
        sectionLabel={sectionLabel}
        title={title ?? section.label}
        titleSize={titleSize}
        actions={actions}
        layout={headerLayout}
        hideExportButton={hideExportButton}
      />
      <div className="bg-white/95 print:bg-white">{children}</div>
    </article>
  );
}
