import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PrintPageProps {
  /** Force a page-break before this block when printing */
  pageBreakBefore?: boolean;
  /** Force a page-break after this block when printing */
  pageBreakAfter?: boolean;
  /** Prevent the print engine from splitting this block across pages */
  avoidBreakInside?: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * Wraps a content block with declarative print-page semantics.
 * Use sparingly — most page-break behaviour is owned by the section registry
 * (`printPageBreak` on `ReportSection`). Reach for `PrintPage` when you need
 * fine-grained control inside a section (e.g. a long table that should keep
 * together on one page).
 */
export function PrintPage({
  pageBreakBefore,
  pageBreakAfter,
  avoidBreakInside = true,
  children,
  className,
}: PrintPageProps) {
  return (
    <div
      className={cn(
        "print-page",
        pageBreakBefore && "print:break-before-page",
        pageBreakAfter && "print:break-after-page",
        avoidBreakInside && "print:break-inside-avoid",
        className,
      )}
    >
      {children}
    </div>
  );
}
