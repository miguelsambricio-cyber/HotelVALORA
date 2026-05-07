import Link from "next/link";

const NAV_LINKS = [
  { href: "#", label: "Términos" },
  { href: "#", label: "Privacidad" },
  { href: "#", label: "Contacto" },
  { href: "#", label: "Institucional" },
] as const;

export function LandingFooter() {
  return (
    <footer className="w-full bg-forest-900 py-8 px-8 border-t border-white/10">
      <div className="max-w-7xl mx-auto flex flex-col items-center">
        <div className="mb-4">
          <span className="font-display font-bold text-xl text-white tracking-tight">
            HotelVALORA
          </span>
        </div>

        <nav className="flex flex-wrap justify-center gap-6 mb-4">
          {NAV_LINKS.map(({ href, label }) => (
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
