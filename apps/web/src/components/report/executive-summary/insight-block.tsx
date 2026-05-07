import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type InsightVariant = "default" | "positive" | "warning" | "thesis" | "recommendation";

interface InsightBlockProps {
  title?: string;
  variant?: InsightVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<InsightVariant, { border: string; title: string; bg: string }> = {
  default:        { border: "border-l-slate-400",   title: "text-slate-700",   bg: "bg-slate-50"     },
  positive:       { border: "border-l-emerald-500", title: "text-forest-900",  bg: "bg-emerald-50/50"},
  warning:        { border: "border-l-amber-400",   title: "text-amber-800",   bg: "bg-amber-50/50"  },
  thesis:         { border: "border-l-forest-700",  title: "text-forest-900",  bg: "bg-forest-50/30" },
  recommendation: { border: "border-l-brand-600",   title: "text-brand-800",   bg: "bg-brand-50/30"  },
};

/**
 * Reusable content block for investment highlights, thesis statements,
 * and executive recommendations throughout report sections.
 */
export function InsightBlock({
  title,
  variant = "default",
  children,
  className,
}: InsightBlockProps) {
  const styles = VARIANT_STYLES[variant];

  return (
    <div
      className={cn(
        "border-l-4 pl-4 py-3 rounded-r-lg text-sm leading-relaxed",
        styles.border,
        styles.bg,
        className
      )}
    >
      {title && (
        <p className={cn("font-bold mb-1 text-xs uppercase tracking-wide", styles.title)}>
          {title}
        </p>
      )}
      <div className="text-slate-600">{children}</div>
    </div>
  );
}
