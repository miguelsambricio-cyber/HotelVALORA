/**
 * Narrative paragraph · institutional underwriting prose block.
 *
 * Used at the top of each section to land the IC narrative BEFORE any
 * tables or KPIs. Sets the analytical frame so the rest of the section
 * reads as supporting evidence.
 *
 * Convention:
 *   · 1-3 sentences max · tight, IC-grade
 *   · embedded metrics as `<strong>` (bold lime) for at-a-glance recall
 *   · NO marketing tone · NO superlatives · institutional understatement
 *
 * Print discipline · serif-feel via font-headline · dark→light inversion.
 */
export function NarrativeParagraph({
  eyebrow,
  children,
}: {
  /** Optional small uppercase tag above the paragraph (e.g. "Investment thesis"). */
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border-l-2 border-lime-300/40 bg-slate-900/40 p-4 print:border-emerald-600 print:bg-emerald-50/40">
      {eyebrow && (
        <p className="mb-2 font-headline text-[9px] font-extrabold uppercase tracking-[0.28em] text-lime-300/80 print:text-emerald-700">
          {eyebrow}
        </p>
      )}
      <p className="font-headline text-[13.5px] font-medium leading-relaxed text-slate-200 print:text-slate-800">
        {children}
      </p>
    </div>
  );
}

/** Inline highlight inside a narrative paragraph · use for KPIs / numbers. */
export function NarrativeMetric({ children }: { children: React.ReactNode }) {
  return (
    <strong className="font-headline font-extrabold text-lime-200 print:text-emerald-700">
      {children}
    </strong>
  );
}
