import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/terms",       label: "Términos"      },
  { href: "/privacy",     label: "Privacidad"    },
  { href: "/contact",     label: "Contacto"      },
  { href: "/institutional", label: "Institucional" },
] as const;

export function LandingFooter() {
  return (
    <footer className="w-full bg-forest-900 py-6 px-8 border-t border-white/10 flex-shrink-0">
      <div className="max-w-7xl mx-auto flex flex-col items-center gap-2">
        <span className="font-display font-bold text-lg text-white tracking-tight">
          HotelVALORA
        </span>

        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-4">
          {FOOTER_LINKS.map(({ href, label }) => (
            <Link
              key={label}
              href={href}
              className="text-xs font-medium tracking-wide text-slate-300 hover:text-white transition-colors"
            >
              {label}
            </Link>
          ))}
        </nav>

        <p className="text-[9px] font-medium tracking-[0.2em] uppercase text-slate-400">
          © 2024 HotelVALORA. Institutional Luminary &amp; Valuation Systems.
        </p>
      </div>
    </footer>
  );
}
