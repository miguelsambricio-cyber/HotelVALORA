/**
 * Institutional dark footer — single source of truth for the bottom
 * chrome shared by landing, /settings, /library, /compset, /report and
 * the auth surfaces. Print-hidden by design.
 *
 * Slim variant (`variant="slim"`) is for fullscreen "kiosk" pages such
 * as the favorites map and the landing, where the footer must stay
 * below the fold of a 100vh layout without dominating it.
 *
 * Legal links migrated 2026-05-20 from hash anchors to real URLs so
 * the landing's previous LandingFooter (which carried the legal
 * destinations) can be retired in favour of this canonical footer
 * without losing /terms · /privacy · /contact · /institutional.
 */
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
  // Institutional is a secondary link · hidden on mobile so the legal row
  // stays a single clean line (Términos · Privacidad · Contacto). Desktop
  // shows all four unchanged.
  { href: "/institutional", label: "Institucional", mobile: false },
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
        isSlim ? "px-6 py-2" : "px-8 py-4",
        className,
      )}
    >
      {/* Mobile: links row on top, copyright below (centered, small, muted).
       *  Desktop (md+): unchanged — copyright left, nav right on one row. */}
      <div className="mx-auto flex max-w-7xl flex-col-reverse items-center justify-between gap-2 md:flex-row md:gap-3">
        <span className="text-center text-[11px] font-medium uppercase tracking-[0.16em] text-slate-400 md:text-[10px] md:tracking-[0.18em]">
          © 2026 HotelVALORA Institutional · Underwriting-grade intelligence.
        </span>
        <nav aria-label="Footer" className="flex flex-wrap items-center justify-center gap-x-5 gap-y-0.5">
          {FOOTER_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href} mobileHidden={!l.mobile}>
              {l.label}
            </FooterLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}

function FooterLink({
  href,
  children,
  mobileHidden = false,
}: {
  href: string;
  children: React.ReactNode;
  /** When true, hidden below md (keeps the mobile legal row to one clean line). */
  mobileHidden?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "items-center py-1.5 text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300",
        mobileHidden ? "hidden md:inline-flex" : "inline-flex",
      )}
    >
      {children}
    </Link>
  );
}
