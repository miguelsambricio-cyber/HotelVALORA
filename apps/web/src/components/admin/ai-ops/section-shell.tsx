import { cn } from "@/lib/utils";

/**
 * Shared section atom for the AI Operations Center (`/user/admin/agents`).
 *
 * Six-section operational hierarchy renders consistently:
 *   01 Command Center · 02 Roster · 03 Metrics · 04 Intel · 05 Ingestion · 06 Alerts
 *
 * Each section gets a numbered eyebrow + forest-900 title + slate subline,
 * matching the institutional `SectionHeader` pattern used on `/user/admin`.
 */
export function SectionShell({
  id,
  index,
  title,
  subtitle,
  trailing,
  className,
  children,
}: {
  /** Anchor target — used for in-page drilldowns from the metrics totems. */
  id: string;
  /** Display number, e.g. "01". */
  index: string;
  title: string;
  subtitle: string;
  /** Optional trailing badge / status pill rendered top-right of the header. */
  trailing?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("scroll-mt-20", className)}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-slate-400">
            Section {index}
          </span>
          <h2
            id={`${id}-h`}
            className="font-headline text-xl font-extrabold tracking-tight text-forest-900"
          >
            {title}
          </h2>
          <p className="text-[12px] text-slate-500">{subtitle}</p>
        </div>
        {trailing && <div className="shrink-0">{trailing}</div>}
      </header>
      {children}
    </section>
  );
}
