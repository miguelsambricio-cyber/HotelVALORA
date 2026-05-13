import type { ReactNode } from "react";
import { Layers } from "lucide-react";

/**
 * Section wrapper for each operational layer on the integrations page.
 * Renders a tracked-out micro-label header + a count chip + a subtitle,
 * matched to the existing dark/lime visual contract.
 */
export function LayerSection({
  number,
  label,
  subtitle,
  count,
  icon = <Layers size={14} className="text-slate-400" aria-hidden />,
  children,
}: {
  /** 1..5 — surfaces as a sequence dot so the reader sees the order */
  number: number;
  label: string;
  subtitle: string;
  count: number;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-end gap-3 px-1">
        {icon}
        <span
          aria-hidden
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-forest-900 font-mono text-[10px] font-extrabold text-lime-300 shadow-sm"
        >
          {number}
        </span>
        <h2 className="font-headline text-[11px] font-extrabold uppercase tracking-[0.25em] text-slate-600">
          {label}
        </h2>
        <span className="font-mono text-[11px] text-slate-400">
          {String(count).padStart(2, "0")}
        </span>
        <p className="basis-full pt-1 text-[12.5px] leading-snug text-slate-500">
          {subtitle}
        </p>
      </header>
      {children}
    </section>
  );
}
