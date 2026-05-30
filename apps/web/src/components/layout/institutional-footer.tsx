/**
 * Institutional dark footer — single source of truth for the bottom
 * chrome shared by landing, /settings, /library, /compset, /report and
 * the auth surfaces. Print-hidden by design.
 *
 * Slim variant (`variant="slim"`) is for fullscreen "kiosk" pages such
 * as the favorites map and the landing, where the footer must stay
 * below the fold of a 100vh layout without dominating it.
 *
 * Responsive (2026-05-30): MOBILE renders ONE centered line —
 *   "Términos · Privacidad · Contacto · © 2026 HotelVALORA" — links
 *   clickable, copyright is plain text, short copyright (no
 *   "Institutional"/tagline) so it never wraps at 360/390px. DESKTOP
 *   (md+) keeps the two-group layout: full copyright left, nav (all 4
 *   links) right.
 */
import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface InstitutionalFooterProps {
  variant?: "default" | "slim";
  className?: string;
}

const FOOTER_LINKS = [
  { href: "/terms",         label: "Términos",      mobile: true  },
  { href: "/privacy",       label: "Privacidad",    mobile: true  },
  { href: "/contact",       label: "Contacto",      mobile: true  },
  // Institutional is secondary · desktop-only (keeps the mobile line short).
  { href: "/institutional", label: "Institucional", mobile: false },
] as const;

const MOBILE_LINKS = FOOTER_LINKS.filter((l) => l.mobile);

export function InstitutionalFooter({
  variant = "default",
  className,
}: InstitutionalFooterProps) {
  const isSlim = variant === "slim";
  return (
    <footer
      className={cn(
        "w-full bg-slate-950 print:hidden",
        isSlim ? "px-4 py-2 md:px-6" : "px-4 py-4 md:px-8",
        className,
      )}
    >
      {/* Mobile · ONE centered line · links (clickable) + short copyright (text). */}
      <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-normal text-slate-400 md:hidden">
        {MOBILE_LINKS.map((l) => (
          <Fragment key={l.href}>
            <Link
              href={l.href}
              className="py-2 text-slate-500 transition-colors hover:text-emerald-300"
            >
              {l.label}
            </Link>
            <span aria-hidden className="text-slate-600">·</span>
          </Fragment>
        ))}
        <span>© 2026 HotelVALORA</span>
      </div>

      {/* Desktop (md+) · copyright left (full) · nav right · one row. */}
      <div className="mx-auto hidden max-w-7xl flex-row items-center justify-between gap-3 md:flex">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          © 2026 HotelVALORA Institutional · Underwriting-grade intelligence.
        </span>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5">
          {FOOTER_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
