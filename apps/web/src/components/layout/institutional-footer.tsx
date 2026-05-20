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
  { href: "/terms",         label: "Términos"      },
  { href: "/privacy",       label: "Privacidad"    },
  { href: "/contact",       label: "Contacto"      },
  { href: "/institutional", label: "Institucional" },
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
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 md:flex-row">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400">
          © 2026 HotelVALORA Institutional · Underwriting-grade intelligence.
        </span>
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-5">
          {FOOTER_LINKS.map((l) => (
            <FooterLink key={l.href} href={l.href}>
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
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
    >
      {children}
    </Link>
  );
}
