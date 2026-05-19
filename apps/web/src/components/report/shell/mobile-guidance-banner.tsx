/**
 * Mobile / narrow-viewport guidance banner · report-system only.
 *
 * Discreet, non-invasive, informational. Renders only below the
 * `md:` breakpoint (768 px) · invisible on tablet landscape, laptop,
 * and any larger surface. Never blocks navigation · never overlays
 * content · always print:hidden.
 *
 * Purpose: protect against the perception that the institutional
 * report flow is "broken on mobile". HotelVALORA's report system
 * is explicitly desktop-first (year grids · sticky nav rail ·
 * landscape PDF chain), and this banner tells the visitor up-front
 * so they read what is on-screen as a constrained view rather than
 * a defect.
 *
 * Scope: report-system surfaces only · injected by ReportShell and
 * by the Madrid Centro chooser page directly. NOT injected app-wide
 * (landing · login · admin · settings keep their own UX language).
 */
export function MobileGuidanceBanner() {
  return (
    <div
      role="note"
      aria-label="Mobile viewport guidance"
      className="md:hidden print:hidden border-b border-slate-200 bg-slate-50 px-4 py-2"
    >
      <p className="text-center font-mono text-[10.5px] leading-snug text-slate-600">
        Best viewed on desktop or tablet landscape · institutional
        workflow optimised for ≥ 1024 px viewports
      </p>
    </div>
  );
}
