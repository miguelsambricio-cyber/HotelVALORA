/**
 * Institutional dark footer — single source of truth for the bottom
 * chrome shared by landing, /settings, /library, /compset, /report and
 * the auth surfaces. Print-hidden by design.
 *
 * Slim variant (`variant="slim"`) is for fullscreen "kiosk" pages such
 * as the favorites map and the landing.
 *
 * Order is unified across breakpoints (2026-05-30): COPYRIGHT FIRST, then
 * the legal links (Términos · Privacidad · Contacto) — same story, same
 * order on mobile and desktop. "Institucional" was removed from the footer
 * (its home, if needed, is the top nav · not the legal/utility row).
 *   · MOBILE: one centered line — "© 2026 HotelVALORA · Términos ·
 *     Privacidad · Contacto" (copyright plain text, links clickable, short
 *     copyright so it fits 360/390px).
 *   · DESKTOP (md+): full copyright left, links right (copyright → links).
 */
import { Fragment } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface InstitutionalFooterProps {
  variant?: "default" | "slim";
  className?: string;
}

const FOOTER_LINKS = [
  { href: "/terms",   label: "Términos"   },
  { href: "/privacy", label: "Privacidad" },
  { href: "/contact", label: "Contacto"   },
] as const;

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
      {/* Mobile · ONE centered line · copyright FIRST, then the 3 links. */}
      <div className="flex flex-nowrap items-center justify-center gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-normal text-slate-400 md:hidden">
        <span>© 2026 HotelVALORA</span>
        {FOOTER_LINKS.map((l) => (
          <Fragment key={l.href}>
            <span aria-hidden className="text-slate-600">·</span>
            <Link
              href={l.href}
              className="py-2 text-slate-500 transition-colors hover:text-emerald-300"
            >
              {l.label}
            </Link>
          </Fragment>
        ))}
      </div>

      {/* Desktop (md+) · copyright FIRST (left, full) · links (right) · same order. */}
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
