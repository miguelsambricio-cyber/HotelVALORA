/**
 * Memorandum block · institutional underwriting page primitive.
 *
 * Extracted from Section 6 (Investment) into a shared primitive so
 * every underwriting section renders cohesively · same hierarchy ·
 * same print discipline · same lime accent · same break-avoidance.
 *
 * Convention:
 *   · `number` is a single letter (A · B · C · …) within a section
 *   · `title` is sentence-case · short
 *   · `subtitle` shows on sm+ screens only · institutional one-liner
 *
 * Print discipline · break-inside-avoid + dark→light theme inversion.
 */
export function MemorandumBlock({
  number,
  title,
  subtitle,
  children,
}: {
  number: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-slate-800/60 bg-slate-950/40 p-5 print:break-inside-avoid print:border-slate-300 print:bg-white">
      <header className="mb-4 flex items-baseline gap-3 border-b border-slate-800/60 pb-3 print:border-slate-300">
        <span className="font-headline text-[10px] font-extrabold uppercase tracking-[0.32em] text-lime-300/80 print:text-emerald-700">
          Block {number}
        </span>
        <h3 className="font-headline text-[16px] font-extrabold text-slate-100 print:text-slate-900">{title}</h3>
        {subtitle && (
          <span className="ml-auto hidden font-mono text-[10px] uppercase tracking-[0.22em] text-slate-500 sm:inline">
            {subtitle}
          </span>
        )}
      </header>
      <div className="space-y-5 print:space-y-3">{children}</div>
    </section>
  );
}
