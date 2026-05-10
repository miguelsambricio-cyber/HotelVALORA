/**
 * Institutional dark footer — single source of truth for the bottom
 * chrome shared by /settings, /library and the auth surfaces. The copy
 * is short, all-caps, tracked-out. Print-hidden by design.
 *
 * Slim variant (`variant="slim"`) is for fullscreen "kiosk" pages such
 * as the favorites map, where the footer must stay below the fold of a
 * 100vh layout without dominating it.
 */
import { cn } from "@/lib/utils";

export interface InstitutionalFooterProps {
  variant?: "default" | "slim";
  className?: string;
}

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
          © 2026 HotelVALORA Institutional. Underwriting-grade intelligence.
        </span>
        <nav aria-label="Footer" className="flex gap-5">
          <FooterLink href="#privacy">Privacy</FooterLink>
          <FooterLink href="#terms">Terms</FooterLink>
          <FooterLink href="#standards">Valuation Standards</FooterLink>
          <FooterLink href="#contact">Contact</FooterLink>
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
    <a
      href={href}
      className="text-[10px] uppercase tracking-[0.18em] text-slate-500 transition-colors hover:text-emerald-300"
    >
      {children}
    </a>
  );
}
